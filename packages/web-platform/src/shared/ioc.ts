import { Glue42WebPlatform } from "../../platform";
import { Gateway } from "../connection/gateway";
import { PlatformController } from "../controllers/main";
import { Platform } from "../platform";
import { GlueController } from "../controllers/glue";
import { PortsBridge } from "../connection/portsBridge";
import { WindowsController } from "../libs/windows/controller";
import { SessionStorageController } from "../controllers/session";
import { WindowsStateController } from "../controllers/state";
import { ApplicationsController } from "../libs/applications/controller";
import { LayoutsController } from "../libs/layouts/controller";
import { IdbLayoutsStore } from "../libs/layouts/idbStore";
import { WorkspacesController } from "../libs/workspaces/controller";
import { IntentsController } from "../libs/intents/controller";
import { ChannelsController } from "../libs/channels/controller";
import { FramesController } from "../libs/workspaces/frames";
import { WorkspaceHibernationWatcher } from "../libs/workspaces/hibernationWatcher";
import { SystemController } from "../controllers/system";
import { AppDirectory } from "../libs/applications/appStore/directory";
import { RemoteWatcher } from "../libs/applications/appStore/remoteWatcher";
import { ServiceWorkerController } from "../controllers/serviceWorker";
import { NotificationsController } from "../libs/notifications/controller";
import { ExtensionController } from "../libs/extension/controller";
import { AsyncSequelizer } from "./sequelizer";
import { PreferredConnectionController } from "../connection/preferred";
import { Glue42CoreDB, InternalPlatformConfig } from "../common/types";
import { IDBPDatabase, openDB } from "idb";
import { dbName, dbVersion } from "../common/constants";
import { TransactionsController } from "../controllers/transactions";
import { InterceptionController } from "../controllers/interception";
import { PluginsController } from "../controllers/plugins";
import { DomainsController } from "../controllers/domains";
import { IntentsResolverHelper } from "../libs/intents/resolverHelper";

export class IoC {
    private _gatewayInstance!: Gateway;
    private _platformInstance!: Platform;
    private _mainController!: PlatformController;
    private _glueController!: GlueController;
    private _portsBridge!: PortsBridge;
    private _windowsController!: WindowsController;
    private _applicationsController!: ApplicationsController;
    private _appDirectory!: AppDirectory;
    private _remoteWatcher!: RemoteWatcher;
    private _layoutsController!: LayoutsController;
    private _workspacesController!: WorkspacesController;
    private _hibernationWatcher!: WorkspaceHibernationWatcher;
    private _intentsController!: IntentsController;
    private _intentsResolverController!: IntentsResolverHelper;
    private _channelsController!: ChannelsController;
    private _notificationsController!: NotificationsController;
    private _extensionController!: ExtensionController;
    private _sessionController!: SessionStorageController;
    private _stateChecker!: WindowsStateController;
    private _framesController!: FramesController;
    private _systemController!: SystemController;
    private _idbStore!: IdbLayoutsStore;
    private _serviceWorkerController!: ServiceWorkerController;
    private _preferredConnectionController!: PreferredConnectionController;
    private _database!: IDBPDatabase<Glue42CoreDB> | undefined;
    private _transactionsController!: TransactionsController;
    private _interceptionController!: InterceptionController;
    private _pluginsController!: PluginsController;
    private _domainsController!: DomainsController;

    constructor(private readonly config?: Glue42WebPlatform.Config) { }

    public get gateway(): Gateway {
        if (!this._gatewayInstance) {
            this._gatewayInstance = new Gateway();
        }

        return this._gatewayInstance;
    }

    public get platform(): Platform {
        if (!this._platformInstance) {
            this._platformInstance = new Platform(this.controller, this.sessionController, this.config);
        }

        return this._platformInstance;
    }

    public get domainsController(): DomainsController {
        if (!this._domainsController) {
            this._domainsController = new DomainsController(
                this.systemController,
                this.windowsController,
                this.applicationsController,
                this.layoutsController,
                this.workspacesController,
                this.intentsController,
                this.channelsController,
                this.notificationsController,
                this.extensionController
            );
        }

        return this._domainsController;
    }


    public get controller(): PlatformController {
        if (!this._mainController) {
            this._mainController = new PlatformController(
                this.domainsController,
                this.glueController,
                this.portsBridge,
                this.stateController,
                this.serviceWorkerController,
                this.preferredConnectionController,
                this.interceptionController,
                this.pluginsController,
                this.sessionController
            );
        }

        return this._mainController;
    }

    public get glueController(): GlueController {
        if (!this._glueController) {
            this._glueController = new GlueController(this.portsBridge, this.sessionController);
        }

        return this._glueController;
    }

    public get systemController(): SystemController {
        if (!this._systemController) {
            this._systemController = new SystemController(this.sessionController);
        }

        return this._systemController;
    }

    public get sessionController(): SessionStorageController {
        if (!this._sessionController) {
            this._sessionController = new SessionStorageController();
        }

        return this._sessionController;
    }

    public get stateController(): WindowsStateController {
        if (!this._stateChecker) {
            this._stateChecker = new WindowsStateController(this.sessionController);
        }

        return this._stateChecker;
    }

    public get windowsController(): WindowsController {
        if (!this._windowsController) {
            this._windowsController = new WindowsController(this.glueController, this.sessionController, this.stateController, this);
        }

        return this._windowsController;
    }

    public get applicationsController(): ApplicationsController {
        if (!this._applicationsController) {
            this._applicationsController = new ApplicationsController(
                this.glueController,
                this.sessionController,
                this.stateController,
                this.appDirectory,
                this
            );
        }

        return this._applicationsController;
    }

    public get appDirectory(): AppDirectory {
        if (!this._appDirectory) {
            this._appDirectory = new AppDirectory(
                this.sessionController,
                this.remoteWatcher
            );
        }

        return this._appDirectory;
    }

    public get remoteWatcher(): RemoteWatcher {
        if (!this._remoteWatcher) {
            this._remoteWatcher = new RemoteWatcher();
        }

        return this._remoteWatcher;
    }


    public get layoutsController(): LayoutsController {
        if (!this._layoutsController) {
            this._layoutsController = new LayoutsController(
                this.glueController,
                this.idbStore,
                this.sessionController,
                this.windowsController
            );
        }

        return this._layoutsController;
    }

    public get workspacesController(): WorkspacesController {
        if (!this._workspacesController) {
            this._workspacesController = new WorkspacesController(
                this.framesController,
                this.glueController,
                this.stateController,
                this.hibernationWatcher,
                this
            );
        }

        return this._workspacesController;
    }

    public get hibernationWatcher(): WorkspaceHibernationWatcher {
        if (!this._hibernationWatcher) {
            this._hibernationWatcher = new WorkspaceHibernationWatcher(this.sessionController);
        }

        return this._hibernationWatcher;
    }

    public get intentsController(): IntentsController {
        if (!this._intentsController) {
            this._intentsController = new IntentsController(
                this.glueController,
                this.intentsResolverHelper,
                this.appDirectory,
                this
            );
        }

        return this._intentsController;
    }

    public get intentsResolverHelper(): IntentsResolverHelper {
        if (!this._intentsResolverController) {
            this._intentsResolverController = new IntentsResolverHelper(this.glueController, this.workspacesController, this.windowsController);
        }

        return this._intentsResolverController;
    }

    public get channelsController(): ChannelsController {
        if (!this._channelsController) {
            this._channelsController = new ChannelsController(
                this.glueController,
                this.windowsController
            );
        }

        return this._channelsController;
    }

    public get extensionController(): ExtensionController {
        if (!this._extensionController) {
            this._extensionController = new ExtensionController(this.sessionController);
        }

        return this._extensionController;
    }

    public get notificationsController(): NotificationsController {
        if (!this._notificationsController) {
            this._notificationsController = new NotificationsController(
                this.glueController,
                this.serviceWorkerController,
                this.sessionController
            );
        }

        return this._notificationsController;
    }

    public get framesController(): FramesController {
        if (!this._framesController) {
            this._framesController = new FramesController(
                this.sessionController,
                this.glueController,
                this
            );
        }

        return this._framesController;
    }

    public get idbStore(): IdbLayoutsStore {
        if (!this._idbStore) {
            this._idbStore = new IdbLayoutsStore(this);
        }

        return this._idbStore;
    }

    public get portsBridge(): PortsBridge {
        if (!this._portsBridge) {
            this._portsBridge = new PortsBridge(this.gateway, this.sessionController, this);
        }

        return this._portsBridge;
    }

    public get serviceWorkerController(): ServiceWorkerController {
        if (!this._serviceWorkerController) {
            this._serviceWorkerController = new ServiceWorkerController(this);
        }

        return this._serviceWorkerController;
    }

    public get transactionsController(): TransactionsController {
        if (!this._transactionsController) {
            this._transactionsController = new TransactionsController();
        }

        return this._transactionsController;
    }

    public get interceptionController(): InterceptionController {
        if (!this._interceptionController) {
            this._interceptionController = new InterceptionController();
        }

        return this._interceptionController;
    }

    public get pluginsController(): PluginsController {
        if (!this._pluginsController) {
            this._pluginsController = new PluginsController(this.interceptionController, this.glueController, this.startCore.bind(this));
        }

        return this._pluginsController;
    }

    public getDatabase(): Promise<IDBPDatabase<Glue42CoreDB>> {
        if (this._database) {
            return Promise.resolve(this._database);
        }

        return new Promise((resolve) => {

            openDB<Glue42CoreDB>(dbName, dbVersion, { upgrade: this.setUpDb.bind(this) })
                .then((database) => {
                    this._database = database;
                    resolve(this._database);
                });
        });
    }

    public get preferredConnectionController(): PreferredConnectionController {
        if (!this._preferredConnectionController) {
            this._preferredConnectionController = new PreferredConnectionController(this.glueController, this.portsBridge, this.createSequelizer());
        }

        return this._preferredConnectionController;
    }

    public createMessageChannel(): MessageChannel {
        return new MessageChannel();
    }

    public createSequelizer(looseInterval?: number): AsyncSequelizer {
        return new AsyncSequelizer(looseInterval);
    }

    private async startCore(platformConfig: InternalPlatformConfig): Promise<void> {
        await platformConfig.corePlus?.start(this, platformConfig);
    }

    private setUpDb(database: IDBPDatabase<Glue42CoreDB>): void {
        if (!database.objectStoreNames.contains("workspaceLayouts" as never)) {
            database.createObjectStore("workspaceLayouts" as never);
        }

        if (!database.objectStoreNames.contains("globalLayouts" as never)) {
            database.createObjectStore("globalLayouts" as never);
        }

        if (!database.objectStoreNames.contains("serviceWorker" as never)) {
            database.createObjectStore("serviceWorker" as never);
        }
    }
}
