import { Context, OpenError, ResolveError, AppIdentifier, AppMetadata, ImplementationMetadata } from "@finos/fdc3";
import { Application, Instance, Logger, ServerInstance } from "../types/glue42Types";
import { GlueController } from "./glue";
import { version } from "../../package.json";
import { responseInteropMethodPrefix } from "../shared/constants";
import { nanoid } from "nanoid";
import { AppIdentifierConfig, CommandIdConfig, ContextListenerInvokedPromise, OpenConfig } from "../types/fdc3Types";
import { promisePlus } from "../shared/utils";
import { ContextListenerResponseDecoder } from "../shared/decoder";

export class ApplicationsController {
    private _logger?: Logger;

    private readonly defaultContextListenerInvokedPromiseTimeout = 60000;

    private contextListenerInvokedPromises: { [instanceId: string]: ContextListenerInvokedPromise } = {};

    constructor(private readonly glueController: GlueController) {}

    public get logger(): Logger {
        if (!this._logger) {
            this._logger = this.glueController.initSubLogger("fdc3.application.controller");
        }

        return this._logger;
    }

    // backwards compatibility for deprecated fdc3.open(TargetApp)
    public async open({ commandId, target, context }: OpenConfig): Promise<AppIdentifier> {
        await this.glueController.gluePromise;

        this.logger.log(`[${commandId}] - open() invoked with target ${target} ${context ? `and contextType ${context.type}` : ""}`);

        const name = typeof target === "object" ? target.appId : target;

        const app = this.glueController.getApplication(name);

        if (!app) {
            throw new Error(`${OpenError.AppNotFound} - Cannot find targeted ${name} application`);
        }

        if (context) {
            this.logger.info(`[${commandId}] - opening app ${app} with startup context`);

            return this.openAppWithContext(app, context);
        }

        try {
            this.logger.info(`[${commandId}] - opening app ${app}`);

            const glueInst = await app.start();

            this.logger.info(`[${commandId}] - instance with id ${glueInst.id} started`);

            return this.parseGlueInstToAppIdentifier(glueInst);
        } catch (error) {
            throw new Error(`${OpenError.ErrorOnLaunch} - Error: ${error}`);
        }
    }

    public async findInstances({ commandId, appIdentifier }: AppIdentifierConfig): Promise<AppIdentifier[]> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - findInstances() invoked with appIdentifier ${appIdentifier}`);

        const { appId } = appIdentifier;

        const app = this.glueController.getApplication(appId);

        if (!app) {
            throw new Error(`${ResolveError.NoAppsFound} - App with appId: ${appId} does not exist`);
        }

        const glueInstances = this.glueController.getApplicationInstances(appId);

        const fdc3Instances = glueInstances.map(glueInst => this.parseGlueInstToAppIdentifier(glueInst));

        this.logger.info(`[${commandId}] - ids of opened instances for appIdentifier ${appIdentifier}: ${JSON.stringify(fdc3Instances.map(inst => inst.instanceId))}`);

        return fdc3Instances;
    }

    public async getAppMetadata({ commandId, appIdentifier }: AppIdentifierConfig): Promise<AppMetadata> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - getAppMetadata() invoked with appIdentifier ${appIdentifier}`);

        const { appId, instanceId } = appIdentifier;

        const app = this.glueController.getApplication(appId);

        if (!app) {
            throw new Error(`${OpenError.AppNotFound} - cannot find application with appId: ${appId}`);
        }

        if (!instanceId) {
            this.logger.info(`[${commandId}] - no opened instances found. Parsing app ${app}`);

            return this.parseGlueAppToAppMetadata(app);
        }

        const instance = this.glueController.getAppInstanceById(instanceId);

        const appMetadata = this.parseGlueAppToAppMetadata(app, instance);

        this.logger.info(`[${commandId}] - found app metadata: ${appMetadata}`);

        return appMetadata;
    }

    public async getInfo({ commandId }: CommandIdConfig): Promise<ImplementationMetadata> {
        await this.glueController.gluePromise;

        this.logger.info(`${commandId} - getInfo() invoked`);

        const appMetadata = await this.getCurrentAppMetadata();

        return {
            provider: "Glue42",
            providerVersion: version,
            fdc3Version: "2.0.0",
            optionalFeatures: {
                OriginatingAppMetadata: true,
                UserChannelMembershipAPIs: true
            },
            appMetadata
        };
    }

    private getCurrentAppMetadata(): Promise<AppMetadata> {
        const myInstance = this.glueController.interopInstance();

        return Promise.resolve({
            appId: myInstance.applicationName,
            instanceId: myInstance.instance
        });
    }

    private parseGlueInstToAppIdentifier(glueInst: Instance): AppIdentifier {
        return {
            appId: glueInst.application.name,
            instanceId: glueInst.id
        };
    }

    private async parseGlueAppToAppMetadata(app: Application, instance?: Instance): Promise<AppMetadata> {
        const appMetadata = await this.getBaseGlueAppToAppMetadata(app);

        if (!instance) {
            return appMetadata;
        }

        return this.addInstanceMetadataToAppMetadata(appMetadata, instance);
    }

    private async getBaseGlueAppToAppMetadata(app: Application): Promise<AppMetadata> {
        const appConfiguration = (window as any).glue42gd
            ? await app.getConfiguration()
            : app.userProperties;

        const icon = (window as any).glue42gd
            ? (await app.getConfiguration()).icon
            : app.icon;
 
        return {
            appId: app.name,
            name: app.name,
            version: app.version,
            description: appConfiguration.description,
            title: app.title,
            icons: icon ? [{ src: icon }] : [],
            tooltip: appConfiguration.tooltip,
            screenshots: (window as any).glue42gd
                ? appConfiguration.customProperties.screenshots
                : appConfiguration.screenshots
        };
    }

    private addInstanceMetadataToAppMetadata(appMetadata: AppMetadata, instance: Instance): AppMetadata {
        return { ...appMetadata, instanceId: instance.id, instanceMetadata: instance.agm };
    }

    private async openAppWithContext(app: Application, context: Context): Promise<AppIdentifier> {
        const methodName = await this.registerContextListenerInteropMethod();

        const startContext = this.buildGlueStartContext(context, methodName);

        const glueInst = await app.start(startContext);

        this.createContextListenerResponsePromise(glueInst, methodName);

        try {
            await this.contextListenerInvokedPromises[glueInst.id].promise;

            await this.unregisterContextListenerPromise(glueInst.id);

            return this.parseGlueInstToAppIdentifier(glueInst);
        } catch (error) {
            await this.unregisterContextListenerPromise(glueInst.id);

            throw new Error(`${OpenError.AppTimeout} - ${error}`);
        }
    }

    private buildGlueStartContext(fdc3Context: Context, responseMethodName: string) {
        return {
            meta: {
                responseMethodName,
                windowId: this.glueController.getMyWindowId()
            },
            context: fdc3Context
        };
    }

    private async registerContextListenerInteropMethod(): Promise<string> {
        const methodName = this.buildInteropMethodName();

        await this.glueController.registerMethod(methodName, this.contextListenerResponseHandler.bind(this));

        return methodName;
    }

    private buildInteropMethodName(): string {
        return `${responseInteropMethodPrefix}.${nanoid()}`;
    }

    private createContextListenerResponsePromise(instance: Instance, methodName: string): void {
        let resolve: (arg: any) => void = () => { };
        let reject: (reason: string) => void = () => { };

        const promise = promisePlus(() => {
            return new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
        }, this.defaultContextListenerInvokedPromiseTimeout, `Timeout of ${this.defaultContextListenerInvokedPromiseTimeout}ms hit waiting for application with appId: ${instance.application.name} and instanceId: ${instance.id} to register context listener`);

        this.contextListenerInvokedPromises[instance.id] = { promise, resolve, reject, methodName };
    }

    private contextListenerResponseHandler(args: any, callerId: ServerInstance): void {
        const result = ContextListenerResponseDecoder.run(args);

        if (!result.ok) {
            const contextListenerPromise = this.contextListenerInvokedPromises[callerId.instance];

            if (!contextListenerPromise) { // ignore messages coming from other instances
                return;
            }

            contextListenerPromise.reject(`Method invoked with invalid argument - ${result.error.message}`);

            return;
        }

        const contextListenerPromise = this.contextListenerInvokedPromises[callerId.instance];

        if (!contextListenerPromise) { // ignore messages coming from other instances
            return;
        }

        contextListenerPromise.resolve();
    }

    private async unregisterContextListenerPromise(instanceId: string) {
        const { methodName } = this.contextListenerInvokedPromises[instanceId];

        await this.glueController.unregisterMethod(methodName);

        delete this.contextListenerInvokedPromises[instanceId];
    }
}