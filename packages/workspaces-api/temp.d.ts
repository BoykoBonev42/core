import { Glue42Workspaces } from "./workspaces";

export interface API extends Glue42Workspaces.API {
    /**
     * Notifies when a window was selected in any frame and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the selected window as a parameter.
     */
    onWindowSelected(callback: (workspaceWindow: Glue42Workspaces.WorkspaceWindow) => void): Promise<Glue42Workspaces.Unsubscribe>;

    /**
     * Notifies when a workspace is hibernated in any frame and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the hibernated workspace as a parameter.
     */
    onWorkspaceHibernated(callback: (workspace: Glue42Workspaces.Workspace) => void): Promise<Glue42Workspaces.Unsubscribe>;

    /**
     * Notifies when a workspace is resumed in any frame and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the resumed workspace as a parameter.
     */
    onWorkspaceResumed(callback: (workspace: Glue42Workspaces.Workspace) => void): Promise<Glue42Workspaces.Unsubscribe>;
}

export interface Workspace extends Glue42Workspaces.Workspace {
    /**
     * Notifies when a window was selected in this workspace and returns an unsubscribe function.
     * @param callback Callback function to handle the event. Receives the selected window as a parameter.
     */
    onWindowSelected(callback: (window: Glue42Workspaces.WorkspaceWindow) => void): Promise<Glue42Workspaces.Unsubscribe>;

    /**
     * Notifies when this workspace is hibernated and returns an unsubscribe function.
     * @param callback Callback function to handle the event.
     */
    onHibernated(callback: () => void): Promise<Glue42Workspaces.Unsubscribe>;

    /**
     * Notifies when this workspace is resumed and returns an unsubscribe function.
     * @param callback Callback function to handle the event.
     */
    onResumed(callback: () => void): Promise<Glue42Workspaces.Unsubscribe>;
}