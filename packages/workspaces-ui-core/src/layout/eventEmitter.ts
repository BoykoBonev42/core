import GoldenLayout from "@glue42/golden-layout";
import { Bounds, Workspace, Window } from "../types/internal";
import { CallbackRegistry, UnsubscribeFunction } from "callback-registry";

export class LayoutEventEmitter {
    private readonly _registry: CallbackRegistry;

    constructor(registry: CallbackRegistry) {
        this._registry = registry;
    }

    public onWorkspaceLayoutInit(callback: () => void): UnsubscribeFunction {
        return this._registry.add("workspace-layout-initialised", callback);
    }

    public onContentLayoutInit(callback: (layout: GoldenLayout) => void): UnsubscribeFunction {
        return this._registry.add("content-layout-init", callback);
    }

    public onOuterLayoutContainerResized(callback: (target: Element) => void): UnsubscribeFunction {
        return this._registry.add("outer-layout-container-resized", callback);
    }

    public onContentContainerResized(callback: (target: GoldenLayout.ContentItem, id?: string) => void, id?: string): UnsubscribeFunction {
        if (id) {
            return this._registry.add(`workspace-content-container-resized-${id}`, callback);
        }

        return this._registry.add("workspace-content-container-resized", callback);
    }

    public onWorkspaceContainerResized(callback: (workspaceId: string) => void): UnsubscribeFunction {
        return this._registry.add("workspace-container-resized", callback);
    }

    public onContentItemResized(callback: (target: Element, id: string) => void): UnsubscribeFunction {
        return this._registry.add("content-item-resized", callback);
    }

    public onContentComponentCreated(callback: (component: GoldenLayout.Component, workspaceId: string) => void): UnsubscribeFunction {
        return this._registry.add("content-component-created", callback);
    }

    public onFrameCloseRequested(callback: () => void): UnsubscribeFunction {
        return this._registry.add("close-frame", callback);
    }

    public onRestoreRequested(callback: () => void): UnsubscribeFunction {
        return this._registry.add("restore-frame", callback);
    }

    public onMaximizeRequested(callback: () => void): UnsubscribeFunction {
        return this._registry.add("maximize-frame", callback);
    }

    public onMinimizeRequested(callback: () => void): UnsubscribeFunction {
        return this._registry.add("minimize-frame", callback);
    }

    public onMoveAreaChanged(callback: (target: Element) => void): UnsubscribeFunction {
        return this._registry.add("move-area-changed", callback);
    }

    public onTabCloseRequested(callback: (item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("tab-close-requested", callback);
    }

    public onTabDragStart(callback: (tab: GoldenLayout.Tab) => void): UnsubscribeFunction {
        return this._registry.add("tab-drag-start", callback);
    }

    public onTabDrag(callback: (tab: GoldenLayout.Tab) => void): UnsubscribeFunction {
        return this._registry.add("tab-drag", callback);
    }

    public onTabDragEnd(callback: (tab: GoldenLayout.Tab) => void): UnsubscribeFunction {
        return this._registry.add("tab-drag-end", callback);
    }

    public onTabElementMouseDown(callback: (tab: GoldenLayout.Tab) => void): UnsubscribeFunction {
        return this._registry.add("tab-element-mouse-down", callback);
    }

    public onSelectionChanged(callback: (toBack: Array<{ id: string; bounds: Bounds }>, toFront: Array<{ id: string; bounds: Bounds }>) => void): UnsubscribeFunction {
        return this._registry.add("selection-changed", callback);
    }

    public onWorkspaceAdded(callback: (workspace: Workspace) => void): UnsubscribeFunction {
        return this._registry.add("workspace-added", callback);
    }

    public onWorkspaceSelectionChanged(callback: (workspace: Workspace, toBack: Window[]) => void): UnsubscribeFunction {
        return this._registry.add("workspace-selection-changed", callback);
    }

    public onWorkspaceTabCloseRequested(callback: (workspace: Workspace) => void): UnsubscribeFunction {
        return this._registry.add("workspace-tab-close-requested", callback);
    }

    public onAddButtonClicked(callback: (args: { laneId: string; workspaceId: string; bounds: Bounds; parentType: string }) => void): UnsubscribeFunction {
        return this._registry.add("add-button-clicked", callback);
    }

    public onContentLayoutStateChanged(callback: (layoutId: string) => void): UnsubscribeFunction {
        return this._registry.add("content-layout-state-changed", callback);
    }

    public onContentItemCreated(callback: (workspaceId: string, item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("content-item-created", callback);
    }

    public onWorkspaceAddButtonClicked(callback: () => void): UnsubscribeFunction {
        return this._registry.add("workspace-add-button-clicked", callback);
    }

    public onWorkspaceSaveRequested(callback: (workspaceId: string) => void): UnsubscribeFunction {
        return this._registry.add("workspace-save-requested", callback);
    }

    public onContainerMaximized(callback: (contentItem: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("container-maximized", callback);
    }

    public onContainerRestored(callback: (contentItem: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("container-restored", callback);
    }

    public onEjectRequested(callback: (item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("eject-requested", callback);
    }

    public onComponentSelectedInWorkspace(callback: (component: GoldenLayout.Component, workspaceId: string) => void): UnsubscribeFunction {
        return this._registry.add("workspace-global-selection-changed", callback);
    }

    public onItemDropped(callback: (item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("item-dropped", callback);
    }

    public onContentItemRemoved(callback: (workspaceId: string, item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("content-item-removed", callback);
    }

    public onWorkspaceLockConfigurationChanged(callback: (itemId: string) => void): UnsubscribeFunction {
        return this._registry.add("workspace-lock-configuration-changed", callback);
    }

    public onContainerLockConfigurationChanged(callback: (item: GoldenLayout.ContentItem) => void): UnsubscribeFunction {
        return this._registry.add("container-lock-configuration-changed", callback);
    }

    public onWindowLockConfigurationChanged(callback: (data: GoldenLayout.Component) => void): UnsubscribeFunction {
        return this._registry.add("window-lock-configuration-changed", callback);
    }

    public onWorkspaceTabDestroyed(callback: (workspaceId: string) => void): UnsubscribeFunction {
        return this._registry.add("workspace-tab-destroyed", callback);
    }

    public onTabSelectionChanged(callback: (item: GoldenLayout.Component) => void): UnsubscribeFunction {
        return this._registry.add("tab-selection-changed", callback);
    }

    public raiseEvent(name: "tab-selection-changed", data: { item: GoldenLayout.Component }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-tab-destroyed", data: { workspaceId: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "window-lock-configuration-changed", data: { item: GoldenLayout.Component }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "container-lock-configuration-changed", data: { item: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-lock-configuration-changed", data: { itemId: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-item-removed", data: { workspaceId: string; item: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "item-dropped", data: { item: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "container-maximized" | "container-restored", data: { container: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-save-requested" | "workspace-container-resized", data: { workspaceId: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-selection-changed", data: { workspace: Workspace; toBack: Window[] }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-item-created", data: { workspaceId: string; item: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-component-created" | "workspace-global-selection-changed", data: { component: GoldenLayout.ContentItem; workspaceId: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-layout-state-changed", data: { layoutId: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "add-button-clicked", data: { args: { laneId: string; workspaceId: string; bounds: Bounds; parentType?: string } }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-tab-close-requested" | "workspace-added", data: { workspace: Workspace }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "selection-changed", data: { toBack: Window[]; toFront: Window[] }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "tab-drag-start" | "tab-drag" | "tab-drag-end" | "tab-element-mouse-down", data: { tab: GoldenLayout.Tab }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "tab-close-requested" | "eject-requested", data: { item: GoldenLayout.ContentItem }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-item-resized", data: { target: Element; id: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-content-container-resized", data: { target: GoldenLayout.ContentItem; id?: string }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "outer-layout-container-resized" | "move-area-changed", data: { target: Element }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "content-layout-init", data: { layout: GoldenLayout }): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: "workspace-layout-initialised" | "close-frame" | "restore-frame" | "maximize-frame" | "minimize-frame" | "workspace-add-button-clicked", data: {}): Promise<void> | Array<Promise<void>>;
    public raiseEvent(name: string, data: object): Promise<void> | Array<Promise<void>> {
        const result = this._registry.execute(name, ...Object.values(data));

        if ((Array.isArray(result) && result.some((r) => r && (r as Promise<object>).then)) ||
            (result && !Array.isArray(result) && (result as Promise<object>).then)) {
            return (result as Array<Promise<unknown>>) as Array<Promise<void>>;
        }

        return (Promise.resolve(result) as Promise<unknown>) as Promise<void>;
    }

    public raiseEventWithDynamicName(name: string, ...args: object[]): void {
        this._registry.execute(name, ...args);
    }
}
