/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { Glue42Web } from "../../web";
import { Glue42EventPayload, ParsedConfig } from "./types";

export class EventsDispatcher {
    private glue!: Glue42Web.API;
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private readonly glue42EventName = "Glue42";
    private _handleMessage!: (event: Event) => void;

    constructor(private readonly config: ParsedConfig) { }

    private readonly events: { [key in string]: { name: string; handle: (glue42Data: any) => void | Promise<void> } } = {
        notifyStarted: { name: "notifyStarted", handle: this.handleNotifyStarted.bind(this) },
        contentInc: { name: "contentInc", handle: this.handleContentInc.bind(this) },
        requestGlue: { name: "requestGlue", handle: this.handleRequestGlue.bind(this) }
    };

    public stop(): void {
        window.removeEventListener(this.glue42EventName, this._handleMessage);
    }

    public start(glue: Glue42Web.API): void {
        this.glue = glue;

        this.wireCustomEventListener();

        this.announceStarted();
    }

    public sendContentMessage<T>(message: T): void {
        this.send("contentOut", "glue42core", message);
    }

    public onContentMessage(callback: (message: any) => void): UnsubscribeFunction {
        return this.registry.add("content-inc", callback);
    }

    private wireCustomEventListener(): void {

        this._handleMessage = this.handleMessage.bind(this);

        window.addEventListener(this.glue42EventName, this._handleMessage);
    }

    private handleMessage(event: Event): void {
        const data = (event as CustomEvent).detail;

        const namespace = data?.glue42 ?? data?.glue42core;
        
        if (!namespace) {
            return;
        }

        const glue42Event: string = namespace.event;

        const foundHandler = this.events[glue42Event];

        if (!foundHandler) {
            return;
        }

        foundHandler.handle(namespace.message);
    }

    private announceStarted(): void {
        this.send("start", "glue42");
    }

    private handleRequestGlue(): void {
        if (!this.config.exposeGlue) {
            this.send("requestGlueResponse", "glue42", { error: "Will not give access to the underlying Glue API, because it was explicitly denied upon initialization." });
            return;
        }

        this.send("requestGlueResponse", "glue42", { glue: this.glue });
    }

    private handleNotifyStarted(): void {
        this.announceStarted();
    }

    private handleContentInc(message: any): void {
        this.registry.execute("content-inc", message);
    }

    private send(eventName: string, namespace: "glue42core" | "glue42", message?: any): void {
        const payload: Glue42EventPayload = {};
        payload[namespace] = { event: eventName, message };

        const event = new CustomEvent(this.glue42EventName, { detail: payload });

        window.dispatchEvent(event);
    }
}
