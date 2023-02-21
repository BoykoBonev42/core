/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Web } from "../../web";

export class Notification implements Glue42Web.Notifications.Notification {

    public onclick: () => any = () => { };
    public onshow: () => any = () => { };
    public id: string;
    public title: string;
    public badge?: string | undefined;
    public body?: string | undefined;
    public data?: any;
    public dir?: "auto" | "ltr" | "rtl" | undefined;
    public icon?: string | undefined;
    public image?: string | undefined;
    public lang?: string | undefined;
    public renotify?: boolean | undefined;
    public requireInteraction?: boolean | undefined;
    public silent?: boolean | undefined;
    public tag?: string | undefined;
    public timestamp?: number | undefined;
    public vibrate?: number[] | undefined;
    public clickInterop?: Glue42Web.Notifications.InteropActionSettings | undefined;
    public actions?: Glue42Web.Notifications.NotificationAction[] | undefined;
    public focusPlatformOnDefaultClick?: boolean | undefined;
    public severity?: "Low" | "Medium" | "High" | "Critical" | "None" | undefined;
    public showToast?: boolean | undefined;
    public showInPanel?: boolean | undefined;

    constructor(config: Glue42Web.Notifications.RaiseOptions, id: string) {
        this.id = id;
        this.badge = config.badge;
        this.body = config.body;
        this.data = config.data;
        this.dir = config.dir;
        this.icon = config.icon;
        this.image = config.image;
        this.lang = config.lang;
        this.renotify = config.renotify;
        this.requireInteraction = config.requireInteraction;
        this.silent = config.silent;
        this.tag = config.tag;
        this.timestamp = config.timestamp;
        this.vibrate = config.vibrate;
        this.title = config.title;
        this.clickInterop = config.clickInterop;
        this.actions = config.actions;
        this.focusPlatformOnDefaultClick = config.focusPlatformOnDefaultClick;
        this.severity = config.severity;
        this.showToast = config.showToast;
        this.showInPanel = config.showInPanel;
    }

}