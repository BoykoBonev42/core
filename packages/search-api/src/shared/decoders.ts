import { Decoder, string, number, object, optional, array, oneOf, constant, anyJson } from "decoder-validate";
import { Glue42Search } from "../../search";
import { QueryStatus, Operation, ProtocolProviderError, ProtocolSearchCompleted, ProtocolSearchResultsBatch } from "./protocol";
import { LegacySearchResultItem, SearchCancelRequest } from "./types";

export const nonEmptyStringDecoder: Decoder<string> = string().where((s) => s.length > 0, "Expected a non-empty string");
export const nonNegativeNumberDecoder: Decoder<number> = number().where((num) => num >= 0, "Expected a non-negative number");

export const searchTypeDecoder: Decoder<Glue42Search.SearchType> = object({
    name: nonEmptyStringDecoder,
    displayName: optional(nonEmptyStringDecoder)
});

export const providerData: Decoder<Glue42Search.ProviderData> = object({
    id: nonEmptyStringDecoder,
    interopId: nonEmptyStringDecoder,
    name: nonEmptyStringDecoder,
    appName: optional(nonEmptyStringDecoder),
    types: optional(array(searchTypeDecoder))
});

export const providerLimitsDecoder: Decoder<Glue42Search.ProviderLimits> = object({
    maxResults: optional(nonNegativeNumberDecoder),
    maxResultsPerType: optional(nonNegativeNumberDecoder)
});

export const queryConfigDecoder: Decoder<Glue42Search.QueryConfig> = object({
    search: nonEmptyStringDecoder,
    providers: optional(array(providerData)),
    types: optional(array(searchTypeDecoder)),
    providerLimits: optional(providerLimitsDecoder)
});

export const providerRegistrationConfig: Decoder<Glue42Search.ProviderRegistrationConfig> = object({
    name: nonEmptyStringDecoder,
    types: optional(array(searchTypeDecoder))
});

export const operationDecoder: Decoder<Operation> = oneOf<"search" | "info" | "cancel">(
    constant("cancel"),
    constant("info"),
    constant("search")
);

export const queryStatusDecoder: Decoder<QueryStatus> = oneOf<"done" | "in-progress" | "error">(
    constant("done"),
    constant("in-progress"),
    constant("error")
);

export const searchCancelRequestDecoder: Decoder<SearchCancelRequest> = object({
    id: nonEmptyStringDecoder
});

export const mainActionDecoder: Decoder<Glue42Search.MainAction> = object({
    method: nonEmptyStringDecoder,
    target: optional(oneOf<{ instance: string } | "all">(
        object({ instance: nonEmptyStringDecoder }),
        constant("all")
    )),
    params: optional(anyJson())
});

export const secondaryActionDecoder: Decoder<Glue42Search.SecondaryAction> = object({
    name: nonEmptyStringDecoder,
    method: nonEmptyStringDecoder,
    target: optional(oneOf<{ instance: string } | "all">(
        object({ instance: nonEmptyStringDecoder }),
        constant("all")
    )),
    params: optional(anyJson())
});

export const queryResultDecoder: Decoder<Glue42Search.QueryResult> = object({
    type: searchTypeDecoder,
    id: optional(nonEmptyStringDecoder),
    displayName: optional(nonEmptyStringDecoder),
    description: optional(nonEmptyStringDecoder),
    iconURL: optional(nonEmptyStringDecoder),
    action: optional(mainActionDecoder),
    secondaryActions: optional(array(secondaryActionDecoder))
});

export const legacySearchResultItemDecoder: Decoder<LegacySearchResultItem> = object({
    type: string(),
    category: optional(string()),
    id: optional(string()),
    displayName: optional(string()),
    description: optional(string()),
    iconURL: optional(string()),
    action: optional(mainActionDecoder)
});

export const protocolSearchResultsBatchDecoder: Decoder<ProtocolSearchResultsBatch> = object({
    items: array(oneOf<Glue42Search.QueryResult | LegacySearchResultItem>(
        queryResultDecoder,
        legacySearchResultItemDecoder
    )),
    provider: optional(providerData),
    queryId: nonEmptyStringDecoder,
    status: constant("in-progress")
});

export const protocolSearchCompletedDecoder: Decoder<ProtocolSearchCompleted> = object({
    items: array(oneOf<Glue42Search.QueryResult | LegacySearchResultItem>(
        queryResultDecoder,
        legacySearchResultItemDecoder
    )),
    queryId: nonEmptyStringDecoder,
    status: constant("done")
});

export const protocolProviderErrorDecoder: Decoder<ProtocolProviderError> = object({
    items: array(oneOf<Glue42Search.QueryResult | LegacySearchResultItem>(
        queryResultDecoder,
        legacySearchResultItemDecoder
    )),
    provider: optional(providerData),
    queryId: nonEmptyStringDecoder,
    errorMessage: nonEmptyStringDecoder,
    status: constant("error")
});
