/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "../../web";
import { channelContextDecoder, channelNameDecoder } from "../shared/decoders";
import { LibController } from "../shared/types";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { latestFDC3Type } from "../shared/constants";
import { IoC } from "../shared/ioc";
import { GlueBridge } from "../communication/bridge";
import { operations } from "./protocol";
import { WindowsController } from "../windows/controller";
import { WindowChannelConfig } from "../windows/protocol";

export class ChannelsController implements LibController {
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private logger!: Glue42Web.Logger.API;
    private contexts!: Glue42Core.Contexts.API;
    private bridge!: GlueBridge;
    private currentChannelName: string | undefined;
    private unsubscribeFunc: (() => void) | undefined;

    private readonly GlueWebChannelsPrefix = "___channel___";
    private readonly SubsKey = "subs";
    private readonly ChangedKey = "changed";
    private windowsController!: WindowsController;
    private coreGlue!: Glue42Web.API;

    public handlePlatformShutdown(): void {
        this.registry.clear();
    }

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("channels.controller.web");

        this.logger.trace("starting the web channels controller");

        this.contexts = coreGlue.contexts;

        this.bridge = ioc.bridge;

        this.windowsController = ioc.windowsController;

        this.logger.trace("no need for platform registration, attaching the channels property to glue and returning");

        const api = this.toApi();

        (coreGlue as Glue42Web.API).channels = api;

        this.coreGlue = coreGlue as Glue42Web.API;
    }

    public async handleBridgeMessage(): Promise<void> {
        // noop
    }

    public async list(): Promise<Glue42Web.Channels.ChannelContext[]> {
        const channelNames = this.getAllChannelNames();

        const channelContexts = await Promise.all(channelNames.map((channelName) => this.get(channelName)));

        return channelContexts;
    }

    public my(): string {
        return this.current();
    }

    public async join(name: string): Promise<void> {
        const channelNames = this.getAllChannelNames();
        channelNameDecoder(channelNames).runWithException(name);

        await this.switchToChannel(name);
    }

    public onChanged(callback: (channel: string) => void): UnsubscribeFunction {
        return this.changed(callback);
    }

    public async leave(): Promise<void> {
        await this.switchToChannel();
    }

    private toApi(): Glue42Web.Channels.API {
        const api: Glue42Web.Channels.API = {
            subscribe: this.subscribe.bind(this),
            subscribeFor: this.subscribeFor.bind(this),
            publish: this.publish.bind(this),
            all: this.all.bind(this),
            list: this.list.bind(this),
            get: this.get.bind(this),
            join: this.join.bind(this),
            leave: this.leave.bind(this),
            current: this.current.bind(this),
            my: this.my.bind(this),
            changed: this.changed.bind(this),
            onChanged: this.onChanged.bind(this),
            add: this.add.bind(this),
            getMy: this.getMy.bind(this),
            getWindowsOnChannel: this.getWindowsOnChannel.bind(this),
            getWindowsWithChannels: this.getWindowsWithChannels.bind(this)
        };

        return Object.freeze(api);
    }

    private createContextName(channelName: string): string {
        return `${this.GlueWebChannelsPrefix}${channelName}`;
    }

    private getAllChannelNames(): string[] {
        const contextNames = this.contexts.all();

        const channelContextNames = contextNames.filter((contextName) => contextName.startsWith(this.GlueWebChannelsPrefix));

        const channelNames = channelContextNames.map((channelContextName) => channelContextName.replace(this.GlueWebChannelsPrefix, ""));

        return channelNames;
    }

    private unsubscribe(): void {
        if (this.unsubscribeFunc) {
            this.unsubscribeFunc();

            this.unsubscribeFunc = undefined;
        }
    }

    private async switchToChannel(name?: string): Promise<void> {
        this.unsubscribe();

        // TODO: Should be set after `subscribe()` has resolved, but due to an issue where `subscribe()` replays the context before returning an unsubscribe function this has been moved here.
        this.currentChannelName = name;

        const myWindow = this.windowsController.my();

        await this.bridge.send<WindowChannelConfig, void>("windows", operations.setChannel, {windowId: myWindow.id, channel: name});

        // When joining a channel (and not leaving).
        if (typeof name !== "undefined") {
            const contextName = this.createContextName(name);

            this.unsubscribeFunc = await this.contexts.subscribe(contextName, (context, _, __, ___, extraData) => {
                this.registry.execute(this.SubsKey, context.data, context, extraData?.updaterId);
            });
        }

        this.registry.execute(this.ChangedKey, name);
    }

    private async updateData(name: string, data: any): Promise<void> {
        const contextName = this.createContextName(name);
        const fdc3Type = this.getFDC3Type(data);

        if (this.contexts.setPathSupported) {
            const pathValues: Glue42Web.Contexts.PathValue[] = Object.keys(data).map((key) => {
                return {
                    path: `data.${key}`,
                    value: data[key]
                };
            });

            if (fdc3Type) {
                pathValues.push({ path: latestFDC3Type, value: fdc3Type});
            }

            await this.contexts.setPaths(contextName, pathValues);
        } else {
            if (fdc3Type) {
                data[latestFDC3Type] = fdc3Type;
            }

            // Pre @glue42/core 5.2.0. Note that we update the data property only.
            await this.contexts.update(contextName, { data });
        }
    }

    private getFDC3Type(data: any): string | undefined {
        const fdc3PropsArr = Object.keys(data).filter((key: string) => key.indexOf("fdc3_") === 0);

        if (fdc3PropsArr.length === 0) {
            return;
        }

        if (fdc3PropsArr.length > 1) {
            throw new Error("FDC3 does not support updating of multiple context keys");
        }

        return fdc3PropsArr[0].split("_").slice(1).join("_");
    }

    private subscribe(callback: (data: any, context: Glue42Web.Channels.ChannelContext, updaterId: string) => void): UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("Cannot subscribe to channels, because the provided callback is not a function!");
        }

        const currentChannel = this.current();
        
        if (currentChannel) {
            this.replaySubscribe(callback, currentChannel);
        }

        return this.registry.add(this.SubsKey, callback);
    }

    private async subscribeFor(name: string, callback: (data: any, context: Glue42Web.Channels.ChannelContext, updaterId: string) => void): Promise<UnsubscribeFunction> {
        const channelNames = this.getAllChannelNames();
        channelNameDecoder(channelNames).runWithException(name);
        if (typeof callback !== "function") {
            throw new Error(`Cannot subscribe to channel ${name}, because the provided callback is not a function!`);
        }

        const contextName = this.createContextName(name);

        return this.contexts.subscribe(contextName, (context, _, __, ___, extraData) => {
            callback(context.data, context, extraData?.updaterId);
        });
    }

    private publish(data: any, name?: string): Promise<void> {
        if (typeof data !== "object") {
            throw new Error("Cannot publish to channel, because the provided data is not an object!");
        }
        if (typeof name !== "undefined") {
            const channelNames = this.getAllChannelNames();
            channelNameDecoder(channelNames).runWithException(name);

            return this.updateData(name, data);
        }

        if (typeof this.currentChannelName === "undefined") {
            throw new Error("Cannot publish to channel, because not joined to a channel!");
        }

        return this.updateData(this.currentChannelName, data);
    }

    private async all(): Promise<string[]> {
        const channelNames = this.getAllChannelNames();

        return channelNames;
    }

    private async get(name: string): Promise<Glue42Web.Channels.ChannelContext> {
        const channelNames = this.getAllChannelNames();
        channelNameDecoder(channelNames).runWithException(name);

        const contextName = this.createContextName(name);

        const channelContext = await this.contexts.get(contextName);

        if (channelContext.latest_fdc3_type) {
            const { latest_fdc3_type, ...rest} = channelContext;

            return { ...rest };
        }

        return channelContext;
    }

    private current(): string {
        return this.currentChannelName as string;
    }

    private changed(callback: (channel: string) => void): UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("Cannot subscribe to channel changed, because the provided callback is not a function!");
        }

        return this.registry.add(this.ChangedKey, callback);
    }

    private async add(info: Glue42Web.Channels.ChannelContext): Promise<Glue42Web.Channels.ChannelContext> {
        const channelContext = channelContextDecoder.runWithException(info);

        const channelWithSuchNameExists = this.getAllChannelNames().includes(channelContext.name);

        if (channelWithSuchNameExists) {
            throw new Error("There's an already existing channel with such name");
        }

        await this.bridge.send<Glue42Web.Channels.ChannelContext, void>("channels", operations.addChannel, channelContext);

        return channelContext;
    }

    private async getMy(): Promise<Glue42Web.Channels.ChannelContext | undefined> {
        const currentChannel = this.current();

        if (!currentChannel) {
            return Promise.resolve(undefined);
        }

        return this.get(currentChannel);
    }

    private async getWindowsOnChannel(channel: string): Promise<Glue42Web.Windows.WebWindow[]> {
        if (typeof channel !== "string") {
            throw new Error("Please provide the channel name as a string");
        }

        const windowsWithChannels = await this.getWindowsWithChannels({channels: [channel]});

        const result = windowsWithChannels.map(w => w.window);

        return result;
    }

    private async getWindowsWithChannels(filter?: Glue42Web.Channels.WindowWithChannelFilter): Promise<Glue42Web.Channels.WindowOnChannelInfo[]> {
        const windowsWithChannels = await this.bridge.send<Glue42Web.Channels.WindowWithChannelFilter | undefined, {windows: Glue42Web.Channels.WindowIdOnChannelInfo[]}>("channels", operations.getWindowsWithChannels, filter);
      
        const windowsList = this.coreGlue.windows.list();

        const result =
            windowsWithChannels?.windows
                ?.map((w) => {
                    const webWindow = windowsList.find(
                        (x) => x.id === w.windowId
                    );
                    let windowWithChannel = null;

                    if (webWindow) {
                        windowWithChannel = {
                            window: windowsList.find(
                                (x) => x.id === w.windowId
                            ),
                            channel: w.channel,
                            application: w.application,
                        };
                    }

                    return windowWithChannel;
                }).filter((w): w is Glue42Web.Channels.WindowOnChannelInfo => !!w) || [];

        return result;
    }

    private replaySubscribe = (callback: (data: any, context: Glue42Web.Channels.ChannelContext, updaterId: string) => void,  channelId: string) => {
        this.get(channelId)
            .then((channelContext: Glue42Web.Channels.ChannelContext) => {
                if (typeof channelContext.data === "object" && Object.keys(channelContext.data).length) {
                    const contextName = this.createContextName(channelContext.name);

                    return this.contexts.subscribe(contextName, (context, _, __, ___, extraData) => {
                        callback(context.data, context, extraData?.updaterId);
                    });
                }
            })
            .then((un: (() => void) | undefined) => {
                if (un && typeof un === "function") {
                    un();
                }
            })
            .catch(err => this.logger.trace(err));
    };
}
