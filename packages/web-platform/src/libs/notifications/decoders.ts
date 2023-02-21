import { Glue42Web } from "@glue42/web";
import { anyJson, array, boolean, constant, Decoder, number, object, oneOf, optional, string } from "decoder-validate";
import { nonEmptyStringDecoder, nonNegativeNumberDecoder } from "../../shared/decoders";
import { AllNotificationsData, NotificationClickConfig, NotificationsOperationsTypes, PermissionQueryResult, PermissionRequestResult, RaiseNotificationConfig, SimpleNotificationSelect } from "./types";

export const notificationsOperationDecoder: Decoder<NotificationsOperationsTypes> = oneOf<"raiseNotification" | "requestPermission" | "getPermission" | "operationCheck" | "list" | "click" | "clear" | "clearAll">(
    constant("raiseNotification"),
    constant("requestPermission"),
    constant("getPermission"),
    constant("operationCheck"),
    constant("list"),
    constant("clear"),
    constant("click"),
    constant("clearAll")
);


const interopActionSettingsDecoder: Decoder<Glue42Web.Notifications.InteropActionSettings> = object({
    method: nonEmptyStringDecoder,
    arguments: optional(anyJson()),
    target: optional(oneOf<"all" | "best">(
        constant("all"),
        constant("best")
    ))
});

const glue42NotificationActionDecoder: Decoder<Glue42Web.Notifications.NotificationAction> = object({
    action: string(),
    title: nonEmptyStringDecoder,
    icon: optional(string()),
    interop: optional(interopActionSettingsDecoder)
});

const glue42NotificationOptionsDecoder: Decoder<Glue42Web.Notifications.RaiseOptions> = object({
    title: nonEmptyStringDecoder,
    clickInterop: optional(interopActionSettingsDecoder),
    actions: optional(array(glue42NotificationActionDecoder)),
    focusPlatformOnDefaultClick: optional(boolean()),
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number())),
    severity: optional(oneOf<"Low" | "Medium" | "High" | "Critical" | "None">(
        constant("Low"),
        constant("None"),
        constant("Medium"),
        constant("High"),
        constant("Critical")
    )),
    showToast: optional(boolean()),
    showInPanel: optional(boolean())
});

export const raiseNotificationDecoder: Decoder<RaiseNotificationConfig> = object({
    settings: glue42NotificationOptionsDecoder,
    id: nonEmptyStringDecoder
});

export const permissionRequestResultDecoder: Decoder<PermissionRequestResult> = object({
    permissionGranted: boolean()
});

export const permissionQueryResultDecoder: Decoder<PermissionQueryResult> = object({
    permission: oneOf<"default" | "granted" | "denied">(
        constant("default"),
        constant("granted"),
        constant("denied")
    )
});

export const simpleNotificationSelectDecoder: Decoder<SimpleNotificationSelect> = object({
    id: nonEmptyStringDecoder
});

export const notificationClickConfigDecoder: Decoder<NotificationClickConfig> = object({
    id: nonEmptyStringDecoder,
    action: optional(nonEmptyStringDecoder)
});

export const notificationsDataDecoder: Decoder<Glue42Web.Notifications.NotificationData> = object({
    id: nonEmptyStringDecoder,
    title: nonEmptyStringDecoder,
    clickInterop: optional(interopActionSettingsDecoder),
    actions: optional(array(glue42NotificationActionDecoder)),
    focusPlatformOnDefaultClick: optional(boolean()),
    badge: optional(string()),
    body: optional(string()),
    data: optional(anyJson()),
    dir: optional(oneOf<"auto" | "ltr" | "rtl">(
        constant("auto"),
        constant("ltr"),
        constant("rtl")
    )),
    icon: optional(string()),
    image: optional(string()),
    lang: optional(string()),
    renotify: optional(boolean()),
    requireInteraction: optional(boolean()),
    silent: optional(boolean()),
    tag: optional(string()),
    timestamp: optional(nonNegativeNumberDecoder),
    vibrate: optional(array(number())),
    severity: optional(oneOf<"Low" | "Medium" | "High" | "Critical" | "None">(
        constant("Low"),
        constant("None"),
        constant("Medium"),
        constant("High"),
        constant("Critical")
    )),
    showToast: optional(boolean()),
    showInPanel: optional(boolean())
});

export const allNotificationsDataDecoder: Decoder<AllNotificationsData> = object({
    notifications: array(notificationsDataDecoder)
});
