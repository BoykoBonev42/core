import { Glue42Core } from "@glue42/core";
import { nanoid } from "nanoid";
import { Glue42Search } from "../../search";
import { ClientController } from "../controllers/client";

export class ClientQuery {

    constructor(
        private readonly controller: ClientController,
        private readonly logger: Glue42Core.Logger.API,
        private readonly masterQueryId: string
    ) {}

    public exposeFacade(): Glue42Search.Query {
        const providerQueryFacade: Glue42Search.Query = {
            cancel: this.cancel.bind(this),
            onResults: this.onResults.bind(this),
            onCompleted: this.onCompleted.bind(this),
            onError: this.onError.bind(this)
        };

        return Object.freeze(providerQueryFacade);
    }

    private async cancel(): Promise<void> {
        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid query cancel request, forwarding to the controller.`);

        await this.controller.cancelQuery(this.masterQueryId, commandId);

        this.logger.info(`[${commandId}] the cancel request was completed.`);
    }

    private onResults(callback: (resultBatch: Glue42Search.QueryResultBatch) => void): Glue42Search.UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onQuery requires a callback of type function");
        }

        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid query onResults request, forwarding to the controller.`);

        const unsubscribe = this.controller.processClientOnResults({ callback, masterQueryId: this.masterQueryId, commandId });

        this.logger.info(`[${commandId}] the onResults request was completed.`);

        return unsubscribe;
    }

    private onCompleted(callback: () => void): Glue42Search.UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onQuery requires a callback of type function");
        }

        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid query onCompleted request, forwarding to the controller.`);

        const unsubscribe = this.controller.processClientOnCompleted({ callback, masterQueryId: this.masterQueryId, commandId });

        this.logger.info(`[${commandId}] the onCompleted request was completed.`);

        return unsubscribe;
    }

    private onError(callback: (error: Glue42Search.QueryError) => void): Glue42Search.UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onQuery requires a callback of type function");
        }

        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid query onError request, forwarding to the controller.`);

        const unsubscribe = this.controller.processClientOnError({ callback, masterQueryId: this.masterQueryId, commandId });

        this.logger.info(`[${commandId}] the onError request was completed.`);

        return unsubscribe;
    }

}