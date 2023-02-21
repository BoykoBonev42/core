/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebWindowModel } from "../windows/webWindow";
import { LibController, LibDomains, ParsedConfig } from "./types";
import { WindowsController } from "../windows/controller";
import { Glue42Core } from "@glue42/core";
import { GlueBridge } from "../communication/bridge";
import { AppManagerController } from "../appManager/controller";
import { WindowProjection } from "../windows/protocol";
import { BaseApplicationData, InstanceData } from "../appManager/protocol";
import { Glue42Web } from "../../web";
import { InstanceModel } from "../appManager/instance";
import { ApplicationModel } from "../appManager/application";
import { LayoutsController } from "../layouts/controller";
import { NotificationsController } from "../notifications/controller";
import { IntentsController } from "../intents/controller";
import { ChannelsController } from "../channels/controller";
import { SystemController } from "../system/controller";
import { Notification } from "../notifications/notification";
import { ExtController } from "../extension/controller";
import { EventsDispatcher } from "./dispatcher";
import { PreferredConnectionController } from "../communication/preferred";
import { LegacyIntentsHelper } from "../intents/legacyHelper";
import { ThemesController } from "../themes/controller";

export class IoC {
    private _coreGlue!: Glue42Core.GlueCore;
    private _communicationId!: string;
    private _actualWindowId!: string;
    private _publicWindowId!: string;
    private _webConfig!: ParsedConfig;
    private _windowsControllerInstance!: WindowsController;
    private _appManagerControllerInstance!: AppManagerController;
    private _layoutsControllerInstance!: LayoutsController;
    private _notificationsControllerInstance!: NotificationsController;
    private _intentsControllerInstance!: IntentsController;
    private _legacyIntentsHelperInstance!: LegacyIntentsHelper;
    private _channelsControllerInstance!: ChannelsController;
    private _themesControllerInstance!: ThemesController;
    private _extensionController!: ExtController;
    private _systemControllerInstance!: SystemController;
    private _bridgeInstance!: GlueBridge;
    private _eventsDispatcher!: EventsDispatcher;
    private _preferredConnectionController!: PreferredConnectionController;

    public controllers: { [key in LibDomains]: LibController } = {
        windows: this.windowsController,
        appManager: this.appManagerController,
        layouts: this.layoutsController,
        notifications: this.notificationsController,
        intents: this.intentsController,
        channels: this.channelsController,
        system: this.systemController,
        extension: this.extensionController,
        themes: this.themesController
    };

    public get communicationId(): string {
        return this._communicationId;
    }

    public get publicWindowId(): string {
        if (!this._publicWindowId) {
            throw new Error("Accessing undefined public window id.");
        }

        return this._publicWindowId;
    }

    public get actualWindowId(): string {
        // the non-workspaces iframes are not considered "GDWindows", so they do not have an actual window id
        // they present themselves with the windowId of their parent.
        return this._actualWindowId;
    }

    public get windowsController(): WindowsController {
        if (!this._windowsControllerInstance) {
            this._windowsControllerInstance = new WindowsController();
        }

        return this._windowsControllerInstance;
    }

    public get appManagerController(): AppManagerController {
        if (!this._appManagerControllerInstance) {
            this._appManagerControllerInstance = new AppManagerController();
        }

        return this._appManagerControllerInstance;
    }

    public get layoutsController(): LayoutsController {
        if (!this._layoutsControllerInstance) {
            this._layoutsControllerInstance = new LayoutsController();
        }

        return this._layoutsControllerInstance;
    }

    public get themesController(): ThemesController {
        if (!this._themesControllerInstance) {
            this._themesControllerInstance = new ThemesController();
        }

        return this._themesControllerInstance;
    }

    public get notificationsController(): NotificationsController {
        if (!this._notificationsControllerInstance) {
            this._notificationsControllerInstance = new NotificationsController();
        }

        return this._notificationsControllerInstance;
    }

    public get intentsController(): IntentsController {
        if (!this._intentsControllerInstance) {
            this._intentsControllerInstance = new IntentsController();
        }

        return this._intentsControllerInstance;
    }

    public get legacyIntentsHelper(): LegacyIntentsHelper {
        if (!this._legacyIntentsHelperInstance) {
            this._legacyIntentsHelperInstance = new LegacyIntentsHelper(this._coreGlue.logger, this.bridge, this._coreGlue.interop, this.appManagerController, this.windowsController);
        }

        return this._legacyIntentsHelperInstance;
    }

    public get systemController(): SystemController {
        if (!this._systemControllerInstance) {
            this._systemControllerInstance = new SystemController();
        }

        return this._systemControllerInstance;
    }

    public get channelsController(): ChannelsController {
        if (!this._channelsControllerInstance) {
            this._channelsControllerInstance = new ChannelsController();
        }

        return this._channelsControllerInstance;
    }

    public get extensionController(): ExtController {
        if (!this._extensionController) {
            this._extensionController = new ExtController();
        }

        return this._extensionController;
    }

    public get eventsDispatcher(): EventsDispatcher {
        if (!this._eventsDispatcher) {
            this._eventsDispatcher = new EventsDispatcher(this.config);
        }

        return this._eventsDispatcher;
    }

    public get bridge(): GlueBridge {
        if (!this._bridgeInstance) {
            this._bridgeInstance = new GlueBridge(this._coreGlue, this.communicationId);
        }

        return this._bridgeInstance;
    }

    public get preferredConnectionController(): PreferredConnectionController {
        if (!this._preferredConnectionController) {
            this._preferredConnectionController = new PreferredConnectionController(this._coreGlue);
        }

        return this._preferredConnectionController;
    }

    public get config(): ParsedConfig {
        return this._webConfig;
    }

    public defineGlue(coreGlue: Glue42Core.GlueCore): void {
        this._coreGlue = coreGlue;

        this._publicWindowId = (coreGlue as any).connection.transport.publicWindowId;
        this._actualWindowId = coreGlue.interop.instance.windowId as string;

        // the communicationId will be available in the glue42core namespace if this client is an internal client to the platform
        this._communicationId = (coreGlue as any).connection.transport.communicationId || (window as any).glue42core.communicationId;
    }

    public defineConfig(config: ParsedConfig): void {
        this._webConfig = config;
    }

    public async buildWebWindow(id: string, name: string): Promise<WindowProjection> {

        const model = new WebWindowModel(id, name, this.bridge);

        const api = await model.toApi();

        return { id, model, api };
    }

    public buildNotification(config: Glue42Web.Notifications.RaiseOptions, id: string): Glue42Web.Notifications.Notification {
        return new Notification(config, id);
    }

    public async buildApplication(app: BaseApplicationData, applicationInstances: InstanceData[]): Promise<Glue42Web.AppManager.Application> {

        const application = (new ApplicationModel(app, [], this.appManagerController)).toApi();

        const instances = applicationInstances.map((instanceData) => this.buildInstance(instanceData, application));

        application.instances.push(...instances);

        return application;
    }

    public buildInstance(instanceData: InstanceData, app: Glue42Web.AppManager.Application): Glue42Web.AppManager.Instance {
        return (new InstanceModel(instanceData, this.bridge, app)).toApi();
    }
}
