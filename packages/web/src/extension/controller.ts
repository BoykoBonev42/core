/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "../../web";
import { ChannelsController } from "../channels/controller";
import { GlueBridge } from "../communication/bridge";
import { EventsDispatcher } from "../shared/dispatcher";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import { ExtensionConfig, operations, WidgetInjectionPermission } from "./protocol";

export class ExtController implements LibController {

    private windowId!: string;
    private logger!: Glue42Web.Logger.API;
    private bridge!: GlueBridge;
    private eventsDispatcher!: EventsDispatcher;
    private channelsController!: ChannelsController;
    private config!: ExtensionConfig;
    private channels: Glue42Web.Channels.ChannelContext[] = [];
    private unsubFuncs: (() => void)[] = [];

    private readonly contentCommands: { [key in string]: { name: string; handle: (message: any) => Promise<void> } } = {
        widgetVisualizationPermission: { name: "widgetVisualizationPermission", handle: this.handleWidgetVisualizationPermission.bind(this) },
        changeChannel: { name: "changeChannel", handle: this.handleChangeChannel.bind(this) }
    };

    public handlePlatformShutdown(): void {
        this.unsubFuncs.forEach((unsub) => unsub());
    }

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {

        this.logger = coreGlue.logger.subLogger("extension.controller.web");
        
        this.windowId = ioc.publicWindowId;

        this.logger.trace("starting the extension web controller");

        this.bridge = ioc.bridge;
        this.channelsController = ioc.channelsController;
        this.eventsDispatcher = ioc.eventsDispatcher;

        // TODO: Maybe think about a better way, because the platform will reject and log an error
        try {
            await this.registerWithPlatform();
        } catch (error) {
            // this is soft controller initialization to ensure that
            // this non-essential controller will not break Glue Web 
            // initialization combined with older platforms
            return;
        }

        this.channels = await this.channelsController.list();

        const unsubDispatcher = this.eventsDispatcher.onContentMessage(this.handleContentMessage.bind(this));
        const unsubChannels = this.channelsController.onChanged((channel) => {
            this.eventsDispatcher.sendContentMessage({ command: "channelChange", newChannel: channel });
        });

        this.unsubFuncs.push(unsubDispatcher);
        this.unsubFuncs.push(unsubChannels);
    }

    public async handleBridgeMessage(_: any): Promise<void> {
        // noop
    }

    private handleContentMessage(message: any): void {

        if (!message || typeof message.command !== "string") {
            return;
        }

        const foundHandler = this.contentCommands[message.command];

        if (!foundHandler) {
            return;
        }

        foundHandler.handle(message);
    }

    private async registerWithPlatform(): Promise<void> {
        this.logger.trace("registering with the platform");

        this.config = await this.bridge.send<{ windowId: string }, ExtensionConfig>("extension", operations.clientHello, { windowId: this.windowId });

        this.logger.trace("the platform responded to the hello message with a valid extension config");
    }

    private async handleWidgetVisualizationPermission(): Promise<void> {
        if (!this.config?.widget.inject) {
            return this.eventsDispatcher.sendContentMessage<WidgetInjectionPermission>({ command: "permissionResponse", allowed: false });
        }

        const currentChannel = this.channels.find((channel) => channel.name === this.channelsController.my());

        this.eventsDispatcher.sendContentMessage<WidgetInjectionPermission>({ command: "permissionResponse", allowed: true, channels: this.channels, currentChannel });
    }

    private async handleChangeChannel(message: { name: string }): Promise<void> {
        if (message.name === "no-channel") {
            await this.channelsController.leave();
            return;
        }

        await this.channelsController.join(message.name);
    }
}
