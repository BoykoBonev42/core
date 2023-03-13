import { Glue42Core } from "@glue42/core";
import { nanoid } from "nanoid";
import { Glue42Search } from "../../search";
import { ProviderController } from "../controllers/provider";
import { nonEmptyStringDecoder, queryResultDecoder } from "../shared/decoders";
import { QueryIdentification } from "../shared/types";
import { extractErrorMsg } from "../shared/utils";

export class ProviderQueryModel {
    constructor(
        private readonly myData: Glue42Search.QueryConfig,
        private readonly controller: ProviderController,
        private readonly logger: Glue42Core.Logger.API,
        private readonly identification: QueryIdentification
    ) {}

    private get id(): string {
        return this.identification.queryId;
    }

    private get search(): string {
        return this.myData.search;
    }

    private get providers(): Glue42Search.ProviderData[] | undefined {
        return this.myData.providers;
    }

    private get types(): Glue42Search.SearchType[] | undefined {
        return this.myData.types;
    }

    private get providerLimits(): Glue42Search.ProviderLimits | undefined {
        return this.myData.providerLimits;
    }

    public get myQueryData(): Glue42Search.QueryConfig {
        return Object.assign({}, this.myData);
    }

    public exposeFacade(): Glue42Search.ProviderQuery {
        const providerQueryFacade: Glue42Search.ProviderQuery = {
            id: this.id,
            search: this.search,
            providers: this.providers,
            types: this.types,
            providerLimits: this.providerLimits,
            sendResult: this.sendResult.bind(this),
            error: this.error.bind(this),
            done: this.done.bind(this)
        };

        return Object.freeze(providerQueryFacade);
    }

    private sendResult(result: Glue42Search.QueryResult): void {
        queryResultDecoder.runWithException(result);

        const commandId = nanoid(10);

        this.logger.trace(`[${commandId}] Received a valid result, forwarding to the controller`);

        return this.controller.processProviderQueryResult({ identification: this.identification, result, commandId });
    }

    private error(error: string): void {
        const commandId = nanoid(10);

        nonEmptyStringDecoder.runWithException(error);

        this.logger.trace(`[${commandId}] Received a valid error, forwarding to the controller`);

        this.controller.processProviderQueryError({ identification: this.identification, error, commandId }).catch((error) => this.logger.warn(`Error processing the error signal for this provider: ${this.id}, error: ${extractErrorMsg(error)}`));
    }

    private done(): void {
        const commandId = nanoid(10);

        this.logger.trace(`[${commandId}] Received a valid done, forwarding to the controller`);

        this.controller.processProviderQueryDone({ identification: this.identification, commandId }).catch((error) => this.logger.warn(`Error processing the done signal for this provider: ${this.identification.providerId}, error: ${extractErrorMsg(error)}`));
    }

}