/* eslint-disable @typescript-eslint/no-explicit-any */
import GlueCore, { Glue42Core } from "@glue42/core";
import GlueWeb, { Glue42Web, Glue42WebFactoryFunction } from "@glue42/web";
import { GlueClientControlName, GlueWebPlatformControlName, GlueWebPlatformStreamName, GlueWebPlatformWorkspacesStreamName, GlueWorkspaceFrameClientControlName, GlueWorkspacesEventsReceiverName } from "../common/constants";
import { BridgeOperation, InternalPlatformConfig, LibDomains, SessionSystemSettings } from "../common/types";
import { PortsBridge } from "../connection/portsBridge";
import { generate } from "shortid";
import { SessionStorageController } from "./session";
import logger from "../shared/logger";
import { PromisePlus } from "../shared/promisePlus";
import { waitFor } from "../shared/utils";
import { UnsubscribeFunction } from "callback-registry";
import { FrameSessionData } from "../libs/workspaces/types";
import { Glue42WebPlatform } from "../../platform";
import { version } from "../../package.json";

export class GlueController {
    private _config!: InternalPlatformConfig;
    private _systemGlue!: Glue42Core.GlueCore;
    private _contextsTrackingGlue: Glue42Core.GlueCore | undefined;
    private _clientGlue!: Glue42Web.API;
    private _systemStream: Glue42Core.Interop.Stream | undefined;
    private _workspacesStream: Glue42Core.Interop.Stream | undefined;
    private _platformClientWindowId!: string;
    private _systemSettings!: SessionSystemSettings;

    constructor(
        private readonly portsBridge: PortsBridge,
        private readonly sessionStorage: SessionStorageController
    ) {}

    public get platformVersion(): string {
        return version;
    }

    public get clientGlue(): Glue42Web.API {
        return this._clientGlue;
    }

    public get contextsTrackingGlue(): Glue42Core.GlueCore | undefined {
        return this._contextsTrackingGlue;
    }

    public get systemGlue(): Glue42Core.GlueCore {
        return this._systemGlue;
    }

    public get platformWindowId(): string {
        return this._platformClientWindowId.slice();
    }

    public async start(config: InternalPlatformConfig): Promise<void> {
        this._config = config;

        const systemSettings = this.sessionStorage.getSystemSettings();

        if (!systemSettings) {
            throw new Error("Cannot initiate the glue controller, because the system settings are not defined");
        }

        this._systemSettings = systemSettings;

        this._systemGlue = await this.initSystemGlue(config.glue);

        logger.setLogger(this._systemGlue.logger);

        this._contextsTrackingGlue = await this.setUpCtxTracking(config);
    }

    public async initClientGlue(config?: Glue42Web.Config, factory?: Glue42WebFactoryFunction, isWorkspaceFrame?: boolean, platformApi?: Glue42WebPlatform.API): Promise<Glue42Web.API> {
        const port = await this.portsBridge.createInternalClient();

        this.registerClientWindow(isWorkspaceFrame);

        const webConfig = {
            application: "Platform",
            gateway: { webPlatform: { port, windowId: this.platformWindowId } }
        } as Glue42Web.Config;

        const c = Object.assign({}, config, webConfig);

        this._clientGlue = factory ? await factory(c) : await GlueWeb(c) as any;

        this._clientGlue.webPlatform = platformApi;

        return this._clientGlue;
    }

    public async createPlatformSystemMethod(handler: (args: Glue42WebPlatform.ControlMessage, caller: Glue42Web.Interop.Instance, success: (args?: Glue42WebPlatform.ControlMessage) => void, error: (error?: string | object) => void) => void): Promise<void> {
        await this.createMethodAsync(GlueWebPlatformControlName, handler);
    }

    public async createPlatformSystemStream(): Promise<void> {
        this._systemStream = await this.createStream(GlueWebPlatformStreamName);
    }

    public async createWorkspacesStream(): Promise<void> {
        this._workspacesStream = await this.createStream(GlueWebPlatformWorkspacesStreamName);
    }

    public async createWorkspacesEventsReceiver(callback: (data: any) => void): Promise<void> {
        await this._systemGlue.interop.register(GlueWorkspacesEventsReceiverName, (args) => callback(args));
    }

    public pushSystemMessage(domain: LibDomains, operation: string, data: any): void {
        if (!this._systemStream) {
            throw new Error(`Cannot push data to domain: ${domain}, because the system stream is not created`);
        }

        this._systemStream.push({ domain, operation, data });
    }

    public pushWorkspacesMessage(data: any): void {
        if (!this._workspacesStream) {
            throw new Error("Cannot push data to domain: workspaces, because the workspaces stream is not created");
        }

        this._workspacesStream.push({ data });
    }

    public async callFrame<OutBound extends object, InBound>(operationDefinition: BridgeOperation, operationArguments: OutBound, windowId: string): Promise<InBound> {
        const messageData = { operation: operationDefinition.name, operationArguments };

        const baseErrorMessage = `Internal Platform->Frame Communication Error. Attempted calling workspace frame: ${windowId} for operation ${operationDefinition.name} `;

        if (operationDefinition.dataDecoder) {
            const decodeResult = operationDefinition.dataDecoder.run(messageData.operationArguments);

            if (!decodeResult.ok) {
                throw new Error(`${baseErrorMessage} OutBound validation failed: ${JSON.stringify(decodeResult.error)}`);
            }
        }

        const methodName = GlueWorkspaceFrameClientControlName;

        const result = await this.transmitMessage<InBound>(methodName, messageData, baseErrorMessage, { windowId }, { methodResponseTimeoutMs: 30000, waitTimeoutMs: 30000 });

        if (operationDefinition.resultDecoder) {
            const decodeResult = operationDefinition.resultDecoder.run(result);

            if (!decodeResult.ok) {
                throw new Error(`${baseErrorMessage} Result validation failed: ${JSON.stringify(decodeResult.error)}`);
            }
        }

        return result;
    }

    public async sendShutDownSignals(): Promise<void> {

        const allNonMeWindows = this.clientGlue.windows.list().filter((webWindow) => webWindow.id !== this.platformWindowId);

        await Promise.all(allNonMeWindows.map((webWindow) => webWindow.close()));

        const messageData = {
            domain: "system",
            operation: "platformShutdown"
        };

        const baseErrorMessage = `Internal Platform-> ${messageData.domain} Domain Communication Error. Attempted sending shutdown signal to all clients.`;

        await this.transmitMessage(GlueClientControlName, messageData, baseErrorMessage, "all", { methodResponseTimeoutMs: 30000, waitTimeoutMs: 30000 });

    }

    public shutdown(): void {
        this.systemGlue.connection.logout();
        this.contextsTrackingGlue?.connection.logout();
        this.clientGlue.connection.logout();
    }

    public async callWindow<OutBound extends object, InBound>(domain: LibDomains, operationDefinition: BridgeOperation, data: OutBound, target: Glue42Core.Interop.Instance): Promise<InBound> {

        const operation = operationDefinition.name;

        const messageData = { domain, operation, data };

        const baseErrorMessage = `Internal Platform-> ${domain} Domain Communication Error. Attempted calling client window: ${JSON.stringify(target)} for operation ${operation}. `;

        if (operationDefinition.dataDecoder) {
            const decodeResult = operationDefinition.dataDecoder.run(messageData.data);

            if (!decodeResult.ok) {
                throw new Error(`${baseErrorMessage} OutBound validation failed: ${JSON.stringify(decodeResult.error)}`);
            }
        }

        const result = await this.transmitMessage<InBound>(GlueClientControlName, messageData, baseErrorMessage, target, { methodResponseTimeoutMs: 30000, waitTimeoutMs: 30000 });

        if (operationDefinition.resultDecoder) {
            const decodeResult = operationDefinition.resultDecoder.run(result);

            if (!decodeResult.ok) {
                throw new Error(`${baseErrorMessage} Result validation failed when calling window: ${JSON.stringify(target)} for operation ${operation}: ${JSON.stringify(decodeResult.error)}`);
            }
        }

        return result;
    }

    public setStartContext(windowId: string, context: any, type: "workspace" | "instance" | "window"): Promise<void> {
        return PromisePlus((resolve, reject) => {
            let unsub: () => void;

            const ready = waitFor(2, () => {
                resolve();
                unsub();
            });
            const key = `___${type}___${windowId}`;

            const waitContextDestroy = this._clientGlue.contexts.all().some((ctx) => ctx === key) ?
                this.waitContextDestroy(key) :
                Promise.resolve();

            waitContextDestroy
                .then(() => this._clientGlue.contexts.subscribe(key, ready))
                .then((un) => {
                    unsub = un;
                    return this._systemGlue.contexts.set(key, context);
                })
                .then(ready)
                .catch(reject);
        }, 10000, `Timed out waiting to set the ${type} context for: ${windowId}`);
    }

    public waitContextDestroy(contextName: string): Promise<void> {
        return new Promise((resolve, reject) => {

            let contextChecks = 0;

            const interval = setInterval(() => {
                const contextExists = this._clientGlue.contexts.all().some((ctx) => ctx === contextName);
                ++contextChecks;

                if (!contextExists) {
                    clearInterval(interval);
                    resolve();
                    return;
                }

                if (contextChecks === 50) {
                    clearInterval(interval);
                    reject(`Timed out waiting for context: ${contextName} to disappear`);
                }

            }, 100);

        });
    }

    public async clearContext(windowId: string, type: "workspace" | "instance" | "window"): Promise<void> {
        const key = `___${type}___${windowId}`;

        const keyExist = this._systemGlue.contexts.all().some((context) => context === key);

        if (keyExist) {
            await this._systemGlue.contexts.destroy(key);
        }

    }

    public async preserveAllWorkspaceWindowsContext(workspaceId: string): Promise<void> {
        const allWorkspaceClients = this.sessionStorage.pickWorkspaceClients((client) => client.workspaceId === workspaceId);

        for (const workspaceClient of allWorkspaceClients) {
            const clientCtx = await this._systemGlue.contexts.get(`___window___${workspaceClient.windowId}`);

            if (!clientCtx || (typeof clientCtx === "object" && !Object.keys(clientCtx).length)) {
                continue;
            }

            await this._systemGlue.contexts.set(`___window-hibernation___${workspaceClient.windowId}`, clientCtx);
        }
    }

    public async pullHibernatedContext(windowId: string): Promise<any> {
        const key = `___window-hibernation___${windowId}`;

        const keyExist = this._systemGlue.contexts.all().some((context) => context === key);

        if (!keyExist) {
            return;
        }
        const ctx = await this._systemGlue.contexts.get(key);

        await this._systemGlue.contexts.destroy(key);

        return ctx;
    }

    public getServers(): Glue42Web.Interop.Instance[] {
        return this._clientGlue.interop.servers();
    }

    public subscribeForServerAdded(callback: (server: Glue42Web.Interop.Instance) => void): UnsubscribeFunction {
        return this._clientGlue.interop.serverAdded(callback);
    }

    public subscribeForMethodAdded(callback: (method: Glue42Web.Interop.Method) => void): UnsubscribeFunction {
        return this._clientGlue.interop.methodAdded(callback);
    }

    public invokeMethod<T>(method: string | Glue42Web.Interop.MethodDefinition, argumentObj?: object, target?: Glue42Web.Interop.InstanceTarget, options?: Glue42Web.Interop.InvokeOptions, success?: Glue42Web.Interop.InvokeSuccessHandler<T>, error?: Glue42Web.Interop.InvokeErrorHandler): Promise<Glue42Web.Interop.InvocationResult<T>> {
        return this._clientGlue.interop.invoke(method, argumentObj, target, options, success, error);
    }

    public setContext(name: string, data: any): Promise<void> {
        return this._systemGlue.contexts.set(name, data);
    }

    public switchTransport(config: Glue42Core.Connection.TransportSwitchSettings, target: "client" | "system" | "contextsTrack"): Promise<{ success: boolean }> {

        if (target === "contextsTrack") {
            return this._contextsTrackingGlue ?
                this._contextsTrackingGlue.connection.switchTransport(config) :
                Promise.resolve({ success: true });
        }

        const glueToSwitch = target === "system" ? this._systemGlue : this._clientGlue;

        return glueToSwitch.connection.switchTransport(config);
    }

    public onDisconnected(callback: () => void): UnsubscribeFunction {
        return this._systemGlue.connection.disconnected(callback);
    }

    public getSystemGlueTransportName(): string {
        return (this._systemGlue as any).connection.transport.name();
    }

    private async initSystemGlue(config?: Glue42Web.Config): Promise<Glue42Core.GlueCore> {

        const port = await this.portsBridge.createInternalClient();

        const logLevel = config?.systemLogger?.level ?? "warn";

        return await GlueCore({
            application: "Platform-System",
            gateway: { webPlatform: { port } },
            logger: logLevel,
            identity: {
                instance: this._systemSettings.systemInstanceId
            }
        });
    }

    private async setUpCtxTracking(config: InternalPlatformConfig): Promise<Glue42Core.GlueCore | undefined> {
        if (this._config.connection.preferred) {
            return await this.initContextsTrackingGlue({
                reAnnounceKnownContexts: true,
                trackAllContexts: true
            }, config);
        }
    }

    private async initContextsTrackingGlue(contextsSettings: Glue42Core.ContextsConfig, config: InternalPlatformConfig): Promise<Glue42Core.GlueCore> {

        const port = await this.portsBridge.createInternalClient();

        return await GlueCore({
            application: "Platform-Contexts-Track",
            gateway: { webPlatform: { port } },
            logger: config?.glue?.systemLogger?.level ?? "warn",
            contexts: contextsSettings,
            identity: {
                instance: this._systemSettings.ctxTrackInstanceId
            }
        });
    }

    private registerClientWindow(isWorkspaceFrame?: boolean): void {
        if (isWorkspaceFrame) {
            const platformFrame = this.sessionStorage.getPlatformFrame();

            this._platformClientWindowId = platformFrame ? platformFrame.windowId :
                window.name ? window.name : `g42-${generate()}`;

            if (!platformFrame) {
                const platformFrameData: FrameSessionData = { windowId: this.platformWindowId, active: true, isPlatform: true };
                this.sessionStorage.saveFrameData(platformFrameData);
            }

            window.name = this.platformWindowId;

            return;
        }

        const platformWindowData = this.sessionStorage.getWindowDataByName("Platform");

        this._platformClientWindowId = platformWindowData ? platformWindowData.windowId :
            window.name ? window.name : `g42-${generate()}`;

        if (!platformWindowData) {
            this.sessionStorage.saveWindowData({ name: "Platform", windowId: this.platformWindowId });
        }

        window.name = this.platformWindowId;
    }

    private async createMethodAsync(name: string, handler: (args: any, caller: Glue42Web.Interop.Instance, success: (args?: any) => void, error: (error?: string | object) => void) => void): Promise<void> {
        await this._systemGlue.interop.registerAsync(name, handler);
    }

    private async createStream(name: string): Promise<Glue42Web.Interop.Stream> {
        return this._systemGlue.interop.createStream(name);
    }

    private async transmitMessage<T>(methodName: string, messageData: any, baseErrorMessage: string, target?: "best" | "all" | Glue42Core.Interop.Instance, options?: Glue42Core.Interop.InvokeOptions): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let invocationResult: Glue42Core.Interop.InvocationResult<T>;

        try {
            invocationResult = await this._systemGlue.interop.invoke<T>(methodName, messageData, target, options);

            if (!invocationResult) {
                throw new Error(`${baseErrorMessage} Received unsupported result from the client - empty result`);
            }

            if (!Array.isArray(invocationResult.all_return_values) || invocationResult.all_return_values.length === 0) {
                throw new Error(`${baseErrorMessage} Received unsupported result from the client - empty values collection`);
            }
        } catch (error: any) {
            if (error && error.all_errors && error.all_errors.length) {
                // IMPORTANT: Do NOT change the `Inner message:` string, because it is used by other programs to extract the inner message of a communication error
                const invocationErrorMessage = error.all_errors[0].message;
                throw new Error(`${baseErrorMessage} -> Inner message: ${invocationErrorMessage}`);

            }
            // IMPORTANT: Do NOT change the `Inner message:` string, because it is used by other programs to extract the inner message of a communication error
            throw new Error(`${baseErrorMessage} -> Inner message: ${error.message}`);
        }

        return invocationResult.all_return_values[0].returned;
    }
}
