import { Context, Listener, ContextMetadata, ContextHandler } from "@finos/fdc3";
import { isValidNonEmptyObject } from "../shared/utils";
import { AddIntentListenerRequest, Application, ChannelContext, Glue42, SystemMethodEventArgument, GlueValidator, Instance, GlueIntent, IntentContext, IntentFilter, GlueIntentRequest, IntentResult, ServerInstance, InteropMethodFilter, InteropMethod, UnsubscribeFunction, InvocationResult, ContextListenerInvokedArgument, ServerMethodFilter, Logger, didCallbackReplayed, GDWindow } from "../types/glue42Types";
import { ChannelsParser } from "../channels/parser";
import { promisePlus } from "../shared/utils";
import { defaultGlue42APIs } from "../shared/constants";
import { Glue42FDC3SystemMethod } from "../channels/privateChannelConstants";
import { ContextListenerResponseDecoder, SystemMethodInvocationArgumentDecoder } from "../shared/decoder";
import { glueChannelNamePrefix } from "../shared/constants";

export class GlueController {
    private glue!: Glue42;
    private _logger!: Logger;

    private glueInitPromise!: Promise<void>;

    private resolveGluePromise!: (value: void | PromiseLike<void>) => void;
    private rejectGluePromise!: (reason?: any) => void;
    private defaultGluePromiseTimeout = 120000;

    constructor(private readonly channelsParser: ChannelsParser) { }

    public get gluePromise(): Promise<void> {
        return this.glueInitPromise.then(this.initializeLogger.bind(this));
    }

    public initialize(glue: Glue42): void {
        this.glue = glue;

        this.resolveGluePromise();
    }

    public initializeFailed(reason: any) {
        this.rejectGluePromise(reason);
    }

    public createGluePromise(): void {
        this.glueInitPromise = promisePlus<void>(() => {
            return new Promise((resolve, reject) => {
                this.resolveGluePromise = resolve;
                this.rejectGluePromise = reject;
            });
        }, this.defaultGluePromiseTimeout, `Timeout of ${this.defaultGluePromiseTimeout}ms waiting for Glue to initialize`);
    }

    public get logger(): Logger {
        return this._logger;
    }

    public validateGlue(glue: any): GlueValidator {
        if (typeof glue !== "object" || Array.isArray(glue)) {
            return { isValid: false, error: { message: "Glue is not a valid object" } };
        }

        const apisToValidate = Object.keys(glue);

        const missingApis = defaultGlue42APIs.filter((api: string) => !apisToValidate.includes(api));

        if (missingApis.length) {
            return { isValid: false, error: { message: `Fdc3 cannot initialize correctly - Glue is missing the following ${missingApis.length > 1 ? "properties" : "property"}: ${missingApis.join(", ")}` } };
        }

        return { isValid: true };
    }

    public interopInstance(): ServerInstance {
        return this.glue.interop.instance;
    }

    public getApplication(name: string): Application {
        return this.glue.appManager.application(name);
    }

    public getApplicationInstances(appName: string): Instance[] {
        return this.glue.appManager.instances().filter(inst => inst.application.name === appName);
    }

    public getAppInstanceById(id: string): Instance | undefined {
        return this.glue.appManager.instances().find(inst => inst.id === id);
    }

    public async findIntents(intentFilter: IntentFilter): Promise<GlueIntent[]> {
        return this.glue.intents.find(intentFilter);
    }

    public async raiseIntent(request: GlueIntentRequest): Promise<IntentResult> {
        return this.glue.intents.raise(request);
    }

    public addIntentListener(intent: string | AddIntentListenerRequest, handler: (context: IntentContext) => any): Listener {
        const registerMethodExists = this.glue.intents.register; // check is needed for backwards compatibility

        return registerMethodExists
            ? this.glue.intents.register!(intent, handler)
            : this.glue.intents.addIntentListener(intent, handler);
    }

    public getAllContexts(): string[] {
        return this.glue.contexts.all();
    }

    public async getContext(contextId: string): Promise<any> {
        return this.glue.contexts.get(contextId);
    }

    public async updateContext(contextId: string, data: any): Promise<void> {
        return this.glue.contexts.update(contextId, data);
    }

    public async updateContextWithLatestFdc3Type(contextId: string, context: Context): Promise<void> {
        const prevContextData = await this.getContext(contextId);
    
        if (!isValidNonEmptyObject(prevContextData)) {
            return this.updateContext(contextId, {
                data: this.channelsParser.parseFDC3ContextToGlueContexts(context),
                latest_fdc3_type: this.channelsParser.mapFDC3TypeToChannelsDelimiter(context.type)
            });
        }
    
        return this.updateContext(contextId, {
            ...prevContextData,
            data: { ...prevContextData.data, ...this.channelsParser.parseFDC3ContextToGlueContexts(context) }, 
            latest_fdc3_type: this.channelsParser.mapFDC3TypeToChannelsDelimiter(context.type)
        });
    }

    public async channelsUpdate(channelId: string, context: Context): Promise<void> {
        const parsedData = this.channelsParser.parseFDC3ContextToGlueContexts(context);

        return this.glue.channels.publish(parsedData, channelId);
    }

    public async joinChannel(channelId: string): Promise<void> {
        return this.glue.channels.join(channelId);
    }

    public async leaveChannel(): Promise<void> {
        return this.glue.channels.leave();
    }

    public getCurrentChannel(): string {
        return this.glue.channels.my();
    }

    public setOnChannelChanged(callback: (channelId: string) => void): () => void {
        return this.glue.channels.changed(callback);
    }

    public async getAllChannels(): Promise<string[]> {
        return this.glue.channels.all();
    }

    public async listAllChannels(): Promise<ChannelContext[]> {
        return this.glue.channels.list();
    }

    public async getChannel(channelId: string): Promise<ChannelContext> {
        return this.glue.channels.get(channelId);
    }

    public getMyWindow(): GDWindow | undefined {
        const win = this.glue.windows.my();

        return isValidNonEmptyObject(win) ? win : undefined;
    }

    public getMyInteropInstanceId(): string {
        return this.glue.interop.instance.instance;
    }

    public getGlueVersion(): string | undefined {
        return this.glue?.version;
    }

    public registerOnInstanceStopped(cb: (instance: Instance) => void | Promise<void>): UnsubscribeFunction {
        return this.glue.appManager.onInstanceStopped(cb);
    }

    public async invokeMethod(methodName: string, instance: string, argumentObj: ContextListenerInvokedArgument): Promise<any> {
        const args = ContextListenerResponseDecoder.runWithException(argumentObj);

        return this.glue.interop.invoke(methodName, args, { instance });
    }

    public async unregisterMethod(methodName: string): Promise<void> {
        return this.glue.interop.unregister(methodName);
    }

    public invokeSystemMethod<T>(argumentObj: SystemMethodEventArgument): Promise<InvocationResult<T>> {
        const args = SystemMethodInvocationArgumentDecoder.runWithException(argumentObj);

        const target = args.payload.clientId;

        return this.glue.interop.invoke(Glue42FDC3SystemMethod, args, { instance: target });
    }

    public registerMethod<T = any, R = any>(name: string, handler: (args: T, caller: ServerInstance) => void | R | Promise<R>): Promise<void> {
        return this.glue.interop.register(name, handler);
    }

    public getInteropMethods(filter?: string | InteropMethodFilter): InteropMethod[] {
        return this.glue.interop.methods(filter);
    }

    public channelsSubscribe(callback: (data: any, metadata?: ContextMetadata) => void) {
        const didReplay: didCallbackReplayed = { replayed: false };

        return this.glue.channels.subscribe(async(_, context: ChannelContext, updaterId: string) => {
            if (this.isUpdateFromMe(updaterId)) {
                return;
            }

            const contextData = await this.glue.contexts.get(`${glueChannelNamePrefix}${context.name}`);

            if (!contextData.latest_fdc3_type) {
                return;
            }

            if (!didReplay.replayed) {
                this.invokePreviouslyBroadcastedData(callback, contextData, this.getContextMetadata(updaterId));

                didReplay.replayed = true;
                
                return;
            }

            this.parseDataAndInvokeSubscribeCallback(callback, contextData, this.getContextMetadata(updaterId));
        });
    }

    public contextsSubscribe(contextName: string, callback: (data: any, metadata?: ContextMetadata) => void): Promise<UnsubscribeFunction> {
        const didReplay: didCallbackReplayed = { replayed: false };

        return this.glue.contexts.subscribe(contextName, (contextData: any, addedData: any, removed: string[], _, extraData?: { updaterId?: string }) => {
            if (this.isUpdateFromMe(extraData?.updaterId)) {
                return;
            }

            if (!this.checkIfAppChannelShouldInvokeInitialReplay(didReplay, contextData)) {
                return;
            }

            this.parseDataAndInvokeSubscribeCallback(callback, contextData, this.getContextMetadata(extraData?.updaterId));
        });
    }

    public getInteropServers(methodFilter?: ServerMethodFilter) {
        return this.glue.interop.servers(methodFilter);
    }

    public initSubLogger(name: string): Logger{
        return this.logger.subLogger(name);
    }

    private invokePreviouslyBroadcastedData(callback: ContextHandler, contextData: any, metadata?: ContextMetadata): void {
        Object.entries(contextData.data).forEach(([key, value]: [string, any]) => {
            if (!this.channelsParser.isFdc3DataKey(key)) {
                return;
            }

            const parsedData = { type: this.channelsParser.revertGlueParsedTypeToInitialFDC3Type(key), ...value };

            callback(parsedData, metadata);
        });
    }

    private isUpdateFromMe(updaterId?: string): boolean {
        return this.glue.interop.instance.peerId === updaterId;
    }

    private getContextMetadata(updaterId?: string): ContextMetadata | undefined {
        const instanceServer = this.glue.interop.servers().find((server: ServerInstance) => server.peerId === updaterId);

        if (!instanceServer) {
            return;
        }

        return {
            source: {
                appId: instanceServer.applicationName,
                instanceId: instanceServer.instance
            }
        };
    }

    private initializeLogger() {
        this._logger = this.glue.logger;
    }

    private parseDataAndInvokeSubscribeCallback(callback: (data: any, metadata?: ContextMetadata) => void, data: any, metadata?: ContextMetadata) {
        const parsedData = this.channelsParser.parseContextsDataToInitialFDC3Data(data);

        callback(parsedData, metadata);
    }

    private checkIfAppChannelShouldInvokeInitialReplay(didReplay: didCallbackReplayed, contextData: any): boolean {
        /* Skip initial replays on App Channels */
        if (!didReplay.replayed) {
            didReplay.replayed = true;

            return false;
        }

        /* broadcasted data on app channels is passed as { data: any, latest_fdc3_type: string } */
        if (!contextData.latest_fdc3_type) {
            return false;
        }

        return true;
    }
}
