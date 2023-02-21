/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "../../web";
import { GlueBridge } from "../communication/bridge";
import { glue42NotificationOptionsDecoder, nonEmptyStringDecoder, notificationsOperationTypesDecoder } from "../shared/decoders";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import { AllNotificationsData, NotificationClickConfig, NotificationEventPayload, operations, PermissionQueryResult, PermissionRequestResult, RaiseNotification, SimpleNotificationData, SimpleNotificationSelect } from "./protocol";
import { generate } from "shortid";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction
} from "callback-registry";

export class NotificationsController implements LibController {
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private logger!: Glue42Web.Logger.API;
    private bridge!: GlueBridge;
    private notificationsSettings?: Glue42Web.Notifications.Settings;
    private notifications: { [key in string]: Glue42Web.Notifications.Notification } = {};
    private coreGlue!: Glue42Core.GlueCore;
    private buildNotificationFunc!: (config: Glue42Web.Notifications.RaiseOptions, id: string) => Glue42Web.Notifications.Notification;

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("notifications.controller.web");

        this.logger.trace("starting the web notifications controller");

        this.bridge = ioc.bridge;

        this.coreGlue = coreGlue;

        this.notificationsSettings = ioc.config.notifications;

        this.buildNotificationFunc = ioc.buildNotification;

        const api = this.toApi();

        this.addOperationExecutors();

        (coreGlue as Glue42Web.API).notifications = api;

        this.logger.trace("notifications are ready");
    }

    public async handleBridgeMessage(args: any): Promise<void> {
        const operationName = notificationsOperationTypesDecoder.runWithException(args.operation);

        const operation = operations[operationName];

        if (!operation.execute) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let operationData: any = args.data;

        if (operation.dataDecoder) {
            operationData = operation.dataDecoder.runWithException(args.data);
        }

        return await operation.execute(operationData);
    }

    private toApi(): Glue42Web.Notifications.API {
        const api: Glue42Web.Notifications.API = {
            raise: this.raise.bind(this),
            requestPermission: this.requestPermission.bind(this),
            getPermission: this.getPermission.bind(this),
            list: this.list.bind(this),
            onRaised: this.onRaised.bind(this),
            onClosed: this.onClosed.bind(this),
            click: this.click.bind(this),
            clear: this.clear.bind(this),
            clearAll: this.clearAll.bind(this)
        };

        return Object.freeze(api);
    }

    private async getPermission(): Promise<"default" | "granted" | "denied"> {

        const queryResult = await this.bridge.send<void, PermissionQueryResult>("notifications", operations.getPermission, undefined);

        return queryResult.permission;
    }

    private async requestPermission(): Promise<boolean> {

        const permissionResult = await this.bridge.send<void, PermissionRequestResult>("notifications", operations.requestPermission, undefined);

        return permissionResult.permissionGranted;
    }

    private async raise(options: Glue42Web.Notifications.RaiseOptions): Promise<Glue42Web.Notifications.Notification> {
        const settings = glue42NotificationOptionsDecoder.runWithException(options);

        settings.showToast = typeof settings.showToast === "boolean" ? settings.showToast : true;
        settings.showInPanel = typeof settings.showInPanel === "boolean" ? settings.showInPanel : true;

        const permissionGranted = await this.requestPermission();

        if (!permissionGranted) {
            throw new Error("Cannot raise the notification, because the user has declined the permission request");
        }

        const id = generate();

        await this.bridge.send<RaiseNotification, void>("notifications", operations.raiseNotification, { settings, id });

        const notification = this.buildNotificationFunc(options, id);

        this.notifications[id] = notification;

        return notification;
    }

    private async list(): Promise<Glue42Web.Notifications.NotificationData[]> {
        const bridgeResponse = await this.bridge.send<void, AllNotificationsData>("notifications", operations.list, undefined, undefined, { includeOperationCheck: true });

        return bridgeResponse.notifications;
    }

    private onRaised(callback: (notification: Glue42Web.Notifications.NotificationData) => void): UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onRaised expects a callback of type function");
        }

        return this.registry.add("notification-raised", callback);
    }

    private onClosed(callback: (notification: SimpleNotificationSelect) => void): UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onRaised expects a callback of type function");
        }

        return this.registry.add("notification-closed", callback);
    }

    private async click(id: string, action?: string): Promise<void> {
        nonEmptyStringDecoder.runWithException(id);

        if (action) {
            nonEmptyStringDecoder.runWithException(action);
        }

        await this.bridge.send<NotificationClickConfig, void>("notifications", operations.click, { id, action }, undefined, { includeOperationCheck: true });
    }

    private async clear(id: string): Promise<void> {
        nonEmptyStringDecoder.runWithException(id);

        await this.bridge.send<SimpleNotificationSelect, void>("notifications", operations.clear, { id }, undefined, { includeOperationCheck: true });
    }

    private async clearAll(): Promise<void> {
        await this.bridge.send<void, void>("notifications", operations.clearAll, undefined, undefined, { includeOperationCheck: true });
    }

    private addOperationExecutors(): void {
        operations.notificationShow.execute = this.handleNotificationShow.bind(this);
        operations.notificationClick.execute = this.handleNotificationClick.bind(this);
        operations.notificationRaised.execute = this.handleNotificationRaised.bind(this);
        operations.notificationClosed.execute = this.handleNotificationClosed.bind(this);
    }

    private async handleNotificationShow(data: NotificationEventPayload): Promise<void> {

        if (!data.id) {
            return;
        }

        const notification = this.notifications[data.id];
        if (notification && notification.onshow) {
            notification.onshow();
        }
    }

    private async handleNotificationClick(data: NotificationEventPayload): Promise<void> {

        if (!data.action && this.notificationsSettings?.defaultClick) {
            this.notificationsSettings.defaultClick(this.coreGlue as Glue42Web.API, data.definition);
        }

        if (data.action && this.notificationsSettings?.actionClicks?.some((actionDef) => actionDef.action === data.action)) {
            const foundHandler = this.notificationsSettings?.actionClicks?.find((actionDef) => actionDef.action === data.action) as Glue42Web.Notifications.ActionClickHandler;

            foundHandler.handler(this.coreGlue as Glue42Web.API, data.definition);
        }

        if (!data.id) {
            return;
        }

        const notification = this.notifications[data.id];

        if (notification && notification.onclick) {
            notification.onclick();
            delete this.notifications[data.id];
        }

    }

    private async handleNotificationRaised(data: SimpleNotificationData): Promise<void> {
        this.registry.execute("notification-raised", data.notification);
    }

    private async handleNotificationClosed(data: SimpleNotificationSelect): Promise<void> {
        this.registry.execute("notification-closed", data);
    }
}
