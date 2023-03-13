/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Search } from "../../search";
import { MAIN_CLIENT_METHOD_NAME, MAIN_PROVIDER_METHOD_NAME } from "../shared/constants";
import { CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS, ProtocolProviderError, ProtocolProviderInfoRequest, ProtocolProviderInfoResponse, ProtocolQueryCancelRequest, ProtocolSearchCompleted, ProtocolSearchRequest, ProtocolSearchResponse, ProtocolSearchResultsBatch, SEARCH_QUERY_STATUSES } from "../shared/protocol";
import { InteropServerProvider, InteropServerQueryIdentification, PublisherQueryResultBatch, SearchCancelRequest } from "../shared/types";

export class GlueController {
    constructor(private readonly glue: Glue42Core.GlueCore) {}

    public get myAppName(): string | undefined {
        return this.glue.interop.instance.applicationName;
    }

    public get myInteropId(): string {
        return this.glue.interop.instance.instance as string;
    }

    public async registerMainProviderMethod(handler: (args: any, caller: Glue42Core.Interop.Instance) => Promise<any>): Promise<void> {
        const mainMethodStatus = this.checkMyMethodExists(MAIN_PROVIDER_METHOD_NAME);

        if (mainMethodStatus.exists) {
            return;
        }

        await this.glue.interop.register(MAIN_PROVIDER_METHOD_NAME, handler);
    }

    public async registerMainClientMethod(handler: (args: any, caller: Glue42Core.Interop.Instance) => Promise<any>): Promise<void> {
        const mainMethodStatus = this.checkMyMethodExists(MAIN_PROVIDER_METHOD_NAME);

        if (mainMethodStatus.exists) {
            return;
        }

        await this.glue.interop.register(MAIN_CLIENT_METHOD_NAME, handler);
    }

    public async clearMainProviderMethod(): Promise<void> {
        // unregister is async, there is a bug in the typings
        await this.glue.interop.unregister(MAIN_PROVIDER_METHOD_NAME);
    }

    public async sendClientResultsBatch(batch: PublisherQueryResultBatch, clientInstanceId: string, queryId: string): Promise<void> {
        const interopArguments: ProtocolSearchResultsBatch = {
            items: batch.results,
            provider: batch.provider,
            queryId,
            status: SEARCH_QUERY_STATUSES.inProgress
        };

        await this.glue.interop.invoke<void>(MAIN_CLIENT_METHOD_NAME, interopArguments, { instance: clientInstanceId });
    }

    public async sendClientQueueCompleted(clientInstanceId: string, queryId: string): Promise<void> {
        const interopArguments: ProtocolSearchCompleted = {
            items: [],
            queryId,
            status: SEARCH_QUERY_STATUSES.done
        };

        await this.glue.interop.invoke<void>(MAIN_CLIENT_METHOD_NAME, interopArguments, { instance: clientInstanceId });
    }

    public async sendClientErrorMessage(error: string, clientInstanceId: string, queryId: string, provider: Glue42Search.ProviderData): Promise<void> {
        const interopArguments: ProtocolProviderError = {
            items: [],
            provider,
            errorMessage: error,
            queryId,
            status: SEARCH_QUERY_STATUSES.error
        };

        await this.glue.interop.invoke<void>(MAIN_CLIENT_METHOD_NAME, interopArguments, { instance: clientInstanceId });
    }

    public async sendQueryRequest(queryConfig: Glue42Search.QueryConfig, instances: InteropServerProvider[]): Promise<InteropServerQueryIdentification[]> {

        if (!instances.length) {
            return [];
        }

        const target = instances.map((inst) => ({ instance: inst.interopId }));

        const invokeArgs: ProtocolSearchRequest = {
            operation: CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.search,
            apiVersion: "1",
            ...queryConfig
        };

        const response = await this.glue.interop.invoke<ProtocolSearchResponse>(MAIN_PROVIDER_METHOD_NAME, invokeArgs, target);

        const allReturned = response.all_return_values || [];

        return allReturned.map<InteropServerQueryIdentification>((returnValue) => {
            return {
                interopId: returnValue.executed_by?.instance as string,
                queryId: returnValue.returned.id
            };
        });
    }

    public async sendQueryCancelRequest(request: SearchCancelRequest, instance: { instance: string }): Promise<void> {
        const args: ProtocolQueryCancelRequest = {
            operation: CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.cancel,
            id: request.id
        };

        await this.glue.interop.invoke(MAIN_PROVIDER_METHOD_NAME, args, instance);
    }

    public async getAllProvidersInfo(): Promise<InteropServerProvider[]> {

        if (this.glue.interop.methods().every((method) => method.name !== MAIN_PROVIDER_METHOD_NAME)) {
            return [];
        }

        const args: ProtocolProviderInfoRequest = {
            operation: CLIENT_TO_PROVIDER_PROTOCOL_OPERATIONS.info
        };

        const response = await this.glue.interop.invoke<ProtocolProviderInfoResponse>(MAIN_PROVIDER_METHOD_NAME, args, "all");

        const allReturned = response.all_return_values || [];

        return allReturned.map<InteropServerProvider>((returnValue) => {

            const isLegacy = typeof returnValue.returned.apiVersion === "undefined";

            const info: ProtocolProviderInfoResponse = isLegacy ? {
                supportedTypes: returnValue.returned.supportedTypes,
                apiVersion: returnValue.returned.apiVersion,
                providers: [{
                    interopId: returnValue.executed_by?.instance as string,
                    id: returnValue.executed_by?.instance as string,
                    name: returnValue.executed_by?.instance as string,
                    appName: response.executed_by?.application,
                    types: returnValue.returned.supportedTypes.map((t) => ({ name: t }))
                }]
            } : returnValue.returned;

            return {
                interopId: returnValue.executed_by?.instance as string,
                info
            };
        });
    }

    private checkMyMethodExists(methodName: string): { exists: boolean } {
        const myMethods = this.glue.interop.methodsForInstance({ instance: this.glue.interop.instance.instance });

        return { exists: myMethods.some((method) => method.name === methodName) };
    }
}