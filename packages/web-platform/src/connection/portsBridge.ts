/* eslint-disable @typescript-eslint/no-explicit-any */
/* tslint:disable:no-console no-empty */
import { Gateway } from "./gateway";
import { IoC } from "../shared/ioc";
import { Glue42CoreMessageTypes, webPlatformTransportName } from "../common/constants";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { ClientPortRequest, CoreClientData, InternalPlatformConfig, SessionWindowData, TransportState } from "../common/types";
import { SessionStorageController } from "../controllers/session";
import { Glue42Core } from "@glue42/core";
import { GwClient } from "@glue42/gateway-web/web/gateway-web.js";
import { TransactionsController } from "../controllers/transactions";
import { defaultClientPortRequestTimeoutMS, defaultClientPreferredLogicTestTimeoutMS } from "../common/defaultConfig";
import logger from "../shared/logger";

export class PortsBridge {

    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private readonly transactionsController: TransactionsController;
    private allPorts: { [key: string]: MessagePort | chrome.runtime.Port } = {};
    private allClients: Array<{ bridgeInstanceId: string, clientId: string, client: GwClient }> = [];
    private unLoadStarted = false;
    private isPreferredActivated = false;
    private activePreferredTransportConfig: Glue42Core.Connection.TransportSwitchSettings | undefined;
    private _communicationId!: string;
    private startUpPromise!: Promise<void>;
    private startupResolve!: (value: void | PromiseLike<void>) => void;
    private _genericMessageHandler!: (event: MessageEvent<any>) => Promise<void> | undefined;
    private _unloaderHandler!: () => void;

    constructor(
        private readonly gateway: Gateway,
        private readonly sessionStorage: SessionStorageController,
        private readonly ioc: IoC
    ) {
        this.transactionsController = this.ioc.transactionsController;
    }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("ports.bridge.controller");
    }

    public shutdown(): void {
        window.removeEventListener("message", this._genericMessageHandler);

        window.removeEventListener("unload", this._unloaderHandler);

        this.registry.clear();

        this.allPorts = {};
        this.allClients = [];
        this.isPreferredActivated = false;
        this.unLoadStarted = false;
    }

    public async configure(config: InternalPlatformConfig): Promise<void> {
        this.startUpPromise = new Promise<void>((resolve) => {
            this.startupResolve = resolve;
        });

        const systemSettings = this.sessionStorage.getSystemSettings();

        if (!systemSettings) {
            throw new Error("Cannot initiate the platform port bridge, because the system settings are not defined");
        }

        this._communicationId = systemSettings.systemInstanceId;

        await this.gateway.start(config?.gateway);

        this.setupListeners();
    }

    public start(): void {
        this.startupResolve();
    }

    public async createInternalClient(): Promise<MessagePort> {

        const channel = this.ioc.createMessageChannel();

        await this.gateway.setupInternalClient(channel.port1);

        return channel.port2;
    }

    public onClientUnloaded(callback: (client: CoreClientData) => void): UnsubscribeFunction {
        return this.registry.add("client-unloaded", callback);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async handleExtConnectionRequest(clientData: any, port: chrome.runtime.Port): Promise<void> {

        const client = clientData.glue42core;

        const hasImpersonatedWindowId = !!client.parentWindowId;

        if (!hasImpersonatedWindowId) {
            // I am a real window
            const id = client.clientId;

            const windowData: SessionWindowData = {
                windowId: id,
                name: id
            };

            await this.ioc.windowsController.processNewWindow(windowData);
        }

        await this.gateway.connectExtClient(port, this.removeClient.bind(this));

        const myWindowId = this.sessionStorage.getWindowDataByName("Platform")?.windowId;

        const message = {
            glue42core: {
                type: Glue42CoreMessageTypes.connectionAccepted.name,
                parentWindowId: myWindowId,
                appName: "ext-no-app",
                clientId: client.clientId,
                clientType: "child"
            }
        };

        this.allPorts[client.clientId] = port;

        port.postMessage(message);
    }

    public setActivePreferredTransportConfig(transportConfig: Glue42Core.Connection.TransportSwitchSettings): void {
        if (transportConfig.type === "secondary") {
            this.activePreferredTransportConfig = transportConfig;

            return;
        }

        delete this.activePreferredTransportConfig;
    }

    public setPreferredActivated(): void {
        this.isPreferredActivated = true;
    }

    public async switchAllClientsTransport(transportConfig: Glue42Core.Connection.TransportSwitchSettings): Promise<void> {

        const transactions: Array<Promise<void>> = Object.keys(this.allPorts)
            .map((id) => this.sendClientPortRequest<void>({
                type: Glue42CoreMessageTypes.transportSwitchRequest.name,
                timeout: defaultClientPortRequestTimeoutMS,
                clientId: id,
                args: { switchSettings: transportConfig }
            }));

        await Promise.all(transactions);
    }

    public async checkClientsPreferredLogic(): Promise<{ success: boolean }> {
        const transactions: Array<Promise<void>> = Object.keys(this.allPorts)
            .map((id) => this.sendClientPortRequest<void>({
                type: Glue42CoreMessageTypes.checkPreferredLogic.name,
                timeout: defaultClientPreferredLogicTestTimeoutMS,
                clientId: id
            }));

        try {
            await Promise.all(transactions);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    public async checkClientsPreferredConnection(url: string): Promise<{ success: boolean }> {
        const transactions: Array<Promise<void>> = Object.keys(this.allPorts)
            .map((id) => this.sendClientPortRequest<void>({
                type: Glue42CoreMessageTypes.checkPreferredConnection.name,
                args: { url },
                timeout: defaultClientPortRequestTimeoutMS,
                clientId: id
            }));

        try {
            await Promise.all(transactions);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    public removeGwClient(windowId: string): void {
        const foundClient = this.allClients.find((client) => client.bridgeInstanceId === windowId);

        if (!foundClient) {
            return;
        }

        this.allClients = this.allClients.filter((client) => client.bridgeInstanceId !== windowId);
        foundClient.client.disconnect();

        if (this.allPorts[foundClient.clientId]) {
            delete this.allPorts[foundClient.clientId];
        }
    }

    private unloader(): void {
        this.unLoadStarted = true;

        for (const id in this.allPorts) {
            this.allPorts[id].postMessage({ type: "platformUnload" });
        }
    }

    private genericMessageHandler(event: MessageEvent<any>): Promise<void> | undefined {
        const data = event.data?.glue42core;

        if (!data || this.unLoadStarted) {
            return;
        }

        // todo: domain whitelisting

        if (data.type === Glue42CoreMessageTypes.clientUnload.name) {

            const client = {
                windowId: data.data.ownWindowId,
                win: event.source
            };

            this.registry.execute("client-unloaded", client);

            return;
        }

        if (data.type === Glue42CoreMessageTypes.connectionRequest.name) {
            return this.startUpPromise.then(() => this.handleRemoteConnectionRequest(event.source as Window, event.origin, data.clientId, data.clientType, data.bridgeInstanceId));
        }

        if (data.type === Glue42CoreMessageTypes.platformPing.name) {
            return this.startUpPromise.then(() => this.handlePlatformPing(event.source as Window, event.origin));
        }

        if (data.type === Glue42CoreMessageTypes.parentPing.name) {
            return this.startUpPromise.then(() => this.handleParentPing(event.source as Window, event.origin));
        }
    }

    private async handleRemoteConnectionRequest(source: Window, origin: string, clientId: string, clientType: "child" | "grandChild", bridgeInstanceId: string): Promise<void> {
        const channel = this.ioc.createMessageChannel();

        const client = await this.gateway.connectClient(channel.port1);

        this.setupGwClientPort({ client, clientId, clientPort: channel.port1 });

        this.allClients.push({ client, bridgeInstanceId, clientId });

        const foundData = this.sessionStorage.getBridgeInstanceData(bridgeInstanceId);
        const appName = foundData?.appName;

        const myWindowId = this.sessionStorage.getWindowDataByName("Platform")?.windowId;

        const message = {
            glue42core: {
                type: Glue42CoreMessageTypes.connectionAccepted.name,
                port: channel.port2,
                communicationId: this._communicationId,
                isPreferredActivated: this.isPreferredActivated,
                parentWindowId: myWindowId,
                appName, clientId, clientType
            }
        };

        source.postMessage(message, origin, [channel.port2]);
    }

    private handleParentPing(source: Window, origin: string): void {
        const message = {
            glue42core: {
                type: Glue42CoreMessageTypes.parentReady.name
            }
        };

        source.postMessage(message, origin);
    }

    private handlePlatformPing(source: Window, origin: string): void {
        const message = {
            glue42core: {
                type: Glue42CoreMessageTypes.platformReady.name
            }
        };

        source.postMessage(message, origin);
    }

    private removeClient(clientId: string, announce?: boolean, preservePort?: boolean): void {
        if (!clientId) {
            return;
        }

        if (this.allPorts[clientId] && !preservePort) {
            delete this.allPorts[clientId];
        }

        if (!announce) {
            return;
        }

        const client = { windowId: clientId };

        this.registry.execute("client-unloaded", client);
    }

    private setupGwClientPort(config: { client: GwClient; clientPort: MessagePort; clientId: string }): void {

        if (this.allPorts[config.clientId] && (this.allPorts[config.clientId] as MessagePort).onmessage) {
            (this.allPorts[config.clientId] as MessagePort).onmessage = null;
        }

        this.allPorts[config.clientId] = config.clientPort;

        config.clientPort.onmessage = (event): void => {

            const data = event.data?.glue42core;

            if (data && (data.type === Glue42CoreMessageTypes.clientUnload.name || data.type === Glue42CoreMessageTypes.gatewayDisconnect.name)) {

                this.removeClient(data.data.clientId, false, data.type === Glue42CoreMessageTypes.gatewayDisconnect.name);

                if (this.allClients.some((client) => client.clientId === data.data.clientId)) {
                    this.allClients = this.allClients.filter((client) => client.clientId !== data.data.clientId);
                    config.client.disconnect();
                }

                return;
            }

            if (data && data.type === Glue42CoreMessageTypes.transportSwitchResponse.name) {

                const args = data.args;

                if (args.success) {
                    this.transactionsController.completeTransaction(data.transactionId);
                } else {
                    this.transactionsController.failTransaction(data.transactionId, `The client: ${config.clientId} could not connect using the provided transport config.`);
                }

                return;
            }

            if (data && data.type === Glue42CoreMessageTypes.getCurrentTransport.name) {

                const transactionId = data.transactionId;

                config.clientPort.postMessage({
                    type: Glue42CoreMessageTypes.getCurrentTransportResponse.name,
                    args: {
                        transportState: this.getCurrentTransportState(),
                    },
                    transactionId
                });

                return;
            }

            if (data && data.type === Glue42CoreMessageTypes.checkPreferredLogicResponse.name) {
                return this.transactionsController.completeTransaction(data.transactionId);
            }

            if (data && data.type === Glue42CoreMessageTypes.checkPreferredConnectionResponse.name) {

                const args = data.args;

                if (args.error) {
                    return this.transactionsController.failTransaction(data.transactionId, args.error);
                }

                if (!args.live) {
                    return this.transactionsController.failTransaction(data.transactionId, `Client ${config.clientId} could not connect to the preferred WS.`);
                }

                return this.transactionsController.completeTransaction(data.transactionId);
            }

            if (this.allClients.every((client) => client.client !== config.client)) {
                // this was put in place in particular because of focus lost not being prevented when the client is closing
                // this made triggering focus lost on already disappeared window impractical
                this.logger?.trace(`Ignoring a protocol message, because the destination client has been disconnected: ${JSON.stringify(event.data)}`);
                return;
            }

            config.client.send(event.data);
        };
    }

    private getCurrentTransportState(): TransportState {
        // my transport state === the system glue transport state

        const transportName = this.ioc.glueController.getSystemGlueTransportName();

        const transportState: TransportState = {
            transportName,
            type: transportName === webPlatformTransportName ? "default" : "secondary",
            transportConfig: transportName === webPlatformTransportName ? undefined : this.activePreferredTransportConfig?.transportConfig
        };

        return transportState;
    }

    private sendClientPortRequest<T>(request: ClientPortRequest): Promise<T> {
        const client = this.allPorts[request.clientId];

        if (!client) {
            throw new Error(`Cannot sent port request: ${request.type} to ${request.clientId}, because there is no such client`);
        }

        const transaction = this.transactionsController.createTransaction<T>(request.type, request.timeout || defaultClientPortRequestTimeoutMS);

        const type = request.type;
        const args = request.args;

        client.postMessage({ type, args, transactionId: transaction.id });

        return transaction.lock;
    }

    private setupListeners(): void {
        this._genericMessageHandler = this.genericMessageHandler.bind(this);

        window.addEventListener("message", this._genericMessageHandler);

        this._unloaderHandler = this.unloader.bind(this);

        window.addEventListener("unload", this._unloaderHandler);
    }
}