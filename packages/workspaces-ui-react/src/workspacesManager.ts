import workspacesManager from "@glue42/workspaces-ui-core";
import { Bounds, WorkspacesManager } from "./types/internal";

declare const window: Window & { workspacesManager: WorkspacesManager };

class WorkspacesManagerDecorator {
    public init(glue: any, componentFactory: any) {
        if (window.workspacesManager) {
            window.workspacesManager.init(componentFactory);
        } else if (!window.glue42gd) {
            workspacesManager.init(glue, componentFactory);
        } else {
            throw new Error(`Detected an attempt to start a workspaces frame in a normal GD window. The Frame app should be started in a type:"workspaces" application when in Glue42 Desktop`);
        }
    }

    public getFrameId() {
        return (window.workspacesManager || workspacesManager).getFrameId();
    }

    public notifyMoveAreaChanged() {
        (window.workspacesManager || workspacesManager).notifyMoveAreaChanged();
    }

    public notifyWorkspacePopupChanged(element: HTMLElement): string {
        return (window.workspacesManager || workspacesManager).notifyWorkspacePopupChanged(element);
    }

    public getComponentBounds(): Bounds {
        return (window.workspacesManager || workspacesManager).getComponentBounds();
    }

    public registerPopup(element: HTMLElement): string {
        return (window.workspacesManager || workspacesManager).registerPopup(element);
    }

    public removePopup(element: HTMLElement): void {
        return (window.workspacesManager || workspacesManager).removePopup(element);
    }

    public removePopupById(elementId: string): void {
        return (window.workspacesManager || workspacesManager).removePopupById(elementId);
    }

    public subscribeForWindowFocused(cb: () => any): () => void {
        return (window.workspacesManager || workspacesManager).subscribeForWindowFocused(cb);
    }

    public unmount(): void {
        return (window.workspacesManager || workspacesManager).unmount();
    }

    public requestFocus(): void {
        return (window.workspacesManager || workspacesManager).requestFocus();
    }

    public showSaveWorkspacePopup(workspaceId: string, bounds: Bounds): void {
        return (window.workspacesManager || workspacesManager).showSaveWorkspacePopup(workspaceId, bounds);
    }

    public closeWorkspace(workspaceId: string): void {
        return (window.workspacesManager || workspacesManager).closeWorkspace(workspaceId);
    }

    public closeWindow(placementId: string): void {
        (window.workspacesManager || workspacesManager).closeWindow(placementId);
    }

    public ejectActiveWindow(groupId: string): void {
        (window.workspacesManager || workspacesManager).ejectActiveWindow(groupId);
    }

    public maximizeGroup(groupId: string): void {
        (window.workspacesManager || workspacesManager).maximizeGroup(groupId);
    }

    public restoreGroup(groupId: string): void {
        (window.workspacesManager || workspacesManager).restoreGroup(groupId);
    }

    public showChannelsSelector(placementId: string, bounds: Bounds): void {
        (window.workspacesManager || workspacesManager).showChannelsSelector(placementId, bounds);
    }

    public showAddApplicationPopup(workspaceId: string, groupId: string, bounds: Bounds): void {
        (window.workspacesManager || workspacesManager).showAddApplicationPopup(workspaceId, groupId, bounds);
    }
}

export default new WorkspacesManagerDecorator();