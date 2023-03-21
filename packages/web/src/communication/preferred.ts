/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { UnsubscribeFunction } from "callback-registry";
import { generate } from "shortid";
import { Glue42CoreMessageTypes, webPlatformTransportName } from "../shared/constants";
import { ParsedConfig, PlatformMessages, Transaction, TransportState } from "../shared/types";

export class PreferredConnectionController {

    private readonly transactionTimeout = 15000;
    private readonly transactionLocks: { [key in string]: Transaction<any> } = {};
    private webPlatformTransport: any;
    private webPlatformMessagesUnsubscribe: UnsubscribeFunction | undefined;
    private reconnectCounter = 0;
    private readonly logger: Glue42Core.Logger.API;

    constructor(private readonly coreGlue: Glue42Core.GlueCore) {
        this.logger = this.coreGlue.logger.subLogger("web.preferred.connection.controller");
    }

    public stop(): void {
        if (!this.webPlatformMessagesUnsubscribe) {
            return;
        }

        this.webPlatformMessagesUnsubscribe();
    }

    public async start(coreConfig: ParsedConfig): Promise<void> {
        if (coreConfig.isPlatformInternal) {
            this.logger.trace("This is an internal client to the platform, skipping all client preferred communication logic.");
            return;
        }

        const isConnectedToPlatform = (this.coreGlue as any).connection.transport.name() === webPlatformTransportName;

        if (!isConnectedToPlatform) {
            throw new Error("Cannot initiate the Glue Web Bridge, because the initial connection was not handled by a Web Platform transport.");
        }

        if (!(this.coreGlue as any).connection.transport.isPreferredActivated) {
            this.logger.trace("The platform of this client was configured without a preferred connection, skipping the rest of the initialization.");
            return;
        }

        this.webPlatformTransport = (this.coreGlue as any).connection.transport;

        this.webPlatformMessagesUnsubscribe = this.webPlatformTransport.onMessage(this.handleWebPlatformMessage.bind(this));

        const transportState = await this.getCurrentPlatformTransportState();

        await this.checkSwitchTransport(transportState);
    }

    private handleWebPlatformMessage(msg: string | object): void {
        if (typeof msg === "string") {
            return;
        }

        const isConnectedToPlatform = (this.coreGlue as any).connection.transport.name() === webPlatformTransportName;

        const type = (msg as any).type;
        const args = (msg as any).args;
        const transactionId = (msg as any).transactionId;

        if (type === Glue42CoreMessageTypes.transportSwitchRequest.name) {
            return this.handleTransportSwitchRequest(args, transactionId);
        }

        if (type === Glue42CoreMessageTypes.platformUnload.name && !isConnectedToPlatform) {
            return this.handlePlatformUnload();
        }

        if (type === Glue42CoreMessageTypes.getCurrentTransportResponse.name) {
            return this.handleGetCurrentTransportResponse(args, transactionId);
        }

        if (type === Glue42CoreMessageTypes.checkPreferredLogic.name) {
            return this.handleCheckPreferredLogic(transactionId);
        }

        if (type === Glue42CoreMessageTypes.checkPreferredConnection.name) {
            return this.handleCheckPreferredConnection(args, transactionId);
        }

    }

    private async reEstablishPlatformPort(): Promise<void> {
        try {
            await this.webPlatformTransport.connect();
        } catch (error) {
            this.logger.trace(`Error when re-establishing port connection to the platform: ${JSON.stringify(error)}`);
            --this.reconnectCounter;

            if (this.reconnectCounter > 0) {
                return this.reEstablishPlatformPort();
            }

            this.logger.warn("This client lost connection to the platform while connected to a preferred GW and was not able to re-connect to the platform.");
        }

        this.logger.trace("The connection to the platform was re-established, closing the connection to the web gateway.");

        this.reconnectCounter = 0;

        this.webPlatformTransport.close();

        const transportState = await this.getCurrentPlatformTransportState();

        await this.checkSwitchTransport(transportState);

    }

    private async checkSwitchTransport(config: TransportState): Promise<void> {
        const myCurrentTransportName: string = (this.coreGlue as any).connection.transport.name();

        if (myCurrentTransportName === config.transportName) {
            this.logger.trace("A check switch was requested, but the platform transport and my transport are identical, no switch is necessary");
            return;
        }

        this.logger.trace(`A check switch was requested and a transport switch is necessary, because this client is now on ${myCurrentTransportName}, but it should reconnect to ${JSON.stringify(config)}`);

        const result = await this.coreGlue.connection.switchTransport(config);

        this.setConnected();

        this.logger.trace(`The transport switch was completed with result: ${JSON.stringify(result)}`);
    }

    private async getCurrentPlatformTransportState(): Promise<TransportState> {

        this.logger.trace("Requesting the current transport state of the platform.");

        const transaction = this.setTransaction<TransportState>(Glue42CoreMessageTypes.getCurrentTransport.name);

        this.sendPlatformMessage(Glue42CoreMessageTypes.getCurrentTransport.name, transaction.id);

        const transportState = await transaction.lock;

        this.logger.trace(`The platform responded with transport state: ${JSON.stringify(transportState)}`);

        return transportState;
    }

    private setTransaction<T>(operation: PlatformMessages): Transaction<T> {
        const transaction: Transaction<T> = {} as Transaction<T>;

        const transactionId = generate();

        const transactionLock = new Promise<T>((resolve, reject) => {

            let transactionLive = true;

            transaction.lift = (args): void => {
                transactionLive = false;
                delete this.transactionLocks[transactionId];
                resolve(args);
            };

            transaction.fail = (reason): void => {
                transactionLive = false;
                delete this.transactionLocks[transactionId];
                reject(reason);
            };

            setTimeout(() => {
                if (!transactionLive) {
                    return;
                }

                transactionLive = false;
                this.logger.warn(`Transaction for operation: ${operation} timed out.`);
                delete this.transactionLocks[transactionId];
                reject(`Transaction for operation: ${operation} timed out.`);
            }, this.transactionTimeout);
        });

        transaction.lock = transactionLock;

        transaction.id = transactionId;

        this.transactionLocks[transactionId] = transaction;

        return transaction;
    }

    private sendPlatformMessage(type: PlatformMessages, transactionId: string, args?: any): void {
        this.logger.trace(`Sending a platform message of type: ${type}, id: ${transactionId} and args: ${JSON.stringify(args)}`);
        this.webPlatformTransport.sendObject({
            glue42core: { type, args, transactionId }
        });
    }

    private handleTransportSwitchRequest(args: any, transactionId: string): void {
        this.logger.trace(`Received a transport switch request with id: ${transactionId} and data: ${JSON.stringify(args)}`);
        this.coreGlue.connection.switchTransport(args.switchSettings)
            .then((result) => {
                this.logger.trace(`The transport switch was completed with result: ${JSON.stringify(result)}`);
                this.setConnected();
                this.sendPlatformMessage(Glue42CoreMessageTypes.transportSwitchResponse.name, transactionId, { success: result.success });
            })
            .catch((error) => {
                this.logger.error(error);
                this.sendPlatformMessage(Glue42CoreMessageTypes.transportSwitchResponse.name, transactionId, { success: false });
            });
    }

    private handlePlatformUnload(): void {
        this.reconnectCounter = 5;
        this.logger.trace("The platform was unloaded while I am connected to a preferred connection, re-establishing the port connection.");
        this.reEstablishPlatformPort();
    }

    private handleGetCurrentTransportResponse(args: any, transactionId: string): void {
        this.logger.trace(`Got a current transport response from the platform with id: ${transactionId} and data: ${JSON.stringify(args)}`);
        const transportState = args.transportState as TransportState;

        const transaction = this.transactionLocks[transactionId];

        transaction?.lift(transportState);
    }

    private handleCheckPreferredLogic(transactionId: string): void {
        setTimeout(() => this.sendPlatformMessage(Glue42CoreMessageTypes.checkPreferredLogicResponse.name, transactionId), 0);
    }

    private handleCheckPreferredConnection(args: any, transactionId: string): void {
        const url = args.url;

        this.logger.trace(`Testing the possible connection to: ${url}`);

        this.checkPreferredConnection(url)
            .then((result) => {
                this.logger.trace(`The connection to ${url} is possible`);
                this.sendPlatformMessage(Glue42CoreMessageTypes.checkPreferredConnectionResponse.name, transactionId, result);
            })
            .catch((error) => {
                this.logger.trace(`The connection to ${url} is not possible`);
                this.sendPlatformMessage(Glue42CoreMessageTypes.checkPreferredConnectionResponse.name, transactionId, { error });
            });
    }

    private checkPreferredConnection(url: string): Promise<{ live: boolean }> {

        return new Promise<{ live: boolean }>((resolve) => {
            const ws = new WebSocket(url);

            ws.onerror = (): void => resolve({ live: false });

            ws.onopen = (): void => {
                ws.close();
                resolve({ live: true });
            };

        });

    }

    private setConnected(): void {
        this.webPlatformTransport.manualSetReadyState();
    }
}
