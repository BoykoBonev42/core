/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import GoldenLayout from "@glue42/golden-layout";
import registryFactory from "callback-registry";
const ResizeObserver = require("resize-observer-polyfill").default || require("resize-observer-polyfill");
import { idAsString, getAllWindowsFromConfig, createWaitFor, getElementBounds, getAllItemsFromConfig, getRealHeight } from "../utils";
import { Workspace, Window, FrameLayoutConfig, StartupConfig, WorkspaceDropOptions, Bounds } from "../types/internal";
import { LayoutEventEmitter } from "./eventEmitter";
import store from "../state/store";
import { LayoutStateResolver } from "../state/resolver";
import { EmptyVisibleWindowName, GroupHeaderMaximizeLabel, GroupHeaderRestoreLabel } from "../utils/constants";
import { TabObserver } from "./tabObserver";
import componentStateMonitor from "../componentStateMonitor";
import { WorkspacesConfigurationFactory } from "../config/factory";
import { WorkspaceWrapper } from "../state/workspaceWrapper";
import uiExecutor from "../uiExecutor";
import { LockGroupArguments } from "../interop/types";
import { WorkspacesWrapperFactory } from "../state/factory";
import { LayoutComponentsFactory } from "./componentsFactory";

export class LayoutController {
    private readonly _maximizedId = "__glMaximised";
    private readonly _workspaceLayoutElementId: string = "#outter-layout-container";
    private readonly _registry = registryFactory();
    private _frameId: string;
    private _showLoadingIndicator: boolean;
    private _tabObserver: TabObserver;

    constructor(
        public readonly emitter: LayoutEventEmitter,
        private _stateResolver: LayoutStateResolver,
        private _options: StartupConfig,
        private _configFactory: WorkspacesConfigurationFactory,
        private _wrapperFactory: WorkspacesWrapperFactory,
        private _layoutComponentsFactory: LayoutComponentsFactory
    ) { }

    public get bounds(): Bounds {
        return getElementBounds(document.getElementById("outter-layout-container"));
    }

    public async init(config: FrameLayoutConfig): Promise<void> {
        this._frameId = config.frameId;
        this._showLoadingIndicator = config.showLoadingIndicator;
        this._tabObserver = new TabObserver();
        this._tabObserver.init(this._workspaceLayoutElementId);
        await this.initWorkspaceConfig(config.workspaceLayout);
        this.refreshLayoutSize();
        await Promise.all(config.workspaceConfigs.map(async (c) => {
            await this.initWorkspaceContents(c.id, c.config, false);
            this.emitter.raiseEvent("workspace-added", { workspace: store.getById(c.id) });
        }));

        this.setupOuterLayout();

        store.workspaceIds.forEach((id) => {
            this.setupContentLayouts(id);
        });
    }

    public async reinit(config: FrameLayoutConfig): Promise<void> {
        this.reinitWorkspaceConfig(config.workspaceLayout);
        this.refreshLayoutSize();
        await Promise.all(config.workspaceConfigs.map(async (c) => {
            await this.initWorkspaceContents(c.id, c.config, false);
            this.emitter.raiseEvent("workspace-added", { workspace: store.getById(c.id) });
        }));

        this._tabObserver.refreshTabsMaxWidth(store.workspaceLayoutHeader.tabsContainer);

        store.workspaceIds.forEach((id) => {
            this.setupContentLayouts(id);
        });
    }

    public async addWindow(config: GoldenLayout.ItemConfig, parentId: string): Promise<void> {
        parentId = parentId || idAsString(store.workspaceLayout.root.contentItems[0].getActiveContentItem().config.id);
        const workspace = store.getByContainerId(parentId);

        if (this._stateResolver.isWorkspaceHibernated(workspace.id)) {
            throw new Error(`Could not add window to ${workspace.id} because its hibernated`);
        }

        if (!workspace.layout) {
            this.hideAddButton(workspace.id);
            await this.initWorkspaceContents(workspace.id, config, true);
            return;
        }

        let contentItem = workspace.layout.root.getItemsByFilter((ci) => ci.isColumn || ci.isRow)[0];
        if (parentId && parentId !== workspace.id) {
            contentItem = workspace.layout.root.getItemsById(parentId)[0];
        }

        if (!contentItem) {
            contentItem = workspace.layout.root.getItemsByFilter((ci) => ci.isStack)[0];
        }

        const { placementId, windowId, url, appName } = this.getWindowInfoFromConfig(config);

        this._layoutComponentsFactory.registerWindowComponent(workspace.layout, idAsString(placementId));

        const emptyVisibleWindow: GoldenLayout.ContentItem = this.getImmediateChildEmptyWindow(contentItem);

        const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        if (config.type === "component") {
            this.applyLockConfig(config, contentItem, workspaceWrapper, parentId === workspace.id);
        } else {
            const allItems = [...getAllItemsFromConfig(config.content), config];
            allItems.forEach((item) => {
                this.applyLockConfig(item, contentItem, workspaceWrapper, parentId === workspace.id);
            });
        }

        return new Promise<void>((res) => {
            const unsub = this.emitter.onContentComponentCreated((component) => {
                if (component.config.id === placementId) {
                    unsub();
                    res();
                }
            });

            // if the root element is a stack you must add the window to the stack
            if (workspace.layout.root.contentItems[0].type === "stack" && config.type !== "component") {
                config = getAllWindowsFromConfig([config])[0];
            }

            if (emptyVisibleWindow &&
                emptyVisibleWindow.parent &&
                !emptyVisibleWindow.parent.config.workspacesConfig?.wrapper) {
                // Triggered when the API level parent is an empty group

                const group = this._configFactory.wrapInGroup([config as GoldenLayout.ComponentConfig]);
                group.workspacesConfig.wrapper = false;
                const { wrapper, ...options } = emptyVisibleWindow.parent.config?.workspacesConfig || {};
                group.workspacesConfig = {
                    ...group.workspacesConfig,
                    ...options
                };
                // Replacing the whole stack in order to trigger the header logic and the properly update the title
                emptyVisibleWindow.parent.parent.replaceChild(emptyVisibleWindow.parent as GoldenLayout.ContentItem, group);
                workspace.windows = workspace.windows.filter((w) => w.id !== idAsString(emptyVisibleWindow.config.id));
                return;
            } else if (emptyVisibleWindow) {
                // Triggered when the API level parent is an empty group/column
                emptyVisibleWindow.parent.replaceChild(emptyVisibleWindow, config);
                workspace.windows = workspace.windows.filter((w) => w.id !== idAsString(emptyVisibleWindow.config.id));
                return;
            }
            contentItem.addChild(config);
        });
    }

    public async addContainer(config: GoldenLayout.RowConfig | GoldenLayout.ColumnConfig | GoldenLayout.StackConfig, parentId: string): Promise<string> {
        const workspace = store.getByContainerId(parentId);
        if (this._stateResolver.isWorkspaceHibernated(workspace.id)) {
            throw new Error(`Could not add container to ${workspace.id} because its hibernated`);
        }
        if (!workspace.layout) {
            const containerId = config.id || this._configFactory.getId();
            if (config) {
                config.id = containerId;
            }
            this.hideAddButton(workspace.id);
            await this.initWorkspaceContents(workspace.id, config, true);
            return idAsString(containerId);
        }

        let contentItem = workspace.layout.root.getItemsByFilter((ci) => ci.isColumn || ci.isRow)[0];
        if (parentId) {
            contentItem = workspace.layout.root.getItemsById(parentId)[0];
        }

        if (!contentItem) {
            contentItem = workspace.layout.root.getItemsByFilter((ci) => ci.isStack)[0];
        }

        if (workspace.id === parentId) {
            if (config.type === "column" || config.type === "stack") {
                this.bundleWorkspace(workspace.id, "row");
            }
            else if (config.type === "row") {
                this.bundleWorkspace(workspace.id, "column");
            }

            contentItem = workspace.layout.root.contentItems[0];
        }

        if (config.content) {
            getAllWindowsFromConfig(config.content).forEach((w: GoldenLayout.ComponentConfig) => {
                this._layoutComponentsFactory.registerWindowComponent(workspace.layout, idAsString(w.id));
            });
        }

        if (config.content) {
            const allItems = [...getAllItemsFromConfig(config.content), config];

            const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
            const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

            allItems.forEach((item: GoldenLayout.ItemConfig) => {
                this.applyLockConfig(item, contentItem, workspaceWrapper, parentId === workspace.id);
            });
        }

        if (contentItem.type === "component") {
            throw new Error("The target item for add container can't be a component");
        }

        const groupWrapperChild = contentItem.contentItems
            .find((ci) => ci.type === "stack" && ci.config.workspacesConfig.wrapper === true) as GoldenLayout.Stack;

        const hasGroupWrapperAPlaceholder = (groupWrapperChild?.contentItems[0] as GoldenLayout.Component)?.config.componentName === EmptyVisibleWindowName;

        return new Promise((res, rej) => {
            let unsub: () => void = () => {
                // safety
            };
            const timeout = setTimeout(() => {
                unsub();
                rej(`Component with id ${config.id} could not be created in 10000ms`);
            }, 10000);

            unsub = this.emitter.onContentItemCreated((wId, item) => {
                if (wId === workspace.id && item.type === config.type) {
                    res(idAsString(item.config.id));
                    unsub();
                    clearTimeout(timeout);
                }
            });

            if (groupWrapperChild?.contentItems.length === 1 && hasGroupWrapperAPlaceholder) {
                const emptyVisibleWindow = contentItem.getComponentsByName(EmptyVisibleWindowName)[0];
                workspace.windows = workspace.windows.filter((w) => w.id !== emptyVisibleWindow.config.id);
                emptyVisibleWindow.parent.replaceChild(emptyVisibleWindow, config);
            } else {
                contentItem.addChild(config);
            }
        });
    }

    public closeContainer(itemId: string): void {
        const workspace = store.getByContainerId(itemId) || store.getByWindowId(itemId);

        if (!workspace) {
            throw new Error(`Could not find container ${itemId} to close in any workspace`);
        }

        const contentItem = workspace.layout.root.getItemsById(itemId)[0];

        if (contentItem.parent.isRoot) {
            this.resetWorkspace(workspace.id);
        } else {
            contentItem.remove();
        }
    }

    public bundleWorkspace(workspaceId: string, type: "row" | "column"): void {
        const workspace = store.getById(workspaceId);

        const contentConfigs = workspace.layout.root.contentItems.map((ci) => {
            return this._wrapperFactory.getContainerWrapper({ itemId: ci.config.id })?.config;
        });

        const oldChild = workspace.layout.root.contentItems[0];
        const newChild: GoldenLayout.ItemConfig = { type, content: contentConfigs, workspacesConfig: {} };

        workspace.layout.root.replaceChild(oldChild, newChild);
    }

    public bundleItem(itemId: string, type: "row" | "column"): void {
        const oldChild = store.getContainer(itemId);

        if (!oldChild) {
            throw new Error(`Cannot find item ${itemId} to bundle it into a ${type}`);
        }

        if (oldChild.parent.type === type) {
            throw new Error(`Cannot bundle item ${itemId} to ${type} because its parent is a ${oldChild.parent.type}`);
        }

        const oldChildConfig = this._wrapperFactory.getContainerWrapper({ itemId })?.config
        const newChild: GoldenLayout.ItemConfig = { type, content: [oldChildConfig], workspacesConfig: {} };

        oldChild.parent.replaceChild(oldChild, newChild);
    }

    public hideAddButton(workspaceId: string): void {
        $(`#nestHere${workspaceId}`).children(".add-button").hide();
    }

    public showAddButton(workspaceId: string): void {
        $(`#nestHere${workspaceId}`).children(".add-button").show();
    }

    public async addWorkspace(id: string, config: GoldenLayout.Config): Promise<void> {
        const stack = store.workspaceLayout.root.getItemsByFilter((ci) => ci.isStack)[0];

        const componentConfig: GoldenLayout.ComponentConfig = {
            componentName: this._configFactory.getWorkspaceLayoutComponentName(id),
            type: "component",
            workspacesConfig: {
                ...config.workspacesOptions
            },
            id,
            noTabHeader: config?.workspacesOptions?.noTabHeader,
            title: config?.workspacesOptions?.title || this._configFactory.getWorkspaceTitle(this._stateResolver.getWorkspaceTitles())
        };

        let shouldActivateChild = true;

        if (componentConfig.noTabHeader === true) {
            shouldActivateChild = false;
        } else if (typeof config.workspacesOptions.selected === "boolean") {
            shouldActivateChild = config.workspacesOptions.selected;
        }

        this._layoutComponentsFactory.registerWorkspaceComponent(id);

        const index = config.workspacesOptions?.positionIndex;
        delete config.workspacesOptions?.positionIndex;

        if (index < 0) {
            throw new Error(`Cannot place the workspace on index ${index} because its negative`);
        }

        const lastPinnedTabIndex = ((stack as GoldenLayout.Stack).header as any)._getLastIndexOfPinnedTab();
        if (index <= lastPinnedTabIndex && !config.workspacesOptions.isPinned) {
            throw new Error(`Cannot place and unpinned workspace before the last pinned workspace at position ${lastPinnedTabIndex}`);
        }

        stack.addChild(componentConfig, index, shouldActivateChild);

        await this.initWorkspaceContents(id, config, false);

        const workspaceContentItem = store.getWorkspaceContentItem(id);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspaceId: id, workspaceContentItem });

        if (wrapper.showCloseButton === false) {
            uiExecutor.hideWorkspaceCloseButton({ workspaceTab: workspaceContentItem.tab });
        }

        if (wrapper.showSaveButton === false) {
            uiExecutor.hideWorkspaceSaveButton({ workspaceTab: workspaceContentItem.tab });
        }

        if (wrapper.isPinned) {
            uiExecutor.replaceWorkspaceSaveButtonWithIcon({ workspaceTab: workspaceContentItem.tab, icon: wrapper.icon });
            uiExecutor.waitForTransition(workspaceContentItem.tab.element[0]).then(() => {
                this._tabObserver.refreshTabsMaxWidth(workspaceContentItem.parent.header.tabsContainer);
            });
        }

        this.setupContentLayouts(id);
    }

    public reinitializeWorkspace(id: string, config: GoldenLayout.Config): Promise<unknown> {
        const workspaceContentItem = store.getWorkspaceContentItem(id);
        store.removeLayout(id);
        if (config.workspacesOptions?.reuseWorkspaceId) {
            // Making sure that the property doesn't leak in a workspace summary or a saved layout
            delete config.workspacesOptions.reuseWorkspaceId;
        }

        if ((config.workspacesOptions as any)?.title) {
            this.setWorkspaceTitle(idAsString(workspaceContentItem.config.id), (config.workspacesOptions as any).title);
        }

        return this.initWorkspaceContents(id, config, false);
    }

    public removeWorkspace(workspaceId: string): void {
        const workspaceToBeRemoved = store.getWorkspaceLayoutItemById(workspaceId);
        if (!workspaceToBeRemoved) {
            throw new Error(`Could not find workspace to remove with id ${workspaceId}`);
        }
        store.removeById(workspaceId);
        workspaceToBeRemoved.remove();
    }

    public async resetWorkspace(workspaceId: string): Promise<void> {
        const workspace = store.getById(workspaceId);
        workspace.hibernatedWindows = [];
        workspace.windows
            .filter((w) => w.appName || (w as any).windowId)
            .map(async (w) => {
                const item = store.getWindowContentItem(w.id);
                if (item) {
                    this.emitter.raiseEvent("tab-close-requested", { item });
                }
            });
        const windowContentItems = workspace.layout.root.getItemsByType("component");
        windowContentItems.forEach((wci) => {
            wci.remove();
        });
        store.removeLayout(workspace.id);
        this.showAddButton(workspace.id);
    }

    public changeTheme(themeName: string): void {
        const htmlElement = document.getElementsByTagName("html")[0];

        if (themeName === "light") {
            if (!htmlElement.classList.contains(themeName)) {
                htmlElement.classList.remove("dark");
                htmlElement.classList.add(themeName);
            }
        } else {
            if (!htmlElement.classList.contains(themeName)) {
                htmlElement.classList.remove("light");
                htmlElement.classList.add(themeName);
            }
        }
        const lightLink = $("link[href='./dist/glue42-light-theme.css']");
        const link = lightLink.length === 0 ? $("link[href='./dist/glue42-dark-theme.css']") : lightLink;
        link.attr("href", `./dist/glue42-${themeName}-theme.css`);
    }

    public getDragElement(): Element {
        const dragElement = $(".lm_dragProxy");

        return dragElement[0];
    }

    public setDragElementSize(contentWidth: number, contentHeight: number): void {
        const dragElement = this.getDragElement();

        if (!dragElement) {
            const observer = new MutationObserver((mutations) => {
                let targetElement: JQuery;
                Array.from(mutations).forEach((m) => {
                    const newItems = $(m.addedNodes);
                    if (!targetElement) {
                        targetElement = newItems.find(".lm_dragProxy");
                    }
                });

                if (targetElement) {
                    observer.disconnect();
                    this.setDragElementSize(contentWidth, contentHeight);
                }
            });

            observer.observe($("body")[0], { childList: true, subtree: true });
        } else {
            dragElement.setAttribute("width", `${contentWidth}px`);
            dragElement.setAttribute("height", `${contentHeight}px`);

            const dragProxyContent = $(dragElement).children(".lm_content").children(".lm_item_container")[0];

            dragProxyContent.setAttribute("width", `${contentWidth}px`);
            dragProxyContent.setAttribute("height", `${contentHeight}px`);
            dragProxyContent.setAttribute("style", "");
        }
    }

    public removeLayoutElement(windowId: string): Workspace {
        let resultLayout: Workspace;
        store.layouts.filter((l) => l.layout).forEach((l) => {
            const elementToRemove = l.layout.root.getItemsById(windowId)[0];

            if (elementToRemove && l.windows.find((w) => w.id === windowId)) {
                l.windows = l.windows.filter((w) => w.id !== windowId);
                elementToRemove.remove();

                resultLayout = l;
            }
        });

        return resultLayout;
    }

    public setWindowTitle(windowId: string, title: string): void {
        const item = store.getWindowContentItem(windowId);

        if (!item) {
            throw new Error(`Could not find window ${windowId} to change its title to ${title}`);
        }

        item.setTitle(title);
        item.config.componentState.title = title;
        componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({ placementId: idAsString(item.config.id), title });
    }

    public setWorkspaceTitle(workspaceId: string, title: string): void {
        const item = store.getWorkspaceLayoutItemById(workspaceId);

        item.setTitle(title);
        componentStateMonitor.decoratedFactory.updateWorkspaceTabs({ workspaceId, title });
    }

    public focusWindow(windowId: string): void {
        const layoutWithWindow = store.getByWindowId(windowId);

        if (!layoutWithWindow) {
            throw new Error(`Could not find workspace for window ${windowId}`);
        }

        if (this._stateResolver.isWorkspaceHibernated(layoutWithWindow.id)) {
            throw new Error(`Could not focus window ${windowId} because the workspace ${layoutWithWindow.id} is hibernated`);
        }

        const item = layoutWithWindow.layout.root.getItemsById(windowId)[0];
        item.parent.setActiveContentItem(item);
    }

    public focusWorkspace(workspaceId: string): void {
        const item = store.getWorkspaceLayoutItemById(workspaceId);
        item.parent.setActiveContentItem(item);
    }

    public maximizeWindow(windowId: string): void {
        const layoutWithWindow = store.getByWindowId(windowId);

        if (!layoutWithWindow) {
            throw new Error(`Could not find workspace for window ${windowId}`);
        }

        if (this._stateResolver.isWorkspaceHibernated(layoutWithWindow.id)) {
            throw new Error(`Could not maximize window ${windowId} because the workspace ${layoutWithWindow.id} is hibernated`);
        }

        const item = layoutWithWindow.layout.root.getItemsById(windowId)[0];

        if (item.parent.hasId(this._maximizedId)) {
            return;
        }

        (item.parent.layoutManager as any)._$maximiseItem(item.parent);
        item.parent.isMaximized = item.parent.hasId("__glMaximised");
    }

    public restoreWindow(windowId: string): void {
        const layoutWithWindow = store.getByWindowId(windowId);

        if (!layoutWithWindow) {
            throw new Error(`Could not find workspace for window ${windowId}`);
        }

        if (this._stateResolver.isWorkspaceHibernated(layoutWithWindow.id)) {
            throw new Error(`Could not restore window ${windowId} because the workspace ${layoutWithWindow.id} is hibernated`);
        }

        const item = layoutWithWindow.layout.root.getItemsById(windowId)[0];
        if (item.parent.hasId(this._maximizedId)) {
            (item.parent.layoutManager as any)._$minimiseItem(item.parent);
            item.parent.isMaximized = item.parent.hasId("__glMaximised");
        }
    }

    public maximizeContainer(itemId: string): void {
        const contentItem = store.getContainer(itemId);

        if (!contentItem) {
            throw new Error(`Could not find item ${itemId} in frame ${this._frameId}`);
        }

        if (!contentItem.hasId("__glMaximised")) {
            (contentItem.layoutManager as any)._$maximiseItem(contentItem);
            contentItem.isMaximized = contentItem.hasId("__glMaximised");
        }
    }

    public restoreContainer(itemId: string): void {
        const contentItem = store.getContainer(itemId);

        if (!contentItem) {
            throw new Error(`Could not find item ${itemId} in frame ${this._frameId}`);
        }

        if (contentItem.hasId("__glMaximised")) {
            (contentItem.layoutManager as any)._$minimiseItem(contentItem);
            contentItem.isMaximized = contentItem.hasId("__glMaximised");
        }
    }

    public async showLoadedWindow(placementId: string, windowId: string): Promise<void> {
        await this.waitForWindowContainer(placementId);

        const winContainer: GoldenLayout.Component = store.getWindowContentItem(placementId);
        const workspace = store.getByWindowId(placementId);
        const winContainerConfig = winContainer.config;

        winContainerConfig.componentState.windowId = windowId;

        workspace.windows.find((w) => w.id === placementId).windowId = windowId;
        winContainer.parent.replaceChild(winContainer, winContainerConfig);
    }

    public isWindowVisible(placementId: string | string[]): boolean {
        placementId = idAsString(placementId);
        const contentItem = store.getWindowContentItem(placementId);
        const parentStack = contentItem.parent;

        if (parentStack.contentItems.length === 1) {
            return true;
        }
        return parentStack.getActiveContentItem().config.id === placementId;
    }

    public showHibernationIcon(workspaceId: string): void {
        const tab = store.getWorkspaceContentItem(workspaceId)?.tab;

        if (!tab) {
            return;
        }

        const saveButton = tab.element.children(".lm_saveButton");

        saveButton.addClass("lm_hibernationIcon");
        saveButton.attr("title", "hibernated");
    }

    public showSaveIcon(workspaceId: string): void {
        const tab = store.getWorkspaceContentItem(workspaceId)?.tab;

        if (!tab) {
            console.error("Could not find the tab for", workspaceId);
            return;
        }

        const saveButton = tab.element.children(".lm_saveButton");
        saveButton.removeClass("lm_hibernationIcon");

        saveButton.attr("title", "save");
    }

    public hideLoadingIndicator(itemId: string): void {
        const windowContentItem = store.getWindowContentItem(itemId);

        if (windowContentItem?.tab) {
            const hibernationIcon = windowContentItem.tab.element[0].getElementsByClassName("lm_hibernationIcon")[0];
            hibernationIcon?.remove();
        }
    }

    public refreshWorkspaceSize(workspaceId: string): void {
        const workspaceContainer = document.getElementById(`nestHere${workspaceId}`);
        const workspace = store.getById(workspaceId);

        if (workspaceContainer && workspace?.layout) {
            const bounds = getElementBounds(workspaceContainer);

            workspace.layout.updateSize(bounds.width, bounds.height);
        }
    }



    public resizeRow(rowItem: GoldenLayout.Row, height?: number): void {
        const component = rowItem.getItemsByType("component")[0] as GoldenLayout.Component;
        let heightToResize = this.validateRowHeight(rowItem, height);

        if (!heightToResize) {
            return;
        }

        if (typeof height === "number") {
            const stackHeaderSize = getRealHeight(component.parent.header.element);

            heightToResize -= stackHeaderSize;
        }

        this.resizeComponentCore(component, undefined, heightToResize);
    }

    public resizeColumn(columnItem: GoldenLayout.Column, width?: number): void {
        const component = columnItem.getItemsByType("component")[0] as GoldenLayout.Component;
        const widthToResize = this.validateColumnWidth(columnItem, width);

        if (!widthToResize) {
            return;
        }

        this.resizeComponentCore(component, widthToResize);
    }

    public resizeStack(stackItem: GoldenLayout.Stack, width?: number, height?: number): void {
        const widthToResize = this.validateStackWidth(stackItem, width);
        let heightToResize = this.validateStackHeight(stackItem, height);
        const component = stackItem.getItemsByType("component")[0] as GoldenLayout.Component;

        if (typeof heightToResize === "number") {
            const stackHeaderSize = getRealHeight(component.parent.header.element);

            heightToResize -= stackHeaderSize;
        }

        this.resizeComponentCore(component, widthToResize, heightToResize);
    }

    public resizeComponent(componentItem: GoldenLayout.Component, width?: number, height?: number): void {

        this.resizeComponentCore(componentItem, width, height);
    }

    public togglePinWorkspace(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        if (workspaceWrapper.isPinned) {
            this.unpinWorkspace(workspaceId);
        } else {
            this.pinWorkspace(workspaceId, undefined);
        }
    }

    public pinWorkspace(workspaceId: string, icon: string): void {
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspaceId, workspaceContentItem });

        const iconToUse = icon || wrapper.icon;

        if (!iconToUse) {
            throw new Error(`Workspace ${workspaceId} cannot be pinned because ${iconToUse} is an invalid icon`);
        }

        workspaceContentItem.tab.pin();

        if (icon) {
            wrapper.icon = icon;
        }

        uiExecutor.replaceWorkspaceSaveButtonWithIcon({ workspaceTab: workspaceContentItem.tab, icon: iconToUse });
        uiExecutor.waitForTransition(workspaceContentItem.tab.element[0]).then(() => {
            this._tabObserver.refreshTabsMaxWidth(workspaceContentItem.parent.header.tabsContainer);
        });

        componentStateMonitor.decoratedFactory.updateWorkspaceTabs({ workspaceId, icon, isPinned: true });
    }

    public unpinWorkspace(workspaceId: string): void {
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspaceId, workspaceContentItem });
        workspaceContentItem.tab.unpin();

        if (wrapper.showSaveButton) {
            uiExecutor.showWorkspaceSaveButton({ workspaceTab: workspaceContentItem.tab });
        }
        if (!wrapper.showCloseButton) {
            uiExecutor.hideWorkspaceCloseButton({ workspaceTab: workspaceContentItem.tab });
        }
        uiExecutor.hideWorkspaceIconButton({ workspaceTab: workspaceContentItem.tab });
        uiExecutor.waitForTransition(workspaceContentItem.tab.element[0]).then(() => {
            this._tabObserver.refreshTabsMaxWidth(workspaceContentItem.parent.header.tabsContainer);
        });

        componentStateMonitor.decoratedFactory.updateWorkspaceTabs({ workspaceId, isPinned: false });
    }

    public hideWorkspaceRootItem(workspaceId: string) {
        uiExecutor.hideWorkspaceRootItem(workspaceId);
    }

    public showWorkspaceRootItem(workspaceId: string) {
        uiExecutor.showWorkspaceRootItem(workspaceId, this._tabObserver);
    }

    public refreshTabSizes(workspaceId: string): void {
        const stacks = store.getById(workspaceId)?.layout?.root.getItemsByType("stack") ?? [];
        stacks.forEach((s: GoldenLayout.Stack) => (s.header as any)?._updateTabSizesWithoutDropdown());
    }

    private resizeComponentCore(componentItem: GoldenLayout.Component, width?: number, height?: number): void {
        const widthToResize = this.validateComponentWidth(componentItem, width);
        const heightToResize = this.validateComponentHeight(componentItem, height);

        if (typeof widthToResize === "number") {
            // Resizing twice to increase accuracy
            const result = (componentItem as any).container.setSize(widthToResize, undefined);
            (componentItem as any).container.setSize(widthToResize, undefined);

            if (!result) {
                throw new Error(`Failed to resize window ${componentItem.config.id} to ${widthToResize} width.
                 This is most likely caused by a missing row parent element - to change the width please make sure that there is a row element`);
            }
        }

        if (typeof heightToResize === "number") {
            // Resizing twice to increase accuracy
            const result = (componentItem as any).container.setSize(undefined, heightToResize);
            (componentItem as any).container.setSize(undefined, heightToResize);

            if (!result) {
                throw new Error(`Failed to resize component ${componentItem.config.id} to ${heightToResize} height.
                     This is most likely caused by a missing column parent element - to change the height please make sure that there is a column element`);
            }
        }
    }

    private validateRowHeight(item: GoldenLayout.ContentItem, height: number): number | undefined {
        if (!height) {
            return;
        }
        const parent = item.parent;
        const parentMaxHeight = parent.getMaxHeight();
        const itemMaxHeight = item.getMaxHeight();
        const itemMinHeight = item.getMinHeight();
        const parentHeight = getElementBounds(parent.element).height;

        const neighboursMinHeights = parent.contentItems.filter((ci) => ci !== item).reduce((acc, ci) => {
            acc += ci.getMinHeight();
            return acc;
        }, 0);

        const maxHeightConstraintFromNeighbours = parentHeight - neighboursMinHeights;
        if (maxHeightConstraintFromNeighbours <= 0) {
            return;
        }

        const neighoursMaxHeights = parent.contentItems.filter((ci) => ci !== item).reduce((acc, ci) => {
            acc += ci.getMaxHeight();
            return acc;
        }, 0);

        const minHeightConstraintFromNeighbours = Math.max(parentHeight - neighoursMaxHeights, 0);

        const smallestMaxConstraint = Math.min(parentMaxHeight, itemMaxHeight, maxHeightConstraintFromNeighbours);
        const biggestMinConstraint = Math.max(minHeightConstraintFromNeighbours, itemMinHeight);

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, height), smallestMaxConstraint);
    }

    private validateColumnWidth(item: GoldenLayout.ContentItem, width: number): number | undefined {
        if (!width) {
            return;
        }
        const parent = item.parent;
        const parentMaxWidth = parent.getMaxWidth();
        const itemMaxWidth = item.getMaxWidth();
        const itemMinWidth = item.getMinWidth();
        const parentWidth = getElementBounds(parent.element).width;

        const neighboursMinWidths = parent.contentItems.filter((ci) => ci !== item).reduce((acc, ci) => {
            acc += ci.getMinWidth();
            return acc;
        }, 0);

        const maxWidthConstraintFromNeighbours = parentWidth - neighboursMinWidths;
        if (maxWidthConstraintFromNeighbours <= 0) {
            return;
        }

        const neighoursMaxWidths = parent.contentItems.filter((ci) => ci !== item).reduce((acc, ci) => {
            acc += ci.getMaxWidth();
            return acc;
        }, 0);

        const minWidthConstraintFromNeighbours = Math.max(parentWidth - neighoursMaxWidths, 0);

        const smallestMaxConstraint = Math.min(parentMaxWidth, itemMaxWidth, maxWidthConstraintFromNeighbours);
        const biggestMinConstraint = Math.max(minWidthConstraintFromNeighbours, itemMinWidth);

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, width), smallestMaxConstraint);
    }

    private validateStackHeight(item: GoldenLayout.ContentItem, height: number): number | undefined {
        if (!height) {
            return;
        }
        const itemMaxHeight = item.getMaxHeight();
        const itemMinHeight = item.getMinHeight();

        const smallestMaxConstraint = itemMaxHeight;
        const biggestMinConstraint = itemMinHeight;

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, height), smallestMaxConstraint);
    }

    private validateStackWidth(item: GoldenLayout.ContentItem, width: number): number | undefined {
        if (!width) {
            return;
        }
        const itemMaxWidth = item.getMaxWidth();
        const itemMinWidth = item.getMinWidth();

        const smallestMaxConstraint = itemMaxWidth;
        const biggestMinConstraint = itemMinWidth;

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, width), smallestMaxConstraint);
    }

    private validateComponentHeight(item: GoldenLayout.ContentItem, height: number): number | undefined {
        if (!height) {
            return;
        }
        const itemMaxHeight = item.getMaxHeight();
        const itemMinHeight = item.getMinHeight();

        const smallestMaxConstraint = itemMaxHeight;
        const biggestMinConstraint = itemMinHeight;

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, height), smallestMaxConstraint);
    }

    private validateComponentWidth(item: GoldenLayout.ContentItem, width: number): number | undefined {
        if (!width) {
            return;
        }
        const itemMaxWidth = item.getMaxWidth();
        const itemMinWidth = item.getMinWidth();

        const smallestMaxConstraint = itemMaxWidth;
        const biggestMinConstraint = itemMinWidth;

        if (smallestMaxConstraint < biggestMinConstraint) {
            return;
        }

        return Math.min(Math.max(biggestMinConstraint, width), smallestMaxConstraint);
    }

    private initWorkspaceContents(id: string, config: GoldenLayout.Config | GoldenLayout.ItemConfig, useWorkspaceSpecificConfig: boolean): Promise<unknown> {
        if (!config || (config.type !== "component" && !config.content.length)) {
            store.addOrUpdate(id, []);
            this.showAddButton(id);
            return Promise.resolve();
        }
        const waitFor = createWaitFor(2);

        if (!(config as GoldenLayout.Config).settings) {
            (config as GoldenLayout.Config).settings = this._configFactory.getDefaultWorkspaceSettings();
        }

        if (config.type && config.type !== "workspace") {
            // Wrap the component in a column when you don't have a workspace;
            config = {
                settings: this._configFactory.getDefaultWorkspaceSettings(),
                content: [
                    config
                ]
            };
        }
        const workspaceContentItem = store.getWorkspaceContentItem(id);

        const optionsFromItem = workspaceContentItem.config.workspacesConfig;
        const optionsFromConfig = (config as GoldenLayout.Config).workspacesOptions;

        const mergedOptions = useWorkspaceSpecificConfig ? Object.assign({}, optionsFromItem, optionsFromConfig) : optionsFromConfig;

        if (typeof mergedOptions.selected === "boolean") {
            delete mergedOptions.selected;
        }

        workspaceContentItem.config.workspacesConfig = mergedOptions;
        (config as GoldenLayout.Config).workspacesOptions = mergedOptions;
        (config as GoldenLayout.Config).workspacesOptions.workspaceId = id;

        const layout = new GoldenLayout(config as GoldenLayout.Config, $(`#nestHere${id}`), componentStateMonitor.decoratedFactory);
        store.addOrUpdate(id, []);

        this._layoutComponentsFactory.registerEmptyWindowComponent(layout, id);

        getAllWindowsFromConfig((config as GoldenLayout.Config).content).forEach((element: GoldenLayout.ComponentConfig) => {
            this._layoutComponentsFactory.registerWindowComponent(layout, idAsString(element.id));
        });

        const layoutContainer = $(`#nestHere${id}`);

        const resizeObserver = new ResizeObserver(() => {
            this.emitter.raiseEvent("workspace-container-resized", { workspaceId: id });
        });

        resizeObserver.observe(layoutContainer[0]);

        layout.on("initialised", () => {
            const allWindows = getAllWindowsFromConfig(layout.toConfig().content);

            store.addOrUpdate(id, allWindows.map((w) => {
                const winContentItem: GoldenLayout.ContentItem = layout.root.getItemsById(idAsString(w.id))[0];
                const winElement = winContentItem.element;

                return {
                    id: idAsString(w.id),
                    bounds: getElementBounds(winElement),
                    windowId: w.componentState.windowId,
                };
            }), layout);

            this.emitter.raiseEventWithDynamicName(`content-layout-initialised-${id}`);
            this.emitter.raiseEvent("content-layout-init", { layout });

            const containerWidth = layoutContainer.width();
            const containerHeight = layoutContainer.height();
            layout.updateSize(containerWidth, containerHeight);

            waitFor.signal();
        });

        layout.on("stateChanged", () => {
            this.emitter.raiseEvent("content-layout-state-changed", { layoutId: id });
        });

        layout.on("itemCreated", (item: GoldenLayout.ContentItem) => {
            if (!item.isComponent) {
                if (item.isRoot) {
                    if (!item.id || !item.id.length) {
                        item.addId(id);
                    }
                    return;
                }
                if (!item.config.id || !item.config.id.length) {
                    item.addId(this._configFactory.getId());
                }
                if (item.type === "row" || item.type === "column" || item.type === "stack") {
                    item.on("maximized", () => {
                        this.emitter.raiseEvent("container-maximized", { container: item });
                    });

                    item.on("minimized", () => {
                        this.emitter.raiseEvent("container-restored", { container: item });
                    });
                }
            } else {
                item.on("size-changed", () => {
                    const windowWithChangedSize = store.getById(id).windows.find((w) => w.id === item.config.id);

                    if (windowWithChangedSize) {
                        windowWithChangedSize.bounds = getElementBounds(item.element);
                    }
                    const itemId = item.config.id;
                    this.emitter.raiseEvent("content-item-resized", { target: (item.element as any)[0], id: idAsString(itemId) });
                });

                if (item.config.componentName === EmptyVisibleWindowName || item.parent?.config.workspacesConfig.wrapper) {
                    item.tab?.header.position(false);
                }
            }

            this.emitter.raiseEvent("content-item-created", { workspaceId: id, item });
        });

        layout.on("itemDestroyed", (item: GoldenLayout.ContentItem) => {
            this.emitter.raiseEvent("content-item-removed", { workspaceId: id, item });

            if (item.type === "component") {
                this._layoutComponentsFactory.unregisterWindowComponent(layout, item.config.componentName);
            }
        });

        layout.on("stackCreated", (stack: GoldenLayout.Stack) => {
            const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem: stack });
            const addWindowButton = document.createElement("li");
            addWindowButton.classList.add("lm_add_button");

            addWindowButton.onclick = (e): void => {
                e.stopPropagation();
                this.emitter.raiseEvent("add-button-clicked", {
                    args: {
                        laneId: idAsString(stack.config.id),
                        workspaceId: id,
                        bounds: getElementBounds(addWindowButton),
                    }
                });
            };

            const maximizeButton = $(stack.element)
                .children(".lm_header")
                .children(".lm_controls")
                .children(".lm_maximise");

            maximizeButton.addClass("workspace_content");

            if (wrapper.showMaximizeButton === false) {
                this.hideMaximizeButton(stack, wrapper.id);
            }

            if (layout.config.workspacesOptions.showEjectButtons === false && wrapper.showEjectButton !== true) {
                this.hideEjectButton(stack, wrapper.id);
            }

            if (wrapper.showEjectButton === false) {
                this.hideEjectButton(stack, wrapper.id);
            }

            stack.on("maximized", () => {
                maximizeButton.addClass("lm_restore");
                maximizeButton.attr("title", GroupHeaderRestoreLabel);
            });

            stack.on("minimized", () => {
                maximizeButton.removeClass("lm_restore");
                maximizeButton.attr("title", GroupHeaderMaximizeLabel);
            });

            if (!this._options.disableCustomButtons && !componentStateMonitor.decoratedFactory?.createGroupHeaderButtons) {
                stack.header.controlsContainer.prepend($(addWindowButton));
            }

            if (layout.config.workspacesOptions.showAddWindowButtons === false && wrapper.showAddWindowButton !== true) {
                this.hideAddWindowButton(stack, wrapper.id);
            }

            if (wrapper.showAddWindowButton === false) {
                this.hideAddWindowButton(stack, wrapper.id);
            }

            stack.on("activeContentItemChanged", () => {
                const activeItem = stack.getActiveContentItem();
                if (!activeItem.isComponent) {
                    return;
                }
                const clickedTabId = activeItem.config.id;
                const toFront: Window[] = [{
                    id: idAsString(activeItem.config.id),
                    bounds: getElementBounds(activeItem.element),
                    windowId: activeItem.config.componentState.windowId,
                    appName: activeItem.config.componentState.appName,
                    url: activeItem.config.componentState.url,
                }];

                const allTabsInTabGroup = stack.header.tabs.reduce((acc: Window[], t: GoldenLayout.Tab) => {
                    const contentItemConfig = t.contentItem.config;

                    if (contentItemConfig.type === "component") {
                        const win: Window = {
                            id: idAsString(contentItemConfig.id),
                            bounds: getElementBounds(t.contentItem.element),
                            windowId: contentItemConfig.componentState.windowId,
                            appName: contentItemConfig.componentState.appName,
                            url: contentItemConfig.componentState.url,
                        };

                        acc.push(win);
                    }

                    return acc;
                }, []);

                const toBack = allTabsInTabGroup
                    .filter((t: Window) => t.id !== clickedTabId);

                this.emitter.raiseEvent("tab-selection-changed", { item: activeItem });
                this.emitter.raiseEvent("selection-changed", { toBack, toFront });
            });

            stack.on("popoutRequested", () => {
                const activeItem = stack.getActiveContentItem();
                this.emitter.raiseEvent("eject-requested", { item: activeItem });
            });
        });

        layout.on("tabCreated", (tab: GoldenLayout.Tab) => {
            tab._dragListener.on("drag", () => {
                this.emitter.raiseEvent("tab-drag", { tab });
            });

            tab._dragListener.on("dragStart", () => {
                this.emitter.raiseEvent("tab-drag-start", { tab });
            });

            tab._dragListener.on("dragStop", () => {
                this.emitter.raiseEvent("tab-drag-end", { tab });
            });

            tab.element.on("mousedown", () => {
                this.emitter.raiseEvent("tab-element-mouse-down", { tab });
            });

            this.refreshTabSizeClass(tab);

            if (this._showLoadingIndicator && tab?.contentItem.type === "component" && !this._stateResolver.isWindowLoaded(tab.contentItem.config.id)) {
                const hibernationIcon = document.createElement("div");
                hibernationIcon.classList.add("lm_saveButton", "lm_hibernationIcon");
                tab.element[0].prepend(hibernationIcon);
            }

            if (!tab.contentItem.isComponent) {
                return;
            }
            const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem: tab.contentItem });

            if ((layout.config.workspacesOptions as any).showWindowCloseButtons === false && wrapper.showCloseButton !== true) {
                uiExecutor.hideWindowCloseButton(tab.contentItem);
            }

            if (wrapper.showCloseButton === false) {
                uiExecutor.hideWindowCloseButton(tab.contentItem);
            }
        });

        layout.on("tabCloseRequested", (tab: GoldenLayout.Tab) => {
            this.emitter.raiseEvent("tab-close-requested", { item: tab.contentItem });
        });

        layout.on("componentCreated", (component: GoldenLayout.ContentItem) => {
            const result = this.emitter.raiseEvent("content-component-created", { component, workspaceId: id });
            if (Array.isArray(result)) {
                Promise.all(result).then(() => {
                    waitFor.signal();
                }).catch((e) => waitFor.reject(e));
            } else {
                result.then(() => {
                    waitFor.signal();
                }).catch((e) => waitFor.reject(e));
            }
        });

        layout.on("activeContentItemChanged", (component: GoldenLayout.Component) => {
            this.emitter.raiseEvent("workspace-global-selection-changed", { component, workspaceId: id });
        });

        layout.on("itemDropped", (item: GoldenLayout.ContentItem) => {
            this.emitter.raiseEvent("item-dropped", { item });
        });

        layout._ignorePinned = true;
        layout.init();
        return waitFor.promise.then(() => {
            layout._ignorePinned = false;
        });
    }

    private initWorkspaceConfig(workspaceConfig: GoldenLayout.Config): Promise<void> {
        return new Promise<void>((res) => {
            workspaceConfig.settings.selectionEnabled = true;
            store.workspaceLayout = new GoldenLayout(workspaceConfig, $(this._workspaceLayoutElementId), componentStateMonitor.decoratedFactory);

            const outerResizeObserver = new ResizeObserver((entries: Array<{ target: Element }>) => {
                Array.from(entries).forEach((e) => {
                    this.emitter.raiseEvent("outer-layout-container-resized", { target: e.target });
                });
            });

            outerResizeObserver.observe($("#outter-layout-container")[0]);

            this.registerWorkspaceComponents(workspaceConfig);

            store.workspaceLayout.on("initialised", () => {
                this.emitter.raiseEvent("workspace-layout-initialised", {});

                const stack = store.workspaceLayout.root.getItemsByType("stack")[0] as GoldenLayout.Stack;
                const tabs = stack.header.tabs as GoldenLayout.Tab[];
                tabs.forEach((tab) => {
                    const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace: undefined, workspaceContentItem: tab.contentItem as GoldenLayout.Component });
                    if (wrapper.isPinned) {
                        uiExecutor.replaceWorkspaceSaveButtonWithIcon({ workspaceTab: tab, icon: wrapper.icon });
                        uiExecutor.waitForTransition(tab.element[0]).then(() => {
                            this._tabObserver.refreshTabsMaxWidth((tab.contentItem.parent as GoldenLayout.Stack).header.tabsContainer);
                        });
                    }

                    if (tab.contentItem?.config?.workspacesConfig?.selected) {
                        delete tab.contentItem.config.workspacesConfig.selected;
                    }
                });

                res();
            });

            store.workspaceLayout.on("stackCreated", (stack: GoldenLayout.Stack) => {
                const closeButton = stack.header.controlsContainer.children(".lm_close")[0];
                if (closeButton) {
                    closeButton.onclick = (): void => {
                        this.emitter.raiseEvent("close-frame", {});
                    };
                }


                const headerElement: HTMLElement = stack.header.element[0];
                const hasCustomAddWorkspaceButton = componentStateMonitor.decoratedFactory?.createAddWorkspace;

                const mutationObserver = new MutationObserver(() => {
                    const addButton = this.getElementByClass(headerElement, "lm_add_button");

                    if (addButton && componentStateMonitor.decoratedFactory.createAddWorkspace) {
                        addButton.onclick = (e: MouseEvent): void => {
                            e.stopPropagation();
                            this.emitter.raiseEvent("workspace-add-button-clicked", { bounds: getElementBounds(addButton) });
                        };
                    }
                });

                const observerConfig = { attributes: false, childList: true, subtree: true };

                mutationObserver.observe(stack.header.element[0], observerConfig);
                if (!hasCustomAddWorkspaceButton) {
                    const button = document.createElement("li");
                    button.classList.add("lm_add_button");

                    button.onclick = (e): void => {
                        e.stopPropagation();
                        this.emitter.raiseEvent("workspace-add-button-clicked", {});
                    };

                    stack.header.workspaceControlsContainer.prepend($(button));
                }

                if (!componentStateMonitor.decoratedFactory.createLogo) {
                    const glueLogo = document.createElement("span");

                    glueLogo.classList.add("logo_type");

                    const container = headerElement.getElementsByClassName("lm_logo")[0];

                    if (container) {
                        container.appendChild(glueLogo);
                    }
                }

                stack.on("activeContentItemChanged", async () => {
                    if (store.workspaceIds.length === 0) {
                        return;
                    }

                    const activeItem = stack.getActiveContentItem();
                    const activeWorkspaceId = activeItem.config.id;
                    await this.waitForLayout(idAsString(activeWorkspaceId));

                    // don't ignore the windows from the currently selected workspace because the event
                    // which adds the workspacesFrame hasn't still added the new workspace and the active item status the last tab
                    const allOtherWindows = store.workspaceIds.reduce((acc, id) => {
                        return [...acc, ...store.getById(id).windows];
                    }, []);

                    const toBack: Window[] = allOtherWindows;

                    this.emitter.raiseEvent("workspace-selection-changed", { workspace: store.getById(activeWorkspaceId), toBack });
                });
            });

            store.workspaceLayout.on("itemCreated", (item: GoldenLayout.ContentItem) => {
                if (item.isComponent) {
                    item.on("size-changed", () => {
                        this.emitter.raiseEvent("workspace-content-container-resized", { target: item, id: idAsString(item.config.id) });
                        this.emitter.raiseEventWithDynamicName(`workspace-content-container-resized-${item.config.id}`, item);
                    });
                }
            });

            store.workspaceLayout.on("tabCreated", (tab: GoldenLayout.Tab) => {
                const saveButton = document.createElement("div");
                const iconButton = document.createElement("div");
                const iconButtonContent = document.createElement("span");
                iconButton.classList.add("lm_iconButton");
                iconButtonContent.classList.add("lm_iconButtonContent");
                iconButton.appendChild(iconButtonContent);
                saveButton.classList.add("lm_saveButton");
                saveButton.onclick = (e): void => {
                    // e.stopPropagation();
                    this.emitter.raiseEvent("workspace-save-requested", { workspaceId: idAsString(tab.contentItem.config.id) });
                };
                if (!this._options.disableCustomButtons) {
                    if (!componentStateMonitor.decoratedFactory.createWorkspaceTabs) {
                        tab.element[0].prepend(iconButton);
                        tab.element[0].prepend(saveButton);
                    }
                    tab.element[0].onclick = (e): void => {
                        if (e.composedPath().indexOf(saveButton) !== -1) {
                            (document.activeElement as any).blur();
                        }
                        e.stopPropagation();
                    };
                }

                this.refreshTabSizeClass(tab);

                const workspace = store.getById(tab.contentItem.config.id);
                const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem: tab.contentItem as GoldenLayout.Component });

                if (wrapper.showSaveButton === false) {
                    uiExecutor.hideWorkspaceSaveButton({ workspaceTab: tab });
                }

                if (wrapper.showCloseButton === false) {
                    uiExecutor.hideWorkspaceCloseButton({ workspaceTab: tab });
                }

                tab._dragListener.on("reorderStop", () => {
                    store.syncWorkspaceOrder();
                });
            });

            store.workspaceLayout.on("tabCloseRequested", (tab: GoldenLayout.Tab) => {
                this.emitter.raiseEvent("workspace-tab-close-requested",
                    { workspace: store.getById(tab.contentItem.config.id) });
            });

            store.workspaceLayout.on("itemDestroyed", (item: GoldenLayout.ContentItem) => {
                if (item.type === "component") {
                    this._layoutComponentsFactory.unregisterWorkspaceComponent(item.config.componentName);
                }
            });

            store.workspaceLayout.on("itemDestroyed", (item: GoldenLayout.Component) => {
                this.emitter.raiseEvent("workspace-tab-destroyed", { workspaceId: idAsString(item.config.id) });
            });

            store.workspaceLayout.init();
        });
    }

    private reinitWorkspaceConfig(config: GoldenLayout.Config): void {
        const stackConfig = config.content[0];

        if (stackConfig.type !== "stack") {
            throw new Error(`Cannot reinitialize the frame with config ${JSON.stringify(config)}`);
        }

        this.registerWorkspaceComponents(config);

        const outerWorkspaceStack = store.workspaceLayout.root.getItemsByType("stack")[0];

        outerWorkspaceStack.parent.replaceChild(outerWorkspaceStack, stackConfig);

        (outerWorkspaceStack as any)._$destroy();
    }

    private setupOuterLayout(): void {
        this.emitter.onOuterLayoutContainerResized((target) => {
            store.workspaceLayout.updateSize($(target).width(), $(target).height());
        });
    }

    private setupContentLayouts(id: string): void {
        const unsub = this.emitter.onContentContainerResized((item) => {
            const currLayout = store.getById(id)?.layout;
            if (currLayout) {
                // The size must be passed in order to handle resizes like maximize of the browser
                const containerElement = $(`#nestHere${id}`);
                const bounds = getElementBounds(containerElement[0]);
                currLayout.updateSize(bounds.width, bounds.height);
            }
        }, id);

        const workspaceDestroyedUnsub = this.emitter.onWorkspaceTabDestroyed((workspaceId) => {
            if (workspaceId === id) {
                unsub();
                workspaceDestroyedUnsub();
            }
        });
    }

    private waitForLayout(id: string): Promise<void> {
        return new Promise<void>((res) => {
            const unsub = this._registry.add(`content-layout-initialised-${id}`, () => {
                res();
                unsub();
            });

            if (store.getById(id)) {
                res();
                unsub();
            }
        });
    }

    private waitForWindowContainer(placementId: string): Promise<void> {
        return new Promise<void>((res) => {
            const unsub = this.emitter.onContentComponentCreated((component) => {
                if (component.config.id === placementId) {
                    res();
                    unsub();
                }
            });

            if (store.getWindowContentItem(placementId)) {
                res();
                unsub();
            }
        });
    }

    private getWindowInfoFromConfig(config: GoldenLayout.ItemConfig): { windowId: string; url: string; appName: string; placementId: string } {
        if (config.type !== "component") {
            return this.getWindowInfoFromConfig(config.content[0]);
        }
        return {
            placementId: idAsString(config.id),
            windowId: config.componentState.windowId,
            appName: config.componentState.appName,
            url: config.componentState.url
        };
    }
    private refreshLayoutSize(): void {
        const bounds = getElementBounds($(this._workspaceLayoutElementId));
        store.workspaceLayout.updateSize(bounds.width, bounds.height);
    }

    private refreshTabSizeClass(tab: GoldenLayout.Tab): void {
        const tabs = tab.header.tabs;
        const haveClassSmall = tabs.map((t) => t.element).some((e) => e.hasClass("lm_tab_small"));
        const haveClassMini = tabs.map((t) => t.element).some((e) => e.hasClass("lm_tab_mini"));

        if (haveClassSmall) {
            tab.element.addClass("lm_tab_small");
        }

        if (haveClassMini) {
            tab.element.addClass("lm_tab_mini");
        }
    }

    private getElementByClass(root: HTMLElement, className: string): HTMLElement {
        const elements = root.getElementsByClassName(className);

        if (elements.length > 1) {
            throw new Error(`Multiple elements with class ${className} in element with id ${root.id} and class ${root.className} are not supported`);
        }

        return elements[0] as HTMLElement;
    }

    private applyLockConfig(itemConfig: GoldenLayout.ItemConfig, parent: GoldenLayout.ContentItem, workspaceWrapper: WorkspaceWrapper, isParentWorkspace: boolean): void {
        const parentAllowDrop = isParentWorkspace ? workspaceWrapper.allowDrop : parent.config.workspacesConfig.allowDrop;
        const parentAllowSplitters = isParentWorkspace ? workspaceWrapper.allowSplitters : parent.config.workspacesConfig.allowSplitters;

        if (itemConfig.type === "stack") {
            if (typeof itemConfig.workspacesConfig.allowDrop === "undefined") {
                itemConfig.workspacesConfig.allowDrop = itemConfig.workspacesConfig.allowDrop ?? parentAllowDrop;
            }

            if (typeof itemConfig.workspacesConfig.allowExtract === "undefined") {
                const parentAllowExtract = workspaceWrapper.allowExtract;
                itemConfig.workspacesConfig.allowExtract = itemConfig.workspacesConfig.allowExtract ?? parentAllowExtract;
            }

            if (typeof itemConfig.workspacesConfig.allowReorder === "undefined") {
                const parentAllowReorder = workspaceWrapper.allowWindowReorder;
                itemConfig.workspacesConfig.allowReorder = itemConfig.workspacesConfig.allowReorder ?? parentAllowReorder;
            }

            if (typeof itemConfig.workspacesConfig.showAddWindowButton === "undefined") {
                itemConfig.workspacesConfig.showAddWindowButton = workspaceWrapper.showAddWindowButtons;
            }

            if (typeof itemConfig.workspacesConfig.showEjectButton === "undefined") {
                itemConfig.workspacesConfig.showEjectButton = workspaceWrapper.showEjectButtons;
            }
        } else if (itemConfig.type === "row" || itemConfig.type === "column") {
            if (typeof itemConfig.workspacesConfig.allowDrop === "undefined") {
                itemConfig.workspacesConfig.allowDrop = itemConfig.workspacesConfig.allowDrop ?? parentAllowDrop;
            }
            if (typeof itemConfig.workspacesConfig.allowSplitters === "undefined") {
                itemConfig.workspacesConfig.allowSplitters = itemConfig.workspacesConfig.allowSplitters ?? parentAllowSplitters;
            }
        } else if (itemConfig.type === "component") {
            if (typeof itemConfig.workspacesConfig.allowExtract === "undefined") {
                const parentAllowExtract = isParentWorkspace ? workspaceWrapper.allowExtract : parent.config.workspacesConfig.allowExtract;
                itemConfig.workspacesConfig.allowExtract = parentAllowExtract;
            }
            if (typeof itemConfig.workspacesConfig.allowReorder === "undefined") {
                const parentAllowReorder = isParentWorkspace ? workspaceWrapper.allowWindowReorder : parent.config.workspacesConfig.allowReorder;
                itemConfig.workspacesConfig.allowReorder = parentAllowReorder;
            }
            if (typeof itemConfig.workspacesConfig.showCloseButton === "undefined") {
                itemConfig.workspacesConfig.showWindowCloseButtons = workspaceWrapper.showWindowCloseButtons;
            }
        }
    }

    private getImmediateChildEmptyWindow = (contentItem: GoldenLayout.ContentItem): GoldenLayout.ContentItem => {
        if (contentItem.type === "component") {
            if (contentItem.config.componentName === EmptyVisibleWindowName) {
                return contentItem;
            }

            return;
        }

        if (contentItem.type === "stack") {
            return contentItem.getComponentsByName(EmptyVisibleWindowName)[0];
        }

        return contentItem.contentItems.reduce((acc, ci) => {
            if (acc) {
                return acc;
            }

            if (ci.type === "component") {
                if (ci.config.componentName === EmptyVisibleWindowName) {
                    return ci;
                }

                return;
            }

            return ci.contentItems.find(ci => ci.type === "component" && ci.config.componentName === EmptyVisibleWindowName);
        }, undefined);
    };

    private registerWorkspaceComponents(workspaceConfig: GoldenLayout.Config) {
        (workspaceConfig.content[0] as GoldenLayout.StackConfig).content.forEach((configObj) => {
            const workspaceId = configObj.id;

            this._layoutComponentsFactory.registerWorkspaceComponent(idAsString(workspaceId));
        });
    }

    private hideMaximizeButton(stack: GoldenLayout.Stack, groupId: string) {
        uiExecutor.hideMaximizeButton(stack);
        componentStateMonitor.decoratedFactory.updateGroupHeaderButtons({ groupId, maximize: { visible: false }, restore: { visible: false } });
    }

    private hideEjectButton(stack: GoldenLayout.Stack, groupId: string) {
        uiExecutor.hideEjectButton(stack);
        componentStateMonitor.decoratedFactory.updateGroupHeaderButtons({ groupId, eject: { visible: false } });
    }

    private hideAddWindowButton(stack: GoldenLayout.Stack, groupId: string) {
        uiExecutor.hideAddWindowButton(stack);
        componentStateMonitor.decoratedFactory.updateGroupHeaderButtons({ groupId, addWindow: { visible: false } });
    }
}
