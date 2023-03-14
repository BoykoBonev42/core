import { WorkspacesWrapperFactory } from "../state/factory";
import { WorkspaceDropOptions } from "../types/internal";
import store from "../state/store";
import uiExecutor from "../uiExecutor";
import { LockGroupArguments } from "../interop/types";

export class WorkspacesLayoutLockingController {
    constructor(private readonly _wrapperFactory: WorkspacesWrapperFactory) {

    }
    public enableWorkspaceDrop(workspaceId: string, workspaceDropOptions: WorkspaceDropOptions): void {
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const workspace = store.getById(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowDrop = workspaceDropOptions.allowDrop;
        wrapper.allowDropLeft = workspaceDropOptions.allowDropLeft;
        wrapper.allowDropTop = workspaceDropOptions.allowDropTop;
        wrapper.allowDropRight = workspaceDropOptions.allowDropRight;
        wrapper.allowDropBottom = workspaceDropOptions.allowDropBottom;
    }

    public disableWorkspaceDrop(workspaceId: string, workspaceDropOptions: WorkspaceDropOptions): void {
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const workspace = store.getById(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowDropLeft = workspaceDropOptions.allowDropLeft;
        wrapper.allowDropTop = workspaceDropOptions.allowDropTop;
        wrapper.allowDropRight = workspaceDropOptions.allowDropRight;
        wrapper.allowDropBottom = workspaceDropOptions.allowDropBottom;
    }

    public enableWorkspaceSaveButton(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showSaveButton = true;
        if (!wrapper.isPinned) {
            uiExecutor.showWorkspaceSaveButton({ workspaceTab: workspaceContentItem.tab });
        }
    }

    public disableWorkspaceSaveButton(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showSaveButton = false;
        uiExecutor.hideWorkspaceSaveButton({ workspaceTab: workspaceContentItem.tab });
    }

    public enableWorkspaceReorder(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowWorkspaceTabReorder = true;
    }

    public disableWorkspaceReorder(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowWorkspaceTabReorder = false;
    }

    public enableWorkspaceCloseButton(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showCloseButton = true;
        if (!wrapper.isPinned) {
            uiExecutor.showWorkspaceCloseButton({ workspaceTab: workspaceContentItem.tab });
        }
    }

    public disableWorkspaceCloseButton(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showCloseButton = false;
        uiExecutor.hideWorkspaceCloseButton({ workspaceTab: workspaceContentItem.tab });
    }

    public enableSplitters(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowSplitters = true;
    }

    public disableSplitters(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowSplitters = false;
    }

    public enableWorkspaceExtract(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowExtract = true;
    }

    public disableWorkspaceExtract(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowExtract = false;
    }

    public enableWorkspaceWindowReorder(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowWindowReorder = true;
    }

    public disableWorkspaceWindowReorder(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.allowWindowReorder = false;
    }

    public enableWorkspaceWindowCloseButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showWindowCloseButtons = true;
        uiExecutor.showWindowCloseButtons(workspaceId);
    }

    public disableWorkspaceWindowCloseButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showWindowCloseButtons = false;
        uiExecutor.hideWindowCloseButtons(workspaceId);
    }

    public enableWorkspaceEjectButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showEjectButtons = true;
        uiExecutor.showEjectButtons(workspaceId);
    }

    public disableWorkspaceEjectButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showEjectButtons = false;
        uiExecutor.hideEjectButtons(workspaceId);
    }

    public enableWorkspaceAddWindowButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showAddWindowButtons = true;
        uiExecutor.showAddWindowButtons(workspaceId);
    }

    public disableWorkspaceAddWindowButtons(workspaceId: string): void {
        const workspace = store.getById(workspaceId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspaceId);
        const wrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });

        wrapper.showAddWindowButtons = false;
        uiExecutor.hideAddWindowButtons(workspaceId);
    }

    public enableWindowExtract(windowId: string, value: boolean | undefined): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.allowExtract = value;
    }

    public disableWindowExtract(windowId: string): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.allowExtract = false;
    }

    public enableWindowReorder(windowId: string, value: boolean | undefined): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.allowReorder = value;
    }

    public disableWindowReorder(windowId: string): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.allowReorder = false;
    }

    public enableWindowCloseButton(windowId: string, value: boolean | undefined): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.showCloseButton = value;

        const workspace = store.getByWindowId(windowId);
        const workspaceContentItem = store.getWorkspaceContentItem(workspace.id);
        const workspaceWrapper = this._wrapperFactory.getWorkspaceWrapper({ workspace, workspaceContentItem });
        if (workspaceWrapper.showCloseButton) {
            uiExecutor.showWindowCloseButton(windowId);
        }
    }

    public disableWindowCloseButton(windowId: string): void {
        const windowContentItem = store.getWindowContentItem(windowId);
        const wrapper = this._wrapperFactory.getWindowWrapper({ windowContentItem });

        wrapper.showCloseButton = false;

        uiExecutor.hideWindowCloseButton(windowId);
    }

    public enableColumnDrop(itemId: string, allowDrop: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "column") {
            throw new Error(`Expected item with type column but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = allowDrop;
    }

    public disableColumnDrop(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "column") {
            throw new Error(`Expected item with type column but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = false;
    }

    public enableRowDrop(itemId: string, allowDrop: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "row") {
            throw new Error(`Expected item with type row but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = allowDrop;
    }

    public disableRowDrop(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "row") {
            throw new Error(`Expected item with type row but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = false;
    }

    public enableColumnSplitters(itemId: string, allowSplitters: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "column") {
            throw new Error(`Expected item with type column but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowSplitters = allowSplitters;
    }

    public disableColumnSplitters(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "column") {
            throw new Error(`Expected item with type column but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowSplitters = false;
    }

    public enableRowSplitters(itemId: string, allowSplitters: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "row") {
            throw new Error(`Expected item with type row but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowSplitters = allowSplitters;
    }

    public disableRowSplitters(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "row") {
            throw new Error(`Expected item with type row but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowSplitters = false;
    }

    public enableGroupDrop(itemId: string, groupDropOptions: LockGroupArguments["config"]): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = groupDropOptions.allowDrop;
        wrapper.allowDropHeader = groupDropOptions.allowDropHeader;
        wrapper.allowDropLeft = groupDropOptions.allowDropLeft;
        wrapper.allowDropTop = groupDropOptions.allowDropTop;
        wrapper.allowDropRight = groupDropOptions.allowDropRight;
        wrapper.allowDropBottom = groupDropOptions.allowDropBottom;
    }

    public disableGroupDrop(itemId: string, groupDropOptions: LockGroupArguments["config"]): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowDrop = false;
        wrapper.allowDropHeader = groupDropOptions.allowDropHeader;
        wrapper.allowDropLeft = groupDropOptions.allowDropLeft;
        wrapper.allowDropTop = groupDropOptions.allowDropTop;
        wrapper.allowDropRight = groupDropOptions.allowDropRight;
        wrapper.allowDropBottom = groupDropOptions.allowDropBottom;
    }

    public enableGroupMaximizeButton(itemId: string, showMaximizeButton: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showMaximizeButton = showMaximizeButton;
        uiExecutor.showMaximizeButton(itemId);
    }
    public disableGroupMaximizeButton(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showMaximizeButton = false;
        uiExecutor.hideMaximizeButton(itemId);
    }
    public enableGroupEjectButton(itemId: string, showEjectButton: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showEjectButton = showEjectButton;
        uiExecutor.showEjectButton(itemId);
    }
    public disableGroupEjectButton(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showEjectButton = false;
        uiExecutor.hideEjectButton(itemId);
    }

    public enableGroupAddWindowButton(itemId: string, showAddWindowButton: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showAddWindowButton = showAddWindowButton;
        uiExecutor.showAddWindowButton(itemId);
    }

    public disableGroupAddWindowButton(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.showAddWindowButton = false;
        uiExecutor.hideAddWindowButton(itemId);
    }
    public enableGroupExtract(itemId: string, allowExtract: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowExtract = allowExtract;
    }
    public disableGroupExtract(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowExtract = false;
    }

    public enableGroupReorder(itemId: string, allowReorder: boolean): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });
        wrapper.allowReorder = allowReorder;
    }
    public disableGroupReorder(itemId: string): void {
        const containerContentItem = store.getContainer(itemId);

        if (containerContentItem.type !== "stack") {
            throw new Error(`Expected item with type stack but received ${containerContentItem.type} ${itemId}`);
        }

        const wrapper = this._wrapperFactory.getContainerWrapper({ containerContentItem });

        wrapper.allowReorder = false;
    }
}