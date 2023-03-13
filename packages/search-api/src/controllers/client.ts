/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { Glue42Core } from "@glue42/core";
import { nanoid } from "nanoid";
import { Glue42Search } from "../../search";
import { ActiveClientQuery, InteropServerProvider, LegacySearchResultItem } from "../shared/types";
import { GlueController } from "./glue";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry
} from "callback-registry";
import { ProtocolProviderError, ProtocolSearchCompleted, ProtocolSearchResultsBatch, SEARCH_QUERY_STATUSES } from "../shared/protocol";
import { queryStatusDecoder, protocolProviderErrorDecoder, protocolSearchCompletedDecoder, protocolSearchResultsBatchDecoder } from "../shared/decoders";
import { ModelFactory } from "../services/model-factory";

export class ClientController {

    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private readonly activeQueryLookup: { [key in string]: ActiveClientQuery } = {};
    private readonly queryIdToMasterIdLookup: { [key in string]: string } = {};
    private pendingDebounce: ({ resolve: (value: Glue42Search.Query) => void, reject: (reason?: any) => void })[] = [];
    private debounceTimer?: NodeJS.Timer;
    private debounceMS = 0;

    constructor(
        private readonly logger: Glue42Core.Logger.API,
        private readonly glueController: GlueController,
        private readonly modelFactory: ModelFactory
    ) {}

    public async start(): Promise<void> {
        await this.glueController.registerMainClientMethod(this.handleProviderCall.bind(this));
    }

    public setDebounceMS(data: { milliseconds: number, commandId: string }): void {

        this.logger.info(`[${data.commandId}] Setting the debounceMS to: ${data.milliseconds}`);

        this.debounceMS = data.milliseconds;

        this.logger.info(`[${data.commandId}] debounceMS set to: ${data.milliseconds}`);
    }

    public getDebounceMS(data: { commandId: string }): number {

        this.logger.info(`[${data.commandId}] Getting the debounceMS`);

        return this.debounceMS;

    }

    public async query(data: { queryConfig: Glue42Search.QueryConfig, commandId: string }, skipDebounce?: boolean): Promise<Glue42Search.Query> {

        if (this.debounceMS && !skipDebounce) {
            return this.debounceQuery(data);
        }

        const { queryConfig, commandId } = data;

        this.logger.info(`[${commandId}] Initiating a query request`);

        let allProvidersInfo = await this.glueController.getAllProvidersInfo();

        this.logger.trace(`[${commandId}] Got all available providers: ${JSON.stringify(allProvidersInfo)}`);

        if (queryConfig.providers) {
            this.logger.info(`[${commandId}] Filtering providers by explicitly allowed providers.`);
            allProvidersInfo = this.filterProvidersByAllowList(allProvidersInfo, queryConfig.providers);
        }

        if (queryConfig.types) {
            this.logger.info(`[${commandId}] Filtering providers by explicitly allowed types.`);
            allProvidersInfo = this.filterProvidersByAllowedTypes(allProvidersInfo, queryConfig.types);
        }

        if (!allProvidersInfo.length) {
            this.logger.warn(`[${commandId}] There are no providers that can handle the query for ${data.queryConfig.search}`);
        }

        this.logger.info(`[${commandId}] Sending query request to providers: ${JSON.stringify(allProvidersInfo)}`);
        const allQueryResponses = await this.glueController.sendQueryRequest(queryConfig, allProvidersInfo);

        this.logger.info(`[${commandId}] Received responses from the providers: ${JSON.stringify(allQueryResponses)}`);
        const masterQueryId = this.generateMasterQueryId();

        const queryModel = this.modelFactory.buildClientQueryModel(masterQueryId, this);

        this.logger.info(`[${commandId}] The query is in progress with master id: ${masterQueryId}`);

        this.activeQueryLookup[masterQueryId] = {
            servers: allQueryResponses,
            model: queryModel
        };

        allQueryResponses.forEach((response) => {
            this.queryIdToMasterIdLookup[response.queryId] = masterQueryId;
        });

        if (!allQueryResponses.length) {
            // there are no providers that will handle this request
            setTimeout(() => {
                this.registry.execute(`on-query-completed-${masterQueryId}`);

                this.cleanUpQuery(masterQueryId);
            }, 0);
        }

        return queryModel.exposeFacade();
    }

    public async cancelQuery(masterQueryId: string, commandId: string): Promise<void> {

        const activeQuery = this.activeQueryLookup[masterQueryId];

        if (!activeQuery) {
            throw new Error(`[${commandId}] Cannot cancel query: ${masterQueryId}, because this query does not exist`);
        }

        const interopIds = activeQuery.servers;

        this.logger.info(`[${commandId}] Sending cancel query requests`);

        await Promise.all(interopIds.map((serverId) => {
            this.logger.trace(`[${commandId}] Sending cancel query request to ${serverId.interopId} with queryId: ${serverId.queryId}`);

            return this.glueController.sendQueryCancelRequest({ id: serverId.queryId }, { instance: serverId.interopId });
        }));

        this.logger.info(`[${commandId}] The query was cancelled`);
    }

    public processClientOnResults(data: { callback: (resultBatch: Glue42Search.QueryResultBatch) => void, masterQueryId: string, commandId: string }): Glue42Search.UnsubscribeFunction {
        return this.registry.add(`on-query-results-${data.masterQueryId}`, data.callback);
    }

    public processClientOnCompleted(data: { callback: () => void, masterQueryId: string, commandId: string }): Glue42Search.UnsubscribeFunction {
        return this.registry.add(`on-query-completed-${data.masterQueryId}`, data.callback);
    }

    public processClientOnError(data: { callback: (error: Glue42Search.QueryError) => void, masterQueryId: string, commandId: string }): Glue42Search.UnsubscribeFunction {
        return this.registry.add(`on-query-error-${data.masterQueryId}`, data.callback);
    }

    private async handleProviderCall(args: any): Promise<any> {
        const { status } = args;

        const validatedOperation = queryStatusDecoder.runWithException(status);

        const commandId = nanoid(10);

        switch (validatedOperation) {
            case SEARCH_QUERY_STATUSES.done:
                return this.handleQueryCompleted({ completedConfig: args, commandId });
            case SEARCH_QUERY_STATUSES.inProgress:
                return this.handleQueryResults({ resultsBatch: args, commandId });
            case SEARCH_QUERY_STATUSES.error:
                return this.handleQueryError({ error: args, commandId });
            default:
                throw new Error(`Unrecognized status: ${status}`);
        }
    }

    private handleQueryResults(data: { resultsBatch: ProtocolSearchResultsBatch, commandId: string }): void {
        const { resultsBatch, commandId } = data;

        this.logger.trace(`[${commandId}] Processing a results batch from provider: ${resultsBatch.provider?.name} with id: ${resultsBatch.provider?.id}`);

        const verifiedResultsBatch = protocolSearchResultsBatchDecoder.runWithException(resultsBatch);

        const masterQueryId = this.queryIdToMasterIdLookup[verifiedResultsBatch.queryId];

        if (!masterQueryId) {
            this.logger.warn(`[${commandId}] Received results for an unknown query. Provider ${JSON.stringify(verifiedResultsBatch.provider)}, items: ${JSON.stringify(verifiedResultsBatch.items)}`);
            return;
        }

        this.logger.trace(`[${commandId}] The results batch is validated, forwarding to the callbacks`);

        const translatedResults: Glue42Search.QueryResult[] = this.checkTransformLegacyResults(verifiedResultsBatch.items);

        const results: Glue42Search.QueryResultBatch = {
            provider: verifiedResultsBatch.provider,
            results: translatedResults
        };

        this.registry.execute(`on-query-results-${masterQueryId}`, results);
    }

    private handleQueryCompleted(data: { completedConfig: ProtocolSearchCompleted, commandId: string }): void {
        const { completedConfig, commandId } = data;

        this.logger.trace(`[${commandId}] Processing a query completed message from query id: ${completedConfig.queryId}`);

        const verifiedCompleteConfig = protocolSearchCompletedDecoder.runWithException(completedConfig);

        const masterQueryId = this.queryIdToMasterIdLookup[verifiedCompleteConfig.queryId];

        if (!masterQueryId) {
            this.logger.warn(`[${commandId}] Received completed message for an unknown query. Provider query id: ${JSON.stringify(verifiedCompleteConfig.queryId)}`);
            return;
        }

        if (verifiedCompleteConfig.items.length) {
            const translatedResults: Glue42Search.QueryResult[] = this.checkTransformLegacyResults(verifiedCompleteConfig.items);

            const results: Glue42Search.QueryResultBatch = {
                results: translatedResults
            };

            this.registry.execute(`on-query-results-${masterQueryId}`, results);
        }

        delete this.queryIdToMasterIdLookup[verifiedCompleteConfig.queryId];

        const activeQuery = this.activeQueryLookup[masterQueryId];

        activeQuery.servers = activeQuery.servers.filter((server) => server.queryId !== verifiedCompleteConfig.queryId);

        if (activeQuery.servers.length) {
            this.logger.trace(`[${commandId}] Waiting for more providers to complete`);

            return;
        }

        this.logger.trace(`[${commandId}] All providers are done, marking this query as completed`);

        this.registry.execute(`on-query-completed-${masterQueryId}`);

        this.cleanUpQuery(masterQueryId);
    }

    private handleQueryError(data: { error: ProtocolProviderError, commandId: string }): void {
        const { error, commandId } = data;

        this.logger.trace(`[${commandId}] Processing an error message from query: ${error.queryId}`);

        const validatedError = protocolProviderErrorDecoder.runWithException(error);

        const masterQueryId = this.queryIdToMasterIdLookup[validatedError.queryId];

        if (!masterQueryId) {
            this.logger.warn(`[${commandId}] Received error message for an unknown query. Provider query id: ${JSON.stringify(validatedError.queryId)} and message: ${JSON.stringify(validatedError.errorMessage)}`);
            return;
        }

        const queryError: Glue42Search.QueryError = {
            error: validatedError.errorMessage,
            provider: validatedError.provider
        };

        this.registry.execute(`on-query-error-${masterQueryId}`, queryError);
    }

    private filterProvidersByAllowList(servers: InteropServerProvider[], allowed: Glue42Search.ProviderData[]): InteropServerProvider[] {

        const allowedLookup = allowed.reduce<{ [key in string]: boolean }>((lookup, allowedEntry) => {
            lookup[allowedEntry.id] = true;

            return lookup;
        }, {});

        return servers.filter((server) => {
            const serverProviders = server.info.providers;

            return serverProviders.some((provider) => allowedLookup[provider.id]);
        });
    }

    private filterProvidersByAllowedTypes(servers: InteropServerProvider[], allowed: Glue42Search.SearchType[]): InteropServerProvider[] {

        const allowedLookup = allowed.reduce<{ [key in string]: boolean }>((lookup, allowedEntry) => {
            lookup[allowedEntry.name] = true;

            return lookup;
        }, {});

        return servers.filter((server) => {
            const allTypes = server.info.supportedTypes;

            return allTypes.some((supportedType) => allowedLookup[supportedType]);
        });
    }

    private generateMasterQueryId(): string {
        const queryId = nanoid(10);

        if (this.activeQueryLookup[queryId]) {
            return this.generateMasterQueryId();
        }

        return queryId;
    }

    private cleanUpQuery(masterQueryId: string): void {
        this.registry.clearKey(`on-query-results-${masterQueryId}`);
        this.registry.clearKey(`on-query-completed-${masterQueryId}`);
        this.registry.clearKey(`on-query-error-${masterQueryId}`);

        delete this.activeQueryLookup[masterQueryId];
    }

    private debounceQuery(data: { queryConfig: Glue42Search.QueryConfig, commandId: string }): Promise<Glue42Search.Query> {
        return new Promise<Glue42Search.Query>((res, rej) => {
            clearTimeout(this.debounceTimer);

            this.debounceTimer = setTimeout(() => {
                const currentPending = [...this.pendingDebounce];

                this.pendingDebounce = [];

                this.query(data, true)
                    .then((query) => currentPending.forEach(({ resolve }) => resolve(query)))
                    .catch((error) => currentPending.forEach(({ reject }) => reject(error)));

            }, this.debounceMS);

            this.pendingDebounce.push({ resolve: res, reject: rej });
        });
    }

    private checkTransformLegacyResults(items: (Glue42Search.QueryResult | LegacySearchResultItem)[]): Glue42Search.QueryResult[] {

        if (!items.length) {
            return [];
        }

        const sampleItem = items[0];

        if (!sampleItem || typeof sampleItem.type === "object") {
            return items as Glue42Search.QueryResult[];
        }

        return (items as LegacySearchResultItem[]).map<Glue42Search.QueryResult>((item) => {
            return {
                type: { name: item.type, displayName: item.category },
                id: item.id,
                displayName: item.displayName,
                description: item.description,
                iconURL: item.iconURL,
                action: item.action
            };
        });
    }
}
