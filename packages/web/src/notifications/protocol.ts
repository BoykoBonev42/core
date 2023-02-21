import { Glue42Web } from "../../web";
import { allNotificationsDataDecoder, notificationEventPayloadDecoder, permissionQueryResultDecoder, permissionRequestResultDecoder, raiseNotificationDecoder, simpleNotificationDataDecoder, simpleNotificationSelectDecoder } from "../shared/decoders";
import { BridgeOperation } from "../shared/types";

export type NotificationsOperationTypes = "raiseNotification" | "requestPermission" | "notificationShow" | "notificationClick" | "getPermission" |
    "list" | "notificationRaised" | "notificationClosed" | "click" | "clear" | "clearAll";

export type NotificationPermissionTypes = "default" | "granted" | "denied";

export const operations: { [key in NotificationsOperationTypes]: BridgeOperation } = {
    raiseNotification: { name: "raiseNotification", dataDecoder: raiseNotificationDecoder },
    requestPermission: { name: "requestPermission", resultDecoder: permissionRequestResultDecoder },
    notificationShow: { name: "notificationShow", dataDecoder: notificationEventPayloadDecoder },
    notificationClick: { name: "notificationClick", dataDecoder: notificationEventPayloadDecoder },
    getPermission: { name: "getPermission", resultDecoder: permissionQueryResultDecoder },
    list: { name: "list", resultDecoder: allNotificationsDataDecoder },
    notificationRaised: { name: "notificationRaised", dataDecoder: simpleNotificationDataDecoder },
    notificationClosed: { name: "notificationClosed", dataDecoder: simpleNotificationSelectDecoder },
    click: { name: "click" },
    clear: { name: "clear" },
    clearAll: { name: "clearAll" }
};

export interface RaiseNotification {
    settings: Glue42Web.Notifications.RaiseOptions;
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

export interface SimpleNotificationData {
    notification: Glue42Web.Notifications.NotificationData;
}

export interface AllNotificationsData {
    notifications: Glue42Web.Notifications.NotificationData[];
}

export interface NotificationClickConfig {
    id: string;
    action?: string;
}

export interface SimpleNotificationSelect {
    id: string;
}
