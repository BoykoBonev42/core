import { Glue42Core } from "@glue42/core";
import { GlueBridge } from "../communication/bridge";
import { systemOperationTypesDecoder } from "../shared/decoders";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import { operations } from "./protocol";

export class SystemController implements LibController {
    private bridge!: GlueBridge;
    private ioc!: IoC;

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.bridge = ioc.bridge;
        this.ioc = ioc;

        this.addOperationsExecutors();

        await this.setEnvironment();
    }

    public async handleBridgeMessage(args: any): Promise<void> {
        const operationName = systemOperationTypesDecoder.runWithException(args.operation);

        const operation = operations[operationName];

        if (!operation.execute) {
            return;
        }

        let operationData: any = args.data;

        if (operation.dataDecoder) {
            operationData = operation.dataDecoder.runWithException(args.data);
        }

        return await operation.execute(operationData);
    }

    private async processPlatformShutdown(): Promise<void> {

        Object.values(this.ioc.controllers).forEach((controller) => controller.handlePlatformShutdown ? controller.handlePlatformShutdown() : null);

        this.ioc.preferredConnectionController.stop();

        this.ioc.eventsDispatcher.stop();

        await this.bridge.stop();

    }

    private async setEnvironment(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const environment = await this.bridge.send<void, any>("system", operations.getEnvironment, undefined);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const base = await this.bridge.send<void, any>("system", operations.getBase, undefined);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const glue42core = Object.assign({}, (window as any).glue42core, base, { environment });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).glue42core = Object.freeze(glue42core);
    }

    private addOperationsExecutors(): void {
        operations.platformShutdown.execute = this.processPlatformShutdown.bind(this);
    }
}