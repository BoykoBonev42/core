/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "@glue42/web";
import { BridgeOperation, InternalPlatformConfig, LibController, OperationCheckConfig, OperationCheckResult } from "../../common/types";
import { GlueController } from "../../controllers/glue";
import { ServiceWorkerController } from "../../controllers/serviceWorker";
import { SessionStorageController } from "../../controllers/session";
import { operationCheckConfigDecoder, operationCheckResultDecoder } from "../../shared/decoders";
import logger from "../../shared/logger";
import { allNotificationsDataDecoder, notificationClickConfigDecoder, notificationsOperationDecoder, permissionQueryResultDecoder, permissionRequestResultDecoder, raiseNotificationDecoder, simpleNotificationSelectDecoder } from "./decoders";
import { AllNotificationsData, NotificationClickConfig, NotificationEventPayload, NotificationsOperationsTypes, PermissionQueryResult, PermissionRequestResult, RaiseNotificationConfig, SimpleNotificationSelect } from "./types";

export class NotificationsController implements LibController {

    private started = false;
    private isInExtension = false;
    private enableToasts!: boolean;
    private clearNotificationOnClick!: boolean;
    private extNotificationConfig: { defaultIcon: string; defaultMessage: string } | undefined;

    private operations: { [key in NotificationsOperationsTypes]: BridgeOperation } = {
        raiseNotification: { name: "raiseNotification", execute: this.handleRaiseNotification.bind(this), dataDecoder: raiseNotificationDecoder },
        requestPermission: { name: "requestPermission", resultDecoder: permissionRequestResultDecoder, execute: this.handleRequestPermission.bind(this) },
        getPermission: { name: "getPermission", resultDecoder: permissionQueryResultDecoder, execute: this.handleGetPermission.bind(this) },
        operationCheck: { name: "operationCheck", dataDecoder: operationCheckConfigDecoder, resultDecoder: operationCheckResultDecoder, execute: this.handleOperationCheck.bind(this) },
        list: { name: "list", resultDecoder: allNotificationsDataDecoder, execute: this.handleList.bind(this) },
        click: { name: "click", dataDecoder: notificationClickConfigDecoder, execute: this.handleClick.bind(this) },
        clear: { name: "clear", dataDecoder: simpleNotificationSelectDecoder, execute: this.handleClear.bind(this) },
        clearAll: { name: "clearAll", execute: this.handleClearAll.bind(this) }
    };

    constructor(
        private readonly glueController: GlueController,
        private readonly serviceWorkerController: ServiceWorkerController,
        private readonly session: SessionStorageController
    ) {}

    private get logger(): Glue42Web.Logger.API | undefined {
        return logger.get("notifications.controller");
    }

    public async start(config: InternalPlatformConfig): Promise<void> {

        if (!config.notifications.enable) {
            this.logger?.log("Skipping the notifications controller initialization, because it was disabled upon platform initialization");
            return;
        }

        this.enableToasts = config.notifications.enableToasts;
        this.clearNotificationOnClick = config.notifications.clearNotificationOnClick;

        this.started = true;

        const currentProtocol = (new URL(window.location.href)).protocol;

        if (currentProtocol.includes("extension")) {
            await this.setupExtensionNotifications();
        }

        this.listenForServiceWorkerNotificationEvents();
    }

    private async handleOperationCheck(config: OperationCheckConfig): Promise<OperationCheckResult> {
        const operations = Object.keys(this.operations);

        const isSupported = operations.some((operation) => operation.toLowerCase() === config.operation.toLowerCase());

        return { isSupported };
    }

    public async handleControl(args: any): Promise<any> {
        if (!this.started) {
            new Error("Cannot handle this notifications control message, because the controller has not been started");
        }

        const notificationsData = args.data;

        const commandId = args.commandId;

        const operationValidation = notificationsOperationDecoder.run(args.operation);

        if (!operationValidation.ok) {
            throw new Error(`This notifications request cannot be completed, because the operation name did not pass validation: ${JSON.stringify(operationValidation.error)}`);
        }

        const operationName: NotificationsOperationsTypes = operationValidation.result;

        const incomingValidation = this.operations[operationName].dataDecoder?.run(notificationsData);

        if (incomingValidation && !incomingValidation.ok) {
            throw new Error(`Notifications request for ${operationName} rejected, because the provided arguments did not pass the validation: ${JSON.stringify(incomingValidation.error)}`);
        }

        this.logger?.debug(`[${commandId}] ${operationName} command is valid with data: ${JSON.stringify(notificationsData)}`);

        const result = await this.operations[operationName].execute(notificationsData, commandId);

        const resultValidation = this.operations[operationName].resultDecoder?.run(result);

        if (resultValidation && !resultValidation.ok) {
            throw new Error(`Notifications request for ${operationName} could not be completed, because the operation result did not pass the validation: ${JSON.stringify(resultValidation.error)}`);
        }

        this.logger?.trace(`[${commandId}] ${operationName} command was executed successfully`);

        return result;
    }

    private async handleList(_: unknown, commandId: string): Promise<AllNotificationsData> {
        this.logger?.trace(`[${commandId}] handling a list notification message`);

        const allNotifications = this.session.getAllNotifications();

        this.logger?.trace(`[${commandId}] list notification message completed`);

        return { notifications: allNotifications };
    }

    private async handleClick(config: NotificationClickConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling a click notification message with data: ${JSON.stringify(config)}`);

        const notification = this.session.getNotification(config.id);

        if (!notification) {
            throw new Error(`Cannot click a notification: ${config.id}, because it doesn't exist`);
        }

        if (config.action && notification.actions?.every((action) => action.action !== config.action)) {
            throw new Error(`Cannot click action ${config.action} of  ${config.id}, because that notification does not have that action`);
        }

        this.handleNotificationClick({ notification, action: config.action });

        this.logger?.trace(`[${commandId}] handling a click notification message completed`);
    }

    private async handleClear(config: SimpleNotificationSelect, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling a clear notification message with data: ${JSON.stringify(config)}`);

        this.removeNotification(config.id);

        this.logger?.trace(`[${commandId}] handling a clear notification message completed`);
    }

    private async handleClearAll(_: unknown, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling a clearAll notifications message`);

        const allNotifications = this.session.getAllNotifications();

        allNotifications.forEach((notification) => this.removeNotification(notification.id));

        this.logger?.trace(`[${commandId}] handling a clearAll notification message completed`);
    }

    private async handleRaiseNotification({ settings, id }: RaiseNotificationConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling a raise notification message with a title: ${settings.title}`);

        this.processNewNotification(settings, id);

        // system-level enable/disable always takes precedence 
        const showToast = this.enableToasts ? !!settings.showToast : this.enableToasts;

        await this.showToast({ settings, id }, showToast, commandId);

        const definition = Object.assign({}, settings, { title: undefined, clickInterop: undefined, actions: undefined });

        const notificationEventPayload: NotificationEventPayload = { definition, id };

        // setImmediate allows the client which raises the event, to resolve the raise promise before receiving the show event
        // which in turn allows the user to not miss the event
        setTimeout(() => this.glueController.pushSystemMessage("notifications", "notificationShow", notificationEventPayload), 0);

        this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was successfully raised`);
    }

    private async showToast({ settings, id }: RaiseNotificationConfig, showToast: boolean, commandId: string): Promise<void> {
        if (!showToast) {
            return;
        }

        if (this.isInExtension) {
            await this.raiseExtensionToast(settings, id, commandId);

            return;
        }

        const hasDefinedActions = settings.actions && settings.actions.length;

        if (hasDefinedActions) {
            await this.raiseActionsToast(settings, id, commandId);

            return;
        }

        this.raiseSimpleToast(settings, id, commandId);
    }

    private async handleGetPermission(_: unknown, commandId: string): Promise<PermissionQueryResult> {
        this.logger?.trace(`[${commandId}] handling a get permission message`);

        const permissionValue = Notification.permission;

        this.logger?.trace(`[${commandId}] permission for raising notifications is: ${permissionValue}`);

        return { permission: permissionValue };
    }

    private async handleRequestPermission(_: unknown, commandId: string): Promise<PermissionRequestResult> {
        this.logger?.trace(`[${commandId}] handling a request permission message`);

        let permissionValue = Notification.permission;

        if (permissionValue !== "granted") {
            permissionValue = await Notification.requestPermission();
        }

        const permissionGranted = permissionValue === "granted";

        this.logger?.trace(`[${commandId}] permission for raising notifications is: ${permissionValue}`);

        return { permissionGranted };
    }

    private async raiseSimpleToast(settings: Glue42Web.Notifications.RaiseOptions, id: string, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was found to be non-persistent and therefore will be raised with the native notifications API`);

        const options: NotificationOptions = Object.assign({}, settings, { title: undefined, clickInterop: undefined });

        const notification = new Notification(settings.title, options);

        notification.onclick = (): void => {

            // do not refactor to a separate function
            // will break the focus due to browser limitations
            if (settings.focusPlatformOnDefaultClick) {
                window.focus();
            }

            const notificationData = this.session.getNotification(id);

            if (!notificationData) {
                return;
            }

            this.handleNotificationClick({ action: "", notification: notificationData });
        };

        notification.onclose = (): void => this.removeNotification(id);
    }

    private async raiseActionsToast(settings: Glue42Web.Notifications.RaiseOptions, id: string, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} was found to be persistent and therefore the service worker will be instructed to raise it.`);

        await this.serviceWorkerController.showNotification(settings, id);
    }

    private raiseExtensionToast(settings: Glue42Web.Notifications.RaiseOptions, id: string, commandId: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            this.logger?.trace(`[${commandId}] notification with a title: ${settings.title} will be raised with the native extension notifications API, because the platform is running in extension mode`);

            // need to get the notifications config from chrome
            if (!this.extNotificationConfig) {
                return reject("Cannot raise a notification, because the environment settings for the extension mode are missing.");
            }

            const buttons = settings.actions ?
                settings.actions.map((action) => ({ title: action.title, iconUrl: action.icon })) :
                undefined;

            const chromeOptions: any = {
                type: "basic",
                iconUrl: settings.icon || this.extNotificationConfig.defaultIcon,
                title: settings.title,
                message: settings.body || this.extNotificationConfig.defaultMessage,
                silent: settings.silent,
                requireInteraction: settings.requireInteraction,
                imageUrl: settings.image,
                buttons
            };

            chrome.notifications.create(id, chromeOptions, () => resolve());
        });
    }

    private async setupExtensionNotifications(): Promise<void> {
        this.isInExtension = true;
        this.extNotificationConfig = (await this.getExtNotificationsConfig()).notifications;
        this.listenForExtensionNotificationsEvents();
    }

    private listenForExtensionNotificationsEvents(): void {
        chrome.notifications.onClicked.addListener((id) => {

            const notificationData = this.session.getNotification(id);

            if (!notificationData) {
                return;
            }

            this.handleNotificationClick({ notification: notificationData });
        });

        chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {

            const notificationData = this.session.getNotification(id);

            if (!notificationData) {
                return;
            }

            if (!notificationData.actions) {
                return;
            }

            const action = notificationData.actions[buttonIndex].action;

            this.handleNotificationClick({ action, notification: notificationData });
        });

        chrome.notifications.onClosed.addListener((id) => this.removeNotification(id));
    }

    private listenForServiceWorkerNotificationEvents(): void {
        this.serviceWorkerController.onNotificationClick((clickData) => {
            const notificationData = this.session.getNotification(clickData.glueData.id);

            if (!notificationData) {
                return;
            }

            this.handleNotificationClick({ action: clickData.action, notification: notificationData });
        });

        this.serviceWorkerController.onNotificationClose((notification) => this.removeNotification(notification.glueData.id));
    }

    private getExtNotificationsConfig(): Promise<{ notifications: { defaultIcon: string; defaultMessage: string } }> {
        return new Promise((resolve) => {
            chrome.storage.local.get("notifications", (entry: any) => {
                resolve(entry);
            });
        });
    }

    private handleNotificationClick(clickData: { notification: Glue42Web.Notifications.NotificationData; action?: string }): void {
        if (!clickData.action && clickData.notification.clickInterop) {
            this.callDefinedInterop(clickData.notification.clickInterop);
        }

        const foundNotificationInteropAction = clickData.action ?
            clickData.notification.actions?.find((actionDef) => actionDef.action === clickData.action) :
            null;

        if (foundNotificationInteropAction && foundNotificationInteropAction.interop) {
            this.callDefinedInterop(foundNotificationInteropAction.interop);
        }

        if (clickData.notification.data?.glueData) {
            delete clickData.notification.data.glueData;
        }

        const notificationEventPayload: NotificationEventPayload = {
            definition: clickData.notification,
            action: clickData.action,
            id: clickData.notification.id
        };

        if (this.clearNotificationOnClick) {
            this.removeNotification(clickData.notification.id);
        }

        this.glueController.pushSystemMessage("notifications", "notificationClick", notificationEventPayload);
    }

    private callDefinedInterop(interopConfig: Glue42Web.Notifications.InteropActionSettings): void {
        const method = interopConfig.method;
        const args = interopConfig.arguments;
        const target = interopConfig.target;

        this.glueController.invokeMethod(method, args, target)
            .catch((err) => {
                const stringError = typeof err === "string" ? err : JSON.stringify(err.message);
                this.logger?.warn(`The interop invocation defined in the clickInterop was rejected, reason: ${stringError}`);
            });
    }

    private processNewNotification(settings: Glue42Web.Notifications.RaiseOptions, id: string): void {
        const notificationData: Glue42Web.Notifications.NotificationData = { id, ...settings };

        this.session.saveNotification(notificationData);

        this.glueController.pushSystemMessage("notifications", "notificationRaised", { notification: notificationData });
    }

    private removeNotification(id: string): void {
        this.session.removeNotification(id);

        this.glueController.pushSystemMessage("notifications", "notificationClosed", { id });
    }
}
