/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Search } from "../../search";
import { ClientQuery } from "../models/client-query";
import { ProviderModel } from "../models/provider";
import { QueryResultsPublisher } from "../services/publisher";
import { ProtocolProviderInfoResponse } from "./protocol";

export interface LegacySearchRequest {
    search: string;
    limit: number;
    categoryLimit: number;
    types: string[];
}

export interface LegacySearchResultItem {
    type: string;
    category?: string;
    id?: string;
    displayName?: string;
    description?: string;
    iconURL?: string;
    action?: {
        method: string;
        params?: any;
    }
}

export interface QueryIdentification {
    queryId: string;
    providerId: string;
}

export interface ActiveQuery {
    queryId: string;
    callerInstanceId: string;
    providersAtWork: ProviderModel[];
    requestedTypes?: Glue42Search.SearchType[];
    publisher: QueryResultsPublisher;
    staleTimer: NodeJS.Timeout;
}

export interface SearchCancelRequest {
    id: string;
}

export interface ProviderQueryDoneCommand {
    identification: QueryIdentification;
    commandId: string;
}

export interface ProviderQueryErrorCommand {
    identification: QueryIdentification;
    commandId: string;
    error: string;
}

export interface ProviderQueryResultCommand {
    identification: QueryIdentification;
    commandId: string;
    result: Glue42Search.QueryResult;
}

export interface PublisherQueryResultBatch {
    results: (Glue42Search.QueryResult | LegacySearchResultItem)[];
    provider: Glue42Search.ProviderData;
}

export interface InteropServerProvider {
    interopId: string;
    info: ProtocolProviderInfoResponse;
}

export interface InteropServerQueryIdentification {
    interopId: string;
    queryId: string;
}

export interface ActiveClientQuery {
    servers: InteropServerQueryIdentification[],
    model: ClientQuery
}

export interface ProviderQueue {
    pendingResults: (Glue42Search.QueryResult | LegacySearchResultItem)[],
    providerData: ProviderModel;
    flushTimer?: NodeJS.Timeout;
    suspended?: boolean;
}

export interface QueryProviderResultsTracker {
    total: number;
    [key: string]: number;
}

export interface ProviderQueryLimit {
    maxResults: number;
    maxResultsPerType: number;
}

export interface LimitTestResult {
    maxLimitHit?: boolean;
    maxLimitPerTypeHit?: boolean;
}