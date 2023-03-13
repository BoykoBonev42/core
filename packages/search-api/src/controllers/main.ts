import { Glue42Core } from "@glue42/core";
import { Glue42Search } from "../../search";
import { ClientController } from "./client";
import { GlueController } from "./glue";
import { ProviderController } from "./provider";

export class MainController {

    constructor(
        private readonly logger: Glue42Core.Logger.API,
        private readonly glueController: GlueController,
        private readonly clientController: ClientController,
        private readonly providerController: ProviderController
    ) {}

    public setDebounceMS(data: { milliseconds: number, commandId: string }): void {
        this.logger.info(`[${data.commandId}] Starting setDebounceMS operation with duration ${data.milliseconds}`);

        this.clientController.setDebounceMS(data);

        this.logger.info(`[${data.commandId}] Operation setDebounceMS with duration ${data.milliseconds} completed`);
    }

    public getDebounceMS(data: { commandId: string }): number {
        this.logger.info(`[${data.commandId}] Starting getDebounceMS operation.`);

        return this.clientController.getDebounceMS(data);
    }

    public async query(data: { queryConfig: Glue42Search.QueryConfig, commandId: string }): Promise<Glue42Search.Query> {
        this.logger.info(`[${data.commandId}] Starting query operation with config ${JSON.stringify(data.queryConfig)}`);

        if (Array.isArray(data.queryConfig.providers) && !data.queryConfig.providers.length) {
            throw new Error("Cannot sent a query with a defined empty array of providers, because this is an impossible query for complete.");
        }

        if (Array.isArray(data.queryConfig.types) && !data.queryConfig.types.length) {
            throw new Error("Cannot sent a query with a defined empty array of types, because this is an impossible query for complete.");
        }

        const query = await this.clientController.query(data);

        this.logger.info(`[${data.commandId}] Operation query with config ${JSON.stringify(data.queryConfig)} completed.`);

        return query;
    }

    public async registerProvider(data: { config: Glue42Search.ProviderRegistrationConfig, commandId: string }): Promise<Glue42Search.Provider> {
        this.logger.info(`[${data.commandId}] Starting registerProvider operation with config ${JSON.stringify(data.config)}`);

        const provider = await this.providerController.processRegisterProvider(data);

        this.logger.info(`[${data.commandId}] Operation registerProvider with config ${JSON.stringify(data.config)} completed.`);

        return provider;
    }

    public async providers(data: { commandId: string }): Promise<Glue42Search.ProviderData[]> {
        this.logger.info(`[${data.commandId}] Starting providers operation.`);

        const allProvidersInfo = await this.glueController.getAllProvidersInfo();

        const allProvidersData = allProvidersInfo.flatMap((provInfo) => provInfo.info.providers);

        this.logger.info(`[${data.commandId}] Operation providers completed.`);

        return allProvidersData;
    }

    public async types(data: { commandId: string }): Promise<Glue42Search.SearchType[]> {
        this.logger.info(`[${data.commandId}] Starting types operation.`);

        const allProvidersInfo = await this.glueController.getAllProvidersInfo();

        const allProvidersData = allProvidersInfo.flatMap((provInfo) => provInfo.info.providers);

        const allSupportedTypes = allProvidersData.filter((provData) => !!provData.types).flatMap((provData) => provData.types as Glue42Search.SearchType[]);

        const uniqueSupportedTypes = [...new Set(allSupportedTypes)];

        this.logger.info(`[${data.commandId}] Operation types completed.`);

        return uniqueSupportedTypes;
    }
}