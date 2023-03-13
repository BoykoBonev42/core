import { Glue42Search } from "../../search";
import { LegacySearchResultItem } from "./types";

export const SEARCH_QUERY_STATUSES: {
    done: "done",
    inProgress: "in-progress",
    error: "error"
} = {
    done: "done",
    inProgress: "in-progress",
    error: "error"
};

export const CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS: {
    info: "info",
    search: "search",
    cancel: "cancel"
} = {
    info: "info",
    search: "search",
    cancel: "cancel"
};

export type Operation = "search" | "info" | "cancel";

export type QueryStatus = "done" | "in-progress" | "error";

export interface ProtocolSearchResultsBatch {
    items: (Glue42Search.QueryResult | LegacySearchResultItem)[];
    provider?: Glue42Search.ProviderData;
    queryId: string;
    status: "in-progress";
}

export interface ProtocolSearchCompleted {
    items: (Glue42Search.QueryResult | LegacySearchResultItem)[];
    queryId: string;
    status: "done";
}

export interface ProtocolProviderError {
    items: (Glue42Search.QueryResult | LegacySearchResultItem)[];
    provider?: Glue42Search.ProviderData;
    queryId: string;
    errorMessage: string;
    status: "error";
}

export interface ProtocolQueryCancelRequest {
    operation: "cancel",
    id: string;
}

export interface ProtocolProviderInfoRequest {
    operation: "info"
}

export interface ProtocolProviderInfoResponse {
    supportedTypes: string[];
    providers: Glue42Search.ProviderData[];
    apiVersion: "1";
}

export interface ProtocolSearchRequest extends Glue42Search.QueryConfig {
    operation: "search"
    apiVersion: "1"
}

export interface ProtocolSearchResponse {
    id: string;
}
