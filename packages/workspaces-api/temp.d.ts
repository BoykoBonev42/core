import { Glue42Workspaces } from "./workspaces";

export interface API extends Glue42Workspaces.API {
    /**
     * Notifies when a window was selected in any frame and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the selected window as a parameter.
     */
    onWindowSelected(callback: (WorkspaceWindow: Glue42Workspaces.WorkspaceWindow) => void): Promise<Glue42Workspaces.Unsubscribe>;
}

export interface Workspace extends Glue42Workspaces.Workspace {
    /**
     * Notifies when a window was selected in this workspace and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the selected window as a parameter.
     */
    onWindowSelected(callback: (window: Glue42Workspaces.WorkspaceWindow) => void): Promise<Glue42Workspaces.Unsubscribe>;
}