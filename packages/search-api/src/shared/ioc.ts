import { Glue42Core } from "@glue42/core";
import { Glue42Search } from "../../search";
import { ClientController } from "../controllers/client";
import { GlueController } from "../controllers/glue";
import { MainController } from "../controllers/main";
import { ProviderController } from "../controllers/provider";
import { SearchFacade } from "../facade";
import { FLUSH_SEQUELIZER_INTERVAL_MS, SEQUELIZER_INTERVAL_MS } from "./constants";
import { AsyncSequelizer } from "../services/sequelizer";
import { LimitsTracker } from "../services/limits-tracker";
import { ModelFactory } from "../services/model-factory";

export class IoC {
    private _glueController!: GlueController;
    private _facade!: SearchFacade;
    private _mainController!: MainController;
    private _providerController!: ProviderController;
    private _clientController!: ClientController;
    private _asyncSequelizer!: AsyncSequelizer;
    private _flushSequelizer!: AsyncSequelizer;
    private _limitsTracker!: LimitsTracker;
    private _modelFactory!: ModelFactory;

    constructor(
        private readonly glue: Glue42Core.GlueCore, private readonly config?: Glue42Search.Config
    ) {}

    public get glueController(): GlueController {
        if (!this._glueController) {
            this._glueController = new GlueController(this.glue);
        }

        return this._glueController;
    }

    public get main(): MainController {
        if (!this._mainController) {
            this._mainController = new MainController(
                this.glue.logger.subLogger("search.main.controller"),
                this.glueController,
                this.clientController,
                this.providerController
            );
        }

        return this._mainController;
    }

    public get clientController(): ClientController {
        if (!this._clientController) {
            this._clientController = new ClientController(
                this.glue.logger.subLogger("search.client.controller"),
                this.glueController,
                this.modelFactory
            );
        }

        return this._clientController;
    }

    public get providerController(): ProviderController {
        if (!this._providerController) {
            this._providerController = new ProviderController(
                this.glue.logger.subLogger("search.provider.controller"),
                this.glueController,
                this.sequelizer,
                this.limitsTracker,
                this.modelFactory
            );
        }

        return this._providerController;
    }

    public get facade(): SearchFacade {
        if (!this._facade) {
            this._facade = new SearchFacade(this.main);
        }

        return this._facade;
    }

    public get sequelizer(): AsyncSequelizer {
        if (!this._asyncSequelizer) {
            this._asyncSequelizer = new AsyncSequelizer(SEQUELIZER_INTERVAL_MS);
        }

        return this._asyncSequelizer;
    }

    public get flushSequelizer(): AsyncSequelizer {
        if (!this._flushSequelizer) {
            this._flushSequelizer = new AsyncSequelizer(FLUSH_SEQUELIZER_INTERVAL_MS);
        }

        return this._flushSequelizer;
    }

    public get limitsTracker(): LimitsTracker {
        if (!this._limitsTracker) {
            this._limitsTracker = new LimitsTracker();
        }

        return this._limitsTracker;
    }

    public get modelFactory(): ModelFactory {
        if (!this._modelFactory) {
            this._modelFactory = new ModelFactory(
                this.glueController,
                this.glue,
                this.flushSequelizer
            );
        }

        return this._modelFactory;
    }
}