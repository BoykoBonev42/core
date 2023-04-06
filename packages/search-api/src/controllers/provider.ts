/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { Glue42Core } from "@glue42/core";
import { nanoid } from "nanoid";
import { Glue42Search } from "../../search";
import { ProviderModel } from "../models/provider";
import { AsyncSequelizer } from "../services/sequelizer";
import { GlueController } from "./glue";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry
} from "callback-registry";
import { operationDecoder, queryConfigDecoder, searchCancelRequestDecoder } from "../shared/decoders";
import { ActiveQuery, LegacySearchRequest, ProviderQueryDoneCommand, ProviderQueryErrorCommand, ProviderQueryResultCommand, SearchCancelRequest } from "../shared/types";
import { STALE_QUERY_TIMEOUT_MS } from "../shared/constants";
import { CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS, ProtocolProviderInfoResponse, ProtocolSearchRequest, ProtocolSearchResponse } from "../shared/protocol";
import { LimitsTracker } from "../services/limits-tracker";
import { ModelFactory } from "../services/model-factory";
import { extractErrorMsg } from "../shared/utils";

export class ProviderController {

    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private readonly providersModels: { [key in string]: ProviderModel } = {};
    private readonly activeQueries: { [key in string]: ActiveQuery } = {};

    constructor(
        private readonly logger: Glue42Core.Logger.API,
        private readonly glueController: GlueController,
        private readonly sequelizer: AsyncSequelizer,
        private readonly limitsTracker: LimitsTracker,
        private readonly modelsFactory: ModelFactory
    ) {}

    public async processRegisterProvider(data: { config: Glue42Search.ProviderRegistrationConfig, commandId: string }): Promise<Glue42Search.Provider> {

        const { config, commandId } = data;

        this.logger.info(`[${commandId}] enqueueing the provider registration process with config: ${JSON.stringify(config)}`);

        const result = await this.sequelizer.enqueue<Glue42Search.Provider>(async () => {

            const allProvidersInfo = await this.glueController.getAllProvidersInfo();

            const allProvidersData = allProvidersInfo.flatMap((provInfo) => provInfo.info.providers);

            if (allProvidersData.some((providerData) => providerData && providerData.name === config.name)) {
                throw new Error(`Cannot register a new provider with name: ${config.name}, because there already is a provider with this name`);
            }

            await this.glueController.registerMainProviderMethod(this.handleSearchQueryRequest.bind(this));

            const modelData: Glue42Search.ProviderData = {
                id: nanoid(10),
                name: config.name,
                interopId: this.glueController.myInteropId,
                appName: this.glueController.myAppName,
                types: config.types
            };

            const model = this.modelsFactory.buildProviderModel(modelData, this);

            this.providersModels[modelData.id] = model;

            return model.exposeFacade();
        });

        this.logger.info(`[${commandId}] the provider with name: ${config.name} has been registered.`);

        return result;
    }

    public processProviderOnQuery(data: { callback: (query: Glue42Search.ProviderQuery) => void, id: string, commandId: string }): Glue42Search.UnsubscribeFunction {
        return this.registry.add(`on-search-query-${data.id}`, data.callback);
    }

    public processProviderOnQueryCancel(data: { callback: (query: { id: string; }) => void, id: string, commandId: string }): Glue42Search.UnsubscribeFunction {
        return this.registry.add(`on-cancel-query-${data.id}`, data.callback);
    }

    public async processProviderUnregister(data: { id: string, commandId: string }): Promise<void> {

        this.logger.info(`[${data.commandId}] enqueueing the provider un-registration with id: ${data.id}`);

        await this.sequelizer.enqueue<void>(async () => {
            this.cleanUpProvider(data.id, data.commandId);

            if (Object.keys(this.providersModels).length) {
                return;
            }

            await this.glueController.clearMainProviderMethod();
        });

        this.logger.info(`[${data.commandId}] the provider un-registration with id: ${data.id} completed`);

    }

    public async processProviderQueryDone(command: ProviderQueryDoneCommand): Promise<void> {

        const { commandId, identification } = command;

        this.activeQueries[identification.queryId]?.publisher.syncSuspendProvider(identification.providerId, commandId);

        await this.sequelizer.enqueue<void>(async () => {

            this.logger.trace(`[${commandId}] Processing a query done command with identification: ${JSON.stringify(identification)}`);

            const activeQuery = this.activeQueries[identification.queryId];

            if (!activeQuery) {
                this.logger.warn(`[${commandId}] Cannot mark provider: ${identification.providerId} done with query ${identification.queryId}, because there is no active query with this id`);
                return;
            }

            await this.cleanUpProviderQuery(identification.queryId, identification.providerId, commandId);

            if (activeQuery.providersAtWork.length) {
                this.logger.trace(`[${commandId}] Query done command completed, but there are more providers still at work.`);

                return;
            }

            this.cleanUpQuery(identification.queryId, commandId);

            this.logger.trace(`[${commandId}] Query is completed, signalling.`);
        });
    }

    public processProviderQueryError(command: ProviderQueryErrorCommand): Promise<void> {
        const { commandId, identification, error } = command;

        this.logger.warn(`[${commandId}] Processing an error sent by provider: ${identification.providerId} for query id: ${identification.queryId} -> ${error}`);

        this.activeQueries[identification.queryId]?.publisher.markProviderError(command);

        return this.processProviderQueryDone(command);
    }

    public processProviderQueryResult(command: ProviderQueryResultCommand): void {
        const { commandId, identification } = command;

        const activeQuery = this.activeQueries[identification.queryId];

        if (!activeQuery) {
            const errorMessage = `Will not send this result to the client, because there is no active query with id ${identification.queryId}. Most likely this query was cancelled.`;
            this.logger.warn(`[${command}] ${errorMessage}`);
            throw new Error(errorMessage);
        }

        if (activeQuery.publisher.checkProviderSuspended(identification.providerId)) {
            const errorMessage = `Will not send this result to the client, because there is no info about this provider in the active query with id ${identification.queryId}. Most likely this query was marked as done by this provider already.`;
            this.logger.warn(`[${command}] ${errorMessage}`);
            throw new Error(errorMessage);
        }

        const requestedTypes = activeQuery.requestedTypes;

        if (requestedTypes && requestedTypes.every((searchType) => searchType.name !== command.result.type.name)) {
            const errorMessage = `Will not send this result to the client, because this result has a defined type: ${command.result.type.name} which is not in the explicitly requested list of types by the client.`;
            this.logger.warn(`[${command}] ${errorMessage}`);
            throw new Error(errorMessage);
        }

        const testResult = this.limitsTracker.testResultLimit(command);

        if (testResult?.maxLimitHit) {
            const errorMessage = `Will not process this result from provider ${command.identification.providerId}, because this provider has reached the max results limit set by the client. This provider cannot send more result, marking it as done.`;
            this.logger.info(errorMessage);
            setTimeout(()=> this.processProviderQueryDone(command), 0);
            throw new Error(errorMessage);
        }

        if (testResult?.maxLimitPerTypeHit) {
            const errorMessage = `Will not process this result from provider ${command.identification.providerId}, because this provider has reached the max results limit per type as set by the client.`;
            this.logger.info(errorMessage);
            throw new Error(errorMessage);
        }

        this.logger.trace(`[${commandId}] An active query for query ${identification.queryId} was found and the provider is within limits, queueing the result`);

        this.limitsTracker.update(command);

        activeQuery.publisher.queueResult(command);

        this.logger.trace(`[${commandId}] The query result was queued successfully.`);

    }

    private async handleSearchQueryRequest(args: any, caller: Glue42Core.Interop.Instance): Promise<any> {
        const { operation } = args;

        const validatedOperation = operationDecoder.runWithException(operation);

        const commandId = nanoid(10);

        switch (validatedOperation) {
            case CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.info:
                return this.handleInfoOperation({ commandId });
            case CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.search:
                return this.handleSearchOperation({ args, commandId }, caller);
            case CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.cancel:
                return this.handleCancelOperation({ args, commandId });
            default:
                throw new Error(`Unrecognized operation: ${operation}`);
        }
    }

    private async handleInfoOperation(request: { commandId: string }): Promise<ProtocolProviderInfoResponse> {

        this.logger.info(`[${request.commandId}] handling an info operation`);

        const allSupportedTypes: Glue42Search.SearchType[] = Object.values(this.providersModels).flatMap((providerModel) => providerModel.myProviderData.types || []);

        const uniqueSupportedTypes = [...new Set(allSupportedTypes)];

        const providers: Glue42Search.ProviderData[] = Object.values(this.providersModels).map((providerModel) => providerModel.myProviderData);

        const response: ProtocolProviderInfoResponse = {
            supportedTypes: uniqueSupportedTypes.map((supportedType) => supportedType.name),
            providers: providers,
            apiVersion: "1"
        };

        this.logger.info(`[${request.commandId}] responding to an info operation with: ${JSON.stringify(response)}`);

        return response;

    }

    private async handleSearchOperation(request: { args: ProtocolSearchRequest | LegacySearchRequest, commandId: string }, caller: Glue42Core.Interop.Instance): Promise<ProtocolSearchResponse> {
        const commandId = request.commandId;

        const queryId = this.generateQueryId();

        this.logger.info(`[${commandId}] Processing search operation with queryId: ${queryId} request details: ${JSON.stringify(request.args)}`);

        const isLegacyRequest = this.checkRequestLegacy(request.args);

        const validatedRequest = this.prepareRequest(request.args, isLegacyRequest, commandId);

        this.logger.info(`[${commandId}] Search operation with queryId: ${queryId} is validated. Creating an active query and enqueueing calling the providers.`);

        this.activeQueries[queryId] = {
            queryId,
            callerInstanceId: caller.instance as string,
            providersAtWork: [],
            requestedTypes: validatedRequest.types,
            publisher: this.modelsFactory.buildPublisher(caller.instance as string, queryId, isLegacyRequest),
            staleTimer: this.setClearStaleQueryTimer(queryId)
        };

        if (validatedRequest.providerLimits) {
            this.limitsTracker.enableTracking(validatedRequest.providerLimits, queryId);
        }

        // needed to allow the search clients to process the query id
        setTimeout(() => {
            this.sequelizer.enqueue<void>(async () => {
                try {
                    this.logger.info(`[${commandId}] Calling the providers.`);
                    this.callProviders(validatedRequest, queryId, commandId);
                } catch (error) {
                    this.logger.error(`[${commandId}] Error calling the providers: ${extractErrorMsg(error)}`);
                }
            });
        }, 0);

        this.logger.info(`[${commandId}] Search operation with queryID: ${queryId} processed successfully.`);

        return { id: queryId };
    }

    private async handleCancelOperation(request: { args: SearchCancelRequest, commandId: string }): Promise<void> {

        await this.sequelizer.enqueue<void>(async () => {
            const validation = searchCancelRequestDecoder.run(request.args);
    
            if (!validation.ok) {
                const errorMsg = `Cannot process a cancel request, because of validation error: ${JSON.stringify(validation.error)}`;
    
                this.logger.warn(`[${request.commandId}] ${errorMsg}`);
                throw new Error(errorMsg);
            }
    
            const validatedRequest = validation.result;
    
            const activeQuery = this.activeQueries[validatedRequest.id];
    
            if (!activeQuery) {
                return;
            }
    
            clearTimeout(activeQuery.staleTimer);
    
            activeQuery.publisher.cancel(request.commandId);
    
            delete this.activeQueries[validatedRequest.id];
    
            activeQuery.providersAtWork.forEach((provider) => this.registry.execute(`on-cancel-query-${provider.myProviderData.id}`, { id: validatedRequest.id }));
        });

    }

    private generateQueryId(): string {
        const queryId = nanoid(10);

        if (this.activeQueries[queryId]) {
            return this.generateQueryId();
        }

        return queryId;
    }

    private translateLegacySearchRequest(legacyRequest: LegacySearchRequest): Glue42Search.QueryConfig {
        return {
            search: legacyRequest.search,
            types: legacyRequest.types?.map<Glue42Search.SearchType>((searchType) => ({ name: searchType })),
            providerLimits: {
                maxResults: legacyRequest.limit,
                maxResultsPerType: legacyRequest.categoryLimit
            }
        };
    }

    private checkRequestLegacy(searchRequest: ProtocolSearchRequest | LegacySearchRequest): boolean {
        return typeof (searchRequest as ProtocolSearchRequest).apiVersion === "undefined";
    }

    private callProviders(validatedRequest: Glue42Search.QueryConfig, queryId: string, commandId: string): void {
        let providers: ProviderModel[] = validatedRequest.providers ?
            this.getFilteredProviderModels(validatedRequest.providers)
            : Object.values(this.providersModels);

        this.logger.trace(`[${commandId}] initial providers filtration yielded: ${JSON.stringify(providers.map((p) => p.myProviderData.name).join(", "))}`);

        providers = validatedRequest.types ? this.getFilteredProvidersBySearchTypes(providers, validatedRequest.types) : providers;

        this.logger.trace(`[${commandId}] search type providers filtration yielded: ${JSON.stringify(providers.map((p) => p.myProviderData.name).join(", "))}`);

        this.activeQueries[queryId].publisher.configureProviders(providers);

        this.activeQueries[queryId].providersAtWork.push(...providers);

        providers.forEach((provider) => this.callProvider(provider, validatedRequest, queryId, commandId));
    }

    private callProvider(provider: ProviderModel, validatedRequest: Glue42Search.QueryConfig, queryId: string, commandId: string): void {
        const queryModel = this.modelsFactory.buildProviderQueryModel(validatedRequest, { queryId, providerId: provider.myProviderData.id }, this);

        const queryFacade = queryModel.exposeFacade();

        this.logger.info(`[${commandId}] The query facade for provider: ${provider.myProviderData.id} with name ${provider.myProviderData.name} is ready, raising the event for query ID: ${queryId}.`);

        this.registry.execute(`on-search-query-${provider.myProviderData.id}`, queryFacade);
    }

    private getFilteredProviderModels(providers: Glue42Search.ProviderData[]): ProviderModel[] {

        const filtered = providers.reduce<ProviderModel[]>((providers, provider) => {
            if (this.providersModels[provider.id]) {
                providers.push(this.providersModels[provider.id]);
            }

            return providers;
        }, []);

        return filtered;
    }

    private getFilteredProvidersBySearchTypes(providers: ProviderModel[], searchTypes: Glue42Search.SearchType[]): ProviderModel[] {

        const filtered = providers.filter((provider) => {

            // a provider with no registered types should receive all queries
            if (!provider.myProviderData.types || !provider.myProviderData.types.length) {
                return true;
            }

            return provider.myProviderData.types?.some((providerSearchType) => searchTypes.some((searchType) => searchType.name === providerSearchType.name));
        });

        return filtered;
    }

    private setClearStaleQueryTimer(queryId: string): NodeJS.Timeout {
        return setTimeout(() => {

            const commandId = nanoid(10);

            this.logger.info(`[${commandId}] Stale query timer is activated for queryId: ${queryId}`);

            const activeQuery = this.activeQueries[queryId];

            if (!activeQuery) {
                this.logger.info(`[${commandId}] No active query was found, this was a false activation.`);

                return;
            }

            this.logger.info(`[${commandId}] force-marking the query as done`);

            this.cleanUpQuery(queryId, commandId);

            this.logger.info(`[${commandId}] the stale query was cleared.`);

        }, STALE_QUERY_TIMEOUT_MS);
    }

    private prepareRequest(searchRequest: LegacySearchRequest | Glue42Search.QueryConfig, isLegacyRequest: boolean, commandId: string): Glue42Search.QueryConfig {
        const parsedRequest = isLegacyRequest ? this.translateLegacySearchRequest(searchRequest as LegacySearchRequest) : searchRequest;

        const validation = queryConfigDecoder.run(parsedRequest);

        if (!validation.ok) {
            const errorMsg = `Cannot process a search request, because of validation error: ${JSON.stringify(validation.error)}`;

            this.logger.warn(`[${commandId}] ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const validatedRequest = validation.result;

        return validatedRequest;
    }

    private cleanUpQuery(queryId: string, commandId: string): void {
        const activeQuery = this.activeQueries[queryId];

        clearTimeout(activeQuery.staleTimer);

        activeQuery.publisher.cleanPublisher(commandId);

        delete this.activeQueries[queryId];
        this.limitsTracker.cleanTracking(queryId);
    }

    private cleanUpProvider(providerId: string, commandId: string): void {
        this.registry.clearKey(`on-search-query-${providerId}`);
        this.registry.clearKey(`on-cancel-query-${providerId}`);

        delete this.providersModels[providerId];

        const queriesWithProvider = Object.values(this.activeQueries).filter((query) => !query.publisher.checkProviderSuspended(providerId));

        queriesWithProvider.forEach((query) => {
            this.processProviderQueryDone({
                identification: {
                    queryId: query.queryId,
                    providerId
                },
                commandId
            });
        });
    }

    private async cleanUpProviderQuery(queryId: string, providerId: string, commandId: string): Promise<void> {
        const activeQuery = this.activeQueries[queryId];

        if (!activeQuery) {
            this.logger.warn(`[${commandId}] Cannot clean up a provider query ${queryId} for provider ${providerId} because there is no such active query`);
            return;
        }

        activeQuery.providersAtWork = activeQuery.providersAtWork.filter((provider) => provider.myProviderData.id !== providerId);

        await activeQuery.publisher.markProviderDone(providerId, commandId);
    }
}
