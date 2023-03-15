/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";

export namespace Glue42Search {

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface Config {}

    export interface API {
        version: string;
        setDebounceMS(milliseconds: number): void;
        getDebounceMS(): number;
        listProviders(): Promise<ProviderData[]>;
        listTypes(): Promise<SearchType[]>;
        query(queryConfig: QueryConfig): Promise<Query>;
        registerProvider(config: ProviderRegistrationConfig): Promise<Provider>;
    }

    export interface Query {
        cancel(): Promise<void>;
        onResults(callback: (resultBatch: QueryResultBatch) => void): UnsubscribeFunction;
        onCompleted(callback: () => void): UnsubscribeFunction;
        onError(callback: (error: QueryError) => void): UnsubscribeFunction;
    }

    export interface Provider extends ProviderData {
        onQuery(callback: (query: ProviderQuery) => void): UnsubscribeFunction;
        onQueryCancel(callback: (query: { id: string }) => void): UnsubscribeFunction;
        unregister(): Promise<void>;
    }

    export interface ProviderData {
        interopId: string;
        id: string;
        name: string;
        appName?: string;
        types?: SearchType[];
    }

    export interface QueryConfig {
        search: string;
        providers?: ProviderData[];
        types?: SearchType[];
        providerLimits?: ProviderLimits;
    }

    export interface ProviderQuery extends QueryConfig {
        id: string;
        sendResult(result: QueryResult): void;
        error(error: string): void;
        done(): void;
    }

    export interface ProviderRegistrationConfig {
        name: string;
        types?: SearchType[];
    }

    export interface QueryResultBatch {
        results: QueryResult[];
        provider?: ProviderData;
    }

    export interface QueryError {
        error: string;
        provider?: ProviderData;
    }

    export interface ProviderLimits {
        maxResults?: number;
        maxResultsPerType?: number;
    }

    export interface QueryResult {
        type: SearchType;
        id?: string;
        displayName?: string;
        description?: string;
        iconURL?: string;
        metadata?: any;
        action?: MainAction;
        secondaryActions?: SecondaryAction[];
    }

    export interface MainAction {
        method: string;
        target?: { instance: string } | "all";
        params?: any;
    }

    export interface SecondaryAction extends MainAction {
        name: string;
    }

    export interface SearchType {
        name: string;
        displayName?: string;
    }

    type UnsubscribeFunction = () => void;
}

export type GlueSearchFactoryFunction = (glue: Glue42Core.GlueCore, config?: Glue42Search.Config) => Promise<void>;
declare const GlueSearch: GlueSearchFactoryFunction;
export default GlueSearch;