import { ChannelError, Context, Listener, Channel, ContextHandler, PrivateChannel } from "@finos/fdc3";
import { Instance, Logger, SystemMethodEventPayload, UnsubscribeFunction } from "../types/glue42Types";
import { GlueController } from "../controllers/glue";
import { ChannelsParser } from "./parser";
import { ChannelsStateStore } from "./stateStore";
import { ChannelsFactory } from "./factory";
import { parseContextHandler } from "./utils";
import { PrivateChannelEventMethods, PrivateChannelPrefix } from "./privateChannelConstants";
import { ChannelsCallbackRegistry } from "./callbackRegistry";
import { ChannelsPendingListenersStore } from "./pendingListenersStore";
import { ChannelTypes, fdc3ChannelNames } from "../shared/constants";
import { isEmptyObject } from "../shared/utils";
import { AddContextListenerConfig, AddPrivateChannelEventConfig, ChannelsConfig, GetContextForChannelConfig } from "../types/fdc3Types";

export class ChannelsController {
    private _logger?: Logger;

    private initDonePromise: Promise<void>;

    private invokeContextHandlerWithStartupContext = true;

    constructor(
        private readonly glueController: GlueController,
        private readonly channelsStateStore: ChannelsStateStore,
        private readonly channelsParser: ChannelsParser,
        private readonly channelsFactory: ChannelsFactory,
        private readonly channelsCallbackRegistry: ChannelsCallbackRegistry,
        private readonly channelsPendingListenersStore: ChannelsPendingListenersStore
    ) {
        this.initDonePromise = this.initialize();

        this.initDonePromise.catch(() => {});
    }

    public get logger(): Logger {
        if (!this._logger) {
            this._logger = this.glueController.initSubLogger("fdc3.channels.controller");
        }

        return this._logger;
    }

    public async addContextListener({ commandId, handler, contextType, channelId }: AddContextListenerConfig): Promise<Listener> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - addContextListener() invoked for contextType ${contextType} and channelId ${channelId}`);

        if (this.invokeContextHandlerWithStartupContext) {
            this.logger.info(`[${commandId}] - trying to invoke context handler with window context`);

            this.handleWindowContextOnOpening(commandId, handler, contextType);
        }

        const channelIdToSubscribeTo = channelId || this.channelsStateStore.currentChannel?.id;

        return this.addContextListenerByChannelId(commandId, handler, channelIdToSubscribeTo, contextType);
    }

    public async broadcast(commandId: string, context: Context, channelId?: string): Promise<void> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - broadcast() invoked with contextType ${context.type} and channelId ${channelId}`);

        const canBroadcast = this.isBroadcastPermitted(commandId, channelId);

        if (!canBroadcast) {
            return;
        }

        const channelIdToBroadcastTo = channelId || (this.channelsStateStore.currentChannel as Channel).id;

        return this.broadcastByChannelId(commandId, channelIdToBroadcastTo, context);
    }

    public async getUserChannels(commandId: string): Promise<Channel[]> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - getUserChannels() invoked`);

        return Object.values(this.channelsStateStore.userChannels);
    }

    public async getOrCreateChannel({ commandId, channelId }: ChannelsConfig): Promise<Channel> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - getOrCreateChannel() invoked for channel with id ${channelId}`);

        const isPrivateChannel = this.isPrivateChannel(channelId);

        if (isPrivateChannel) {
            throw new Error(`${ChannelError.AccessDenied} - Cannot retrieve a private channel`);
        }

        const isUserChannel = this.isUserChannel(channelId);

        if (isUserChannel) {
            throw new Error(`${ChannelError.AccessDenied} - There's an already existing system channel with passed id. Retrieve it using fdc3.getSystemChannels() or create a new app channel with a different id`);
        }

        return this.getOrCreateAppChannel(commandId, channelId);
    }

    public async joinUserChannel({ commandId, channelId }: ChannelsConfig): Promise<void> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - joinUserChannel() invoked for channel with id ${channelId}`);

        const isAppChannel = this.doesAppChannelExist(channelId);

        if (isAppChannel) {
            throw new Error(`${ChannelError.AccessDenied} - Cannot join an app channel`);
        }

        const channelToJoin = this.channelsStateStore.userChannels[channelId];

        if (!channelToJoin) {
            throw new Error(`${ChannelError.NoChannelFound} - Cannot find user channel with id ${channelId}`);
        }

        const currentChannel = this.channelsStateStore.currentChannel;

        if (currentChannel) {
            this.logger.info(`[${commandId}] - unsubscribing from listeners of the current channel: ${currentChannel}`);

            this.channelsPendingListenersStore.unsubscribePendingListeners();
        }

        const glueChannelName = this.channelsStateStore.getGlueChannelNameByFdc3ChannelId(channelId);

        await this.glueController.joinChannel(glueChannelName);

        this.logger.info(`[${commandId}] - joining fdc3 user channel with id ${channelId} (underlying glue channel: ${glueChannelName})`);

        await this.channelsPendingListenersStore.subscribePendingListeners(commandId, this.addContextListener.bind(this), channelId);
    }

    public async getCurrentChannel(commandId: string): Promise<Channel | null> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - getCurrentChannel() invoked`);

        return this.channelsStateStore.currentChannel;
    }

    public async leaveCurrentChannel(commandId: string): Promise<void> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - leaveCurrentChannel() invoked`);

        if (!this.channelsStateStore.currentChannel) {
            this.logger.info(`[${commandId}] - no channel to leave`);

            return;
        }

        await this.glueController.leaveChannel();

        this.channelsStateStore.currentChannel = null;

        this.logger.info(`[${commandId}] - current channel is left. unsubscribing from all listeners`);

        this.channelsPendingListenersStore.unsubscribePendingListeners();
    }

    public async getContextForChannel({commandId, channelId, contextType }: GetContextForChannelConfig): Promise<Context | null> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - getContextForChannel() invoked for channel with id ${channelId}`);

        const isUserChannel = this.isUserChannel(channelId);

        if (!contextType) {
            this.logger.info(`[${commandId}] - retrieving latest context broadcasted on channel with id ${channelId}`);

            let context;

            if (isUserChannel) {
                const glueChannelName = this.channelsStateStore.getGlueChannelNameByFdc3ChannelId(channelId);
                const glueChannelWithPrefix = this.channelsParser.mapChannelNameToContextName(glueChannelName);
                
                this.logger.info(`[${commandId}] - getting context for user channel with id ${channelId} (underlying glue channel ${glueChannelName})`);

                context = await this.glueController.getContext(glueChannelWithPrefix);
            } else {
                this.logger.info(`[${commandId}] - getting context for app channel with id ${channelId}`);

                context = await this.glueController.getContext(channelId);
            }

            return context.latest_fdc3_type
                ? this.channelsParser.parseContextsDataToInitialFDC3Data(context)
                : null;
        }

        this.logger.info(`[${commandId}] Retrieving latest context of type ${contextType} broadcasted on ${isUserChannel ? "user" :"app" } channel with id ${channelId}`);

        const parsedType = this.channelsParser.mapFDC3TypeToChannelsDelimiter(contextType);

        const { data } = isUserChannel
            ? await this.glueController.getChannel(this.channelsStateStore.getGlueChannelNameByFdc3ChannelId(channelId))
            : await this.glueController.getContext(channelId);

        return data && data[`fdc3_${parsedType}`]
            ? this.channelsParser.parseContextsDataToInitialFDC3Data({ data, latest_fdc3_type: parsedType })
            : null;
    }

    public async createPrivateChannel(commandId: string): Promise<PrivateChannel> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - createPrivateChannel() invoked`);
        
        const creatorId = this.glueController.getMyInteropInstanceId();

        const channel = this.buildChannel(ChannelTypes.Private) as PrivateChannel;

        await this.glueController.updateContext(channel.id, { creatorId });

        this.logger.info(`[${commandId}] - private channel with id ${channel.id} created`);

        return channel;
    }

    public async announceDisconnect(commandId: string, channelId: string, instanceId?: string): Promise<void> {
        await this.initDonePromise;

        this.logger.info(`[${commandId}] - disconnect() invoked on channel with id ${channelId}`);

        await this.glueController.updateContext(channelId, { disconnected: true });

        this.logger.info(`[${commandId}] - glue context for ${channelId} updated with disconnected flag`);

        const closedInstanceId = instanceId || this.glueController.getMyInteropInstanceId();

        const targetInstance = await this.getOtherInstanceIdFromClosedOne(channelId, closedInstanceId);

        const replayContextTypes = await this.getContextTypesForPrivateChannel(channelId);

        this.logger.info(`[${commandId}] - invoking onDisconnect callback for instance ${targetInstance}`);

        this.invokeSystemMethod(targetInstance, PrivateChannelEventMethods.OnDisconnect, { clientId: targetInstance, channelId, replayContextTypes });
    }

    public async addClientToPrivateChannel(commandId: string, channelId: string, clientId: string): Promise<void> {
        this.logger.info(`[${commandId}] - client with id ${clientId} added to private channel with id ${channelId}`);

        await this.glueController.updateContext(channelId, { clientId });
    }

    public async isPrivateChannelDisconnected({ commandId, channelId }: ChannelsConfig): Promise<boolean> {
        this.logger.info(`[${commandId}] - checking if private channel with id ${channelId} is disconnected`);

        const context = await this.glueController.getContext(channelId);

        return !!context.disconnected;
    }

    public registerOnInstanceStopped({ commandId, channelId }: ChannelsConfig): () => void {
        this.logger.info(`[${commandId}] - registering onInstanceStopped callback for channel with id ${channelId}`);

        const handler = async (instance: Instance) => {
            const { clientId, creatorId } = await this.glueController.getContext(channelId);

            if (instance.id !== clientId && instance.id !== creatorId) {
                return;
            }

            this.logger.info(`[${commandId}] - calling onDisconnect callback for channel with id ${channelId}`);

            await this.announceDisconnect(commandId, channelId, instance.id);
        };

        return this.glueController.registerOnInstanceStopped(handler.bind(this));
    }

    public async addPrivateChannelEvent({ commandId, action, channelId, handler }: AddPrivateChannelEventConfig): Promise<UnsubscribeFunction> {
        this.logger.info(`[${commandId}] - registering callback for ${action} event in channel with id ${channelId}`);

        let replayArgs: string[] | undefined;

        const targetInstanceId = await this.getTargetedInstanceId(channelId);

        if (action === PrivateChannelEventMethods.OnAddContextListener && targetInstanceId) {
            replayArgs = await this.getContextTypesForPrivateChannel(channelId);
        }

        return this.channelsCallbackRegistry.add({ action, channelId, handler, replayArgs });
    }

    private async initialize(): Promise<void> {
        await this.glueController.gluePromise;

        const current = this.glueController.getCurrentChannel();

        const glueChannels = await this.glueController.listAllChannels();

        const glueChannelsWithFdc3Meta = glueChannels.filter((glueChannel) => glueChannel.meta.fdc3);

        glueChannelsWithFdc3Meta.forEach((glueChannel) => {
            const userChannel = this.buildChannel(ChannelTypes.User, { displayMetadata: { glueChannel } });

            this.channelsStateStore.addFdc3IdToGlueChannelName(userChannel.id, glueChannel.name);

            this.channelsStateStore.addUserChannel(userChannel);

            if (current && glueChannel.name === current) {
                this.channelsStateStore.currentChannel = userChannel;
            }
        });
                
        if (current) {
            this.handleSwitchChannelUI(current);
        }

        /* Used in Glue42 Enterprise for navigating through system channels with the channelSelectorWidget */
        this.glueController.setOnChannelChanged((channelId: string) => {
            this.handleSwitchChannelUI(channelId);
        });
    }

    private handleSwitchChannelUI(channelId?: string): void {
        if (!channelId) {
            return;
        }

        const isFdc3ChannelName = fdc3ChannelNames.includes(channelId);

        const userChannelId = isFdc3ChannelName ? channelId : this.channelsStateStore.getFdc3ChannelIdByGlueChannelName(channelId);

        this.channelsStateStore.currentChannel = this.channelsStateStore.userChannels[userChannelId];
    }

    private isBroadcastPermitted(commandId: string, channelId?: string): boolean {
        if (channelId) {
            return true;
        }

        if (!this.channelsStateStore.currentChannel) {
            this.logger.info(`[${commandId}] - invocation of broadcast ignored - no channel to broadcast to`);

            console.error("You need to join a user channel in order to broadcast");

            return false;
        }

        if (this.channelsStateStore.currentChannel.type === ChannelTypes.App) {
            this.logger.info(`[${commandId}] - invocation of broadcast ignored - cannot broadcast on app channel directly`);

            console.error("You can't broadcast to an app channel directly - use channel's broadcast method instead");

            return false;
        }

        return true;
    }

    private async handleWindowContextOnOpening(commandId: string, handler: (context: Context) => void, contextType?: string): Promise<void> {
        const windowContext = await this.glueController.getContextForMyWindow();

        if (isEmptyObject(windowContext)) {
            this.logger.info(`[${commandId}] - addContextListener handler won't be invoked - startup context is empty`);

            this.invokeContextHandlerWithStartupContext = false;

            return;
        }

        // startup context is passed to the applications as { meta: { responseMethodName: string, windowId: string }, context: Context }
        const { context, meta } = windowContext;

        const isSameContextType = contextType ? context?.type === contextType : true;

        if (!isSameContextType || !meta) {
            this.logger.info(`[${commandId}] - addContextListener handler won't be invoked`);

            return;
        }

        this.logger.info(`[${commandId}] - invoking addContextListener handler with startup context`);

        handler(context);

        this.invokeContextHandlerWithStartupContext = false;

        const { responseMethodName, windowId } = meta;

        const responseMethodExists = this.doesServerMethodExist(responseMethodName, windowId);

        if (!responseMethodExists) {
            this.logger.info(`[${commandId}] - response method for window with id ${windowId} does not exist anymore. returning`);

            return;
        }

        this.logger.info(`[${commandId}] - invoking response method for window with id ${windowId}`);

        await this.glueController.invokeMethod(responseMethodName, windowId, { listenerInvoked: true });
    }

    private doesServerMethodExist(methodName: string, windowId: string): boolean {
        const serversForMethodName = this.glueController.getInteropServers({ name: methodName });

        return !!serversForMethodName.find(server => server.windowId === windowId);
    }

    private async getOrCreateAppChannel(commandId: string, channelId: string): Promise<Channel> {
        const exists = this.doesAppChannelExist(channelId);

        if (!exists) {
            this.logger.info(`[${commandId}] - app channel with id ${channelId} does not exist. Creating one`);

            await this.glueController.updateContext(channelId, {});
        }

        this.logger.info(`[${commandId}] - returning app channel with id ${channelId}`);

        return this.buildChannel(ChannelTypes.App, { id: channelId });
    }

    private doesAppChannelExist(name: string): boolean {
        return !name.includes(PrivateChannelPrefix) && this.glueController.getAllContexts().some((ctxName: string) => ctxName === name);
    }

    private isUserChannel(channelId?: string): boolean {
        if (!channelId) {
            return false;
        }

        return !!this.channelsStateStore.userChannels[channelId];
    }

    private isPrivateChannel(channelId: string): boolean {
        return channelId.includes(PrivateChannelPrefix) && this.glueController.getAllContexts().some((ctxName: string) => ctxName === channelId);
    }

    private buildChannel(type: ChannelTypes, data?: any): Channel {
        return this.channelsFactory.buildModel({ type, ...data, isChannel: true });
    }

    private async broadcastByChannelId(commandId: string, channelId: string, context: Context): Promise<void> {
        const isUserChannel = this.isUserChannel(channelId);

        if (!isUserChannel) {
            this.logger.info(`[${commandId}] - broadcasting on app channel with id ${channelId}`);

            return this.glueController.updateContextWithLatestFdc3Type(channelId, context);
        }

        const glueChannelName = this.channelsStateStore.getGlueChannelNameByFdc3ChannelId(channelId);

        this.logger.info(`[${commandId}] - broadcasting on fdc3 user channel with id ${channelId} (underlying glue channel: ${glueChannelName})`);

        return this.glueController.channelsUpdate(glueChannelName, context);
    }

    private async addContextListenerByChannelId(commandId: string, handler: ContextHandler, channelId?: string, contextType?: string): Promise<Listener> {
        const subHandler = parseContextHandler(handler, contextType);

        if (!channelId) {
            this.logger.info(`[${commandId}] - no channel to subscribe for. Creating a pending listener`);

            return this.channelsPendingListenersStore.createPendingListener(subHandler, contextType);
        }

        const channelType = this.getChannelTypeById(channelId);

        if (channelType === ChannelTypes.User) {
            const channelName = this.channelsStateStore.getGlueChannelNameByFdc3ChannelId(channelId);   // ex: returns "Red"
            const contextChannelName = this.channelsParser.mapChannelNameToContextName(channelName);     // ex: returns ___channel___Red

            this.logger.info(`[${commandId}] - subscribing for fdc3 user channel with id ${channelId} (underlying glue channel: ${channelName})`);

            const unsubscribe = await this.glueController.contextsSubscribe(contextChannelName, subHandler);

            return {
                unsubscribe: () => {
                    this.logger.info(`[${commandId}] - invoking unsubscribe for fdc3 user channel with id ${channelId} (underlying glue channel: ${channelName})`);

                    unsubscribe();
                }
            };
        }

        if (channelType === ChannelTypes.App) {
            this.logger.info(`[${commandId}] - subscribing for fdc3 app channel with id ${channelId} (underlying glue context with same name)`);

            const unsubscribe = await this.glueController.contextsSubscribe(channelId, subHandler);

            return {
                unsubscribe: () => {
                    this.logger.info(`[${commandId}] - invoking unsubscribe for app channel with id ${channelId}`);

                    unsubscribe();
                }
            };
        }

        if (channelType === ChannelTypes.Private) {
            this.logger.info(`[${commandId}] - subscribing for fdc3 private channel with id ${channelId} (underlying glue context with same name)`);

            const contextsUnsubscribe = await this.glueController.contextsSubscribe(channelId, subHandler);

            await this.addContextTypeInPrivateChannelContext(channelId, contextType);

            const targetInstance = await this.getTargetedInstanceId(channelId!) as string;

            const unsubscribe = () => {
                this.logger.info(`[${commandId}] - unsubscribe invoked for private channel with id ${channelId}`);

                contextsUnsubscribe();

                this.logger.info(`[${commandId}] - invoking onUnsubscribe handler for private channel with id ${channelId}`);

                this.invokeSystemMethod(targetInstance, PrivateChannelEventMethods.OnUnsubscribe, { channelId, clientId: targetInstance, contextType });
            };

            this.logger.info(`[${commandId}] - invoking onAddContextListener handler for private channel with id ${channelId}`);

            this.invokeSystemMethod(targetInstance, PrivateChannelEventMethods.OnAddContextListener, { channelId: channelId!, clientId: targetInstance, contextType });

            return { unsubscribe };
        }

        throw new Error(`${ChannelError.AccessDenied} - Cannot add a context listener on an invalid channel`);
    }

    private getChannelTypeById(channelId: string): ChannelTypes {
        const isUser = this.isUserChannel(channelId);

        if (isUser) {
            return ChannelTypes.User;
        }

        const isPrivate = this.isPrivateChannel(channelId);

        if (isPrivate) {
            return ChannelTypes.Private;
        }

        const isApp = this.doesAppChannelExist(channelId);

        if (isApp) {
            return ChannelTypes.App;
        }

        throw new Error(`Channel with id: ${channelId} does not exist`);
    }

    private async getTargetedInstanceId(channelId: string): Promise<string | undefined> {
        const { clientId, creatorId } = await this.glueController.getContext(channelId);

        const myId = this.glueController.getMyInteropInstanceId();

        return myId === clientId ? creatorId : clientId;
    }

    private async getOtherInstanceIdFromClosedOne(channelId: string, closedInstanceId: string): Promise<string> {
        const { clientId, creatorId } = await this.glueController.getContext(channelId);

        return closedInstanceId === clientId
            ? creatorId
            : clientId;
    }

    private invokeSystemMethod(clientId: string | undefined, action: string, payload: SystemMethodEventPayload): void {
        /* do not invoke the system method unless there's another client listening on that channel; if i'm the only client, ignore */
        if (clientId) {
            this.glueController.invokeSystemMethod({ action, payload });
        }
    }

    private async addContextTypeInPrivateChannelContext(channelId: string, contextType?: string): Promise<void> {
        const currentContext = await this.glueController.getContext(channelId);

        const updatedTypes = currentContext.contextListenerTypes ? [...currentContext.contextListenerTypes, contextType] : [contextType];

        return this.glueController.updateContext(channelId, { ...currentContext, contextListenerTypes: updatedTypes });
    }

    private async getContextTypesForPrivateChannel(channelId: string): Promise<string[] | undefined> {
        const ctx = await this.glueController.getContext(channelId);

        return ctx.contextListenerTypes;
    }
}
