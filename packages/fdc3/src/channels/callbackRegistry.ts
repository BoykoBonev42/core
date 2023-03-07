import { default as CallbackRegistryFactory, CallbackRegistry, UnsubscribeFunction } from "callback-registry";
import { AddCallbackInRegistryConfig } from "../types/fdc3Types";
import { SystemMethodEventPayload } from "../types/glue42Types";


export class ChannelsCallbackRegistry {
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();

    public add({ action, channelId, handler , replayArgs }: AddCallbackInRegistryConfig): UnsubscribeFunction {
        return this.registry.add(`${action}-${channelId}`, handler, replayArgs);
    }

    public invoke(action: string, argumentObj: SystemMethodEventPayload): void {
        const { channelId, contextType } = argumentObj;

        this.registry.execute(`${action}-${channelId}`, contextType);
    }
}