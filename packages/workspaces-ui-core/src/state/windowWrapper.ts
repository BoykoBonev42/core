/* eslint-disable @typescript-eslint/no-explicit-any */
import GoldenLayout from "@glue42/golden-layout";
import componentStateMonitor from "../componentStateMonitor";
import { LayoutEventEmitter } from "../layout/eventEmitter";
import { Bounds, LockWindowConfig, WindowSummary } from "../types/internal";
import { getElementBounds, idAsString } from "../utils";
import { WorkspacesWrapperFactory } from "./factory";
import store from "./store";

export class WorkspaceWindowWrapper {
    constructor(
        private readonly wrapperFactory: WorkspacesWrapperFactory,
        private readonly layoutEventEmitter: LayoutEventEmitter,
        private readonly windowContentItem: GoldenLayout.Component,
        private readonly frameId: string) {
    }

    public get minWidth(): number | undefined {
        return this.windowContentItem.getMinWidth();
    }

    public set minWidth(value: number | undefined) {
        this.windowContentItem.config.workspacesConfig.minWidth = value;
    }

    public get maxWidth(): number | undefined {
        return this.windowContentItem.getMaxWidth();
    }

    public set maxWidth(value: number | undefined) {
        this.windowContentItem.config.workspacesConfig.maxWidth = value;
    }

    public get minHeight(): number | undefined {
        return this.windowContentItem.getMinHeight();
    }

    public set minHeight(value: number | undefined) {
        this.windowContentItem.config.workspacesConfig.minHeight = value;
    }

    public get maxHeight(): number | undefined {
        return this.windowContentItem.getMaxHeight();
    }

    public set maxHeight(value: number | undefined) {
        this.windowContentItem.config.workspacesConfig.maxHeight = value;
    }

    public get allowExtract(): boolean | undefined {
        return this.getLockPropertyFromConfig("allowExtract");
    }

    public set allowExtract(value: boolean | undefined) {
        this.setLockPropertyInConfig("allowExtract", value);
    }

    public get allowReorder(): boolean | undefined {
        return this.getLockPropertyFromConfig("allowReorder");
    }

    public set allowReorder(value: boolean | undefined) {
        this.setLockPropertyInConfig("allowReorder", value);
    }

    public get showCloseButton(): boolean | undefined {
        return this.getLockPropertyFromConfig("showCloseButton");
    }

    public set showCloseButton(value: boolean | undefined) {
        this.setLockPropertyInConfig("showCloseButton", value);
        componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({ placementId: idAsString(this.windowContentItem.config.id), close: { visible: value } });
    }

    public get isMaximized(): boolean {
        return this.windowContentItem?.parent?.isMaximized ?? false;
    }

    public get isSelected(): boolean {
        if (typeof this.windowContentItem?.parent.getActiveContentItem !== "function") {
            return false;
        }
        return idAsString(this.windowContentItem?.parent.getActiveContentItem().config.id) === idAsString(this.windowContentItem.config.id);
    }

    public get index(): number {
        return this.windowContentItem.parent?.contentItems?.indexOf(this.windowContentItem) || 0;
    }

    public get isTabless(): boolean {
        const parent = this.windowContentItem?.parent;

        return !!parent?.config?.workspacesConfig?.wrapper;
    }

    public get summary(): WindowSummary {
        return this.getSummaryCore(this.windowContentItem as GoldenLayout.Component,
            idAsString(this.windowContentItem.config.id));
    }

    public get config(): GoldenLayout.ComponentConfig {
        return this.windowContentItem?.config;
    }

    public get bounds(): Bounds {
        if (!this.windowContentItem) {
            return {} as Bounds;
        }

        if (!this.windowContentItem.config.workspacesConfig) {
            this.windowContentItem.config.workspacesConfig = {};
        }

        const workspaceId = store.getByWindowId(idAsString(this.windowContentItem.config.id))?.id;
        if (workspaceId && this.isWorkspaceSelected(workspaceId)) {
            const bounds = getElementBounds(this.windowContentItem.element);

            (this.windowContentItem.config.workspacesConfig as any).cachedBounds = bounds;

            return bounds;
        }

        const elementBounds = getElementBounds(this.windowContentItem.element);

        if (elementBounds.width === 0 && elementBounds.height === 0 && (this.windowContentItem.config.workspacesConfig as any)?.cachedBounds) {
            return (this.windowContentItem.config.workspacesConfig as any)?.cachedBounds;
        }

        return elementBounds;
    }

    private getSummaryCore(windowContentItem: GoldenLayout.Component, winId: string): WindowSummary {
        const isLoaded = windowContentItem.config.componentState.windowId !== undefined;
        const positionIndex = this.index;
        const workspaceId = store.getByWindowId(winId)?.id;
        const { appName, url, windowId } = windowContentItem.config.componentState;

        const userFriendlyParent = this.getUserFriendlyParent(windowContentItem);
        return {
            itemId: idAsString(windowContentItem.config.id),
            parentId: idAsString(userFriendlyParent?.config?.id) ?? idAsString(windowContentItem.config.id),
            config: {
                frameId: this.frameId,
                isLoaded,
                isFocused: false,
                isSelected: this.isSelected,
                positionIndex,
                workspaceId,
                windowId,
                isMaximized: this.isMaximized,
                appName,
                url,
                title: windowContentItem.config.title,
                allowExtract: this.allowExtract,
                allowReorder: this.allowReorder,
                showCloseButton: this.showCloseButton,
                minWidth: this.minWidth,
                maxWidth: this.maxWidth,
                minHeight: this.minHeight,
                maxHeight: this.maxHeight,
                widthInPx: this.bounds.width,
                heightInPx: this.bounds.height
            }
        };
    }

    private getUserFriendlyParent(contentItem: GoldenLayout.ContentItem): GoldenLayout.ContentItem {
        if (!contentItem.parent) {
            return contentItem;
        }

        if (contentItem.parent?.config?.workspacesConfig?.wrapper) {
            return this.getUserFriendlyParent(contentItem.parent as any);
        }

        return contentItem.parent as any;
    }

    private isWorkspaceSelected(workspaceId: string) {
        const wrapper = this.wrapperFactory.getWorkspaceWrapper({ workspaceId });

        return wrapper.isSelected;
    }

    private getPropertyFromConfig<T extends keyof GoldenLayout.WorkspacesConfig>(propertyName: T): GoldenLayout.WorkspacesConfig[T] {
        return (this.windowContentItem?.config?.workspacesConfig ?? {})[propertyName];
    }

    private getLockPropertyFromConfig<T extends keyof LockWindowConfig>(propertyName: T): LockWindowConfig[T] {
        return this.getPropertyFromConfig(propertyName as any) ?? true as any; // TODO allowReorder
    }

    private setPropertyInConfig<T extends keyof GoldenLayout.WorkspacesConfig>(propertyName: T, value: GoldenLayout.WorkspacesConfig[T]) {
        (this.windowContentItem.config.workspacesConfig[propertyName] as any) = value as any;
    }

    private setLockPropertyInConfig<T extends keyof LockWindowConfig>(propertyName: T, value: LockWindowConfig[T]) {
        const previousValue = this.getLockPropertyFromConfig(propertyName as any); // TODO allowReorder
        this.setPropertyInConfig(propertyName as any, value);
        const newValue = this.getLockPropertyFromConfig(propertyName as any);

        if (previousValue !== newValue) {
            this.layoutEventEmitter.raiseEvent("window-lock-configuration-changed", { item: this.windowContentItem });
        }
    }
}
