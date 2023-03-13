import { Glue42Search } from "../search";
import { MainController } from "./controllers/main";
import { nonNegativeNumberDecoder, providerRegistrationConfig, queryConfigDecoder } from "./shared/decoders";
import { nanoid } from "nanoid";

export class SearchFacade {

    constructor(
        private readonly main: MainController
    ) {}

    public exposeApi(): Glue42Search.API {

        const api: Glue42Search.API = {
            setDebounceMS: this.setDebounceMS.bind(this),
            getDebounceMS: this.getDebounceMS.bind(this),
            listProviders: this.providers.bind(this),
            listTypes: this.types.bind(this),
            query: this.query.bind(this),
            registerProvider: this.registerProvider.bind(this)
        };

        return Object.freeze(api);
    }

    private setDebounceMS(milliseconds: number): void {
        nonNegativeNumberDecoder.runWithException(milliseconds);

        const commandId = nanoid(10);

        return this.main.setDebounceMS({ milliseconds, commandId });
    }

    private getDebounceMS(): number {
        const commandId = nanoid(10);

        return this.main.getDebounceMS({ commandId });
    }

    private async providers(): Promise<Glue42Search.ProviderData[]> {
        const commandId = nanoid(10);

        return this.main.providers({ commandId });
    }

    private async types(): Promise<Glue42Search.SearchType[]> {
        const commandId = nanoid(10);

        return this.main.types({ commandId });
    }

    private async query(queryConfig: Glue42Search.QueryConfig): Promise<Glue42Search.Query> {
        const verifiedConfig = queryConfigDecoder.runWithException(queryConfig);

        const commandId = nanoid(10);

        return this.main.query({ queryConfig: verifiedConfig, commandId });
    }

    private async registerProvider(config: Glue42Search.ProviderRegistrationConfig): Promise<Glue42Search.Provider> {
        const verifiedConfig = providerRegistrationConfig.runWithException(config);

        const commandId = nanoid(10);

        return this.main.registerProvider({ config: verifiedConfig, commandId });
    }
}