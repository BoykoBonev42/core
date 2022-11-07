import { Context, DisplayMetadata, Listener, Channel, ContextHandler } from '@finos/fdc3';
import { ChannelTypes } from '../channels/privateChannelConstants';
import { ChannelsController } from '../channels/controller';
import { contextDecoder, optionalNonEmptyStringDecoder, nonEmptyStringDecoder } from '../shared/decoder';
import { ChannelContext } from '../types/glue42Types';

export class UserChannel {
    private id!: string;
    private type = ChannelTypes.User;
    private displayMetadata: DisplayMetadata;

    constructor(private readonly channelsController: ChannelsController, glueChannel: ChannelContext) {
        this.id = glueChannel.meta.fdc3 
            ? glueChannel.meta.fdc3.id 
            : glueChannel.name;
        this.displayMetadata = {
            name: glueChannel.name, 
            color: glueChannel.meta.color
        };
    }

    public toApi(): Channel {
        const api: Channel = {
            id: this.id,
            type: this.type,
            displayMetadata: this.displayMetadata,
            broadcast: this.broadcast.bind(this),
            getCurrentContext: this.getCurrentContext.bind(this),
            addContextListener: this.addContextListener.bind(this) as { (handler: ContextHandler): Promise<Listener>; (contextType: string | null, handler: ContextHandler): Promise<Listener> },
        };

        return api;
    }

    private async broadcast(context: Context): Promise<void> {
        contextDecoder.runWithException(context);

        return this.channelsController.broadcast(context, this.id);
    }

    private async getCurrentContext(contextType?: string): Promise<Context | null> {
        nonEmptyStringDecoder.run(contextType);

        return this.channelsController.getContextForChannel(this.id, contextType);
    }

    private async addContextListener(handler: ContextHandler): Promise<Listener | void>;
    private async addContextListener(contextType: string | null | ContextHandler, handler?: ContextHandler): Promise<Listener | void> {
        if (arguments.length === 1) {
            if (typeof contextType !== "function") {
                throw new Error("Please provide the handler as a function!");
            }

            return this.channelsController.addContextListener(contextType as ContextHandler, undefined, this.id);
        }

        const contextTypeDecoder = optionalNonEmptyStringDecoder.runWithException(contextType);

        if (typeof handler !== "function") {
            throw new Error("Please provide the handler as a function!");
        }

        return this.channelsController.addContextListener(handler, contextTypeDecoder, this.id);
    }
}