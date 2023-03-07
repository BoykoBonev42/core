import { string } from 'decoder-validate';
import { ChannelsCallbackRegistry } from '../channels/callbackRegistry';
import { Glue42FDC3SystemMethod, PrivateChannelEventMethods } from '../channels/privateChannelConstants';
import { SystemMethodInvocationArgumentDecoder } from '../shared/decoder';
import { SystemMethodEventArgument, SystemMethodEventPayload } from '../types/glue42Types';
import { GlueController } from './glue';

export class GlueEventsController {
    constructor(
        private readonly glueController: GlueController,
        private readonly channelsCallbackRegistry: ChannelsCallbackRegistry
    ) { }

    public async initialize(): Promise<void> {
        const isMethodRegisteredByThisApp = this.isSysMethodRegisteredByCurrentApp();

        if (isMethodRegisteredByThisApp) {
            return;
        }

        await this.glueController.registerMethod(Glue42FDC3SystemMethod, this.handleSystemMethodInvocation.bind(this));
    }

    private isSysMethodRegisteredByCurrentApp(): boolean {
        const methods = this.glueController.getInteropMethods(Glue42FDC3SystemMethod);

        const myId = this.glueController.getMyInteropInstanceId();

        const methodsByThisInstance = methods.filter(method => {
            return method.getServers().find(server => server.instance === myId)
                ? method
                : undefined;
        });

        return !!methodsByThisInstance.length;
    }

    private handleSystemMethodInvocation(argumentObj: SystemMethodEventArgument): void {
        const argsDecodeResult = SystemMethodInvocationArgumentDecoder.run(argumentObj);

        if (!argsDecodeResult.ok) {
            throw new Error(`Interop Method ${Glue42FDC3SystemMethod} invoked with invalid argument object - ${argsDecodeResult.error}.\n Expected ${JSON.stringify({ action: string, payload: { channelId: string, clientId: string } })}`)
        }

        const { action, payload } = argsDecodeResult.result;

        if (action === PrivateChannelEventMethods.OnDisconnect) {
            return this.handleOnDisconnect(payload);
        }

        if (action === PrivateChannelEventMethods.OnAddContextListener || action === PrivateChannelEventMethods.OnUnsubscribe) {
            return this.channelsCallbackRegistry.invoke(action, payload);
        }
    }

    private handleOnDisconnect(payload: SystemMethodEventPayload): void {
        if (payload.replayContextTypes) {
            this.invokeOnUnsubscribeHandlerMultipleTimes(payload);
        }

        this.channelsCallbackRegistry.invoke(PrivateChannelEventMethods.OnDisconnect, payload);
    }

    private invokeOnUnsubscribeHandlerMultipleTimes(payload: SystemMethodEventPayload): void {
        payload.replayContextTypes!.forEach(contextType => {
            this.channelsCallbackRegistry.invoke(PrivateChannelEventMethods.OnUnsubscribe, { channelId: payload.channelId, clientId: payload.clientId, contextType });
        });
    }
}