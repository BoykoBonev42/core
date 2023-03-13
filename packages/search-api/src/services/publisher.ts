import { Glue42Core } from "@glue42/core";
import { Glue42Search } from "../../search";
import { GlueController } from "../controllers/glue";
import { ProviderModel } from "../models/provider";
import { FLUSH_TIMEOUT_MS } from "../shared/constants";
import { LegacySearchResultItem, PublisherQueryResultBatch, ProviderQueryResultCommand, ProviderQueryErrorCommand, ProviderQueue } from "../shared/types";
import { extractErrorMsg } from "../shared/utils";
import { AsyncSequelizer } from "./sequelizer";

export class QueryResultsPublisher {

    private queues: { [key in string]: ProviderQueue } = {};

    constructor(
        private readonly sequelizer: AsyncSequelizer,
        private readonly glueController: GlueController,
        private readonly logger: Glue42Core.Logger.API,
        private readonly clientInstanceId: string,
        private readonly queryId: string,
        private readonly isLegacy: boolean
    ) {}

    public checkProviderSuspended(providerId: string): boolean {
        return this.queues[providerId] ? !!this.queues[providerId].suspended : false;
    }

    public syncSuspendProvider(providerId: string, commandId: string): void {
        const providerQueue = this.queues[providerId];

        if (!providerQueue) {
            this.logger.warn(`[${commandId}] Cannot suspend provider: ${providerId}, because there is no provider queue. This happens when the provider queue was already cancelled or completed`);

            return;
        }

        providerQueue.suspended = true;
    }

    public configureProviders(providers: ProviderModel[]): void {
        providers.forEach((provider) => {
            this.queues[provider.myProviderData.id] = {
                providerData: provider,
                pendingResults: []
            };
        });
    }

    public queueResult(command: ProviderQueryResultCommand): void {
        const { commandId, identification } = command;

        this.logger.trace(`[${commandId}] Queuing a new result from provider: ${identification.providerId}`);

        const providerQueue = this.queues[identification.providerId];

        if (!providerQueue) {
            this.logger.warn(`[${commandId}] Cannot queue this result, because there is no provider queue. This happens when the provider queue was already cancelled or completed`);

            return;
        }

        const result = this.isLegacy ? this.translateLegacySearchItem(command.result) : command.result;

        providerQueue.pendingResults.push(result);

        clearTimeout(providerQueue.flushTimer);

        if (providerQueue.pendingResults.length === 10) {
            this.logger.trace(`[${commandId}] Reached the limit in the queue buffer, flushing to the client.`);
            this.flushProviderQueue(identification.providerId, commandId);

            return;
        }

        this.logger.trace(`[${commandId}] The limit in the queue buffer is not reached yet, setting a flush timer.`);

        providerQueue.flushTimer = setTimeout(() => {
            this.logger.trace(`[${commandId}] Reached the time limit in the queue buffer, flushing to the client.`);
            this.flushProviderQueue(identification.providerId, commandId);
        }, FLUSH_TIMEOUT_MS);
    }

    public cancel(commandId: string): void {
        this.logger.trace(`[${commandId}] Cancelling queue ${this.queryId}.`);

        Object.values(this.queues).forEach((queue) => clearTimeout(queue.flushTimer));

        this.queues = {};

        this.logger.trace(`[${commandId}] Queue ${this.queryId} publisher cancelled.`);

    }

    public async markProviderDone(providerId: string, commandId: string): Promise<void> {
        this.logger.trace(`[${commandId}] Marking provider ${providerId} as done.`);

        const providerQueue = this.queues[providerId];

        if (!providerQueue) {
            this.logger.info(`[${commandId}] Cannot mark this queue as done, because there is no provider queue. This happens when the provider queue was already cancelled, completed or the provider sent an error`);

            return;
        }

        clearTimeout(providerQueue.flushTimer);

        await this.flushProviderQueue(providerId, commandId);

        delete this.queues[providerId];

        this.logger.trace(`[${commandId}] Provider ${providerId} marked as done.`);
    }

    public markProviderError(command: ProviderQueryErrorCommand): void {
        const providerQueue = this.queues[command.identification.providerId];

        if (!providerQueue) {
            this.logger.warn(`[${command.commandId}] Cannot mark this provider as errored, because there is no provider queue. This happens when the provider queue was already cancelled, completed or the provider sent and error`);

            return;
        }

        this.glueController.sendClientErrorMessage(command.error, this.clientInstanceId, this.queryId, providerQueue.providerData.myProviderData)
            .catch((error) => this.logger.warn(`[${command.commandId}] The client errored when handling error message for query: ${this.queryId} -> ${extractErrorMsg(error)}`));
    }

    public cleanPublisher(commandId: string): void {
        Object.values(this.queues).forEach((queue) => clearTimeout(queue.flushTimer));

        this.queues = {};

        this.glueController.sendClientQueueCompleted(this.clientInstanceId, this.queryId)
            .catch((error) => this.logger.warn(`[${commandId}] The client errored when handling search end message for query: ${this.queryId} -> ${extractErrorMsg(error)}`));
    }

    private async flushProviderQueue(providerId: string, commandId: string): Promise<void> {

        await this.sequelizer.enqueue<void>(async () => {
            const providerQueue = this.queues[providerId];

            if (!providerQueue) {
                this.logger.warn(`[${commandId}] Cannot flush this queue, because there is no provider queue. This happens when the provider queue was already cancelled, completed or the provider sent and error`);

                return;
            }

            if (!providerQueue.pendingResults.length) {
                this.logger.info(`[${commandId}] This provider does not have any pending results to flush.`);
                return;
            }

            const resultBatch: PublisherQueryResultBatch = {
                results: providerQueue.pendingResults,
                provider: providerQueue.providerData.myProviderData
            };

            providerQueue.pendingResults = [];

            try {
                await this.glueController.sendClientResultsBatch(resultBatch, this.clientInstanceId, this.queryId);
            } catch (error) {
                this.logger.warn(`[${commandId}] The client errored when handling search results for query: ${this.queryId} -> ${extractErrorMsg(error)}`);
            }
        });

    }

    private translateLegacySearchItem(searchResult: Glue42Search.QueryResult): LegacySearchResultItem {
        return {
            type: searchResult.type.name,
            category: searchResult.type.displayName,
            id: searchResult.id,
            displayName: searchResult.displayName,
            description: searchResult.description,
            iconURL: searchResult.iconURL,
            action: searchResult.action
        };
    }
}