/* eslint-disable @typescript-eslint/no-explicit-any */
import GoldenLayout, { ContentItem, WorkspacesConfig } from "@glue42/golden-layout";
import { Bounds, ContainerSummary } from "../types/internal";
import { getElementBounds, idAsString } from "../utils";
import { DefaultMaxSize, DefaultMinSize } from "../utils/constants";
import store from "./store";
import { WorkspacesWrapperFactory } from "./factory";
import { LayoutEventEmitter } from "../layout/eventEmitter";
import componentStateMonitor from "../componentStateMonitor";

export class WorkspaceContainerWrapper {
    constructor(
        private readonly wrapperFactory: WorkspacesWrapperFactory,
        private readonly layoutEventEmitter: LayoutEventEmitter,
        private readonly containerContentItem: GoldenLayout.Row | GoldenLayout.Stack | GoldenLayout.Column,
        private readonly frameId: string,
        private readonly workspaceId?: string) {
    }

    public get id(): string {
        return idAsString(this.containerContentItem?.config.id);
    }

    public get minWidth(): number {
        return this.containerContentItem.getMinWidth() ?? DefaultMinSize;
    }

    public set minWidth(value: number | undefined) {
        if (this.containerContentItem.type === "row") {
            throw new Error(`Cannot set minWidth ${value} to a container of type row`);
        }
        if (isNaN(value) || value < 0) {
            throw new Error(`Invalued value passed for minWidth ${value}`);
        }
        this.containerContentItem.config.workspacesConfig.minWidth = value;
    }

    public get minHeight(): number {
        return this.containerContentItem.getMinHeight() ?? DefaultMinSize;
    }

    public set minHeight(value: number | undefined) {
        if (this.containerContentItem.type === "column") {
            throw new Error(`Cannot set minHeight ${value} to a container of type column`);
        }
        if (isNaN(value) || value < 0) {
            throw new Error(`Invalued value passed for minHeight ${value}`);
        }
        this.containerContentItem.config.workspacesConfig.minHeight = value;
    }

    public get maxWidth(): number {
        return this.containerContentItem.getMaxWidth() ?? DefaultMaxSize;
    }

    public set maxWidth(value: number | undefined) {
        if (this.containerContentItem.type === "row") {
            throw new Error(`Cannot set maxWidth ${value} to a container of type row`);
        }
        if (isNaN(value) || value < 0) {
            throw new Error(`Invalued value passed for maxWidth ${value}`);
        }
        (this.containerContentItem.config.workspacesConfig as any).maxWidth = value;
    }

    public get maxHeight(): number {
        return this.containerContentItem.getMaxHeight() ?? DefaultMaxSize;
    }

    public set maxHeight(value: number | undefined) {
        if (this.containerContentItem.type === "column") {
            throw new Error(`Cannot set maxHeight ${value} to a container of type column`);
        }
        if (isNaN(value) || value < 0) {
            throw new Error(`Invalued value passed for maxHeight ${value}`);
        }
        this.containerContentItem.config.workspacesConfig.maxHeight = value;
    }

    public get allowDrop(): boolean {
        return this.getLockPropertyFromConfig("allowDrop");
    }

    public set allowDrop(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDrop", value);

        this.populateChildrenAllowDrop(value);
    }

    public get allowDropHeader(): boolean {
        return this.getLockPropertyFromConfig("allowDropHeader");
    }

    public set allowDropHeader(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDropHeader", value);
    }

    public get allowDropLeft(): boolean {
        return this.getLockPropertyFromConfig("allowDropLeft");
    }

    public set allowDropLeft(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDropLeft", value);
    }

    public get allowDropRight(): boolean {
        return this.getLockPropertyFromConfig("allowDropRight");
    }

    public set allowDropRight(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDropRight", value);
    }

    public get allowDropTop(): boolean {
        return this.getLockPropertyFromConfig("allowDropTop");
    }

    public set allowDropTop(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDropTop", value);
    }

    public get allowDropBottom(): boolean {
        return this.getLockPropertyFromConfig("allowDropBottom");
    }

    public set allowDropBottom(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowDropBottom", value);
    }

    public get allowExtract(): boolean {
        return this.getLockPropertyFromConfig("allowExtract");
    }

    public set allowExtract(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowExtract", value);

        this.populateChildrenAllowExtract(value);
    }

    public get allowReorder(): boolean {
        return this.getLockPropertyFromConfig("allowReorder");
    }

    public set allowReorder(value: boolean | undefined) {
        this.setLockPropertyFromConfig("allowReorder", value);

        this.populateChildrenAllowReorder(value);
    }

    public get allowSplitters(): boolean {
        if (this.containerContentItem.config.type === "stack") {
            throw new Error(`Accessing allowSplitters of container ${this.containerContentItem.type} ${this.id} the property is available only for rows and columns`);
        }
        return this.getLockPropertyFromConfig("allowSplitters");
    }

    public set allowSplitters(value: boolean | undefined) {
        if (this.containerContentItem.config.type === "stack") {
            throw new Error(`Setting allowSplitters of container ${this.containerContentItem.type} ${this.id} the property is available only for rows and columns`);
        }
        this.setLockPropertyFromConfig("allowSplitters", value);

        this.populateChildrenAllowSplitters(value);
    }

    public get showMaximizeButton(): boolean {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Accessing showMaximizeButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        return this.getLockPropertyFromConfig("showMaximizeButton");
    }

    public set showMaximizeButton(value: boolean | undefined) {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Setting showMaximizeButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        this.setLockPropertyFromConfig("showMaximizeButton", value);
    }

    public get showEjectButton(): boolean {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Accessing showEjectButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        return this.getLockPropertyFromConfig("showEjectButton");
    }

    public set showEjectButton(value: boolean | undefined) {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Setting showEjectButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        this.setLockPropertyFromConfig("showEjectButton", value);
        componentStateMonitor.decoratedFactory.updateGroupHeaderButtons({ groupId: this.id, eject: { visible: value } });
    }

    public get showAddWindowButton(): boolean {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Accessing showAddWindowButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        return this.getLockPropertyFromConfig("showAddWindowButton");
    }

    public set showAddWindowButton(value: boolean | undefined) {
        if (this.containerContentItem.config.type !== "stack") {
            throw new Error(`Setting showAddWindowButton of container ${this.containerContentItem.type} ${this.id} the property is available only for stacks`);
        }
        this.setLockPropertyFromConfig("showAddWindowButton", value);
        componentStateMonitor.decoratedFactory.updateGroupHeaderButtons({ groupId: this.id, addWindow: { visible: value } });
    }

    public get positionIndex(): number {
        return this.containerContentItem?.parent?.contentItems.indexOf(this.containerContentItem) || 0;
    }

    public get bounds(): Bounds {
        if (!this.containerContentItem) {
            return {} as Bounds;
        }

        if (!this.containerContentItem.config.workspacesConfig) {
            this.containerContentItem.config.workspacesConfig = {};
        }

        const workspaceId = this.workspaceId ?? store.getByContainerId(this.id)?.id;
        if (workspaceId && this.isWorkspaceSelected(workspaceId)) {
            const bounds = getElementBounds(this.containerContentItem.element);
            (this.containerContentItem.config.workspacesConfig as any).cachedBounds = bounds;
            return bounds;
        }

        const elementBounds = getElementBounds(this.containerContentItem.element);

        if (elementBounds.width === 0 && elementBounds.height === 0 && (this.containerContentItem.config.workspacesConfig as any)?.cachedBounds) {
            return (this.containerContentItem.config.workspacesConfig as any)?.cachedBounds;
        }

        return elementBounds;

    }

    public get isPinned(): boolean {
        return this.containerContentItem.config.workspacesConfig.isPinned ?? false;
    }

    public get maximizationBoundary(): boolean {
        return this.containerContentItem.config.workspacesConfig.maximizationBoundary ?? false;
    }

    public set maximizationBoundary(value: boolean) {
        this.containerContentItem.config.workspacesConfig.maximizationBoundary = value;
    }

    public get activeItemId(): string {
        if (this.containerContentItem.type !== "stack") {
            return;
        }

        return idAsString(this.containerContentItem.getActiveContentItem().config.id);
    }

    public get summary(): ContainerSummary {
        const workspaceId = this.workspaceId ?? store.getByContainerId(this.id)?.id;
        const userFriendlyType = this.getUserFriendlyType(this.containerContentItem?.type || "workspace");

        let config: ContainerSummary["config"] = {
            workspaceId,
            frameId: this.frameId,
            positionIndex: this.positionIndex,
            allowDrop: this.allowDrop,
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            minHeight: this.minHeight,
            maxHeight: this.maxHeight,
            widthInPx: this.bounds.width,
            heightInPx: this.bounds.height,
            isPinned: this.isPinned,
            isMaximized: this.isMaximized,
            maximizationBoundary: this.maximizationBoundary
        };

        const type = userFriendlyType === "window" ? undefined : userFriendlyType;
        if (type === "group") {
            config = {
                ...config,
                allowExtract: this.allowExtract,
                allowReorder: this.allowReorder,
                showMaximizeButton: this.showMaximizeButton,
                showEjectButton: this.showEjectButton,
                showAddWindowButton: this.showAddWindowButton,
                allowDropHeader: this.allowDropHeader,
                allowDropLeft: this.allowDropLeft,
                allowDropRight: this.allowDropRight,
                allowDropTop: this.allowDropTop,
                allowDropBottom: this.allowDropBottom
            };
        }
        if (type !== "group") {
            config = {
                ...config,
                allowSplitters: this.allowSplitters
            };
        }
        return {
            itemId: this.id,
            type: userFriendlyType === "window" ? undefined : userFriendlyType,
            config
        };
    }

    public get config(): GoldenLayout.ItemConfig {
        const workspace = store.getByContainerId(this.containerContentItem.config.id) ||
            store.getByWindowId(this.id);

        const workspaceConfig = workspace.layout.toConfig();

        const containerConfig = this.findElementInConfig(this.id, workspaceConfig);
        containerConfig.workspacesConfig.isPinned = containerConfig.workspacesConfig.isPinned ?? false;

        return containerConfig;
    }

    public get isMaximized(): boolean {
        return this.containerContentItem.hasId("__glMaximised");
    }

    private populateChildrenAllowDrop(value: boolean | undefined): void {
        const lockChildren = (children: ContentItem[]): void => {
            children.forEach((c) => {
                if (c.type === "component") {
                    return;
                }

                const wrapper = this.wrapperFactory.getContainerWrapper({ containerContentItem: c });

                wrapper.allowDrop = value;

                lockChildren(c.contentItems);
            });
        };

        lockChildren(this.containerContentItem.contentItems);
    }

    private populateChildrenAllowExtract(value: boolean | undefined): void {
        const lockChildren = (children: ContentItem[]): void => {
            children.forEach((c) => {
                if (c.type === "component") {
                    const windowWrapper = this.wrapperFactory.getWindowWrapper({ windowContentItem: c });

                    windowWrapper.allowExtract = value;
                    return;
                }

                if (c.type === "stack") {
                    const containerWrapper = this.wrapperFactory.getContainerWrapper({ containerContentItem: c });
                    containerWrapper.allowExtract = value;
                }

                lockChildren(c.contentItems);
            });
        };

        lockChildren(this.containerContentItem.contentItems);
    }

    private populateChildrenAllowReorder(value: boolean | undefined): void {
        const lockChildren = (children: ContentItem[]): void => {
            children.forEach((c) => {
                if (c.type === "component") {
                    const windowWrapper = this.wrapperFactory.getWindowWrapper({ windowContentItem: c });

                    windowWrapper.allowReorder = value;
                    return;
                }

                if (c.type === "stack") {
                    const containerWrapper = this.wrapperFactory.getContainerWrapper({ containerContentItem: c });
                    containerWrapper.allowReorder = value;
                }

                lockChildren(c.contentItems);
            });
        };

        lockChildren(this.containerContentItem.contentItems);
    }

    private populateChildrenAllowSplitters(value: boolean | undefined): void {
        const lockChildren = (children: ContentItem[]): void => {
            children.forEach((c) => {
                if (c.type === "component" || c.type === "stack") {
                    return;
                }

                const containerWrapper = this.wrapperFactory.getContainerWrapper({ containerContentItem: c });
                containerWrapper.allowSplitters = value;

                lockChildren(c.contentItems);
            });
        };

        lockChildren(this.containerContentItem.contentItems);
    }

    private getUserFriendlyType(type: "row" | "column" | "component" | "stack" | "root" | "workspace"): "row" | "window" | "column" | "group" | "workspace" {
        if (type === "stack") {
            return "group";
        } else if (type === "root") {
            return "workspace";
        } else if (type === "component") {
            return "window";
        }

        return type;
    }

    private findElementInConfig(elementId: string, config: GoldenLayout.Config): GoldenLayout.ItemConfig {
        const search = (glConfig: GoldenLayout.Config | GoldenLayout.ItemConfig): any => {
            if (idAsString(glConfig.id) === elementId) {
                return [glConfig];
            }

            const contentToTraverse = (glConfig as any).content || [];

            return contentToTraverse.reduce((acc: any, ci: any) => [...acc, ...search(ci)], []);
        };

        const searchResult = search(config);

        return searchResult.find((i: GoldenLayout.ItemConfig) => i.id);
    }

    private isWorkspaceSelected(workspaceId: string) {
        const wrapper = this.wrapperFactory.getWorkspaceWrapper({ workspaceId });

        return wrapper.isSelected;
    }

    private getLockPropertyFromConfig<T extends keyof WorkspacesConfig>(propertyName: T): WorkspacesConfig[T] {
        return this.containerContentItem.config.workspacesConfig[propertyName] ?? true as WorkspacesConfig[T];
    }

    private setLockPropertyFromConfig<T extends keyof WorkspacesConfig>(propertyName: T, value: WorkspacesConfig[T]): void {
        const previousValue = this.getLockPropertyFromConfig(propertyName);
        (this.containerContentItem.config.workspacesConfig[propertyName]) = value;
        const newValue = this.getLockPropertyFromConfig(propertyName);
        if (previousValue !== newValue) {
            this.layoutEventEmitter.raiseEvent("container-lock-configuration-changed", { item: this.containerContentItem });
        }
    }
}
