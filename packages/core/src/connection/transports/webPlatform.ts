/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "../../../glue";
import { Identity, Transport } from "../types";
import { Logger } from "../../logger/logger";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import generate from "shortid";
import { PromisePlus } from "../../utils/promise-plus";

type MessageType = "connectionAccepted" | "connectionRejected" | "connectionRequest" | "parentReady" |
    "parentPing" | "platformPing" | "platformReady" | "clientUnload" | "manualUnload" |
    "extConnectionResponse" | "extSetupRequest" | "gatewayDisconnect" | "gatewayInternalConnect";

export default class WebPlatformTransport implements Transport {
    public isPreferredActivated: boolean | undefined;

    private _communicationId: string | undefined;
    private publicWindowId: string | undefined;
    private selfAssignedWindowId: string | undefined;
    private iAmConnected = false;
    private parentReady = false;
    private rejected = false;
    private parentPingResolve: ((value?: void | PromiseLike<void> | undefined) => void) | undefined;
    private parentPingInterval: NodeJS.Timeout | undefined;
    private connectionResolve: ((value?: void | PromiseLike<void> | undefined) => void) | undefined;
    private extConnectionResolve: ((value: void | PromiseLike<void>) => void) | undefined;
    private extConnectionReject: ((reason?: any) => void) | undefined;
    private connectionReject: ((reason?: unknown) => void) | undefined;
    private port: MessagePort | undefined;
    private myClientId: string | undefined;
    private children: { grandChildId: string; source: Window; connected: boolean; origin: string }[] = [];

    private extContentAvailable = false;
    private extContentConnecting = false;
    private extContentConnected = false;
    private parentWindowId: string | undefined;
    private parentInExtMode = false;

    private readonly webNamespace = "g42_core_web";
    private parent: Window | undefined;
    private parentType: "window" | "workspace" | "extension" | undefined;
    private readonly parentPingTimeout = 5000;
    private readonly connectionRequestTimeout = 7000;
    private readonly defaultTargetString = "*";
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private readonly messages: { [key in MessageType]: { name: string; handle: (event: MessageEvent) => void } } = {
        connectionAccepted: { name: "connectionAccepted", handle: this.handleConnectionAccepted.bind(this) },
        connectionRejected: { name: "connectionRejected", handle: this.handleConnectionRejected.bind(this) },
        connectionRequest: { name: "connectionRequest", handle: this.handleConnectionRequest.bind(this) },
        parentReady: {
            name: "parentReady", handle: () => {
                //
            }
        },
        parentPing: { name: "parentPing", handle: this.handleParentPing.bind(this) },
        platformPing: { name: "platformPing", handle: this.handlePlatformPing.bind(this) },
        platformReady: { name: "platformReady", handle: this.handlePlatformReady.bind(this) },
        clientUnload: { name: "clientUnload", handle: this.handleClientUnload.bind(this) },
        manualUnload: { name: "manualUnload", handle: this.handleManualUnload.bind(this) },
        extConnectionResponse: { name: "extConnectionResponse", handle: this.handleExtConnectionResponse.bind(this) },
        extSetupRequest: { name: "extSetupRequest", handle: this.handleExtSetupRequest.bind(this) },
        gatewayDisconnect: { name: "gatewayDisconnect", handle: this.handleGatewayDisconnect.bind(this) },
        gatewayInternalConnect: { name: "gatewayInternalConnect", handle: this.handleGatewayInternalConnect.bind(this) }
    };

    constructor(private readonly settings: Glue42Core.WebPlatformConnection, private readonly logger: Logger, private readonly identity?: Identity) {
        this.extContentAvailable = !!(window as any).glue42ext;

        this.setUpMessageListener();
        this.setUpUnload();
        this.setupPlatformUnloadListener();

        this.parentType = window.name.includes("#wsp") ? "workspace" : undefined;
    }

    public manualSetReadyState(): void {
        this.iAmConnected = true;
        this.parentReady = true;
    }

    public get transportWindowId(): string | undefined {
        return this.publicWindowId;
    }

    public get communicationId(): string | undefined {
        return this._communicationId;
    }

    public async sendObject(msg: object): Promise<void> {

        if (this.extContentConnected) {
            return window.postMessage({ glue42ExtOut: msg }, this.defaultTargetString);
        }

        if (!this.port) {
            throw new Error("Cannot send message, because the port was not opened yet");
        }
        this.port.postMessage(msg);
    }

    public get isObjectBasedTransport(): boolean {
        return true;
    }

    public onMessage(callback: (msg: string | object) => void): UnsubscribeFunction {
        return this.registry.add("onMessage", callback);
    }

    public send(): Promise<void> {
        return Promise.reject("not supported");
    }

    public onConnectedChanged(callback: (connected: boolean, reason?: string) => void): UnsubscribeFunction {
        return this.registry.add("onConnectedChanged", callback);
    }

    public async open(): Promise<void> {
        this.logger.debug("opening a connection to the web platform gateway.");

        await this.connect();

        this.notifyStatusChanged(true);
    }

    public close(): Promise<void> {
        const message = {
            glue42core: {
                type: this.messages.gatewayDisconnect.name,
                data: {
                    clientId: this.myClientId,
                    ownWindowId: this.identity?.windowId
                }
            }
        };

        this.port?.postMessage(message);

        this.parentReady = false;

        this.notifyStatusChanged(false, "manual reconnection");

        return Promise.resolve();
    }

    public name(): string {
        return "web-platform";
    }

    public async reconnect(): Promise<void> {
        await this.close();

        return Promise.resolve();
    }

    private initiateInternalConnection(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.logger.debug("opening an internal web platform connection");
            this.port = this.settings.port;

            if (this.iAmConnected) {
                this.logger.warn("cannot open a new connection, because this client is currently connected");
                return;
            }

            this.port.onmessage = (event): void => {

                if (this.iAmConnected && !event.data?.glue42core) {
                    this.registry.execute("onMessage", event.data);
                    return;
                }

                const data = event.data?.glue42core;

                if (!data) {
                    return;
                }

                if (data.type === this.messages.gatewayInternalConnect.name && data.success) {
                    this.publicWindowId = this.settings.windowId;

                    if (this.identity && this.publicWindowId) {
                        this.identity.windowId = this.publicWindowId;
                        this.identity.instance = this.publicWindowId;
                    }
                    resolve();
                }

                if (data.type === this.messages.gatewayInternalConnect.name && data.error) {
                    reject(data.error);
                }
            };

            this.port.postMessage({
                glue42core: {
                    type: this.messages.gatewayInternalConnect.name
                }
            });

        });
    }

    private initiateRemoteConnection(target?: Window): Promise<void> {

        return PromisePlus<void>((resolve, reject) => {
            this.connectionResolve = resolve;
            this.connectionReject = reject;

            // if I am reconnecting, I want to reuse my original client id
            this.myClientId = this.myClientId ?? generate();

            const bridgeInstanceId = this.getMyWindowId() || generate();

            const request = {
                glue42core: {
                    type: this.messages.connectionRequest.name,
                    clientId: this.myClientId,
                    clientType: "child",
                    bridgeInstanceId,
                    selfAssignedWindowId: this.selfAssignedWindowId
                }
            };

            this.logger.debug("sending connection request");

            if (this.extContentConnecting) {
                request.glue42core.clientType = "child";
                request.glue42core.bridgeInstanceId = this.myClientId;
                (request as any).glue42core.parentWindowId = this.parentWindowId;
                return window.postMessage(request, this.defaultTargetString);
            }

            if (!target) {
                throw new Error("Cannot send a connection request, because no glue target was specified!");
            }

            target.postMessage(request, this.defaultTargetString);
        }, this.connectionRequestTimeout, "The connection to the target glue window timed out");

    }

    private async isParentCheckSuccess(parentCheck: Promise<void>): Promise<{ success: boolean }> {
        try {
            await parentCheck;

            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    private setUpMessageListener(): void {
        if (this.settings.port) {
            this.logger.debug("skipping generic message listener, because this is an internal client");
            // do not set up listener, because this is running as an internal client for the platform
            return;
        }

        window.addEventListener("message", (event) => {
            const data = event.data?.glue42core;

            if (!data || this.rejected) {
                return;
            }

            if (!this.checkMessageTypeValid(data.type)) {
                this.logger.error(`cannot handle the incoming glue42 core message, because the type is invalid: ${data.type}`);
                return;
            }

            const messageType = data.type as MessageType;

            this.logger.debug(`received valid glue42core message of type: ${messageType}`);

            this.messages[messageType].handle(event);
        });
    }

    private setUpUnload(): void {
        if (this.settings.port) {
            this.logger.debug("skipping unload event listener, because this is an internal client");
            // do not set up listener, because this is running as an internal client for the platform
            return;
        }

        window.addEventListener("beforeunload", () => {

            if (this.extContentConnected) {
                // before unload in this case should be handled in the content script
                return;
            }

            const message = {
                glue42core: {
                    type: this.messages.clientUnload.name,
                    data: {
                        clientId: this.myClientId,
                        ownWindowId: this.identity?.windowId
                    }
                }
            };

            if (this.parent) {
                this.parent.postMessage(message, this.defaultTargetString);
            }

            this.port?.postMessage(message);
        });
    }

    private handlePlatformReady(event: MessageEvent): void {
        this.logger.debug("the web platform gave the ready signal");
        this.parentReady = true;

        if (this.parentPingResolve) {
            this.parentPingResolve();
            delete this.parentPingResolve;
        }

        if (this.parentPingInterval) {
            clearInterval(this.parentPingInterval);
            delete this.parentPingInterval;
        }

        this.parent = event.source as Window;
        this.parentType = window.name.includes("#wsp") ? "workspace" : "window";
    }

    private handleConnectionAccepted(event: MessageEvent): void {
        const data = event.data?.glue42core;

        if (this.myClientId === data.clientId) {
            return this.handleAcceptanceOfMyRequest(data);
        }

        return this.handleAcceptanceOfGrandChildRequest(data, event);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleAcceptanceOfMyRequest(data: any): void {
        this.logger.debug("handling a connection accepted signal targeted at me.");
        this.isPreferredActivated = data.isPreferredActivated;

        if (this.extContentConnecting) {
            return this.processExtContentConnection(data);
        }

        if (!data.port) {
            this.logger.error("cannot set up my connection, because I was not provided with a port");
            return;
        }

        this.publicWindowId = this.getMyWindowId();

        if (this.identity) {
            this.identity.windowId = this.publicWindowId;
            this.identity.instance = this.identity.instance ? this.identity.instance : this.publicWindowId || generate();
        }

        if (this.identity && data.appName) {
            this.identity.application = data.appName;
            this.identity.applicationName = data.appName;
        }

        this._communicationId = data.communicationId;

        this.port = data.port as MessagePort;
        this.port.onmessage = (e): object[] => this.registry.execute("onMessage", e.data);

        if (this.connectionResolve) {
            this.logger.debug("my connection is set up, calling the connection resolve.");
            this.connectionResolve();
            delete this.connectionResolve;
            return;
        }

        this.logger.error("unable to call the connection resolve, because no connection promise was found");
    }

    private processExtContentConnection(data: any): void {
        this.logger.debug("handling a connection accepted signal targeted at me for extension content connection.");

        this.extContentConnecting = false;
        this.extContentConnected = true;

        this.publicWindowId = this.parentWindowId || this.myClientId;

        if (this.extContentConnecting && this.identity) {
            this.identity.windowId = this.publicWindowId;
        }

        if (this.identity && data.appName) {
            this.identity.application = data.appName;
            this.identity.applicationName = data.appName;
        }

        window.addEventListener("message", (event) => {
            const extData = event.data?.glue42ExtInc;

            if (!extData) {
                return;
            }

            this.registry.execute("onMessage", extData);
        });

        if (this.connectionResolve) {
            this.logger.debug("my connection is set up, calling the connection resolve.");
            this.connectionResolve();
            delete this.connectionResolve;
            return;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleAcceptanceOfGrandChildRequest(data: any, event: MessageEvent): void {
        if (this.extContentConnecting || this.extContentConnected) {
            this.logger.debug("cannot process acceptance of a grandchild, because I am connected to a content script");
            return;
        }
        this.logger.debug(`handling a connection accepted signal targeted at a grandchild: ${data.clientId}`);

        const child = this.children.find((c) => c.grandChildId === data.clientId);

        if (!child) {
            this.logger.error(`cannot handle connection accepted for grandchild: ${data.clientId}, because there is no grandchild with this id`);
            return;
        }

        child.connected = true;

        this.logger.debug(`the grandchild connection for ${data.clientId} is set up, forwarding the success message and the gateway port`);

        data.parentWindowId = this.publicWindowId;

        child.source.postMessage(event.data, child.origin, [data.port]);
        return;
    }

    private handleConnectionRejected(): void {
        this.logger.debug("handling a connection rejection. Most likely the reason is that this window was not created by a glue API call");
        if (this.connectionReject) {
            this.connectionReject("The platform connection was rejected. Most likely because this window was not created by a glue API call");
            delete this.connectionReject;
        }
    }

    private handleConnectionRequest(event: MessageEvent): void {

        if (this.extContentConnecting) {
            // I am being connected now and this is handled in the associated content script
            this.logger.debug("This connection request event is targeted at the extension content");
            return;
        }

        const source = event.source as Window;
        const data = event.data.glue42core;

        if (!data.clientType || data.clientType !== "grandChild") {
            return this.rejectConnectionRequest(source, event.origin, "rejecting a connection request, because the source was not opened by a glue API call");
        }

        if (!data.clientId) {
            return this.rejectConnectionRequest(source, event.origin, "rejecting a connection request, because the source did not provide a valid id");
        }

        if (!this.parent) {
            return this.rejectConnectionRequest(source, event.origin, "Cannot forward the connection request, because no direct connection to the platform was found");
        }

        this.logger.debug(`handling a connection request for a grandchild: ${data.clientId}`);

        this.children.push({ grandChildId: data.clientId, source, connected: false, origin: event.origin });

        this.logger.debug(`grandchild: ${data.clientId} is prepared, forwarding connection request to the platform`);

        this.parent.postMessage(event.data, this.defaultTargetString);
    }

    private handleParentPing(event: MessageEvent): void {

        if (!this.parentReady) {
            this.logger.debug("my parent is not ready, I am ignoring the parent ping");
            return;
        }

        if (!this.iAmConnected) {
            this.logger.debug("i am not fully connected yet, I am ignoring the parent ping");
            return;
        }

        const message = {
            glue42core: {
                type: this.messages.parentReady.name
            }
        };

        if (this.extContentConnected) {
            (message as any).glue42core.extMode = { windowId: this.myClientId };
        }

        const source = event.source as Window;

        this.logger.debug("responding to a parent ping with a ready message");

        source.postMessage(message, event.origin);
    }

    private setupPlatformUnloadListener(): void {
        this.onMessage((msg) => {
            if ((msg as any).type === "platformUnload") {
                this.logger.debug("detected a web platform unload");

                this.parentReady = false;

                this.notifyStatusChanged(false, "Gateway unloaded");
            }
        });
    }

    private handleManualUnload(): void {
        // this message handler exists only to soften the phasing our of the manual unload.
        const message = {
            glue42core: {
                type: this.messages.clientUnload.name,
                data: {
                    clientId: this.myClientId,
                    ownWindowId: this.identity?.windowId
                }
            }
        };

        if (this.extContentConnected) {
            return window.postMessage({ glue42ExtOut: message }, this.defaultTargetString);
        }

        this.port?.postMessage(message);
    }

    private handleClientUnload(event: MessageEvent): void {
        const data = event.data.glue42core;
        const clientId = data?.data.clientId;

        if (!clientId) {
            this.logger.warn("cannot process grand child unload, because the provided id was not valid");
            return;
        }

        const foundChild = this.children.find((child) => child.grandChildId === clientId);

        if (!foundChild) {
            this.logger.warn("cannot process grand child unload, because this client is unaware of this grandchild");
            return;
        }

        this.logger.debug(`handling grandchild unload for id: ${clientId}`);

        this.children = this.children.filter((child) => child.grandChildId !== clientId);
    }

    private handlePlatformPing(): void {
        return;
    }

    private notifyStatusChanged(status: boolean, reason?: string): void {
        this.iAmConnected = status;
        this.registry.execute("onConnectedChanged", status, reason);
    }

    private checkMessageTypeValid(typeToValidate: string): boolean {
        return typeof typeToValidate === "string" && !!this.messages[typeToValidate as MessageType];
    }

    private rejectConnectionRequest(source: Window, origin: string, reason: string): void {
        this.rejected = true;
        this.logger.error(reason);

        const rejection = {
            glue42core: {
                type: this.messages.connectionRejected.name
            }
        };

        source.postMessage(rejection, origin);
    }

    // --- ext methods ---

    private requestConnectionPermissionFromExt(): Promise<void> {
        // here I know that a content script is started, but not sure if it is ready

        return this.waitForContentScript()
            .then(() => PromisePlus<void>((resolve, reject) => {
                this.extConnectionResolve = resolve;
                this.extConnectionReject = reject;

                const message = {
                    glue42core: {
                        type: "extSetupRequest"
                    }
                };

                this.logger.debug("permission request to the extension content script was sent");

                window.postMessage(message, this.defaultTargetString);
            }, this.parentPingTimeout, "Cannot initialize glue, because this app was not opened or created by a Glue Client and the request for extension connection timed out"));
    }

    private handleExtConnectionResponse(event: MessageEvent): void {
        const data = event.data?.glue42core;

        if (!data.approved) {
            return this.extConnectionReject ? this.extConnectionReject("Cannot initialize glue, because this app was not opened or created by a Glue Client and the request for extension connection was rejected") : undefined;
        }

        if (this.extConnectionResolve) {
            this.extConnectionResolve();
            delete this.extConnectionResolve;
        }

        this.extContentConnecting = true;
        this.parentType = "extension";
        this.logger.debug("The extension connection was approved, proceeding.");
    }

    private handleExtSetupRequest(): void {
        // this is handled by the associated content script
        return;
    }

    private handleGatewayDisconnect(): void {
        // this is handled only in the web platform gateway;
        return;
    }

    private handleGatewayInternalConnect(): void {
        // this is handled only in the internal connection port;
        return;
    }

    private waitForContentScript(): Promise<void> {
        const contentReady = !!(window as any).glue42ext?.content;

        if (contentReady) {
            return Promise.resolve();
        }

        return PromisePlus<void>((resolve) => {

            window.addEventListener("Glue42EXTReady", () => {
                resolve();
            });

        }, this.connectionRequestTimeout, "The content script was available, but was never heard to be ready");
    }

    // ---- V2 Connection ----

    private async connect(): Promise<void> {

        if (this.settings.port) {
            await this.initiateInternalConnection();
            this.logger.debug("internal web platform connection completed");
            return;
        }

        this.logger.debug("opening a client web platform connection");

        await this.findParent();

        await this.initiateRemoteConnection(this.parent);

        this.logger.debug("the client is connected");
    }

    private async findParent(): Promise<void> {
        const connectionNotPossibleMsg = "Cannot initiate glue, because this window was not opened or created by a glue client";

        const myInsideParents = this.getPossibleParentsInWindow(window);

        const myOutsideParents = this.getPossibleParentsOutsideWindow(window.top?.opener, window.top);

        const uniqueParents = new Set<Window>([...myInsideParents, ...myOutsideParents]);

        if (!uniqueParents.size && !this.extContentAvailable) {
            throw new Error(connectionNotPossibleMsg);
        }

        if (!uniqueParents.size && this.extContentAvailable) {
            await this.requestConnectionPermissionFromExt();
            return;
        }

        const defaultParentCheck = await this.isParentCheckSuccess(this.confirmParent(Array.from(uniqueParents)));

        if (defaultParentCheck.success) {
            this.logger.debug("The default parent was found!");
            return;
        }

        if (!this.extContentAvailable) {
            throw new Error(connectionNotPossibleMsg);
        }

        await this.requestConnectionPermissionFromExt();
    }

    private getPossibleParentsInWindow(currentWindow: Window): Window[] {
        return (!currentWindow || currentWindow === currentWindow.top) ? [] : [currentWindow.parent, ...this.getPossibleParentsInWindow(currentWindow.parent)];
    }

    private getPossibleParentsOutsideWindow(opener: Window | null, current: Window | null): Window[] {
        return (!opener || !current || opener === current) ? [] : [opener, ...this.getPossibleParentsInWindow(opener), ...this.getPossibleParentsOutsideWindow(opener.opener, opener)];
    }

    private confirmParent(targets: Window[]): Promise<void> {
        const connectionNotPossibleMsg = "Cannot initiate glue, because this window was not opened or created by a glue client";

        const parentCheck = PromisePlus<void>((resolve) => {

            this.parentPingResolve = resolve;

            const message = {
                glue42core: {
                    type: this.messages.platformPing.name
                }
            };

            this.parentPingInterval = setInterval(() => {
                targets.forEach((target) => {
                    target.postMessage(message, this.defaultTargetString);
                });
            }, 1000);

        }, this.parentPingTimeout, connectionNotPossibleMsg);

        parentCheck.catch(() => {
            if (this.parentPingInterval) {
                clearInterval(this.parentPingInterval);
                delete this.parentPingInterval;
            }
        });

        return parentCheck;
    }

    private getMyWindowId(): string | undefined {

        if (this.parentType === "workspace") {
            return window.name.substring(0, window.name.indexOf("#wsp"));
        }

        if (window !== window.top) {
            // iframes are not considered Glue Windows and have no window Id
            return;
        }

        if (window.name?.includes("g42")) {
            return window.name;
        }

        this.selfAssignedWindowId = this.selfAssignedWindowId || `g42-${generate()}`;

        return this.selfAssignedWindowId;
    }
}
