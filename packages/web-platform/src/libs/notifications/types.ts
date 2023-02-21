import { Glue42Web } from "@glue42/web";

export type NotificationsOperationsTypes = "raiseNotification" | "requestPermission" | "getPermission" | "operationCheck" |
    "list" | "click" | "clear" | "clearAll";

export type NotificationPermissionTypes = "default" | "granted" | "denied";

export interface RaiseNotificationConfig {
    settings: Glue42Web.Notifications.RaiseOptions;
    id: string;
}

export interface GlueNotificationData {
    clickInterop?: Glue42Web.Notifications.InteropActionSettings;
    actions?: Glue42Web.Notifications.NotificationAction[];
    focusPlatformOnDefaultClick?: boolean;
    id: string;
}

export interface PermissionRequestResult {
    permissionGranted: boolean;
}

export interface PermissionQueryResult {
    permission: NotificationPermissionTypes;
}

export interface NotificationEventPayload {
    definition: Glue42Web.Notifications.NotificationDefinition;
    action?: string;
    id?: string;
}

export interface NotificationClickConfig {
    id: string;
    action?: string;
}

export interface SimpleNotificationSelect {
    id: string;
}

export interface AllNotificationsData {
    notifications: Glue42Web.Notifications.NotificationData[];
}