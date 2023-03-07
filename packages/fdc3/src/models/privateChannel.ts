import { ChannelError, Context, ContextType, Listener, ContextHandler, PrivateChannel as Fdc3PrivateChannel } from "@finos/fdc3";
import { nanoid } from "nanoid";
import { PrivateChannelEventMethods, PrivateChannelPrefix } from "../channels/privateChannelConstants";
import { ChannelsController } from "../channels/controller";
import { contextDecoder, optionalNonEmptyStringDecoder } from "../shared/decoder";
import { AsyncListener, generateCommandId } from "../shared/utils";
import { ChannelTypes } from "../shared/constants";

export class PrivateChannel {
    private id!: string;
    private type = ChannelTypes.Private;
    private displayMetadata!: any;

    private unsubFromInstanceStopped!: () => void;

    constructor(private readonly channelsController: ChannelsController, channelId?: string) {
        this.id = channelId || `${PrivateChannelPrefix}${nanoid()}`;

        this.unsubFromInstanceStopped = this.channelsController.registerOnInstanceStopped({ commandId: generateCommandId(), channelId: this.id });
    }

    public toApi(): Fdc3PrivateChannel {
        const api: Fdc3PrivateChannel = {
            id: this.id,
            type: this.type,
            displayMetadata: this.displayMetadata,
            broadcast: this.broadcast.bind(this),
            getCurrentContext: this.getCurrentContext.bind(this),
            addContextListener: this.addContextListener.bind(this) as { (handler: ContextHandler): Promise<Listener>; (contextType: string | null, handler: ContextHandler): Promise<Listener> },
            onAddContextListener: this.onAddContextListener.bind(this),
            onUnsubscribe: this.onUnsubscribe.bind(this),
            onDisconnect: this.onDisconnect.bind(this),
            disconnect: this.disconnect.bind(this),
        };

        return api;
    }

    private async broadcast(context: Context): Promise<void> {
        const commandId = generateCommandId();

        /* After disconnect() has been called on the channel, Desktop Agents SHOULD prevent apps from broadcasting on this channel */
        const isDisconnected = await this.channelsController.isPrivateChannelDisconnected({ commandId, channelId: this.id });

        if (isDisconnected) {
            throw new Error(`${ChannelError.AccessDenied} - Channel has disconnected - broadcast is no longer available`);
        }

        contextDecoder.runWithException(context);

        return this.channelsController.broadcast(commandId ,context, this.id);
    }

    private async getCurrentContext(contextType?: string): Promise<Context | null> {
        optionalNonEmptyStringDecoder.runWithException(contextType);

        return this.channelsController.getContextForChannel({ commandId: generateCommandId(), channelId: this.id, contextType });
    }

    private async addContextListener(handler: ContextHandler): Promise<Listener>;
    private async addContextListener(contextType: string | null | ContextHandler, handler?: ContextHandler): Promise<Listener> {
        if (arguments.length === 1) {
            if (typeof contextType !== "function") {
                throw new Error(`${ChannelError.AccessDenied} - Expected function as an argument, got ${typeof contextType}`);
            }

            return this.channelsController.addContextListener({ commandId: generateCommandId(), handler: contextType, channelId: this.id });
        }

        const contextTypeDecoder = optionalNonEmptyStringDecoder.runWithException(contextType);

        if (typeof handler !== "function") {
            throw new Error(`${ChannelError.AccessDenied} - Expected function as an argument, got ${typeof contextType}`);
        }

        return this.channelsController.addContextListener({ 
            commandId: generateCommandId(), 
            contextType: contextTypeDecoder,
            channelId: this.id, 
            handler,
        });

    }

    private onAddContextListener(handler: (contextType?: string) => void): Listener {
        if (typeof handler !== "function") {
            throw new Error(`${ChannelError.AccessDenied} - Expected function as an argument, got ${typeof handler}`);
        }

        const unsub = this.channelsController.addPrivateChannelEvent({
            commandId: generateCommandId(), 
            action: PrivateChannelEventMethods.OnAddContextListener,
            channelId: this.id,
            handler
        });

        return AsyncListener(unsub);
    }

    private onUnsubscribe(handler: (contextType?: ContextType) => void): Listener {
        if (typeof handler !== "function") {
            throw new Error(`${ChannelError.AccessDenied} - Expected function as an argument, got ${typeof handler}`);
        }

        const unsub = this.channelsController.addPrivateChannelEvent({
            commandId: generateCommandId(), 
            action: PrivateChannelEventMethods.OnUnsubscribe,
            channelId: this.id,
            handler
        });

        return AsyncListener(unsub);
    }

    private onDisconnect(handler: () => void): Listener {
        if (typeof handler !== "function") {
            throw new Error(`${ChannelError.AccessDenied} - Expected function as an argument, got ${typeof handler}`);
        }

        const unsub = this.channelsController.addPrivateChannelEvent({
            commandId: generateCommandId(), 
            action: PrivateChannelEventMethods.OnDisconnect,
            channelId: this.id,
            handler
        });

        return AsyncListener(unsub);
    }

    private async disconnect(): Promise<void> {
        await this.channelsController.announceDisconnect(generateCommandId(), this.id);

        this.unsubFromInstanceStopped();
    }
}
