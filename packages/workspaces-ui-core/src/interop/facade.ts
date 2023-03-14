/* eslint-disable @typescript-eslint/no-explicit-any */
/*eslint indent: [2, 4, {"SwitchCase": 1}]*/
import {
    ControlArguments,
    OpenWorkspaceArguments,
    LayoutSelector,
    SaveLayoutArguments,
    OpenWorkspaceResult,
    GetWorkspaceSnapshotResult,
    ItemSelector,
    CloseItemResult,
    RestoreItemResult,
    MaximizeItemResult,
    AddContainerArguments,
    AddWindowArguments,
    AddItemResult,
    SetItemTitleArguments,
    AddWorkspaceChildrenResult,
    AddWorkspaceChildrenArguments,
    CreateWorkspaceArguments,
    BundleWorkspaceArguments,
    BundleItemArguments,
    MoveFrameArguments,
    MoveWindowToArguments,
    GenerateLayoutArguments,
    WorkspaceSelector,
    LockContainerArguments,
    LockWindowArguments,
    LockWorkspaceArguments,
    ResizeItemArguments,
    PinWorkspaceArguments,
    SetWorkspaceIconArguments,
    InitFrameArguments,
    CreateFrameArguments,
    InitFrameFromSnapshotArguments,
    FrameSnapshotArguments,
    GetWorkspacesLayoutsArguments,
    GetWorkspacesLayoutsResult,
    SetMaximizationBoundaryArguments,
    OperationCheckArguments,
    OperationCheckResult,
} from "./types";
import manager from "../manager";
import store from "../state/store";
import { WorkspaceSummary, ColumnItem, RowItem, WorkspaceLayout, WorkspaceItem, FrameSummary, WorkspaceSnapshot } from "../types/internal";
import GoldenLayout, { RowConfig, ColumnConfig } from "@glue42/golden-layout";
import { idAsString, isOperationSupported } from "../utils";
import { Glue42Web } from "@glue42/web";
import { EventActionType, EventPayload } from "../types/events";
import { WorkspacesConfigurationFactory } from "../config/factory";
import { ConfigConverter } from "../config/converter";
import { ConstraintsValidator } from "../config/constraintsValidator";
import { WorkspacesLocker } from "../locking";

declare const window: Window & { glue: Glue42Web.API };

export class GlueFacade {
    private readonly _workspacesControlMethod = "T42.Workspaces.Control";
    private readonly _workspacesEventMethod = "T42.Workspaces.Events";
    private _configFactory: WorkspacesConfigurationFactory;
    private _glue: Glue42Web.API;
    private _inDisposing = false;
    private _frameId: string;
    private _converter: ConfigConverter;
    private _constraintValidator: ConstraintsValidator;
    private _controlPromise: Promise<any> = Promise.resolve();
    private _locker: WorkspacesLocker;

    public async init(glue: Glue42Web.API, frameId: string): Promise<void> {
        this._frameId = frameId;
        this._glue = glue;
        this._configFactory = new WorkspacesConfigurationFactory(glue);
        this._converter = new ConfigConverter(this._configFactory);
        this._locker = new WorkspacesLocker(manager);
        this._constraintValidator = new ConstraintsValidator();

        if (this._glue) {
            await this.registerAgmMethods();
        }
    }

    public dispose(): void {
        this._inDisposing = true;
    }

    public subscribeForWorkspaceEvents(): void {
        manager.workspacesEventEmitter.onFrameEvent((action, payload) => {
            this.publishEventData(action, payload, "frame");
        });

        manager.workspacesEventEmitter.onWindowEvent((action, payload) => {
            this.publishEventData(action, payload, "window");
        });

        manager.workspacesEventEmitter.onWorkspaceEvent((action, payload) => {
            this.publishEventData(action, payload, "workspace");
        });

        manager.workspacesEventEmitter.onContainerEvent((action, payload) => {
            this.publishEventData(action, payload, "container");
        });
    }

    public executeAfterControlIsDone(cb: () => Promise<void> | void): void {
        this._controlPromise.finally(() => {
            return cb();
        });
    }

    private async registerAgmMethods(): Promise<void> {
        await this._glue.agm.registerAsync({
            name: this._workspacesControlMethod
        }, this.handleControl);
    }

    private handleControlCore = async (args: ControlArguments, caller: object, successCallback: (result: object) => void, errorCallback: (error: string) => void) => {
        try {
            await manager.initPromise;
            switch (args.operation) {
                case "isWindowInWorkspace":
                    successCallback(this.handleIsWindowInWorkspace(args.operationArguments));
                    break;
                case "addWindow":
                    successCallback(await this.handleAddWindow(args.operationArguments));
                    break;
                case "addContainer":
                    successCallback(await this.handleAddContainer(args.operationArguments));
                    break;
                case "getWorkspaceSnapshot":
                    successCallback(await this.handleGetWorkspaceSnapshot(args.operationArguments));
                    break;
                case "openWorkspace":
                    successCallback(await this.handleOpenWorkspace(args.operationArguments));
                    break;
                case "saveLayout":
                    successCallback(await this.handleSaveLayout(args.operationArguments));
                    break;
                case "exportAllLayouts":
                    successCallback(await this.handleExportAllLayouts());
                    break;
                case "deleteLayout":
                    this.handleDeleteLayout(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "getAllWorkspacesSummaries":
                    successCallback(this.handleGetAllWorkspaceSummaries());
                    break;
                case "maximizeItem":
                    this.handleMaximizeItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "restoreItem":
                    this.handleRestoreItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "closeItem":
                    this.handleCloseItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "setItemTitle":
                    await this.handleSetItemTitle(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "addWorkspaceChildren":
                    await this.handleAddWorkspaceChildren(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "ejectWindow":
                    successCallback(await this.handleEject(args.operationArguments));
                    break;
                case "createWorkspace":
                    successCallback(await this.handleCreateWorkspace(args.operationArguments));
                    break;
                case "forceLoadWindow":
                    successCallback(await this.handleForceLoadWindow(args.operationArguments));
                    break;
                case "focusItem":
                    await this.handleFocusItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "bundleWorkspace":
                    this.handleBundleWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "bundleItem":
                    this.handleBundleItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "getFrameSummary":
                    successCallback(await this.handleGetFrameSummary(args.operationArguments));
                    break;
                case "moveFrame":
                    await this.handleMoveFrame(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "getFrameSnapshot":
                    successCallback(await this.handleGetFrameSnapshot(args.operationArguments));
                    break;
                case "getSnapshot":
                    successCallback(await this.handleGetSnapshot(args.operationArguments));
                    break;
                case "moveWindowTo":
                    await this.handleMoveWindowTo(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "generateLayout":
                    successCallback(await this.handleGenerateLayout(args.operationArguments));
                    break;
                case "ping":
                    successCallback(this.handlePing());
                    break;
                case "hibernateWorkspace":
                    await this.handleHibernateWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "resumeWorkspace":
                    await this.handleResumeWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "lockWorkspace":
                    this.handleLockWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "lockContainer":
                    this.handleLockContainer(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "lockWindow":
                    this.handleLockWindow(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "resizeItem":
                    this.handleResizeItem(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "pinWorkspace":
                    this.handlePinWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "unpinWorkspace":
                    this.handleUnpinWorkspace(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "getWorkspaceIcon":
                    successCallback(this.handleGetWorkspaceIcon(args.operationArguments));
                    break;
                case "setWorkspaceIcon":
                    this.handleSetWorkspaceIcon(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "initFrame":
                    await this.handleInitFrame(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "createFrame":
                    successCallback(this.handleCreateFrame(args.operationArguments));
                    break;
                case "initFrameFromSnapshot":
                    await this.handleInitFrameFromSnapshot(args.operationArguments);
                    successCallback(undefined);
                    break;
                case "getWorkspacesLayouts":
                    successCallback(await this.handleGetWorkspaceLayouts(args.operationArguments));
                    break;
                case "setMaximizationBoundary":
                    this.handleSetMaximizationBoundary(args.operationArguments)
                    successCallback(undefined);
                    break;
                case "operationCheck":
                    successCallback(this.handleOperationCheck(args.operationArguments));
                    break;
                default:
                    errorCallback(`Invalid operation - ${((args as unknown) as { operation: string }).operation}`);
            }

        } catch (error) {
            errorCallback(error.message);
            console.warn(error);
        }
    };

    private handleControl = async (args: ControlArguments, caller: object, successCallback: (result: object) => void, errorCallback: (error: string) => void): Promise<void> => {
        const controlPromise = this.handleControlCore(args, caller, successCallback, errorCallback);
        this._controlPromise = controlPromise;
        await controlPromise;
    };

    private async handleOpenWorkspace(operationArguments: OpenWorkspaceArguments): Promise<OpenWorkspaceResult> {
        const id = await manager.openWorkspace(operationArguments.name, operationArguments.restoreOptions);

        return manager.stateResolver.getWorkspaceSnapshot(id, manager);
    }

    private async handleExportAllLayouts() {
        const layouts = await manager.exportAllLayouts();
        return {
            layouts
        };
    }

    private async handleSaveLayout(operationArguments: SaveLayoutArguments): Promise<WorkspaceLayout> {
        return await manager.saveWorkspace(
            operationArguments.name,
            operationArguments.workspaceId,
            operationArguments.saveContext,
            operationArguments.metadata);
    }

    private handleDeleteLayout(operationArguments: LayoutSelector): void {
        manager.deleteLayout(operationArguments.name);
    }

    private async handleGetWorkspaceSnapshot(operationArguments: ItemSelector): Promise<GetWorkspaceSnapshotResult> {
        return manager.stateResolver.getWorkspaceSnapshot(operationArguments.itemId, manager);
    }

    private handleGetAllWorkspaceSummaries() {
        const summaries = store.layouts.map((w) => {
            const summary: WorkspaceSummary = manager.stateResolver.getWorkspaceSummary(w.id);

            return summary;
        });

        return {
            summaries
        };
    }

    private handleCloseItem(operationArguments: ItemSelector): CloseItemResult {
        return manager.closeItem(operationArguments.itemId);
    }
    private handleRestoreItem(operationArguments: ItemSelector): RestoreItemResult {
        manager.restoreItem(operationArguments.itemId);
    }
    private handleMaximizeItem(operationArguments: ItemSelector): MaximizeItemResult {
        manager.maximizeItem(operationArguments.itemId);
    }

    private async handleAddContainer(operationArguments: AddContainerArguments): Promise<AddItemResult> {
        if (operationArguments.definition.type === "workspace") {
            throw new Error(`Unsuported add container type ${operationArguments.definition.type}`);
        }

        const workspace = store.getByContainerId(operationArguments.parentId) || store.getById(operationArguments.parentId);
        const workspaceItem = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspace.id)) as WorkspaceItem;
        this._constraintValidator.fixNewContainer(operationArguments.definition, workspaceItem, operationArguments.parentId);
        const rendererFriendlyConfig = this._converter.convertToRendererConfig(operationArguments.definition);

        if (rendererFriendlyConfig.type === "workspace") {
            throw new Error("Unsuccessful conversion");
        }
        const containerDefinition = {
            id: idAsString(rendererFriendlyConfig.id),
            content: rendererFriendlyConfig.content,
            type: rendererFriendlyConfig.type,
            workspacesConfig: rendererFriendlyConfig.workspacesConfig
        };
        const itemId = await manager.addContainer(containerDefinition,
            operationArguments.parentId);

        const workspaceItemAferAdd = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspace.id)) as WorkspaceItem;

        this._locker.applyContainerLockConfiguration(operationArguments.definition, workspaceItemAferAdd, itemId);

        return {
            itemId
        };
    }

    private async handleAddWindow(operationArguments: AddWindowArguments): Promise<AddItemResult> {
        const constraintsValidator = new ConstraintsValidator();
        const workspace = store.getByContainerId(operationArguments.parentId) || store.getById(operationArguments.parentId);
        const workspaceItem = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspace.id)) as WorkspaceItem;
        constraintsValidator.fixNewWindow(operationArguments.definition as any, workspaceItem, operationArguments.parentId);
        const windowConfig = this._configFactory.createGDWindowConfig({
            windowId: operationArguments.definition.windowId,
            id: undefined,
            appName: operationArguments.definition.appName,
            url: operationArguments.definition.url,
            context: operationArguments.definition.context,
            allowExtract: operationArguments.definition.config?.allowExtract,
            allowReorder: operationArguments.definition.config?.allowReorder,
            showCloseButton: operationArguments.definition.config?.showCloseButton,
            minWidth: operationArguments.definition.config?.minWidth,
            maxWidth: operationArguments.definition.config?.maxWidth,
            minHeight: operationArguments.definition.config?.minHeight,
            maxHeight: operationArguments.definition.config?.maxHeight,
        });

        if (operationArguments.definition.windowId) {
            const win = this._glue.windows.list().find((w) => w.id === operationArguments.definition.windowId);
            const url = await win.getURL();

            windowConfig.componentState.url = url;
            windowConfig.componentState.appName = this._configFactory.getAppNameFromWindowId(win.id);
        }

        await manager.addWindow(windowConfig, operationArguments.parentId);
        const notLoadedSummary = manager.stateResolver.getWindowSummarySync(windowConfig.id);
        this._locker.applyWindowLockConfiguration(notLoadedSummary);

        return {
            itemId: idAsString(windowConfig.id),
        };
    }

    private handleSetItemTitle(operationArguments: SetItemTitleArguments): void {
        manager.setItemTitle(operationArguments.itemId, operationArguments.title);
    }

    private async handleAddWorkspaceChildren(operationArguments: AddWorkspaceChildrenArguments): Promise<AddWorkspaceChildrenResult> {
        const hasRows = operationArguments.children.some((c) => c.type === "row");
        const hasColumns = operationArguments.children.some((c) => c.type === "column");

        if (hasColumns && hasRows) {
            throw new Error("Can't add both row and column workspace children");
        }

        let itemConfig: ColumnItem | RowItem = {
            type: "column",
            children: operationArguments.children
        };
        if (hasColumns) {
            itemConfig = {
                type: "row",
                children: operationArguments.children
            };
        }
        const convertedConfig = this._converter.convertToRendererConfig(itemConfig);
        await manager.addContainer(convertedConfig as RowConfig | ColumnConfig, operationArguments.workspaceId);

    }

    private async handleEject(operationArguments: ItemSelector) {
        return await manager.eject(operationArguments.itemId);
    }

    private async handleCreateWorkspace(operationArguments: CreateWorkspaceArguments) {
        if (!operationArguments.config) {
            operationArguments.config = {};
        }
        const workspaceItem = this.convertCreateWorkspaceArgumentsToWorkspaceItem(operationArguments);

        this._constraintValidator.fixWorkspace(workspaceItem);

        const config = this._converter.convertToRendererConfig(workspaceItem);
        const workspaceId = await manager.createWorkspace(config as GoldenLayout.Config);
        const apiConfig = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspaceId)) as WorkspaceItem;

        this._locker.applyLockConfiguration(workspaceItem, apiConfig);

        return manager.stateResolver.getWorkspaceSnapshot(workspaceId, manager);
    }

    private async handleForceLoadWindow(operationArguments: ItemSelector): Promise<{ windowId: string }> {
        return await manager.loadWindow(operationArguments.itemId);
    }

    private handleFocusItem(operationArguments: ItemSelector): Promise<void> {
        return manager.focusItem(operationArguments.itemId);
    }

    private handleBundleWorkspace(operationArguments: BundleWorkspaceArguments): void {
        return manager.bundleWorkspace(operationArguments.workspaceId, operationArguments.type);
    }

    private handleBundleItem(operationArguments: BundleItemArguments): void {
        return manager.bundleItem(operationArguments.itemId, operationArguments.type);
    }

    private handleIsWindowInWorkspace(operationArguments: ItemSelector): { inWorkspace: boolean } {
        return {
            inWorkspace: manager.stateResolver.isWindowInWorkspace(operationArguments.itemId)
        };
    }

    private handleGetFrameSummary(operationArguments: ItemSelector): { id: string } {
        return manager.getFrameSummary(operationArguments.itemId);
    }

    private async handleMoveFrame(operationArguments: MoveFrameArguments): Promise<void> {
        await manager.move(operationArguments.location);
    }

    private handleGetFrameSnapshot(operationArguments: FrameSnapshotArguments) {
        return manager.stateResolver.getFrameSnapshot(manager, operationArguments.excludeIds);
    }

    private async handleGetSnapshot(operationArguments: ItemSelector) {
        if (this._frameId === operationArguments.itemId) {
            return manager.stateResolver.getFrameSnapshot(manager);
        } else if (store.getById(operationArguments.itemId)) {
            return manager.stateResolver.getWorkspaceSnapshot(operationArguments.itemId, manager);
        }
    }

    private async handleMoveWindowTo(operationArguments: MoveWindowToArguments) {
        return manager.moveWindowTo(operationArguments.itemId, operationArguments.containerId);
    }

    private handleGenerateLayout(operationArguments: GenerateLayoutArguments) {
        return manager.generateWorkspaceLayout(operationArguments.name, operationArguments.workspaceId);
    }

    private handlePing() {
        return { live: !this._inDisposing };
    }

    private async handleHibernateWorkspace(operationArguments: WorkspaceSelector) {
        return manager.hibernateWorkspace(operationArguments.workspaceId);
    }

    private async handleResumeWorkspace(operationArguments: WorkspaceSelector): Promise<void> {
        return manager.resumeWorkspace(operationArguments.workspaceId);
    }

    private handleLockWorkspace(operationArguments: LockWorkspaceArguments): void {
        return manager.lockWorkspace(operationArguments);
    }

    private handleLockWindow(operationArguments: LockWindowArguments): void {
        return manager.lockWindow(operationArguments);
    }

    private handleLockContainer(operationArguments: LockContainerArguments): void {
        return manager.lockContainer(operationArguments);
    }

    private handleResizeItem(operationArguments: ResizeItemArguments): void {
        return manager.resizeItem(operationArguments);
    }

    private handlePinWorkspace(operationArguments: PinWorkspaceArguments): void {
        return manager.pinWorkspace(operationArguments.workspaceId, operationArguments.icon);
    }

    private handleUnpinWorkspace(operationArguments: WorkspaceSelector): void {
        return manager.unpinWorkspace(operationArguments.workspaceId);
    }

    private handleGetWorkspaceIcon(operationArguments: WorkspaceSelector): { icon?: string } {
        const icon = manager.stateResolver.getWorkspaceIcon(operationArguments.workspaceId);
        if (icon) {
            return { icon };
        } else {
            return {};
        }
    }

    private handleSetWorkspaceIcon(operationArguments: SetWorkspaceIconArguments): void {
        manager.setWorkspaceIcon(operationArguments.workspaceId, operationArguments.icon);
    }

    private async handleInitFrame(operationArguments: InitFrameArguments): Promise<void> {
        const contentConfigs = await Promise.all(operationArguments.workspaces.map(async (def) => {
            const defAsLayout = def as OpenWorkspaceArguments;
            const defAsWorkspace = def as CreateWorkspaceArguments;

            if (defAsLayout.name) {
                return this._configFactory.convertLayoutOptionsToWorkspaceItem(defAsLayout.name, defAsLayout.restoreOptions, manager.layoutsManager);
            }

            return this._converter.convertToRendererConfig(this.convertCreateWorkspaceArgumentsToWorkspaceItem(defAsWorkspace)) as GoldenLayout.Config;
        }));
        const workspaceIds = await manager.initFrameLayout(contentConfigs);

        workspaceIds.forEach((workspaceId, i) => {
            const workspaceItem = operationArguments.workspaces[i] as WorkspaceItem;
            if (!workspaceItem.children) {
                return;
            }
            const apiConfig = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspaceId)) as WorkspaceItem;

            this._locker.applyLockConfiguration(workspaceItem, apiConfig);
        });

    }

    private async handleInitFrameFromSnapshot(operationArguments: InitFrameFromSnapshotArguments): Promise<void> {
        const contentConfigs = operationArguments.workspaces.map((def) => {
            return this._converter.convertToRendererConfig(this.convertCreateWorkspaceArgumentsToWorkspaceItem(def)) as GoldenLayout.Config;
        });

        const workspaceIds = await manager.initFrameLayout(contentConfigs, operationArguments.keepWorkspaces);

        workspaceIds.forEach((workspaceId, i) => {
            const workspaceItem = operationArguments.workspaces[i] as WorkspaceItem;
            if (!workspaceItem.children) {
                return;
            }
            const apiConfig = this._converter.convertToAPIConfig(manager.stateResolver.getWorkspaceConfig(workspaceId)) as WorkspaceItem;

            this._locker.applyLockConfiguration(workspaceItem, apiConfig);
        });
    }

    private async handleGetWorkspaceLayouts(operationArguments: GetWorkspacesLayoutsArguments): Promise<GetWorkspacesLayoutsResult> {
        return {
            workspaces: await manager.stateResolver.getAllWorkspacesLayouts(manager, operationArguments)
        }
    }

    private handleSetMaximizationBoundary(operationArguments: SetMaximizationBoundaryArguments): void {
        manager.setMaximizationBoundary(operationArguments.itemId, operationArguments.enabled);
    }

    private handleOperationCheck(operationArguments: OperationCheckArguments): OperationCheckResult {
        return { isSupported: isOperationSupported(operationArguments.operation) };
    }

    private handleCreateFrame(operationArguments: CreateFrameArguments): FrameSummary {
        manager.setFrameContext(operationArguments?.context);

        return manager.getFrameSummary(this._frameId);
    }

    private publishEventData(action: EventActionType, payload: EventPayload, type: "workspace" | "frame" | "container" | "window"): void {
        const hasEventMethod = this._glue.agm.methods().some(m => m.name === this._workspacesEventMethod);

        if (hasEventMethod) {
            const methodPayload = {
                action,
                type,
                payload
            };

            this._glue.agm.invoke(this._workspacesEventMethod, methodPayload).catch(() => {
                // console.warn(`Could not push data to ${this._workspacesEventMethod} because ${e.message}`);
            });
        }
    }

    private convertCreateWorkspaceArgumentsToWorkspaceItem(args: CreateWorkspaceArguments): WorkspaceItem {
        const workspaceItem: WorkspaceItem = { ...args };
        if (!workspaceItem.config) {
            workspaceItem.config = {};
        }
        if (typeof args.config?.isSelected === "boolean") {
            // The API friendly flag name is isSelected and to preserve backwards compatibility (the global layouts will use selected) the mapping is being made
            workspaceItem.config.selected = args.config.isSelected;
        }
        workspaceItem.config.context = args.config?.context || args.context;
        workspaceItem.config.allowDrop = undefined; // The property isn't supported in core

        return workspaceItem;
    }
}

export default new GlueFacade();
