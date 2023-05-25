import { Base } from "./base/base";
import { Glue42Workspaces } from "../../workspaces.d";
import { checkThrowCallback, elementResizeConfigDecoder, groupLockConfigDecoder } from "../shared/decoders";
import { SubscriptionConfig } from "../types/subscription";

interface PrivateData {
    base: Base;
}

const privateData = new WeakMap<Group, PrivateData>();

const getBase = (model: Group): Base => {
    return privateData.get(model).base;
};

export class Group implements Glue42Workspaces.Group {

    constructor(base: Base) {
        privateData.set(this, { base });
    }

    public get type(): "group" {
        return "group";
    }

    public get id(): string {
        return getBase(this).getId(this);
    }

    public get frameId(): string {
        return getBase(this).getFrameId(this);
    }

    public get workspaceId(): string {
        return getBase(this).getWorkspaceId(this);
    }

    public get positionIndex(): number {
        return getBase(this).getPositionIndex(this);
    }

    public get children(): Glue42Workspaces.WorkspaceElement[] {
        return getBase(this).getAllChildren(this);
    }

    public get parent(): Glue42Workspaces.Workspace | Glue42Workspaces.WorkspaceBox {
        return getBase(this).getMyParent(this);
    }

    public get frame(): Glue42Workspaces.Frame {
        return getBase(this).getMyFrame(this);
    }

    public get workspace(): Glue42Workspaces.Workspace {
        return getBase(this).getMyWorkspace(this);
    }

    public get allowExtract(): boolean {
        return getBase(this).getAllowExtract(this);
    }

    public get allowReorder(): boolean {
        return getBase(this).getAllowReorder(this);
    }

    public get allowDropLeft(): boolean {
        return getBase(this).getAllowDropLeft(this);
    }

    public get allowDropRight(): boolean {
        return getBase(this).getAllowDropRight(this);
    }

    public get allowDropTop(): boolean {
        return getBase(this).getAllowDropTop(this);
    }

    public get allowDropBottom(): boolean {
        return getBase(this).getAllowDropBottom(this);
    }

    public get allowDropHeader(): boolean {
        return getBase(this).getAllowDropHeader(this);
    }

    public get allowDrop(): boolean {
        return getBase(this).getAllowDrop(this);
    }

    public get showMaximizeButton(): boolean {
        return getBase(this).getShowMaximizeButton(this);
    }

    public get showEjectButton(): boolean {
        return getBase(this).getShowEjectButton(this);
    }

    public get showAddWindowButton(): boolean {
        return getBase(this).getShowAddWindowButton(this);
    }

    public get minWidth(): number {
        return getBase(this).getMinWidth(this);
    }

    public get minHeight(): number {
        return getBase(this).getMinHeight(this);
    }

    public get maxWidth(): number {
        return getBase(this).getMaxWidth(this);
    }

    public get maxHeight(): number {
        return getBase(this).getMaxHeight(this);
    }

    public get width(): number {
        return getBase(this).getWidthInPx(this);
    }

    public get height(): number {
        return getBase(this).getHeightInPx(this);
    }

    public get isMaximized(): boolean {
        return getBase(this).getIsMaximized(this);
    }

    public addWindow(definition: Glue42Workspaces.WorkspaceWindowDefinition): Promise<Glue42Workspaces.WorkspaceWindow> {
        return getBase(this).addWindow(this, definition, "group");
    }

    public async addGroup(): Promise<Group> {
        throw new Error("Adding groups as group child is not supported");
    }

    public async addColumn(): Promise<Glue42Workspaces.Column> {
        throw new Error("Adding columns as group child is not supported");
    }

    public async addRow(): Promise<Glue42Workspaces.Row> {
        throw new Error("Adding rows as group child is not supported");
    }

    public removeChild(predicate: (child: Glue42Workspaces.WorkspaceElement) => boolean): Promise<void> {
        return getBase(this).removeChild(this, predicate);
    }

    public maximize(): Promise<void> {
        return getBase(this).maximize(this);
    }

    public restore(): Promise<void> {
        return getBase(this).restore(this);
    }

    public close(): Promise<void> {
        return getBase(this).close(this);
    }

    public lock(config?: Glue42Workspaces.GroupLockConfig | ((config: Glue42Workspaces.GroupLockConfig) => Glue42Workspaces.GroupLockConfig)): Promise<void> {
        let lockConfigResult = undefined;

        if (typeof config === "function") {
            const currentLockConfig = {
                allowDrop: this.allowDrop,
                allowDropHeader: this.allowDropHeader,
                allowDropLeft: this.allowDropLeft,
                allowDropRight: this.allowDropRight,
                allowDropTop: this.allowDropTop,
                allowDropBottom: this.allowDropBottom,
                allowExtract: this.allowExtract,
                allowReorder: this.allowReorder,
                showAddWindowButton: this.showAddWindowButton,
                showEjectButton: this.showEjectButton,
                showMaximizeButton: this.showMaximizeButton
            };

            lockConfigResult = config(currentLockConfig);
        } else {
            lockConfigResult = config;
        }
        const verifiedConfig = lockConfigResult === undefined ? undefined : groupLockConfigDecoder.runWithException(lockConfigResult);
        return getBase(this).lockContainer(this, verifiedConfig);
    }

    public async setSize(config: Glue42Workspaces.ElementResizeConfig): Promise<void> {
        const verifiedConfig = elementResizeConfigDecoder.runWithException(config);

        if (!verifiedConfig.width && !verifiedConfig.height) {
            throw new Error("Expected either width or height to be passed.");
        }


        return getBase(this).setSize(this, config.width, config.height);
    }

    public async bundleToRow(): Promise<void> {
        await getBase(this).bundleTo(this, "row");
        await this.workspace.refreshReference();
    }

    public async bundleToColumn(): Promise<void> {
        await getBase(this).bundleTo(this, "column");
        await this.workspace.refreshReference();
    }

    public async onLockConfigurationChanged(callback: (config: Glue42Workspaces.GroupLockConfig) => void): Promise<Glue42Workspaces.Unsubscribe> {
        checkThrowCallback(callback);
        const wrappedCallback = async (): Promise<void> => {
            await this.workspace.refreshReference();
            callback({
                allowDrop: this.allowDrop,
                allowDropHeader: this.allowDropHeader,
                allowDropLeft: this.allowDropLeft,
                allowDropTop: this.allowDropTop,
                allowDropRight: this.allowDropRight,
                allowDropBottom: this.allowDropBottom,
                allowExtract: this.allowExtract,
                allowReorder: this.allowReorder,
                showAddWindowButton: this.showAddWindowButton,
                showEjectButton: this.showEjectButton,
                showMaximizeButton: this.showMaximizeButton
            });
        };
        const config: SubscriptionConfig = {
            callback: wrappedCallback,
            action: "lock-configuration-changed",
            eventType: "container",
            scope: "container"
        };
        const unsubscribe = await getBase(this).processLocalSubscription(this, config);
        return unsubscribe;
    }

}
