/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42WebPlatform } from "../platform";
import { platformConfigDecoder } from "./shared/decoders";
import { defaultPlatformConfig } from "./common/defaultConfig";
import deepMerge from "deepmerge";
import { PlatformController } from "./controllers/main";
import { Glue42Web } from "@glue42/web";
import { InternalPlatformConfig } from "./common/types";
import { nanoid } from "nanoid";
import { SessionStorageController } from "./controllers/session";

export class Platform {

    private platformConfig!: InternalPlatformConfig;

    constructor(
        private readonly controller: PlatformController,
        private readonly session: SessionStorageController,
        private readonly config?: Glue42WebPlatform.Config,
    ) { }

    public async ready(): Promise<void> {
        this.session.start();

        this.checkSingleton();
        this.processConfig(this.config);

        await this.controller.start(this.platformConfig);
    }

    public getClientGlue(): Glue42Web.API {
        return this.controller.getClientGlue();
    }

    public getPlatformApi(): Glue42WebPlatform.API {
        return this.controller.platformApi;
    }

    private checkSingleton(): void {
        const glue42CoreNamespace = (window as any).glue42core;

        if (glue42CoreNamespace && glue42CoreNamespace.platformStarted) {
            throw new Error("The Glue42 Core Platform has already been started for this application.");
        }
    }

    private processConfig(config: Glue42WebPlatform.Config = {}): void {
        // if corePlus is activated, then the config was already decoded
        const verifiedConfig = config.corePlus ? config : platformConfigDecoder.runWithException(config);

        this.validatePlugins(verifiedConfig);

        this.platformConfig = deepMerge<InternalPlatformConfig>(defaultPlatformConfig, verifiedConfig as any);

        let systemSettings = this.session.getSystemSettings();

        if (!systemSettings) {
            systemSettings = {
                systemInstanceId: nanoid(),
                ctxTrackInstanceId: nanoid()
            };

            this.session.saveSystemSettings(systemSettings);
        }

        this.platformConfig.workspacesFrameCache = typeof verifiedConfig.workspaces?.frameCache === "boolean" ? verifiedConfig.workspaces?.frameCache : true;

        // deep merge deletes the promise object when merging, probably due to some cyclical references 
        this.transferPromiseObjects(verifiedConfig);

        const glue42core = {
            isPlatformFrame: !!verifiedConfig.workspaces?.isFrame,
            initAsEmptyFrame: !!verifiedConfig.workspaces?.initAsEmpty,
            workspacesFrameCache: this.platformConfig.workspacesFrameCache,
            platformStarted: true,
            environment: Object.assign({}, this.platformConfig.environment, { extension: undefined }),
            communicationId: systemSettings.systemInstanceId,
            workspaces: {
                frameCache: this.platformConfig.workspacesFrameCache,
                isPlatform: !!verifiedConfig.workspaces?.isFrame,
                initAsEmpty: !!verifiedConfig.workspaces?.initAsEmpty
            }
        };

        (window as any).glue42core = glue42core;
    }

    private transferPromiseObjects(verifiedConfig: Glue42WebPlatform.Config): void {
        if (verifiedConfig.serviceWorker?.registrationPromise) {
            (this.platformConfig.serviceWorker as Glue42WebPlatform.ServiceWorker.Config).registrationPromise = verifiedConfig.serviceWorker.registrationPromise;
        }

        if (verifiedConfig.plugins && verifiedConfig.plugins.definitions.length) {
            const definitions = verifiedConfig.plugins.definitions;

            definitions.forEach((def) => {
                const found = this.platformConfig.plugins?.definitions.find((savedDef) => savedDef.name === def.name);

                if (found) {
                    found.config = def.config;
                }
            });
        }
    }

    private validatePlugins(verifiedConfig: Glue42WebPlatform.Config): void {

        if (verifiedConfig.plugins?.definitions) {

            const badDefinitions = verifiedConfig.plugins.definitions.reduce<Array<{ name: string; startType: string }>>((soFar, definition) => {
                const startType = typeof definition.start;
                const name = definition.name;

                if (startType !== "function") {
                    soFar.push({ name, startType });
                }

                return soFar;
            }, []);

            if (badDefinitions.length) {
                const errorStack = badDefinitions
                    .map((def) => `The start function for plugin ${def.name} was expected to be of type function, but was provided: ${def.startType}`)
                    .join("\n");
                throw new Error(errorStack);
            }
        }
    }
}
