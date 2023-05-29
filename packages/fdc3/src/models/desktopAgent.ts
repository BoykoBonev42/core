import { Context, Listener, ImplementationMetadata, AppIdentifier, AppMetadata, Channel, AppIntent, IntentHandler, ContextHandler } from "@finos/fdc3";
import { IntentsController } from "../controllers/intents";
import { ApplicationsController } from "../controllers/applications";
import { appIdentifierDecoder, contextDecoder, optionalNonEmptyStringDecoder, nonEmptyStringDecoder, optionalAppIdentifier, optionalContextDecoder, optionalTargetApp, targetAppDecoder } from "../shared/decoder";
import { ChannelsController } from "../channels/controller";
import { generateCommandId } from "../shared/utils";
import { ExtendedFDC3DesktopAgent, ExtendedIntentResolution } from "../types/fdc3Types";
export class DesktopAgent {
    constructor(
        private readonly intentsController: IntentsController,
        private readonly applicationController: ApplicationsController,
        private readonly channelsController: ChannelsController
    ) { }

    public toApi(): ExtendedFDC3DesktopAgent {
        const api: ExtendedFDC3DesktopAgent = {
            addContextListener: this.addContextListener.bind(this),
            addIntentListener: this.addIntentListener.bind(this),
            broadcast: this.broadcast.bind(this),
            createPrivateChannel: this.createPrivateChannel.bind(this),
            findInstances: this.findInstances.bind(this),
            findIntent: this.findIntent.bind(this),
            findIntentsByContext: this.findIntentsByContext.bind(this),
            getAppMetadata: this.getAppMetadata.bind(this),
            getCurrentChannel: this.getCurrentChannel.bind(this),
            getInfo: this.getInfo.bind(this),
            getOrCreateChannel: this.getOrCreateChannel.bind(this),
            getSystemChannels: this.getSystemChannels.bind(this),
            getUserChannels: this.getSystemChannels.bind(this),
            joinChannel: this.joinChannel.bind(this),
            joinUserChannel: this.joinUserChannel.bind(this),
            leaveCurrentChannel: this.leaveCurrentChannel.bind(this),
            open: this.open.bind(this) as { (target: AppIdentifier, context?: Context): Promise<AppIdentifier>; (target: string, context?: Context): Promise<AppIdentifier> },
            raiseIntent: this.raiseIntent.bind(this) as { (intent: string, context: Context, app?: AppIdentifier): Promise<ExtendedIntentResolution>; (intent: string, context: Context, name?: string): Promise<ExtendedIntentResolution>},
            raiseIntentForContext: this.raiseIntentForContext.bind(this) as { (context: Context, app?: AppIdentifier | undefined): Promise<ExtendedIntentResolution>; (context: Context, name: string): Promise<ExtendedIntentResolution>},
        };

        return Object.freeze(api);
    }

    // apps 
    
    private async open(target: string | AppIdentifier, context?: Context): Promise<AppIdentifier> {
        targetAppDecoder.runWithException(target);

        optionalContextDecoder.runWithException(context);

        return this.applicationController.open({ commandId: generateCommandId(), target, context });
    }

    private async findInstances(app: AppIdentifier): Promise<AppIdentifier[]> {
        appIdentifierDecoder.runWithException(app);

        return this.applicationController.findInstances({ commandId: generateCommandId(), appIdentifier: app });
    }

    private async getAppMetadata(app: AppIdentifier): Promise<AppMetadata> {
        appIdentifierDecoder.runWithException(app);

        return this.applicationController.getAppMetadata({ commandId: generateCommandId(), appIdentifier: app });
    }

    private async getInfo(): Promise<ImplementationMetadata> {
        return this.applicationController.getInfo({ commandId: generateCommandId() });
    }
  
    // context

    private async broadcast(context: Context): Promise<void> {
        contextDecoder.runWithException(context);

        return this.channelsController.broadcast(generateCommandId(), context);
    }

    private async addContextListener(contextType: string | null | ContextHandler, handler?: ContextHandler): Promise<Listener> {
        /* deprecated addContextListener(handler); */
        if (arguments.length === 1) {
            if (typeof contextType !== "function") {
                throw new Error("Please provide the handler as a function!");
            }

            return this.channelsController.addContextListener({ commandId: generateCommandId(), handler: contextType as ContextHandler });
        }

        const contextTypeDecoder = optionalNonEmptyStringDecoder.runWithException(contextType);

        if (typeof handler !== "function") {
            throw new Error("Please provide the handler as a function!");
        }

        return this.channelsController.addContextListener({ commandId: generateCommandId(), handler, contextType: contextTypeDecoder });
    }

    // intents

    private async findIntent(intent: string, context?: Context, resultType?: string): Promise<AppIntent> {
        nonEmptyStringDecoder.runWithException(intent);

        const contextDecoderResult = optionalContextDecoder.run(context);

        if (!contextDecoderResult.ok) {
            throw new Error(`Invalid Context: ${contextDecoderResult.error}`);
        }

        optionalNonEmptyStringDecoder.runWithException(resultType);

        return this.intentsController.findIntent({ commandId: generateCommandId(), intent, context: contextDecoderResult.result, resultType });
    }

    private async findIntentsByContext(context: Context, resultType?: string): Promise<AppIntent[]> {
        const contextDecoderResult = contextDecoder.run(context);
        
        if (!contextDecoderResult.ok) {
            throw new Error(`Invalid Context: ${contextDecoderResult.error}`);
        }

        optionalNonEmptyStringDecoder.runWithException(resultType);

        return this.intentsController.findIntentsByContext({ commandId: generateCommandId(), context: contextDecoderResult.result, resultType });
    }

    private async raiseIntent(intent: string, context: Context, app?: string | AppIdentifier): Promise<ExtendedIntentResolution> {
        nonEmptyStringDecoder.runWithException(intent);

        contextDecoder.runWithException(context);
        
        optionalAppIdentifier.runWithException(app);

        return this.intentsController.raiseIntent({ commandId: generateCommandId(), intent, context, target: app });
    }

    private async raiseIntentForContext(context: Context, app?: string | AppIdentifier): Promise<ExtendedIntentResolution> {
        contextDecoder.runWithException(context);
        optionalTargetApp.runWithException(app);

        return this.intentsController.raiseIntentForContext({ commandId: generateCommandId(), context, target: app });
    }

    private async addIntentListener(intent: string, handler: IntentHandler): Promise<Listener> {
        nonEmptyStringDecoder.runWithException(intent);

        if (typeof handler !== "function") {
            throw new Error("Please provide the handler as a function!");
        }

        return this.intentsController.addIntentListener({ commandId: generateCommandId(), intent, handler });
    }

    // channels
    private async getOrCreateChannel(channelId: string): Promise<Channel> {
        nonEmptyStringDecoder.runWithException(channelId);

        return this.channelsController.getOrCreateChannel({ commandId: generateCommandId(), channelId });
    }

    private async getSystemChannels(): Promise<Channel[]> {
        return this.channelsController.getUserChannels(generateCommandId());
    }

    private async joinChannel(channelId: string): Promise<void> {
        nonEmptyStringDecoder.runWithException(channelId);

        return this.channelsController.joinUserChannel({ commandId: generateCommandId(), channelId });
    }

    private async joinUserChannel(channelId: string): Promise<void> {
        nonEmptyStringDecoder.runWithException(channelId);

        return this.channelsController.joinUserChannel({ commandId: generateCommandId(), channelId });
    }

    private async getCurrentChannel(): Promise<Channel | null> {
        return this.channelsController.getCurrentChannel(generateCommandId());
    }

    private async leaveCurrentChannel(): Promise<void> {
        return this.channelsController.leaveCurrentChannel(generateCommandId());
    }

    private async createPrivateChannel(): Promise<any> {
        return this.channelsController.createPrivateChannel(generateCommandId());
    }
}