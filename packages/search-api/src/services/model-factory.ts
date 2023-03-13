import { Glue42Core } from "@glue42/core";
import { Glue42Search } from "../../search";
import { ClientController } from "../controllers/client";
import { GlueController } from "../controllers/glue";
import { ProviderController } from "../controllers/provider";
import { ClientQuery } from "../models/client-query";
import { ProviderModel } from "../models/provider";
import { ProviderQueryModel } from "../models/provider-query";
import { QueryIdentification } from "../shared/types";
import { QueryResultsPublisher } from "./publisher";
import { AsyncSequelizer } from "./sequelizer";

export class ModelFactory {

    constructor(
        private readonly glueController: GlueController,
        private readonly glue: Glue42Core.GlueCore,
        private readonly flushSequelizer: AsyncSequelizer
    ) {}

    public buildProviderModel(providerData: Glue42Search.ProviderData, controller: ProviderController): ProviderModel {
        return new ProviderModel(providerData, controller, this.glue.logger.subLogger(`search.provider.model.${providerData.name}`));
    }

    public buildProviderQueryModel(queryConfig: Glue42Search.QueryConfig, identification: QueryIdentification, controller: ProviderController): ProviderQueryModel {
        return new ProviderQueryModel(queryConfig, controller, this.glue.logger.subLogger(`search.provider.${identification.providerId}.query.${identification.queryId}`), identification);
    }

    public buildPublisher(clientInstanceId: string, queryId: string, isLegacy: boolean): QueryResultsPublisher {
        return new QueryResultsPublisher(
            this.flushSequelizer,
            this.glueController,
            this.glue.logger.subLogger(`search.results.publisher.${queryId}`),
            clientInstanceId, queryId, isLegacy
        );
    }

    public buildClientQueryModel(masterQueryId: string, controller: ClientController): ClientQuery {
        return new ClientQuery(controller, this.glue.logger.subLogger(`search.provider.model.${masterQueryId}`), masterQueryId);
    }
}