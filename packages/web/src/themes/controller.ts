/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "../../web";
import { GlueBridge } from "../communication/bridge";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction
} from "callback-registry";
import { nonEmptyStringDecoder, simpleThemeResponseDecoder } from "../shared/decoders";
import { AllThemesResponse, operations, SelectThemeConfig, SimpleThemeResponse } from "./protocol";

export class ThemesController implements LibController {

    private logger!: Glue42Web.Logger.API;
    private bridge!: GlueBridge;
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private themesSubscription: Glue42Core.AGM.Subscription | undefined;
    private activeThemeSubs = 0;

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("themes.controller.web");

        this.logger.trace("starting the web themes controller");

        this.bridge = ioc.bridge;

        const api = this.toApi();

        (coreGlue as Glue42Web.API).themes = api;

        this.logger.trace("themes are ready");
    }

    public async handleBridgeMessage(): Promise<void> {
        // noop, because we do not want theme changes notifications to be published by default
    }

    private toApi(): Glue42Web.Themes.API {
        const api: Glue42Web.Themes.API = {
            getCurrent: this.getCurrent.bind(this),
            list: this.list.bind(this),
            select: this.select.bind(this),
            onChanged: this.onChanged.bind(this)
        };

        return Object.freeze(api);
    }

    private async getCurrent(): Promise<Glue42Web.Themes.Theme> {

        const bridgeResponse = await this.bridge.send<void, SimpleThemeResponse>("themes", operations.getCurrent, undefined, undefined, { includeOperationCheck: true });

        return bridgeResponse.theme;
    }

    private async list(): Promise<Glue42Web.Themes.Theme[]> {
        const bridgeResponse = await this.bridge.send<void, AllThemesResponse>("themes", operations.list, undefined, undefined, { includeOperationCheck: true });

        return bridgeResponse.themes;
    }

    private async select(name: string): Promise<void> {
        nonEmptyStringDecoder.runWithException(name);

        await this.bridge.send<SelectThemeConfig, void>("themes", operations.select, { name }, undefined, { includeOperationCheck: true });
    }

    private async onChanged(callback: (theme: Glue42Web.Themes.Theme) => any): Promise<UnsubscribeFunction> {

        if (typeof callback !== "function") {
            throw new Error("onChanged requires a callback of type function");
        }

        const subReady = this.themesSubscription ?
            Promise.resolve() :
            this.configureThemeSubscription();

        await subReady;

        ++this.activeThemeSubs;
        const unsubFunc = this.registry.add("on-theme-change", callback);

        return () => this.themeUnsub(unsubFunc);
    }

    private async configureThemeSubscription(): Promise<void> {
        if (this.themesSubscription) {
            return;
        }

        this.themesSubscription = await this.bridge.createNotificationsSteam();

        this.themesSubscription.onData((data) => {
            const eventData = data.data;

            const validation = simpleThemeResponseDecoder.run(eventData);

            if (!validation.ok) {
                this.logger.warn(`Received invalid theme data on the theme event stream: ${JSON.stringify(validation.error)}`);
                return;
            }

            const themeChanged = validation.result;

            this.registry.execute("on-theme-change", themeChanged.theme);
        });

        this.themesSubscription.onClosed(() => {
            this.logger.warn("The Themes interop stream was closed, no theme changes notifications will be received");
            this.registry.clear();
            this.activeThemeSubs = 0;
            delete this.themesSubscription;
        });

    }

    private themeUnsub(registryUnsub: UnsubscribeFunction): void {
        registryUnsub();
        --this.activeThemeSubs;

        if (this.activeThemeSubs) {
            return;
        }

        this.themesSubscription?.close();

        delete this.themesSubscription;
    }
}