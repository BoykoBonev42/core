/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { Glue42WebPlatform } from "../../platform";
import { GlueController } from "../controllers/glue";
import { wait } from "../shared/utils";
import { PortsBridge } from "./portsBridge";
import logger from "../shared/logger";
import { AsyncSequelizer } from "../shared/sequelizer";
import { defaultPreferredDiscoveryIntervalMS } from "../common/defaultConfig";

export class PreferredConnectionController {
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private discoveryInterval!: number;
    private shouldForceTransfer!: boolean;
    private preferredUrl!: string;
    private preferredAuth!: Glue42Core.Auth;
    private stopped = false;

    constructor(
        private readonly glueController: GlueController,
        private readonly portsBridge: PortsBridge,
        private readonly sequelizer: AsyncSequelizer
    ) { }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("preferred.connection.controller");
    }

    public shutdown(): void {
        this.stopped = true;

        this.registry.clear();
    }

    public async start(config: Glue42WebPlatform.Connection.PreferredConnectionSettings): Promise<void> {

        this.logger?.trace(`Starting the preferred connection with config: ${JSON.stringify(config)}`);

        this.stopped = false;

        this.preferredUrl = config.url;

        this.preferredAuth = Object.assign({}, { provider: "core" }, config.auth);

        this.shouldForceTransfer = typeof config.forceIncompleteSwitch === "boolean" ? config.forceIncompleteSwitch : false;

        this.discoveryInterval = typeof config.discoveryIntervalMS === "number" ? config.discoveryIntervalMS : defaultPreferredDiscoveryIntervalMS;

        this.portsBridge.setPreferredActivated();

        this.logger?.trace("Starting the initial preferred connection check");

        await this.connectPreferred();

        this.logger?.trace("The preferred connection controller initiated.");
    }

    public onReconnect(callback: () => void): UnsubscribeFunction {
        return this.registry.add("system-reconnect", callback);
    }

    private async connectPreferred(): Promise<void> {
        if (this.stopped) {
            return;
        }

        const check = await this.checkPreFlight();

        if (!check.ready) {
            this.logger?.trace("The preflight is not ready, restarting the preferred tracking.");
            wait(this.discoveryInterval).then(() => this.connectPreferred());
            return;
        }

        const transportSwitchConfig: Glue42Core.Connection.TransportSwitchSettings = {
            type: "secondary",
            transportConfig: Object.assign({ url: this.preferredUrl }, { auth: this.preferredAuth })
        };

        this.logger?.trace("Switching the system glue.");

        if (this.stopped) {
            return;
        }

        const switched = (await this.glueController.switchTransport(transportSwitchConfig, "system")).success;

        if (!switched) {
            this.logger?.trace("The switch attempt was not successful, revered to default.");
            wait(this.discoveryInterval).then(() => this.connectPreferred());
            return;
        }

        this.portsBridge.setActivePreferredTransportConfig(transportSwitchConfig);

        this.logger?.trace("The switch to the preferred connection was successful, transferring all children.");

        try {
            await this.changeClientsConnection(transportSwitchConfig);
        } catch (error) {

            this.logger?.warn(`Some platform clients could not connect to the preferred connection, reverting all to the default connection. Reason: ${JSON.stringify(error)}`);

            this.fullDefaultRevert()
                .then(() => wait(this.discoveryInterval).then(() => this.connectPreferred()))
                .catch(() => wait(this.discoveryInterval).then(() => this.connectPreferred()));

            return;
        }

        this.logger?.trace("The platform is now fully connected to the preferred connection, hooking up disconnection logic.");

        this.registry.execute("system-reconnect");

        const unsub = this.glueController.onDisconnected(() => this.handleDisconnected(unsub));
    }

    private handleDisconnected(unsub: UnsubscribeFunction): void {

        this.logger?.trace("The platform has been disconnected from the preferred transport, reverting all to the default one.");

        unsub();

        this.fullDefaultRevert()
            .then(() => {
                this.registry.execute("system-reconnect");
                this.logger?.trace("The platform reversion to default completed, restarting the preferred tracking.");
                wait(this.discoveryInterval).then(() => this.connectPreferred());
            })
            .catch(() => wait(this.discoveryInterval).then(() => this.connectPreferred()));
    }

    private changeClientsConnection(config: Glue42Core.Connection.TransportSwitchSettings): Promise<void> {
        return this.sequelizer.enqueue<void>(async () => {

            try {

                await Promise.all([
                    this.glueController.switchTransport(config, "client"),
                    this.portsBridge.switchAllClientsTransport(config)
                ]);

            } catch (error: any) {
                this.logger?.trace(`Some clients could not connect to the preferred transport with error: ${JSON.stringify(error)}`);

                if (!this.shouldForceTransfer) {

                    this.logger?.trace("The platform is not forcing a transfer in cases of errors, re-throwing.");

                    throw new Error(error);
                }

                this.logger?.trace("The platform is forcing a transfer regardless of the errors.");
            }

            await this.glueController.switchTransport(config, "contextsTrack");
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

    private async fullDefaultRevert(): Promise<void> {
        await this.glueController.switchTransport({ type: "default" }, "system");

        this.portsBridge.setActivePreferredTransportConfig({ type: "default" });

        await this.changeClientsConnection({ type: "default" });
    }

    private async checkPreFlight(): Promise<{ ready: boolean }> {

        this.logger?.trace("Starting the preflight check");

        const isPreferredLive = (await this.checkPreferredConnection(this.preferredUrl)).live;

        if (!isPreferredLive) {
            this.logger?.trace("The preferred connection is not live.");
            return { ready: false };
        }

        this.logger?.trace(`Found a live preferred connection at: ${this.preferredUrl}, testing the availability of transport switching logic in all current clients`);

        const logicTestResult = await this.portsBridge.checkClientsPreferredLogic();

        this.logger?.trace(`The logic check returned: ${JSON.stringify(logicTestResult)}`);

        if (!logicTestResult.success && !this.shouldForceTransfer) {
            this.logger?.trace("The preflight check is marked as not ready");
            return { ready: false };
        }

        this.logger?.trace("Checking the possibility of all clients to connect to the preferred connection");

        const connectionTest = await this.portsBridge.checkClientsPreferredConnection(this.preferredUrl);

        this.logger?.trace(`The connection check returned: ${JSON.stringify(connectionTest)}`);

        if (!connectionTest.success && !this.shouldForceTransfer) {
            this.logger?.trace("The preflight check is marked as not ready");
            return { ready: false };
        }

        this.logger?.trace("The preflight check is marked as ready");

        return { ready: true };
    }
}