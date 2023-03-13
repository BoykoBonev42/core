import { Glue42Core } from "@glue42/core";
import { nanoid } from "nanoid";
import { Glue42Search } from "../../search";
import { ProviderController } from "../controllers/provider";

export class ProviderModel {

    constructor(
        private readonly myData: Glue42Search.ProviderData,
        private readonly controller: ProviderController,
        private readonly logger: Glue42Core.Logger.API
    ) {}

    private get id(): string {
        return this.myData.id;
    }

    private get name(): string {
        return this.myData.name;
    }

    private get appName(): string | undefined {
        return this.myData.appName;
    }

    private get types(): Glue42Search.SearchType[] | undefined {
        return this.myData.types;
    }

    public get myProviderData(): Glue42Search.ProviderData {
        return Object.assign({}, this.myData);
    }

    public exposeFacade(): Glue42Search.Provider {
        const providerFacade: Glue42Search.Provider = {
            interopId: this.myData.interopId,
            id: this.id,
            name: this.name,
            appName: this.appName,
            types: this.types,
            onQuery: this.onQuery.bind(this),
            onQueryCancel: this.onQueryCancel.bind(this),
            unregister: this.unregister.bind(this)
        };

        return Object.freeze(providerFacade);
    }

    private onQuery(callback: (query: Glue42Search.ProviderQuery) => void): Glue42Search.UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onQuery requires a callback of type function");
        }

        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid onQuery request, forwarding to the controller.`);

        const unsubscribe = this.controller.processProviderOnQuery({ callback, id: this.id, commandId });

        this.logger.info(`[${commandId}] the onQuery request was completed.`);

        return unsubscribe;
    }

    private onQueryCancel(callback: (query: { id: string; }) => void): Glue42Search.UnsubscribeFunction {
        if (typeof callback !== "function") {
            throw new Error("onQuery requires a callback of type function");
        }

        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid onQueryCancel request, forwarding to the controller.`);

        const unsubscribe = this.controller.processProviderOnQueryCancel({ callback, id: this.id, commandId });

        this.logger.info(`[${commandId}] the onQueryCancel request was completed.`);

        return unsubscribe;
    }

    private async unregister(): Promise<void> {
        const commandId = nanoid(10);

        this.logger.info(`[${commandId}] received a valid unregister request, forwarding to the controller.`);

        await this.controller.processProviderUnregister({ id: this.id, commandId });

        this.logger.info(`[${commandId}] the unregister request was completed.`);
    }

}