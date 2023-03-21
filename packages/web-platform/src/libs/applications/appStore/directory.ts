/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "@glue42/web";
import { Glue42WebPlatform } from "../../../../platform";
import { objEqualFast } from "../../../shared/utils";
import { AppDirSetup, AppDirProcessingConfig, BaseApplicationData, ApplicationsMergeResult, AppDirectoryStateChange } from "../types";
import logger from "../../../shared/logger";
import { SessionStorageController } from "../../../controllers/session";
import { RemoteWatcher } from "./remoteWatcher";
import { AsyncSequelizer } from "../../../shared/sequelizer";

export class AppDirectory {
    private maxAllowedApplicationsInStore = 10000;
    private readonly baseEventFlushDurationMs = 10;
    private appsStateChange!: (state: AppDirectoryStateChange) => void;
    private sequelizer!: AsyncSequelizer;

    constructor(
        private readonly sessionStorage: SessionStorageController,
        private readonly remoteWatcher: RemoteWatcher
    ) { }

    public stop(): void {
        this.remoteWatcher.stop();
    }

    public async start(setup: AppDirSetup): Promise<void> {
        this.logger?.trace("Starting the application directory");
        this.appsStateChange = setup.appsStateChange;
        this.sequelizer = setup.sequelizer;

        if (setup.config.local && setup.config.local.length) {
            this.logger?.trace("Detected local applications, parsing...");

            await this.processAppDefinitions(setup.config.local, { type: "inmemory", mode: "merge" });
        }

        if (setup.config.remote) {
            this.logger?.trace("Detected remote app store configuration, starting the watcher...");
            this.remoteWatcher.start(setup.config.remote, (apps) => this.processAppDefinitions(apps, { type: "remote", mode: "replace" }));
        }
    }

    public processAppDefinitions(definitions: Array<Glue42Web.AppManager.Definition | Glue42WebPlatform.Applications.FDC3Definition>, config: AppDirProcessingConfig): Promise<void> {
        return this.sequelizer.enqueue<void>(async () => {
            const parsedDefinitions: BaseApplicationData[] = definitions.map((def) => this.parseDefinition(def));

            const currentApps: BaseApplicationData[] = this.sessionStorage.getAllApps(config.type);

            const mergeResult = this[config.mode](currentApps, parsedDefinitions);

            if (mergeResult.readyApps.length > this.maxAllowedApplicationsInStore) {
                throw new Error("Cannot save the app definitions, because the total number exceeds 10000, which is the limit.");
            }

            this.sessionStorage.overwriteApps(mergeResult.readyApps, config.type);

            await this.announceApps(mergeResult);

        });
    }

    public getAll(): Promise<BaseApplicationData[]> {
        return this.sequelizer.enqueue<BaseApplicationData[]>(async () => {
            const inMemory = this.sessionStorage.getAllApps("inmemory");
            const remote = this.sessionStorage.getAllApps("remote");

            return inMemory.concat(remote);
        });
    }

    public exportInMemory(): Promise<Glue42Web.AppManager.Definition[]> {
        return this.sequelizer.enqueue<Glue42Web.AppManager.Definition[]>(async () => {
            const allBaseApps = this.sessionStorage.getAllApps("inmemory");

            return allBaseApps.map(this.reverseParseDefinition);
        });
    }

    public removeInMemory(name: string): Promise<BaseApplicationData | undefined> {
        return this.sequelizer.enqueue<BaseApplicationData | undefined>(async () => {
            return this.sessionStorage.removeApp(name, "inmemory");
        });
    }

    private merge(currentApps: BaseApplicationData[], parsedDefinitions: BaseApplicationData[]): ApplicationsMergeResult {
        const result: ApplicationsMergeResult = { readyApps: [], addedApps: [], changedApps: [], removedApps: [] };

        const currentAppsTable = currentApps.reduce<{ [key in string]: BaseApplicationData }>((soFar, definition) => {
            soFar[definition.name] = definition;
            return soFar;
        }, {});

        parsedDefinitions.forEach((definition) => {
            if (currentAppsTable[definition.name] && !objEqualFast(definition, currentAppsTable[definition.name])) {

                currentAppsTable[definition.name] = definition;
                result.changedApps.push(definition);
                return;
            }

            if (!currentAppsTable[definition.name]) {
                currentAppsTable[definition.name] = definition;
                result.addedApps.push(definition);

                return;
            }

        });

        result.readyApps = Object.values(currentAppsTable);

        return result;
    }

    private replace(currentApps: BaseApplicationData[], parsedDefinitions: BaseApplicationData[]): ApplicationsMergeResult {
        const result: ApplicationsMergeResult = { readyApps: [], addedApps: [], changedApps: [], removedApps: [] };

        const currentAppsTable = currentApps.reduce<{ [key in string]: BaseApplicationData }>((soFar, definition) => {
            soFar[definition.name] = definition;
            return soFar;
        }, {});

        parsedDefinitions.forEach((definition) => {

            if (!currentAppsTable[definition.name]) {
                result.addedApps.push(definition);
            }

            if (currentAppsTable[definition.name] && !objEqualFast(definition, currentAppsTable[definition.name])) {
                result.changedApps.push(definition);
            }

            if (currentAppsTable[definition.name]) {
                (currentAppsTable[definition.name] as any).isChecked = true;
            }
        });

        result.removedApps = currentApps.filter((app) => !(app as any).isChecked);
        result.readyApps = parsedDefinitions;

        return result;
    }

    private reverseParseDefinition(definition: BaseApplicationData): Glue42Web.AppManager.Definition {

        const definitionDetails = definition.userProperties.details;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { details, ...removedDetails } = definition.userProperties;

        return {
            name: definition.name,
            type: (definition as any).type || "window",
            title: definition.title,
            version: definition.version,
            icon: (definition as any).icon,
            caption: (definition as any).caption,
            details: definitionDetails,
            customProperties: removedDetails
        };
    }

    private parseDefinition(definition: Glue42Web.AppManager.Definition | Glue42WebPlatform.Applications.FDC3Definition): BaseApplicationData {

        const glue42CoreAppProps = ["name", "title", "version", "customProperties", "icon", "caption", "type"];

        const userProperties = Object.fromEntries(Object.entries(definition).filter(([key]) => !glue42CoreAppProps.includes(key)));

        let createOptions: Glue42Web.AppManager.DefinitionDetails = { url: "" };

        if ((definition as any).manifest) {
            // this is fdc3
            const parsedManifest = JSON.parse((definition as Glue42WebPlatform.Applications.FDC3Definition).manifest);

            const url = parsedManifest.details?.url || parsedManifest.url;

            if (!url || typeof url !== "string") {
                throw new Error(`The FDC3 definition: ${definition.name} is not valid, because there is not url defined in the manifest`);
            }

            createOptions.url = url;
        } else {
            // this is GD
            createOptions = (definition as Glue42Web.AppManager.Definition).details;
        }

        const baseDefinition: BaseApplicationData = {
            createOptions,
            type: (definition as any).type || "window",
            name: definition.name,
            title: definition.title,
            version: definition.version,
            icon: (definition as any).icon,
            caption: (definition as any).caption,
            userProperties: {
                ...userProperties,
                ...(definition as any).customProperties
            }
        };

        if (!baseDefinition.userProperties.details) {
            baseDefinition.userProperties.details = createOptions;
        }

        // clears the undefined fields created by the assignment, which causes the same app import to trigger appChanged
        Object
            .keys(baseDefinition)
            .forEach((key: string) => (baseDefinition as { [key in string]: any })[key] === undefined && delete (baseDefinition as { [key in string]: any })[key]);

        return baseDefinition;
    }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("applications.remote.directory");
    }

    private async announceApps(mergeResult: ApplicationsMergeResult): Promise<void> {

        const appsStateChange: AppDirectoryStateChange = {
            appsAdded: mergeResult.addedApps,
            appsChanged: mergeResult.changedApps,
            appsRemoved: mergeResult.removedApps
        };

        this.logger?.trace(`announcing a change in the app directory state: ${JSON.stringify(appsStateChange)}`);

        this.appsStateChange(appsStateChange);

        await this.waitEventFlush();
    }

    private waitEventFlush(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, this.baseEventFlushDurationMs));
    }
}