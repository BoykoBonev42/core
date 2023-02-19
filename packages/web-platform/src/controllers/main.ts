/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "@glue42/web";
import { UnsubscribeFunction } from "callback-registry";
import { CoreClientData, InternalPlatformConfig } from "../common/types";
import { GlueController } from "./glue";
import { PortsBridge } from "../connection/portsBridge";
import { WindowsStateController } from "./state";
import logger from "../shared/logger";
import { generate } from "shortid";
import { Glue42WebPlatform } from "../../platform";
import { ServiceWorkerController } from "./serviceWorker";
import { PreferredConnectionController } from "../connection/preferred";
import { Glue42Core } from "@glue42/core";
import { InterceptionController } from "./interception";
import { PluginsController } from "./plugins";
import { DomainsController } from "./domains";

export class PlatformController {

    private _platformApi!: Glue42WebPlatform.API;

    constructor(
        private readonly domainsController: DomainsController,
        private readonly glueController: GlueController,
        private readonly portsBridge: PortsBridge,
        private readonly stateController: WindowsStateController,
        private readonly serviceWorkerController: ServiceWorkerController,
        private readonly preferredConnectionController: PreferredConnectionController,
        private readonly interceptionController: InterceptionController,
        private readonly pluginsController: PluginsController
    ) {}

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("main.web.platform");
    }

    public get ctxTrackingGlue(): Glue42Core.GlueCore | undefined {
        return this.glueController.contextsTrackingGlue;
    }

    public get systemGlue(): Glue42Core.GlueCore | undefined {
        return this.glueController.systemGlue;
    }

    public get platformApi(): Glue42WebPlatform.API {
        return this._platformApi;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async start(config: InternalPlatformConfig): Promise<void> {
        await this.portsBridge.configure(config);

        this.portsBridge.onClientUnloaded(this.handleClientUnloaded.bind(this));

        await this.glueController.start(config);

        await Promise.all([
            this.glueController.createPlatformSystemMethod(this.handleClientMessage.bind(this)),
            this.glueController.createPlatformSystemStream()
        ]);

        this.stateController.start();

        await this.domainsController.startAllDomains(config);

        await this.glueController.initClientGlue(config?.glue, config?.glueFactory, config?.workspaces?.isFrame);

        await this.serviceWorkerController.connect(config);

        this._platformApi = this.buildPlatformApi(config);

        await this.pluginsController.startCorePlus(config);

        await this.pluginsController.start({
            platformConfig: config,
            plugins: config.plugins?.definitions,
            api: this.platformApi,
            handlePluginMessage: this.handlePluginMessage.bind(this)
        });

        if (config.connection.preferred) {
            await this.preferredConnectionController.start(config.connection.preferred);
        }

        this.serviceWorkerController.notifyReady();

        this.portsBridge.start();
    }

    public getClientGlue(): Glue42Web.API {
        return this.glueController.clientGlue;
    }

    private handleClientMessage(args: Glue42WebPlatform.ControlMessage, caller: Glue42Web.Interop.Instance, success: (args?: Glue42WebPlatform.ControlMessage) => void, error: (error?: string | object) => void): void {
        this.processControllerCommand(args, "client", caller.instance as string)
            .then((result) => success(result))
            .catch((err) => error(err));
    }

    private async handlePluginMessage(args: Glue42WebPlatform.Plugins.BaseControlMessage, pluginName: string): Promise<any> {
        return this.processControllerCommand(args, "plugin", pluginName);
    }

    private async processControllerCommand(args: Glue42WebPlatform.Plugins.BaseControlMessage, callerType: "plugin" | "client", callerId: string): Promise<any> {
        try {
            this.domainsController.validateDomain(args.domain);
        } catch (error) {
            const errString = JSON.stringify(error);

            this.logger?.trace(`rejecting execution of a command issued by a ${callerType}: ${callerId}, because of a domain validation error: ${errString}`);

            throw new Error(`Cannot execute this platform control, because of domain validation error: ${errString}`);
        }

        const controlMessage: Glue42WebPlatform.ControlMessage = Object.assign({}, args, {
            commandId: generate(),
            callerId, callerType
        });

        this.logger?.trace(`[${controlMessage.commandId}] received a command for a valid domain: ${args.domain} from ${callerType}: ${callerId}, forwarding to the appropriate controller`);

        try {
            const result = await this.executeCommand(controlMessage);

            this.logger?.trace(`[${controlMessage.commandId}] this command was executed successfully, sending the result to the caller.`);

            return result;
        } catch (error: any) {
            const stringError = typeof error === "string" ?
                error :
                error.message ? JSON.stringify(error.message) :
                    JSON.stringify(error);

            this.logger?.trace(`[${controlMessage.commandId}] this command's execution was rejected, reason: ${stringError}`);

            throw new Error(`The platform rejected operation ${controlMessage.operation} for domain: ${args.domain} with reason: ${stringError}`);
        }
    }

    private handleClientUnloaded(client: CoreClientData): void {
        this.domainsController.notifyDomainsClientUnloaded(client);
    }

    private executeCommand(controlMessage: Glue42WebPlatform.ControlMessage): Promise<any> {
        const interceptor = this.interceptionController.getOperationInterceptor({ domain: controlMessage.domain, operation: controlMessage.operation });

        if (interceptor && !controlMessage.settings?.skipInterception) {
            this.logger?.trace(`[${controlMessage.commandId}] The operation is being intercepted and executed by: ${interceptor.name}`);

            return interceptor.intercept(controlMessage);
        }

        return this.domainsController.executeControlMessage(controlMessage);
    }

    private buildPlatformApi(config: InternalPlatformConfig): Glue42WebPlatform.API {
        return {
            version: this.glueController.platformVersion,
            corePlus: config.corePlus ? { version: config.corePlus.version } : undefined,
            contextTrackGlue: this.ctxTrackingGlue,
            systemGlue: this.systemGlue,
            connectExtClient: (client: any, port: any) => {
                return this.connectExtClient(client, port);
            },
            onSystemReconnect: (callback: () => void): UnsubscribeFunction => {
                return this.onSystemReconnect(callback);
            }
        } as Glue42WebPlatform.API;
    }

    private async connectExtClient(client: any, port: any): Promise<void> {
        await this.portsBridge.handleExtConnectionRequest(client, port);
    }

    private onSystemReconnect(callback: () => void): UnsubscribeFunction {
        return this.preferredConnectionController.onReconnect(callback);
    }
}
