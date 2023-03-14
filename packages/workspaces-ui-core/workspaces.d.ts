import { Bounds } from "./src/types/internal";
import { Glue42Web } from "@glue42/web";

export interface WorkspacesManager {
    getFrameId: () => string;
    init: (glue: Glue42Web.API, componentFactory?: any) => void;
    notifyMoveAreaChanged: () => void;
    getComponentBounds: () => Bounds;
    registerPopup: (element: HTMLElement) => string;
    removePopup: (element: HTMLElement) => void;
    removePopupById: (id: string) => void;
    unmount: () => void;
    subscribeForWindowFocused: (callback: () => void) => void;
    notifyWorkspacePopupChanged: (element: HTMLElement) => void;
    requestFocus: () => void;
    closeWorkspace: (workspaceId: string) => void;
    showSaveWorkspacePopup: (workspaceId: string, bounds: Bounds) => void;
    closeWindow: (id: string) => void;
    maximizeGroup: (id: string) => void;
    restoreGroup: (id: string) => void;
    ejectActiveWindow: (groupId: string) => void;
    showChannelsSelector: (placementId: string, bounds: Bounds) => void;
    showAddApplicationPopup:(groupId:string, bounds:Bounds)=>void;
}

declare const WorkspacesManagerAPI: WorkspacesManager;
export default WorkspacesManagerAPI;