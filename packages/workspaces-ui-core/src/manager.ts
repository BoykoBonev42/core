/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { LayoutController } from "./layout/controller";
import { WindowSummary, Workspace, WorkspaceOptionsWithTitle, WorkspaceOptionsWithLayoutName, LoadingStrategy, WorkspaceLayout, Bounds, FrameSummary, WorkspaceSummary } from "./types/internal";
import { LayoutEventEmitter } from "./layout/eventEmitter";
import { IFrameController } from "./iframeController";
import store from "./state/store";
import registryFactory, { UnsubscribeFunction } from "callback-registry";
import GoldenLayout from "@glue42/golden-layout";
import { LayoutsManager } from "./layouts";
import { LayoutStateResolver } from "./state/resolver";
import scReader from "./config/startupReader";
import { idAsString, getAllWindowsFromConfig, getElementBounds, getWorkspaceContextName } from "./utils";
import { WorkspacesConfigurationFactory } from "./config/factory";
import { Glue42Web } from "@glue42/web";
import { LockColumnArguments, LockContainerArguments, LockGroupArguments, LockRowArguments, LockWindowArguments, LockWorkspaceArguments, ResizeItemArguments, RestoreWorkspaceConfig } from "./interop/types";
import startupReader from "./config/startupReader";
import componentStateMonitor from "./componentStateMonitor";
import { ConfigConverter } from "./config/converter";
import { PopupManagerComposer } from "./popups/composer";
import { PopupManager } from "./popups/external";
import { ComponentPopupManager } from "./popups/component";
import { GlueFacade } from "./interop/facade";
import { ApplicationFactory } from "./app/factory";
import { DelayedExecutor } from "./utils/delayedExecutor";
import { WorkspacesSystemSettingsProvider } from "./config/system";
import { ConstraintsValidator } from "./config/constraintsValidator";
import uiExecutor from "./uiExecutor";
import { ComponentFactory } from "./types/componentFactory";
import { PlatformCommunicator } from "./interop/platformCommunicator";
import { WorkspacesWrapperFactory } from "./state/factory";
import { WorkspacesEventBundler } from "./utils/eventBundler";
import { LayoutComponentsFactory } from "./layout/componentsFactory";
import { WorkspacesLayoutLockingController } from "./layout/locking";
import { ThemeController } from "./layout/themeController";

export class WorkspacesManager {
    private _controller: LayoutController;
    private _frameController: IFrameController;
    private _frameId: string;
    private _popupManager: PopupManagerComposer
    private _layoutsManager: LayoutsManager;
    private _stateResolver: LayoutStateResolver;
    private _isLayoutInitialized = false;
    private _initPromise = Promise.resolve();
    private _workspacesEventEmitter = new WorkspacesEventBundler();
    private _initialized: boolean;
    private _glue: Glue42Web.API;
    private _configFactory: WorkspacesConfigurationFactory;
    private _applicationFactory: ApplicationFactory;
    private _facade: GlueFacade;
    private _context?: object;
    private _systemSettings: WorkspacesSystemSettingsProvider;
    private _platformCommunicator: PlatformCommunicator;
    private _wrapperFactory: WorkspacesWrapperFactory;
    private _layoutLockingController: WorkspacesLayoutLockingController;
    private _themeController: ThemeController;

    public get stateResolver(): LayoutStateResolver {
        return this._stateResolver;
    }

    public get workspacesEventEmitter(): WorkspacesEventBundler {
        return this._workspacesEventEmitter;
    }

    public get initPromise(): Promise<void> {
        return this._initPromise;
    }

    public get initialized(): boolean {
        return this._initialized;
    }

    public get frameId(): string {
        return this._frameId;
    }

    public get layoutsManager(): LayoutsManager {
        return this._layoutsManager;
    }

    public init(glue: Glue42Web.API, frameId: string, facade: GlueFacade, componentFactory?: ComponentFactory): { cleanUp: () => void } {
        this._glue = glue;
        this._facade = facade;
        const startupConfig = scReader.loadConfig();

        if (this._initialized) {
            componentStateMonitor.reInitialize(componentFactory);
            return;
        }

        this._initialized = true;
        this._frameId = frameId;
        this._configFactory = new WorkspacesConfigurationFactory(glue);
        const converter = new ConfigConverter(this._configFactory);
        componentStateMonitor.init(this._frameId, componentFactory);
        this._platformCommunicator = new PlatformCommunicator(this._glue, this._frameId);
        this._frameController = new IFrameController(glue, this._platformCommunicator);
        const eventEmitter = new LayoutEventEmitter(registryFactory());
        this._wrapperFactory = new WorkspacesWrapperFactory(eventEmitter, this.frameId);
        this._layoutLockingController = new WorkspacesLayoutLockingController(this._wrapperFactory);
        this._stateResolver = new LayoutStateResolver(this._frameId, eventEmitter, this._frameController, converter, this._wrapperFactory);
        const layoutComponentsFactory = new LayoutComponentsFactory(eventEmitter, this._configFactory);
        this._controller = new LayoutController(eventEmitter, this._stateResolver, startupConfig, this._configFactory, this._wrapperFactory, layoutComponentsFactory);
        this._systemSettings = new WorkspacesSystemSettingsProvider(this._platformCommunicator);
        this._applicationFactory = new ApplicationFactory(glue, this.stateResolver, this._frameController, this, new DelayedExecutor(), this._platformCommunicator, this._systemSettings);
        this._layoutsManager = new LayoutsManager(this.stateResolver, glue, this._configFactory, converter, new ConstraintsValidator(), this._platformCommunicator);
        this._popupManager = new PopupManagerComposer(new PopupManager(glue), new ComponentPopupManager(componentFactory, frameId), componentFactory);
        this._themeController = new ThemeController(this._glue, uiExecutor);
        this._themeController.applyTheme();

        if (!startupConfig.emptyFrame && !this._platformCommunicator.platformConfig?.initAsEmptyFrame) {
            this.initLayout();
        }

        return { cleanUp: this.cleanUp };
    }

    public async initFrameLayout(workspaces: GoldenLayout.Config[], keepWorkspaces?: string[]): Promise<string[]> {
        workspaces.forEach((wsp) => {
            wsp.id = this._configFactory.getId();
        });
        this._layoutsManager.setInitialWorkspaceConfig(workspaces);
        if (this._isLayoutInitialized && !keepWorkspaces?.length) {
            this._initPromise = this.reinitLayout();
        } else if (this._isLayoutInitialized && keepWorkspaces?.length) {
            this._initPromise = this.updateFrameLayoutNaive(workspaces, keepWorkspaces);
        }
        else {
            this._initPromise = this.initLayout();
        }

        await this._initPromise;

        return workspaces.map((w) => idAsString(w.id));
    }

    public getComponentBounds = (): Bounds => {
        return this._controller.bounds;
    };

    public subscribeForWindowClicked = (cb: () => void): UnsubscribeFunction => {
        if (!this._frameController) {
            // tslint:disable-next-line: no-console
            console.warn("Your subscription to window clicked wasn't successful, because the Workspaces library isn't initialized yet");
            return (): void => { };
        }
        return this._frameController.onFrameContentClicked(cb);
    };

    public async saveWorkspace(name: string, id?: string, saveContext?: boolean, metadata?: object): Promise<WorkspaceLayout> {
        const workspace = store.getById(id) || store.getActiveWorkspace();
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceId: workspace.id });
        const result = await this._layoutsManager.save({
            name,
            workspace,
            title: wrapper.title,
            saveContext,
            metadata
        });

        const config = workspace.layout?.config || workspace.hibernateConfig;
        (config.workspacesOptions as WorkspaceOptionsWithLayoutName).layoutName = name;

        if (componentStateMonitor.decoratedFactory?.createWorkspaceTabs) {
            componentStateMonitor.decoratedFactory.updateWorkspaceTabs({ workspaceId: workspace.id, layoutName: name });
        }
        if (config.workspacesOptions.noTabHeader) {
            delete config.workspacesOptions.noTabHeader;
        }

        return result;
    }

    public async openWorkspace(name: string, options?: RestoreWorkspaceConfig): Promise<string> {
        const savedConfigWithData = await this._layoutsManager.getWorkspaceByName(name);
        const savedConfig = savedConfigWithData.config;

        savedConfig.workspacesOptions.context = savedConfigWithData.layoutData.context;

        if (options?.context && savedConfig.workspacesOptions.context) {
            savedConfig.workspacesOptions.context = Object.assign(savedConfigWithData.layoutData.context, options?.context);
        } else if (options?.context) {
            savedConfig.workspacesOptions.context = options?.context;
        }

        (savedConfig.workspacesOptions as WorkspaceOptionsWithTitle).title = options?.title || name;
        savedConfig.workspacesOptions.icon = options?.icon ?? savedConfig.workspacesOptions.icon;
        savedConfig.workspacesOptions.positionIndex = options?.positionIndex ?? savedConfig.workspacesOptions.positionIndex;

        if (savedConfig && savedConfig.workspacesOptions && !savedConfig.workspacesOptions.name) {
            savedConfig.workspacesOptions.name = name;
        }

        if (savedConfig) {
            savedConfig.workspacesOptions = savedConfig.workspacesOptions || {};

            savedConfig.workspacesOptions.layoutName = savedConfigWithData.layoutData.name;
        }

        if (savedConfig && options) {
            (savedConfig.workspacesOptions as any).loadingStrategy = options.loadingStrategy;
        }

        if (savedConfig && options?.noTabHeader !== undefined) {
            savedConfig.workspacesOptions = savedConfig.workspacesOptions || {};
            savedConfig.workspacesOptions.noTabHeader = options?.noTabHeader;
        }

        if (savedConfig && options?.isPinned !== undefined) {
            savedConfig.workspacesOptions = savedConfig.workspacesOptions || {};
            savedConfig.workspacesOptions.isPinned = options?.isPinned;
        }

        if (savedConfig && options?.isSelected !== undefined) {
            savedConfig.workspacesOptions = savedConfig.workspacesOptions || {};
            savedConfig.workspacesOptions.selected = options?.isSelected;
        }

        if (!this._isLayoutInitialized) {
            this._layoutsManager.setInitialWorkspaceConfig([savedConfig]);

            this._initPromise = this.initLayout();

            await this._initPromise;

            return idAsString(savedConfig.id);
        } else if (name) {
            savedConfig.id = options?.reuseWorkspaceId || this._configFactory.getId();

            if (options?.reuseWorkspaceId) {
                const workspace = store.getById(savedConfig.id);

                workspace.windows.map((w) => store.getWindowContentItem(w.id))
                    .filter((w) => w)
                    .map((w) => this.closeTab(w, false));

                await this.reinitializeWorkspace(idAsString(savedConfig.id), savedConfig);

                if (savedConfig.workspacesOptions?.context) {
                    await this._glue.contexts.set(getWorkspaceContextName(idAsString(savedConfig.id)), savedConfig.workspacesOptions.context);
                }
            } else {
                await this.addWorkspace(idAsString(savedConfig.id), savedConfig);
            }

            return idAsString(savedConfig.id);
        }
    }

    public exportAllLayouts() {
        return this._layoutsManager.export();
    }

    public deleteLayout(name: string): void {
        this._layoutsManager.delete(name);
    }

    public maximizeItem(itemId: string): void {
        const container = store.getContainer(itemId);
        if (container) {
            this._controller.maximizeContainer(itemId);
            return;
        }

        const workspaceByWindowId = store.getByWindowId(itemId);
        if (workspaceByWindowId) {
            this._controller.maximizeWindow(itemId);
            return;
        }

        throw new Error(`Could not find a window or a container with id ${itemId} in frame ${this.frameId} to maximize`);
    }

    public restoreItem(itemId: string): void {
        const container = store.getContainer(itemId);
        if (container) {
            this._controller.restoreContainer(itemId);
            return;
        }

        const workspaceByWindowId = store.getByWindowId(itemId);
        if (workspaceByWindowId) {
            this._controller.restoreWindow(itemId);
            return;
        }

        throw new Error(`Could not find a window or a container with id ${itemId} in frame ${this.frameId} to restore`);
    }

    public closeItem(itemId: string): void {
        const win = store.getWindow(itemId);
        const container = store.getContainer(itemId);
        if (this._frameId === itemId) {
            store.workspaceIds.forEach((wid) => this.closeWorkspace(store.getById(wid)));
        } else if (win) {
            const windowContentItem = store.getWindowContentItem(itemId);
            if (!windowContentItem) {
                throw new Error(`Could not find item ${itemId} to close`);
            }
            this.closeTab(windowContentItem);
        } else if (container) {
            this._controller.closeContainer(itemId);
        } else {
            const workspace = store.getById(itemId);
            this.closeWorkspace(workspace);
        }
    }

    public async addContainer(config: GoldenLayout.RowConfig | GoldenLayout.StackConfig | GoldenLayout.ColumnConfig, parentId: string): Promise<string> {
        const configWithoutIsPinned = this.cleanIsPinned(config) as GoldenLayout.RowConfig | GoldenLayout.StackConfig | GoldenLayout.ColumnConfig;
        const workspace = store.getByContainerId(parentId) || store.getById(parentId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        const result = await this._controller.addContainer(configWithoutIsPinned, parentId);

        if (workspaceWrapper.hasMaximizedItems) {
            this._controller.refreshWorkspaceSize(workspace.id);
        }

        const itemConfig = store.getContainer(result);
        if (itemConfig) {
            this.applyIsPinned(config, itemConfig);
        }

        const windowConfigs = getAllWindowsFromConfig(config.content);

        Promise.all(windowConfigs.map(async (itemConfig) => {
            const component = store.getWindowContentItem(idAsString(itemConfig.id));

            await this._applicationFactory.start(component, workspace.id);
        }));

        return result;
    }

    public async addWindow(itemConfig: GoldenLayout.ItemConfig, parentId: string): Promise<void> {
        const parent = store.getContainer(parentId);
        if ((!parent || parent.type !== "stack") && itemConfig.type === "component") {
            itemConfig = this._configFactory.wrapInGroup([itemConfig]);
        }
        const workspace = store.getById(parentId) || store.getByContainerId(parentId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        await this._controller.addWindow(itemConfig, parentId);

        if (workspaceWrapper.hasMaximizedItems) {
            this._controller.refreshWorkspaceSize(workspace.id);
        }

        const allWindowsInConfig = getAllWindowsFromConfig([itemConfig]);
        const component = store.getWindowContentItem(idAsString(allWindowsInConfig[0].id));

        this._applicationFactory.start(component, workspace.id);
    }

    public setItemTitle(itemId: string, title: string): void {
        if (store.getById(itemId)) {
            this._controller.setWorkspaceTitle(itemId, title);
        } else {
            this._controller.setWindowTitle(itemId, title);
        }
    }

    public async eject(itemId: string): Promise<{ windowId: string }> {
        const item = store.getWindowContentItem(itemId);
        if (!item) {
            throw new Error(`Could not find item ${itemId}`);
        }
        const { appName, url, windowId } = item.config.componentState;
        const workspaceContext = store.getWorkspaceContext(store.getByWindowId(item.config.id).id);
        const webWindow = this._glue.windows.findById(windowId);
        const context = webWindow ? await webWindow.getContext() : workspaceContext;
        this.closeItem(idAsString(item.config.id));

        // If an appName is available it should be used instead of just opening the window with glue.windows.open
        // in order to be as close as possible to a real eject
        if (appName) {
            const options = (windowId ? { reuseId: windowId } : undefined) as any; // making sure that the invokation is robust and can't fail easily due to corrupted state
            const ejectedInstance = await this._glue.appManager.application(appName).start(context, options);

            return { windowId: ejectedInstance.id };
        }

        const ejectedWindowUrl = this._applicationFactory.getUrlByAppName(appName) || url;
        const ejectedWindow = await this._glue.windows.open(`${appName}_${windowId}`, ejectedWindowUrl, { context, windowId } as Glue42Web.Windows.Settings);

        return { windowId: ejectedWindow.id };
    }

    public ejectActiveWindow(groupId: string): Promise<{ windowId: string }> {
        const groupWrapper = this._wrapperFactory.getContainerWrapper({ itemId: groupId });

        return this.eject(groupWrapper.activeItemId);
    }

    public async createWorkspace(config: GoldenLayout.Config): Promise<string> {
        if (!this._isLayoutInitialized) {
            config.id = this._configFactory.getId();
            this._layoutsManager.setInitialWorkspaceConfig([config]);

            this._initPromise = this.initLayout();

            await this._initPromise;

            return idAsString(config.id);
        }

        const id = config.workspacesOptions?.reuseWorkspaceId || this._configFactory.getId();

        if (config.workspacesOptions?.reuseWorkspaceId) {
            const workspace = store.getById(id);

            if (!workspace) {
                throw new Error(`Could not find workspace ${config.workspacesOptions?.reuseWorkspaceId} to reuse`);
            }

            workspace.windows
                .map((w) => store.getWindowContentItem(w.id))
                .filter((w) => w)
                .map((w) => this.closeTab(w, false));

            await this.reinitializeWorkspace(id, config);
            await this._glue.contexts.set(getWorkspaceContextName(id), config.workspacesOptions.context ?? {});
        } else {
            await this.addWorkspace(id, config);
        }

        return id;
    }

    public async loadWindow(itemId: string): Promise<{ windowId: string }> {
        let contentItem = store.getWindowContentItem(itemId);
        if (!contentItem) {
            throw new Error(`Could not find window ${itemId} to load`);
        }
        let windowId = this._frameController.getWindowId(itemId);
        const workspace = store.getByWindowId(itemId);

        if (!this.stateResolver.isWindowLoaded(itemId) && contentItem.type === "component") {
            this._applicationFactory.start(contentItem, workspace.id);
            await this.waitForFrameLoaded(itemId);
            contentItem = store.getWindowContentItem(itemId);
            windowId = contentItem.config.componentState.windowId;
        }
        return new Promise<{ windowId: string }>((res, rej) => {
            if (!windowId) {
                rej(`The window id of ${itemId} is missing`);
            }

            let unsub = (): void => {
                // safety
            };
            const timeout = setTimeout(() => {
                rej(`Could not load window ${windowId} for 5000ms`);
                unsub();
            }, 5000);

            unsub = this._glue.windows.onWindowAdded((w) => {
                if (w.id === windowId) {
                    res({ windowId });
                    unsub();
                    clearTimeout(timeout);
                }
            });

            const win = this._glue.windows.list().find((w) => w.id === windowId);

            if (win) {
                res({ windowId });
                unsub();
                clearTimeout(timeout);
            }
        });
    }

    public async focusItem(itemId: string): Promise<void> {
        const workspace = store.getById(itemId);

        if (this._frameId === itemId) {
            // do nothing
        } else if (workspace) {
            if (workspace.hibernateConfig) {
                await this.resumeWorkspace(workspace.id);
            }
            this._controller.focusWorkspace(workspace.id);
        } else {
            this._controller.focusWindow(itemId);
        }
    }

    public bundleWorkspace(workspaceId: string, type: "row" | "column"): void {
        if (this._stateResolver.isWorkspaceHibernated(workspaceId)) {
            throw new Error(`Could not bundle workspace ${workspaceId} because its hibernated`);
        }
        this._controller.bundleWorkspace(workspaceId, type);
    }

    public bundleItem(itemId: string, type: "row" | "column"): void {
        const workspace = store.getByContainerId(itemId);
        if (!workspace) {
            throw new Error(`Could not find workspace that contains item with id${itemId} in frame ${this.frameId}`);
        }
        if (this._stateResolver.isWorkspaceHibernated(workspace.id)) {
            throw new Error(`Could not bundle workspace ${workspace.id} because its hibernated`);
        }
        this._controller.bundleItem(itemId, type);
    }

    public move(location: { x: number; y: number }): Promise<Glue42Web.Windows.WebWindow> {
        return this._glue.windows.my().moveTo(location.y, location.x);
    }

    public getFrameSummary(itemId: string): FrameSummary {
        const workspace = store.getByContainerId(itemId) || store.getByWindowId(itemId) || store.getById(itemId);
        const isFrameId = this._frameId === itemId;

        if (this._context) {
            return {
                id: (workspace || isFrameId) ? this._frameId : "none",
                isInitialized: this._isLayoutInitialized,
                initializationContext: {
                    context: this._context
                }
            };
        } else {
            return {
                id: (workspace || isFrameId) ? this._frameId : "none",
                isInitialized: this._isLayoutInitialized,
            };
        }
    }

    public async moveWindowTo(itemId: string, containerId: string): Promise<void> {
        const sourceWorkspace = store.getByWindowId(itemId);
        const targetWorkspace = store.getByContainerId(containerId) || store.getById(containerId);
        if (!targetWorkspace) {
            throw new Error(`Could not find container ${containerId} in frame ${this._frameId}`);
        }

        if (!sourceWorkspace) {
            throw new Error(`Could not find window ${itemId} in frame ${this._frameId}`);
        }

        if (this._stateResolver.isWorkspaceHibernated(targetWorkspace.id)) {
            throw new Error(`Could not move window ${itemId} to workspace ${targetWorkspace.id} because its hibernated`);
        }

        if (this._stateResolver.isWorkspaceHibernated(sourceWorkspace.id)) {
            throw new Error(`Could not move window ${itemId} from workspace ${sourceWorkspace.id} because its hibernated`);
        }

        const targetWindow = store.getWindowContentItem(itemId);
        if (!targetWindow) {
            throw new Error(`Could not find window ${itemId} in frame ${this._frameId}`);
        }
        const movedWindow = sourceWorkspace.windows.find(w => w.id === itemId || w.windowId === itemId);
        const windowSummaryBeforeMove = this.stateResolver.getWindowSummarySync(movedWindow.id);

        this._controller.removeLayoutElement(itemId);
        store.removeWindow(movedWindow, sourceWorkspace.id);
        store.addWindow(movedWindow, targetWorkspace.id);
        // this.closeTab(targetWindow);
        await this._controller.addWindow(targetWindow.config, containerId);

        const windowSummary = this.stateResolver.getWindowSummarySync(movedWindow.id);

        this.workspacesEventEmitter.raiseWindowEvent({
            action: "removed",
            payload: {
                windowSummary: windowSummaryBeforeMove
            }
        });
        this.workspacesEventEmitter.raiseWindowEvent({
            action: "added",
            payload: {
                windowSummary
            }
        });
    }

    public generateWorkspaceLayout(name: string, itemId: string) {
        const workspace = store.getById(itemId);
        if (!workspace) {
            throw new Error(`Could not find workspace with id ${itemId}`);
        }

        return this._layoutsManager.generateLayout(name, workspace);
    }

    public async resumeWorkspace(workspaceId: string): Promise<void> {
        const workspace = store.getById(workspaceId);
        if (!workspace) {
            throw new Error(`Could not find workspace ${workspaceId} in any of the frames`);
        }
        const hibernatedConfig = workspace.hibernateConfig;

        if (!hibernatedConfig.workspacesOptions) {
            hibernatedConfig.workspacesOptions = {};
        }

        hibernatedConfig.workspacesOptions.reuseWorkspaceId = workspaceId;

        // the start mode should always be eager
        await this.createWorkspace(hibernatedConfig);

        workspace.hibernateConfig = undefined;

        const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });
        if (!wrapper.isPinned) {
            uiExecutor.showSaveIcon({ workspaceTab: workspaceContentItem.tab, workspaceId: workspace.id });
        } else {
            uiExecutor.hideHibernatedIcon({ workspaceTab: workspaceContentItem.tab });
            uiExecutor.hideWorkspaceSaveButton({ workspaceTab: workspaceContentItem.tab });
            uiExecutor.showWorkspaceIconButton({ workspaceTab: workspaceContentItem.tab, icon: wrapper.icon });
        }

        this.workspacesEventEmitter.raiseWorkspaceEvent({
            action:"resumed",
            payload:{
                frameSummary: this.getFrameSummary(this.frameId),
                workspaceSummary: this.stateResolver.getWorkspaceSummary(workspaceId),
                frameBounds: this.stateResolver.getFrameBounds()
            }
        });
    }

    public lockWorkspace(lockConfig: LockWorkspaceArguments): void {
        if (!lockConfig.config) {
            lockConfig.config = {
                allowDrop: false,
                allowDropLeft: false,
                allowDropTop: false,
                allowDropRight: false,
                allowDropBottom: false,
                allowExtract: false,
                allowWindowReorder: false,
                allowSplitters: false,
                showCloseButton: false,
                showSaveButton: false,
                allowWorkspaceTabReorder: false,
                showWindowCloseButtons: false,
                showEjectButtons: false,
                showAddWindowButtons: false
            };
        }

        Object.keys(lockConfig.config).forEach((key) => {
            const config = lockConfig.config as any;
            if (config[key] === undefined) {
                config[key] = true;
            }
        });

        if (typeof lockConfig.config.allowDrop === "boolean") {
            lockConfig.config.allowDropLeft = lockConfig.config.allowDropLeft ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropTop = lockConfig.config.allowDropTop ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropRight = lockConfig.config.allowDropRight ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropBottom = lockConfig.config.allowDropBottom ?? lockConfig.config.allowDrop;
        }

        const { allowDrop, allowExtract, allowWindowReorder, allowSplitters, showCloseButton, showSaveButton, allowWorkspaceTabReorder, showAddWindowButtons, showWindowCloseButtons, showEjectButtons } = lockConfig.config;
        const { workspaceId } = lockConfig;

        try {
            this.workspacesEventEmitter.startWorkspaceLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.startContainerLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.startWindowLockConfigurationChangedGrouping();

            if (allowDrop === false) {
                this._layoutLockingController.disableWorkspaceDrop(workspaceId, lockConfig.config);
            } else {
                this._layoutLockingController.enableWorkspaceDrop(workspaceId, lockConfig.config);
            }

            if (allowExtract === false) {
                this._layoutLockingController.disableWorkspaceExtract(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceExtract(workspaceId);
            }

            if (allowWindowReorder === false) {
                this._layoutLockingController.disableWorkspaceWindowReorder(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceWindowReorder(workspaceId);
            }

            if (allowSplitters === false) {
                this._layoutLockingController.disableSplitters(workspaceId);
            } else {
                this._layoutLockingController.enableSplitters(workspaceId);
            }

            if (showCloseButton === false) {
                this._layoutLockingController.disableWorkspaceCloseButton(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceCloseButton(workspaceId);
            }

            if (showSaveButton === false) {
                this._layoutLockingController.disableWorkspaceSaveButton(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceSaveButton(workspaceId);
            }

            if (allowWorkspaceTabReorder === false) {
                this._layoutLockingController.disableWorkspaceReorder(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceReorder(workspaceId);
            }

            if (showAddWindowButtons === false) {
                this._layoutLockingController.disableWorkspaceAddWindowButtons(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceAddWindowButtons(workspaceId);
            }

            if (showEjectButtons === false) {
                this._layoutLockingController.disableWorkspaceEjectButtons(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceEjectButtons(workspaceId);
            }

            if (showWindowCloseButtons === false) {
                this._layoutLockingController.disableWorkspaceWindowCloseButtons(workspaceId);
            } else {
                this._layoutLockingController.enableWorkspaceWindowCloseButtons(workspaceId);
            }
        } finally {
            this.workspacesEventEmitter.endWorkspaceLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.endContainerLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.endWindowLockConfigurationChangedGrouping();
        }

    }

    public lockContainer(lockConfig: LockContainerArguments): void {

        if (!lockConfig.config && lockConfig.type === "column") {
            lockConfig.config = {
                allowDrop: false,
                allowSplitters: false
            };
        } else if (!lockConfig.config && lockConfig.type === "row") {
            lockConfig.config = {
                allowDrop: false,
                allowSplitters: false
            };
        } else if (!lockConfig.config && lockConfig.type === "group") {
            lockConfig.config = {
                allowDrop: false,
                allowDropHeader: false,
                allowDropLeft: false,
                allowDropRight: false,
                allowDropTop: false,
                allowDropBottom: false,
                allowExtract: false,
                allowReorder: false,
                showAddWindowButton: false,
                showEjectButton: false,
                showMaximizeButton: false
            };
        }

        if (typeof lockConfig.config.allowDrop !== "undefined" && lockConfig.type === "group") {
            lockConfig.config.allowDropHeader = lockConfig.config.allowDropHeader ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropLeft = lockConfig.config.allowDropLeft ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropTop = lockConfig.config.allowDropTop ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropRight = lockConfig.config.allowDropRight ?? lockConfig.config.allowDrop;
            lockConfig.config.allowDropBottom = lockConfig.config.allowDropBottom ?? lockConfig.config.allowDrop;
        }

        Object.keys(lockConfig.config).forEach((key) => {
            const config = lockConfig.config as any;
            if (config[key] === undefined) {
                config[key] = true;
            }
        });

        try {
            this.workspacesEventEmitter.startContainerLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.startWindowLockConfigurationChangedGrouping();

            switch (lockConfig.type) {
                case "column":
                    this.handleColumnLockRequested(lockConfig);
                    break;
                case "row":
                    this.handleRowLockRequested(lockConfig);
                    break;
                case "group":
                    this.handleGroupLockRequested(lockConfig);
                    break;
            }
        } finally {
            this.workspacesEventEmitter.endContainerLockConfigurationChangedGrouping();
            this.workspacesEventEmitter.endWindowLockConfigurationChangedGrouping();
        }

    }

    public lockWindow(lockConfig: LockWindowArguments): void {
        if (!lockConfig.config) {
            lockConfig.config = {
                allowExtract: false,
                allowReorder: false,
                showCloseButton: false,
            };
        }

        Object.keys(lockConfig.config).forEach((key) => {
            const config = lockConfig.config as any;
            if (config[key] === undefined) {
                config[key] = true;
            }
        });

        const { allowExtract, allowReorder, showCloseButton } = lockConfig.config;
        const { windowPlacementId } = lockConfig;

        try {
            this.workspacesEventEmitter.startWindowLockConfigurationChangedGrouping();

            if (allowExtract === false) {
                this._layoutLockingController.disableWindowExtract(windowPlacementId);
            } else {
                this._layoutLockingController.enableWindowExtract(windowPlacementId, allowExtract);
            }

            if (allowReorder === false) {
                this._layoutLockingController.disableWindowReorder(windowPlacementId);
            } else {
                this._layoutLockingController.enableWindowReorder(windowPlacementId, allowReorder);
            }

            if (showCloseButton === false) {
                this._layoutLockingController.disableWindowCloseButton(windowPlacementId);
            } else {
                this._layoutLockingController.enableWindowCloseButton(windowPlacementId, showCloseButton);
            }

        } finally {
            this.workspacesEventEmitter.endWindowLockConfigurationChangedGrouping();
        }

        const workspace = store.getByWindowId(windowPlacementId);

        if (workspace?.layout) {
            workspace.layout.updateSize();
        }
    }

    public async hibernateWorkspace(workspaceId: string): Promise<GoldenLayout.Config> {
        const workspace = store.getById(workspaceId);

        if (store.getActiveWorkspace().id === workspace.id) {
            throw new Error(`Cannot hibernate workspace ${workspace.id} because its active`);
        }

        if (this.stateResolver.isWorkspaceHibernated(workspaceId)) {
            throw new Error(`Cannot hibernate workspace ${workspaceId} because it has already been hibernated`);
        }

        if (!workspace.layout) {
            throw new Error(`Cannot hibernate workspace ${workspace.id} because its empty`);
        }

        const snapshot =  this.stateResolver.getWorkspaceConfig(workspace.id);

        workspace.hibernatedWindows = workspace.windows;
        (snapshot.workspacesOptions as any).isHibernated = true;
        workspace.hibernateConfig = snapshot;

        const currentWorkspaceContext = await this.getWorkspaceContext(workspace.id);
        // done as a more stylish way to handle the possibly undefined workspaceOptions
        workspace.hibernateConfig.workspacesOptions = Object.assign({}, { ...workspace.hibernateConfig.workspacesOptions }, { context: currentWorkspaceContext });

        workspace.windows.map((w) => store.getWindowContentItem(w.id)).forEach((w) => this.closeTab(w, false));

        store.removeLayout(workspace.id);

        this._controller.showHibernationIcon(workspaceId);

        this.workspacesEventEmitter.raiseWorkspaceEvent({
            action:"hibernated",
            payload:{
                frameSummary: this.getFrameSummary(this.frameId),
                workspaceSummary: this.stateResolver.getWorkspaceSummary(workspaceId),
                frameBounds: this.stateResolver.getFrameBounds()
            }
        });

        return snapshot;
    }

    public closeTab(item: GoldenLayout.ContentItem, emptyWorkspaceCheck = true): void {
        const itemId = idAsString(item.config.id);
        const workspace = store.getByWindowId(itemId);
        const windowSummary = this.stateResolver.getWindowSummarySync(itemId);

        this._controller.removeLayoutElement(itemId);
        this._frameController.remove(itemId);

        this._platformCommunicator.notifyFrameWillClose(windowSummary.config.windowId, windowSummary.config.appName).catch((e) => {
            // Log the error
        });

        if (!workspace.hibernatedWindows.some((hw) => windowSummary.itemId === hw.id)) {
            this.workspacesEventEmitter.raiseWindowEvent({
                action: "removed",
                payload: {
                    windowSummary
                }
            });
        }


        if (!workspace.windows.length && emptyWorkspaceCheck) {
            this._controller.resetWorkspace(workspace.id);
        }
    }

    public resizeItem(args: ResizeItemArguments): void {
        if (args.itemId === this.frameId) {
            throw new Error(`Cannot resize frame ${args.itemId}`);
        } else {
            return this.resizeWorkspaceItem(args);
        }
    }

    public unmount(): void {
        try {
            this._popupManager.hidePopup();
        } catch (error) {
            // tslint:disable-next-line: no-console
            console.warn(error);
        }
    }

    public pinWorkspace(workspaceId: string, icon?: string): void {
        this._controller.pinWorkspace(workspaceId, icon);
    }

    public unpinWorkspace(workspaceId: string): void {
        this._controller.unpinWorkspace(workspaceId);
    }

    public setWorkspaceIcon(workspaceId: string, icon?: string): void {
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspaceId, workspaceContentItem });

        wrapper.icon = icon;

        if (wrapper.isPinned) {
            uiExecutor.showWorkspaceIconButton({ workspaceTab: workspaceContentItem.tab, icon });
        }
    }

    public setFrameContext(context?: object) {
        this._context = context;
    }

    public async showSaveWorkspacePopup(workspaceId: string, targetBounds: Bounds): Promise<void> {
        const payload: any = {
            frameId: this._frameId,
            workspaceId,
            peerId: this._glue.agm.instance.peerId,
            buildMode: scReader.config.build,
            domNode: undefined,
            resizePopup: undefined,
            hidePopup: undefined
        };

        const saveButton = (store
            .getWorkspaceLayoutItemById(workspaceId) as GoldenLayout.Component)
            .tab
            .element
            .find(".lm_saveButton");


        await this._popupManager.showSaveWorkspacePopup(targetBounds, payload);
    }

    public getWorkspaceContext(workspaceId: string): Promise<object> {
        return this._glue.contexts.get(getWorkspaceContextName(workspaceId));
    }

    public setMaximizationBoundary(itemId: string, value: boolean): void {
        const container = store.getContainer(itemId);

        if (!container) {
            throw new Error(`Could not find container ${itemId} in frame ${this.frameId} to set the maximizationBoundary to ${value}`);
        }

        if (container.type === "stack") {
            throw new Error(`Could not set the maximization boundary of group ${itemId} to ${value} because only rows and columns can be considered maximizationBoundaries`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem: container });

        wrapper.maximizationBoundary = value;
    }

    public showChannelsSelector(placementId: string, bounds: Bounds) {
        // TODO
    }

    public showAddWindowPopup(groupId: string, bounds: Bounds) {
        this._popupManager.showAddWindowPopup(bounds, {
            boxId: groupId,
            parentType: "group",
            frameId: this.frameId,
            peerId: this._glue.agm.instance.peerId,
            workspaceId: store.getActiveWorkspace().id
        });
    }

    private resizeWorkspaceItem(args: ResizeItemArguments): void {
        const item = store.getContainer(args.itemId) || store.getWindowContentItem(args.itemId);

        if (!item) {
            throw new Error(`Could not find container ${args.itemId} in frame ${this.frameId}`);
        }

        if (item.type === "column" && args.height) {
            throw new Error(`Requested resize for ${item.type} ${args.itemId}, however an unsupported argument (height) was passed`);
        }

        if (item.type === "row" && args.width) {
            throw new Error(`Requested resize for ${item.type} ${args.itemId}, however an unsupported argument (width) was passed`);
        }

        const workspace = store.getByContainerId(item.config.id) || store.getByWindowId(idAsString(item.config.id));
        let maximizedWindow;
        let maximizedContainer;

        if (this.stateResolver.isWorkspaceHibernated(workspace.id)) {
            throw new Error(`Requested resize for ${item.type} ${args.itemId}, however the workspace ${workspace.id} is hibernated`);
        }

        if (workspace) {
            maximizedWindow = workspace.windows.find((w) => {
                return this.stateResolver.isWindowMaximized(w.id);
            });

            maximizedContainer = workspace.layout?.root?.getItemsByFilter((layoutItem) => {
                return layoutItem.hasId("__glMaximised") && layoutItem.type !== "component";
            })[0];
        }

        if (maximizedWindow) {
            this._controller.restoreWindow(maximizedWindow.id);
        }

        if (maximizedContainer) {
            this._controller.restoreContainer(idAsString(maximizedContainer.config.id));
        }

        if (item.type === "row") {
            this._controller.resizeRow(item, args.height);
        } else if (item.type === "column") {
            this._controller.resizeColumn(item, args.width);
        } else if (item.type === "stack") {
            this._controller.resizeStack(item, args.width, args.height);
        } else {
            this._controller.resizeComponent(item, args.width, args.height);
        }

        if (maximizedWindow) {
            this._controller.maximizeWindow(maximizedWindow.id);
        }

        if (maximizedContainer) {
            this._controller.maximizeContainer(idAsString(maximizedContainer.config.id));
        }
    }

    private async initLayout(): Promise<void> {
        const workspacesSystemSettings = await this._systemSettings.getSettings();
        const config = await this._layoutsManager.getInitialConfig();

        this.subscribeForPopups();
        this.subscribeForLayout();

        this._isLayoutInitialized = true;

        await Promise.all(config.workspaceConfigs.map(c => {
            return this._glue.contexts.set(getWorkspaceContextName(c.id), c.config?.workspacesOptions?.context || {});
        }));
        await this._controller.init({
            frameId: this._frameId,
            workspaceLayout: config.workspaceLayout,
            workspaceConfigs: config.workspaceConfigs,
            showLoadingIndicator: workspacesSystemSettings?.loadingStrategy?.showDelayedIndicator || false
        });

        Promise.all(store.workspaceIds.map((wid) => {
            const loadingStrategy = this._applicationFactory.getLoadingStrategy(workspacesSystemSettings, config.workspaceConfigs[0].config);
            return this.handleWindows(wid, loadingStrategy);
        }));

        store.layouts.map((l) => l.layout).filter((l) => l).forEach((l) => this.reportLayoutStructure(l));

        if (startupReader.config.emptyFrame) {

            this._workspacesEventEmitter.raiseFrameEvent({
                action: "opened", payload: {
                    frameSummary: {
                        id: this._frameId
                    },
                    frameBounds: this.stateResolver.getFrameBounds()
                }
            });
        }
    }

    private async reinitLayout(): Promise<void> {
        const workspacesSystemSettings = await this._systemSettings.getSettings();
        const config = await this._layoutsManager.getInitialConfig();

        this._isLayoutInitialized = true;

        await Promise.all(config.workspaceConfigs.map(c => {
            return this._glue.contexts.set(getWorkspaceContextName(c.id), c.config?.workspacesOptions?.context || {});
        }));

        store.workspaceIds.forEach((wid) => {
            this.discardWorkspaceWithoutClosing(store.getById(wid));
        });

        await this._controller.reinit({
            frameId: this._frameId,
            workspaceLayout: config.workspaceLayout,
            workspaceConfigs: config.workspaceConfigs,
            showLoadingIndicator: workspacesSystemSettings?.loadingStrategy?.showDelayedIndicator || false
        });

        Promise.all(store.workspaceIds.map((wid) => {
            const loadingStrategy = this._applicationFactory.getLoadingStrategy(workspacesSystemSettings, config.workspaceConfigs[0].config);
            return this.handleWindows(wid, loadingStrategy);
        }));

        store.layouts.map((l) => l.layout).filter((l) => l).forEach((l) => this.reportLayoutStructure(l));
    }

    private async updateFrameLayoutNaive(newWorkspaces: GoldenLayout.Config[], keepWorkspaces: string[]): Promise<void> {
        const workspaceIdsToClose = store.workspaceIds.filter((wid) => !keepWorkspaces.includes(wid));
        const workspacesToClose = workspaceIdsToClose.map((wid) => store.getById(wid));

        const closePromise = Promise.all(workspacesToClose.map((wtc) => this.closeWorkspace(wtc)));
        const createPromise = Promise.all(newWorkspaces.map((nwc) => this.createWorkspace(nwc)));

        await Promise.all([closePromise, createPromise]);
    }

    private async reinitializeWorkspace(id: string, config: GoldenLayout.Config): Promise<void> {
        await this._controller.reinitializeWorkspace(id, config);

        const workspacesSystemSettings = await this._systemSettings.getSettings();
        const loadingStrategy = this._applicationFactory.getLoadingStrategy(workspacesSystemSettings, config);
        this.handleWindows(id, loadingStrategy);
    }

    private subscribeForLayout(): void {
        this._controller.emitter.onContentItemResized((target, id) => {
            this._frameController.moveFrame(id, getElementBounds(target));
        });

        this._controller.emitter.onTabCloseRequested(async (item) => {
            const workspace = store.getByWindowId(idAsString(item.config.id));
            // const windowSummary = await this.stateResolver.getWindowSummary(item.config.id);
            this.closeTab(item);

            this._controller.removeLayoutElement(idAsString(item.config.id));
            this._frameController.remove(idAsString(item.config.id));
        });

        this._controller.emitter.onWorkspaceTabCloseRequested((workspace) => {
            this.closeWorkspace(workspace);
        });

        this._controller.emitter.onTabElementMouseDown((tab) => {
            const tabContentSize = getElementBounds(tab.contentItem.element);
            const contentWidth = Math.min(tabContentSize.width, 800);
            const contentHeight = Math.min(tabContentSize.height, 600);

            this._controller.setDragElementSize(contentWidth, contentHeight);
        });

        this._controller.emitter.onTabDragStart((tab) => {
            const dragElement = this._controller.getDragElement();

            const mutationObserver = new MutationObserver((mutations) => {
                Array.from(mutations).forEach((m) => {
                    if (m.type === "attributes") {
                        const proxyContent = $(this._controller.getDragElement())
                            .children(".lm_content")
                            .children(".lm_item_container");

                        const proxyContentBounds = getElementBounds(proxyContent[0]);
                        const id = idAsString(tab.contentItem.config.id);
                        this._frameController.moveFrame(id, proxyContentBounds);
                        this._frameController.bringToFront(id);
                    }
                });
            });


            if (!dragElement) {
                return;
            }

            mutationObserver.observe(dragElement, {
                attributes: true
            });

            const windowSummary = this.stateResolver.getWindowSummarySync(tab.contentItem.config.id, tab.contentItem as GoldenLayout.Component);
            this.workspacesEventEmitter.raiseWindowEvent({
                action: "removed", payload: {
                    windowSummary
                }
            });
        });

        this._controller.emitter.onItemDropped((item) => {
            const windowSummary = this.stateResolver.getWindowSummarySync(item.config.id, item as GoldenLayout.Component);
            this.workspacesEventEmitter.raiseWindowEvent({
                action: "added", payload: {
                    windowSummary
                }
            });
        });

        this._controller.emitter.onSelectionChanged(async (toBack, toFront) => {
            this._popupManager.hidePopup();
            this._frameController.selectionChanged(toFront.map((tf) => tf.id), toBack.map((t) => t.id));
        });

        this._controller.emitter.onTabSelectionChanged(async (item) => {
            componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({
                placementId: idAsString(item.config.id),
                groupId: idAsString(item.parent.config.id),
                isSelected: true
            });

            this.workspacesEventEmitter.raiseWindowEvent({
                action: "selected", payload: {
                    windowSummary: this.stateResolver.getWindowSummarySync(item.config.id, item)
                }
            });
        });

        this._controller.emitter.onWorkspaceAdded((workspace) => {
            this.handleOnWorkspaceAdded(workspace);
        });

        this._controller.emitter.onWorkspaceSelectionChanged((workspace, toBack) => {
            this._popupManager.hidePopup();

            this._controller.refreshTabSizes(workspace.id);
            if (!workspace.layout) {
                this._frameController.selectionChangedDeep([], toBack.map((w) => w.id));
                this._workspacesEventEmitter.raiseWorkspaceEvent({
                    action: "selected", payload: {
                        frameSummary: { id: this._frameId },
                        workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                        frameBounds: this.stateResolver.getFrameBounds()
                    }
                });

                if (workspace.hibernateConfig) {
                    this.resumeWorkspace(workspace.id);
                }
                return;
            }
            const allWinsInLayout = getAllWindowsFromConfig(workspace.layout.toConfig().content)
                .filter((w) => this._controller.isWindowVisible(w.id));

            this._frameController.selectionChangedDeep(allWinsInLayout.map((w) => idAsString(w.id)), toBack.map((w) => w.id));

            this._workspacesEventEmitter.raiseWorkspaceEvent({
                action: "selected", payload: {
                    frameSummary: { id: this._frameId },
                    workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                    frameBounds: this.stateResolver.getFrameBounds()
                }
            });
        });

        this._controller.emitter.onAddButtonClicked(async ({ laneId, workspaceId, bounds, parentType }) => {
            const payload: any = {
                boxId: laneId,
                workspaceId,
                parentType,
                frameId: this._frameId,
                peerId: this._glue.agm.instance.peerId,
                domNode: undefined,
                resizePopup: undefined,
                hidePopup: undefined
            };

            await this._popupManager.showAddWindowPopup(bounds, payload);
        });

        this._controller.emitter.onContentLayoutInit((layout: Workspace["layout"]) => {
            const workspace = store.getById(layout.root.config.id);
            const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem: undefined });

            if (wrapper.getMaximizedItemInRoot(layout)) {
                this._controller.hideWorkspaceRootItem(workspace.id);
            }

            this.reportLayoutStructure(layout);
        });

        this._controller.emitter.onWorkspaceAddButtonClicked(async () => {
            const payload = {
                frameId: this._frameId,
                peerId: this._glue.agm.instance.windowId
            };

            const addButton = store
                .workspaceLayoutHeader
                .element
                .find(".lm_workspace_controls")
                .find(".lm_add_button");
            const addButtonBounds = getElementBounds(addButton);

            await this._popupManager.showOpenWorkspacePopup(addButtonBounds, payload);
        });

        this._controller.emitter.onWorkspaceSaveRequested(async (workspaceId) => {
            const saveButton = (store
                .getWorkspaceLayoutItemById(workspaceId) as GoldenLayout.Component)
                .tab
                .element
                .find(".lm_saveButton");

            const targetBounds = getElementBounds(saveButton);

            await this.showSaveWorkspacePopup(workspaceId, targetBounds);
        });

        this._controller.emitter.onContainerMaximized((contentItem: GoldenLayout.ContentItem) => {
            if (contentItem.type === "component") {
                return;
            }
            const components = contentItem.getItemsByFilter((ci) => ci.type === "component");

            components.forEach((c) => {
                this._frameController.maximizeTab(idAsString(c.config.id));
            });

            contentItem.contentItems
                .filter((ci) => ci.type === "component")
                .map((c) => this.stateResolver.getWindowSummarySync(c.config.id)).forEach((ws) => {
                    this.workspacesEventEmitter.raiseWindowEvent({ action: "maximized", payload: { windowSummary: ws } });
                });

            const stacks = contentItem.getItemsByFilter((ci) => ci.type === "stack");

            if (contentItem.type === "stack") {
                stacks.push(contentItem);
            }

            const [toFront, toBack] = stacks.reduce((acc, stack: GoldenLayout.Stack) => {
                const activeItem = stack.getActiveContentItem();
                const toBack = stack.contentItems.map((ci) => idAsString(ci.config.id));
                acc[0].push(idAsString(activeItem.config.id));
                acc[1] = [...acc[1], ...toBack];
                return acc;
            }, [[], []]);

            this._frameController.selectionChanged(toFront, toBack);

            const workspace = store.getById(contentItem.layoutManager.root.config.id);
            const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
            const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

            if (wrapper.getMaximizedItemInRoot(contentItem.layoutManager) && !contentItem.parent.isRoot) {
                this._controller.hideWorkspaceRootItem(workspace.id);
            }

            this.reportLayoutStructure(contentItem.layoutManager);
        });

        this._controller.emitter.onContainerRestored((contentItem: GoldenLayout.ContentItem) => {
            if (contentItem.type === "component") {
                return;
            }

            const components = contentItem.getItemsByFilter((ci) => ci.type === "component");

            components.forEach((c) => {
                this._frameController.restoreTab(idAsString(c.config.id));
            });

            contentItem.contentItems
                .filter((ci) => ci.type === "component")
                .map((c) => this.stateResolver.getWindowSummarySync(c.config.id)).forEach((ws) => {
                    this.workspacesEventEmitter.raiseWindowEvent({ action: "restored", payload: { windowSummary: ws } });
                });

            const stacks = contentItem.getItemsByFilter((ci) => ci.type === "stack");

            if (contentItem.type === "stack") {
                stacks.push(contentItem);
            }

            const [toFront, toBack] = stacks.reduce((acc, stack: GoldenLayout.Stack) => {
                const activeItem = stack.getActiveContentItem();
                const toBack = stack.contentItems.map((ci) => idAsString(ci.config.id));
                acc[0].push(idAsString(activeItem.config.id));
                acc[1] = [...acc[1], ...toBack];
                return acc;
            }, [[], []]);

            this._frameController.selectionChanged(toFront, toBack);
            const workspaceId = idAsString(contentItem.layoutManager.root.config.id);
            this._controller.showWorkspaceRootItem(workspaceId);
            this._controller.refreshWorkspaceSize(workspaceId);
            this.reportLayoutStructure(contentItem.layoutManager);
        });

        this._controller.emitter.onEjectRequested((item) => {
            if (!item.isComponent) {
                throw new Error(`Can't eject item of type ${item.type}`);
            }
            return this.eject(idAsString(item.config.id));
        });

        this._controller.emitter.onComponentSelectedInWorkspace((component, workspaceId) => {
            this._applicationFactory.start(component, workspaceId);
        });

        const resizedTimeouts: { [id: string]: NodeJS.Timeout } = {};
        this._controller.emitter.onWorkspaceContainerResized((workspaceId) => {
            const id = idAsString(workspaceId);
            if (resizedTimeouts[id]) {
                clearTimeout(resizedTimeouts[id]);
            }
            resizedTimeouts[id] = setTimeout(() => {
                this._controller.refreshWorkspaceSize(id);
            }, 16); // 60 FPS
        });

        this._controller.emitter.onContentItemRemoved(async (workspaceId, item) => {
            if (item.type === "stack") {
                componentStateMonitor.notifyGroupClosed(idAsString(item.config.id));
            }
        });

        this._controller.emitter.onWorkspaceLockConfigurationChanged(async (itemId) => {
            this.workspacesEventEmitter.raiseWorkspaceEvent({
                action: "lock-configuration-changed",
                payload: {
                    frameSummary: this.getFrameSummary(this.frameId),
                    workspaceSummary: this.stateResolver.getWorkspaceSummary(itemId),
                    frameBounds: this.stateResolver.getFrameBounds()
                }
            });
        });

        this._controller.emitter.onContainerLockConfigurationChanged(async (item) => {
            this.workspacesEventEmitter.raiseContainerEvent({
                action: "lock-configuration-changed",
                payload: {
                    containerSummary: this.stateResolver.getContainerSummaryByReference(item, store.getByContainerId(item.config.id)?.id)
                }
            });
        });

        this._controller.emitter.onWindowLockConfigurationChanged(async (item) => {
            this.workspacesEventEmitter.raiseWindowEvent({
                action: "lock-configuration-changed",
                payload: {
                    windowSummary: this.stateResolver.getWindowSummarySync(item.config.id)
                }
            });
        });

        // debouncing because there is potential for 1ms spam
        let shownTimeout: NodeJS.Timeout = undefined;
        componentStateMonitor.onWorkspaceContentsShown((workspaceId: string) => {
            const workspace = store.getActiveWorkspace();
            if (!workspace?.layout || workspaceId !== workspace.id) {
                return;
            }
            if (shownTimeout) {
                clearTimeout(shownTimeout);
            }

            shownTimeout = setTimeout(() => {
                const containerElement = $(`#nestHere${workspace.id}`);
                const bounds = getElementBounds(containerElement[0]);
                workspace.layout.updateSize(bounds.width, bounds.height);
            }, 50);
            const stacks = workspace.layout.root.getItemsByFilter((e) => e.type === "stack");

            this._frameController.selectionChangedDeep(stacks.map(s => idAsString(s.getActiveContentItem().config.id)), []);
        });

        componentStateMonitor.onWorkspaceContentsHidden((workspaceId: string) => {
            const workspace = store.getById(workspaceId);
            if (!workspace?.layout || workspaceId !== workspace.id) {
                return;
            }

            this._frameController.selectionChangedDeep([], workspace.windows.map(w => w.id));
        });

        this.workspacesEventEmitter.onWorkspaceEvent((action, payload) => {
            const workspace = store.getById(payload.workspaceSummary.id);

            if (!workspace) {
                return;
            }

            workspace.lastActive = Date.now();
        });
    }

    private subscribeForPopups(): void {
        this._frameController.onFrameContentClicked(() => {
            this._popupManager.hidePopup();
        });

        this._frameController.onWindowTitleChanged((id, title) => {
            this.setItemTitle(id, title);
        });

        this._frameController.onFrameLoaded((id) => {
            this._controller.hideLoadingIndicator(id);
        });
    }

    private cleanUp = (): void => {
        if (scReader.config?.build) {
            return;
        }
        const windowSummaries: WindowSummary[] = [];
        const workspaceSummaries = store.workspaceIds.map((wid) => {
            const workspace = store.getById(wid);
            const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceId: workspace.id });

            windowSummaries.push(...wrapper.windowSummaries);

            return this.stateResolver.getWorkspaceSummary(wid);
        });

        windowSummaries.forEach((ws) => {
            this._platformCommunicator.notifyFrameWillClose(ws.config.windowId, ws.config.appName).catch((e) => {
                // Log the error
            });
            this.workspacesEventEmitter.raiseWindowEvent({ action: "removed", payload: { windowSummary: ws } });
        });

        workspaceSummaries.forEach((ws) => {
            this.workspacesEventEmitter.raiseWorkspaceEvent({ action: "closed", payload: { frameSummary: { id: this._frameId }, workspaceSummary: ws, frameBounds: this.stateResolver.getFrameBounds() } });
        });

        const currentWorkspaces = store.layouts.filter(l => !l.layout?.config?.workspacesOptions?.noTabHeader);

        this._layoutsManager.saveWorkspacesFrame(currentWorkspaces);

        this.workspacesEventEmitter.raiseFrameEvent({ action: "closed", payload: { frameSummary: { id: this._frameId }, frameBounds: this.stateResolver.getFrameBounds() } });
    };

    private reportLayoutStructure(layout: Workspace["layout"]): void {
        const allWinsInLayout = getAllWindowsFromConfig(layout.toConfig().content);

        allWinsInLayout.forEach((w) => {
            const win = layout.root.getItemsById(w.id)[0];
            this._frameController.moveFrame(idAsString(win.config.id), getElementBounds(win.element));
        });
    }

    private closeWorkspace(workspace: Workspace): void {
        if (!workspace) {
            throw new Error("Could not find a workspace to close");
        }

        this.closeWorkspaceCore(workspace);
    }

    private closeWorkspaceCore(workspace: Workspace): void {
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceId: workspace.id });
        const workspaceSummary = workspaceWrapper.summary;

        const windowSummaries = workspaceWrapper.windowSummaries;

        const isFrameEmpty = this.checkForEmptyWorkspace(workspace);

        this.disposeOfWindowsInClosingWorkspace(windowSummaries);

        if (isFrameEmpty) {
            return;
        }
        this.raiseWorkspaceClosedEventsInClosingWorkspace(workspaceSummary);
    }

    private discardWorkspaceWithoutClosing(workspace: Workspace) {
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceId: workspace.id });

        const windowSummaries = workspaceWrapper.windowSummaries;

        const workspaceSummary = workspaceWrapper.summary;

        this.disposeOfWindowsInClosingWorkspace(windowSummaries);
        this.raiseWorkspaceClosedEventsInClosingWorkspace(workspaceSummary);
        store.removeById(workspace.id);
    }

    private disposeOfWindowsInClosingWorkspace(windowSummaries: WindowSummary[]) {
        windowSummaries.forEach((w) => this._frameController.remove(w.itemId));

        windowSummaries.forEach((ws) => {
            this._platformCommunicator.notifyFrameWillClose(ws.config.windowId, ws.config.appName).catch((e) => {
                // Log the error
            });
            this.workspacesEventEmitter.raiseWindowEvent({
                action: "removed",
                payload: {
                    windowSummary: ws
                }
            });
        });
    }

    private raiseWorkspaceClosedEventsInClosingWorkspace(workspaceSummary: WorkspaceSummary) {
        componentStateMonitor.notifyWorkspaceClosed(workspaceSummary.id);

        this.workspacesEventEmitter.raiseWorkspaceEvent({
            action: "closed",
            payload: {
                workspaceSummary,
                frameSummary: { id: this._frameId },
                frameBounds: this.stateResolver.getFrameBounds()
            }
        });
    }

    private async addWorkspace(id: string, config: GoldenLayout.Config): Promise<void> {
        await this._glue.contexts.set(getWorkspaceContextName(id), config?.workspacesOptions?.context || {});
        await this._controller.addWorkspace(id, config);

        this._controller.emitter.raiseEvent("workspace-added", { workspace: store.getById(id) });

        const workspacesSystemSettings = await this._systemSettings.getSettings();
        const loadingStrategy = this._applicationFactory.getLoadingStrategy(workspacesSystemSettings, config);
        this.handleWindows(id, loadingStrategy).catch((e) => {
            // If it fails do nothing
            console.log(e);
        });
    }

    private async handleWindows(workspaceId: string, loadingStrategy: LoadingStrategy): Promise<void> {
        switch (loadingStrategy) {
            case "delayed":
                await this._applicationFactory.startDelayed(workspaceId);
                break;
            case "direct":
                await this._applicationFactory.startDirect(workspaceId);
                break;
            case "lazy":
                await this._applicationFactory.startLazy(workspaceId);
                break;
        }
    }

    private checkForEmptyWorkspace(workspace: Workspace): boolean {
        // Closing all workspaces except the last one
        if (store.layouts.length === 1) {
            if (this._isLayoutInitialized && (window as any).glue42core.isPlatformFrame) {
                this.replaceLastWorkspaceWithEmpty(workspace);

                return false;
            } else if (this._isLayoutInitialized) {
                try {
                    this._facade.executeAfterControlIsDone(() => {
                        window.close();
                    });
                } catch (error) {
                    // Try to close my window if it fails fallback to frame with one empty workspace
                }

                return true;
            }

        } else {
            this._controller.removeWorkspace(workspace.id);
        }

        return false;
    }

    private replaceLastWorkspaceWithEmpty(lastWorkspace: Workspace) {
        const newId = this._configFactory.getId();
        const emptyWorkspaceConfig = this._configFactory.getEmptyWorkspaceConfig();
        const lastWorkspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace: lastWorkspace, workspaceId: lastWorkspace.id });
        const titlesWithoutLastWorkspace = this.stateResolver.getWorkspaceTitles().filter(t => t !== lastWorkspaceWrapper.title);
        const titleForEmptyWorkspace = this._configFactory.getWorkspaceTitle(titlesWithoutLastWorkspace);

        // Ensuring that the title will be Untitled 1
        emptyWorkspaceConfig.workspacesOptions.title = titleForEmptyWorkspace;

        this._controller.addWorkspace(newId, this._configFactory.getEmptyWorkspaceConfig()).then(async () => {
            await this.handleOnWorkspaceAddedWithSnapshot(store.getById(newId));
            this.checkForEmptyWorkspace(lastWorkspace);
        }).catch(() => {
            // Can happen if the workspace has already been closed
            // e.g the closing of the last window in a workspace could potentially trigger this behavior
        });
    }

    private waitForFrameLoaded(itemId: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            let unsub = (): void => {
                // safety
            };
            const timeout = setTimeout(() => {
                unsub();
                rej(`Did not hear frame loaded for ${itemId} in 5000ms`);
            }, 5000);

            unsub = this.workspacesEventEmitter.onWindowEvent((action, payload) => {
                if (action === "loaded" && payload.windowSummary.itemId === itemId) {
                    res();
                    clearTimeout(timeout);
                    unsub();
                }
            });

            if (this.stateResolver.isWindowLoaded(itemId)) {
                res();
                clearTimeout(timeout);
                unsub();
            }
        });
    }

    private handleGroupLockRequested(data: LockGroupArguments): void {
        const { allowExtract, allowReorder, showAddWindowButton, showEjectButton, showMaximizeButton, allowDrop } = data.config;
        if (allowExtract === false) {
            this._layoutLockingController.disableGroupExtract(data.itemId);
        } else {
            this._layoutLockingController.enableGroupExtract(data.itemId, allowExtract);
        }

        if (allowReorder === false) {
            this._layoutLockingController.disableGroupReorder(data.itemId);
        } else {
            this._layoutLockingController.enableGroupReorder(data.itemId, allowReorder);
        }

        if (showAddWindowButton === false) {
            this._layoutLockingController.disableGroupAddWindowButton(data.itemId);
        } else {
            this._layoutLockingController.enableGroupAddWindowButton(data.itemId, showAddWindowButton);
        }

        if (showEjectButton === false) {
            this._layoutLockingController.disableGroupEjectButton(data.itemId);
        } else {
            this._layoutLockingController.enableGroupEjectButton(data.itemId, showEjectButton);
        }

        if (showMaximizeButton === false) {
            this._layoutLockingController.disableGroupMaximizeButton(data.itemId);
        } else {
            this._layoutLockingController.enableGroupMaximizeButton(data.itemId, showMaximizeButton);
        }

        if (allowDrop === false) {
            this._layoutLockingController.disableGroupDrop(data.itemId, data.config);
        } else {
            this._layoutLockingController.enableGroupDrop(data.itemId, data.config);
        }

        const workspace = store.getByContainerId(data.itemId);
        if (workspace?.layout) {
            workspace.layout.updateSize();
        }
    }

    private handleRowLockRequested(data: LockRowArguments): void {
        const { allowDrop, allowSplitters } = data.config;
        if (allowDrop === false) {
            this._layoutLockingController.disableRowDrop(data.itemId);
        } else {
            this._layoutLockingController.enableRowDrop(data.itemId, allowDrop);
        }

        if (allowSplitters === false) {
            this._layoutLockingController.disableRowSplitters(data.itemId);
        } else {
            this._layoutLockingController.enableRowSplitters(data.itemId, allowSplitters);
        }
    }

    private handleColumnLockRequested(data: LockColumnArguments): void {
        const { allowDrop, allowSplitters } = data.config;

        if (allowDrop === false) {
            this._layoutLockingController.disableColumnDrop(data.itemId);
        } else {
            this._layoutLockingController.enableColumnDrop(data.itemId, allowDrop);
        }

        if (allowSplitters === false) {
            this._layoutLockingController.disableColumnSplitters(data.itemId);
        } else {
            this._layoutLockingController.enableColumnSplitters(data.itemId, allowSplitters);
        }
    }

    private cleanIsPinned(data: GoldenLayout.Config | GoldenLayout.ItemConfig): GoldenLayout.ItemConfig | GoldenLayout.Config {
        if (data.type !== "row" && data.type !== "column") {
            return data;
        }

        let hasFoundIsPinned = false;
        const clone = JSON.parse(JSON.stringify(data));

        const traverseAndClean = (item: GoldenLayout.ItemConfig): void => {
            if (item.workspacesConfig.isPinned) {
                hasFoundIsPinned = true;
                item.workspacesConfig.isPinned = false;
            }
            if (item.type === "component") {
                return;
            }

            item.content.forEach((c) => traverseAndClean(c));
        };

        traverseAndClean(clone);

        if (hasFoundIsPinned) {
            return clone;
        }

        return data;
    }

    private applyIsPinned(initialConfig: GoldenLayout.Config | GoldenLayout.ItemConfig, currentConfig: GoldenLayout | GoldenLayout.ContentItem): void {
        if (initialConfig.type !== "row" && initialConfig.type !== "column") {
            return;
        }

        if (currentConfig.config.type !== "row" && currentConfig.config.type !== "column") {
            return;
        }

        let hasFoundIsPinned = false;

        const traverseAndApply = (initialItem: GoldenLayout.ItemConfig, currentItem: GoldenLayout.ContentItem): void => {
            if (initialItem.workspacesConfig.isPinned) {
                hasFoundIsPinned = true;
                currentItem.config.workspacesConfig.isPinned = true;
            }

            if (initialItem.type === "component" || currentItem.type === "component") {
                return;
            }

            initialItem.content.forEach((c, i) => traverseAndApply(c, currentItem.contentItems[i]));
        };

        traverseAndApply(initialConfig, currentConfig as GoldenLayout.ContentItem);
    }

    private handleOnWorkspaceAdded(workspace: Workspace): void {
        const allOtherWindows = store.workspaceIds.filter((wId) => wId !== workspace.id).reduce((acc, w) => {
            return [...acc, ...store.getById(w).windows];
        }, []);

        this._workspacesEventEmitter.raiseWorkspaceEvent({
            action: "opened",
            payload: {
                frameSummary: { id: this._frameId },
                workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                frameBounds: this.stateResolver.getFrameBounds()
            }
        });
        if (store.getActiveWorkspace().id === workspace.id) {
            this._workspacesEventEmitter.raiseWorkspaceEvent({
                action: "selected",
                payload: {
                    frameSummary: { id: this._frameId },
                    workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                    frameBounds: this.stateResolver.getFrameBounds(),
                }
            });
            if (!workspace.layout) {
                this._frameController.selectionChangedDeep([], allOtherWindows.map((w) => w.id));
                return;
            }
            const allWinsInLayout = getAllWindowsFromConfig(workspace.layout.toConfig().content);

            this._frameController.selectionChangedDeep(allWinsInLayout.map((w) => idAsString(w.id)), allOtherWindows.map((w) => w.id));
        }

        if (!workspace.layout) {
            return;
        }
        const workspaceOptions = workspace.layout.config.workspacesOptions as { title: string; name: string };
        const title = workspaceOptions.title || workspaceOptions.name;

        if (title) {
            store.getWorkspaceLayoutItemById(workspace.id)?.setTitle(title);
        }
    }

    private async handleOnWorkspaceAddedWithSnapshot(workspace: Workspace): Promise<void> {
        const allOtherWindows = store.workspaceIds.filter((wId) => wId !== workspace.id).reduce((acc, w) => {
            return [...acc, ...store.getById(w).windows];
        }, []);
        const snapshot = await this._stateResolver.getWorkspaceSnapshot(workspace.id, this);
        this._workspacesEventEmitter.raiseWorkspaceEvent({
            action: "opened",
            payload: {
                frameSummary: { id: this._frameId },
                workspaceSnapshot: snapshot,
                workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                frameBounds: this.stateResolver.getFrameBounds()
            }
        });
        if (store.getActiveWorkspace().id === workspace.id) {
            this._workspacesEventEmitter.raiseWorkspaceEvent({
                action: "selected",
                payload: {
                    frameSummary: { id: this._frameId },
                    workspaceSummary: this.stateResolver.getWorkspaceSummary(workspace.id),
                    frameBounds: this.stateResolver.getFrameBounds()
                }
            });
            if (!workspace.layout) {
                this._frameController.selectionChangedDeep([], allOtherWindows.map((w) => w.id));
                return;
            }
            const allWinsInLayout = getAllWindowsFromConfig(workspace.layout.toConfig().content);

            this._frameController.selectionChangedDeep(allWinsInLayout.map((w) => idAsString(w.id)), allOtherWindows.map((w) => w.id));
        }

        if (!workspace.layout) {
            return;
        }
        const workspaceOptions = workspace.layout.config.workspacesOptions as { title: string; name: string };
        const title = workspaceOptions.title || workspaceOptions.name;

        if (title) {
            store.getWorkspaceLayoutItemById(workspace.id)?.setTitle(title);
        }
    }
}

export default new WorkspacesManager();
