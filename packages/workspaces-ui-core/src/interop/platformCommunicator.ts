import { Glue42Web } from "@glue42/web";
import { WorkspacesSystemConfig } from "../types/internal";
import { PlatformControlMethod } from "../utils/constants";
import { GetWorkspaceWindowOnLayoutSaveContextResult, GetWorkspaceWindowsOnLayoutSaveContextConfig, Glue42CoreConfig, OperationCheckResult, PlatformOperations, WorkspaceWindowOnSaveData } from "./types";

declare var window: Window & { glue42core: Glue42CoreConfig };

export class PlatformCommunicator {

    constructor(private readonly _glue: Glue42Web.API,
        private readonly _frameId: string) {
    }

    public get platformConfig(): Glue42CoreConfig | undefined {
        return window.glue42core;
    }

    public async requestOnLayoutSaveContexts(data: GetWorkspaceWindowsOnLayoutSaveContextConfig): Promise<WorkspaceWindowOnSaveData[]> {
        const isOperationSupported = await this.isOperationSupported({ domain: "workspaces", operation: "getWorkspaceWindowsOnLayoutSaveContext" });
        if (!isOperationSupported) {
            console.warn(`Workspace layout ${data.layoutName} won't save the window contexts because the platform must be at lease version 1.13.0`);
            return [];
        }
        try {
            const result = await this._glue.agm.invoke<GetWorkspaceWindowOnLayoutSaveContextResult>(PlatformControlMethod, {
                domain: "workspaces",
                operation: "getWorkspaceWindowsOnLayoutSaveContext",
                data
            });

            return result?.returned?.windowsOnSaveData ?? [];
        } catch (error) {
            console.warn(`The save of window contexts unexpectedly failed with `, error);
        }

        return [];

    }

    public notifyFrameWillStart(windowId: string, appName?: string, context?: any, title?: string, workspaceId?: string) {
        const systemId = (window as any).glue42core.communicationId;

        return this._glue.interop.invoke(PlatformControlMethod, {
            domain: appName ? "appManager" : "windows",
            operation: appName ? "registerWorkspaceApp" : "registerWorkspaceWindow",
            data: {
                name: `${appName || "window"}_${windowId}`,
                windowId,
                frameId: this._frameId,
                appName,
                context,
                title,
                workspaceId
            }
        }, systemId ? { instance: systemId } : undefined);
    }

    public notifyFrameWillClose(windowId: string, appName?: string): Promise<any> {
        const systemId = (window as any).glue42core.communicationId;

        return this._glue.interop.invoke(PlatformControlMethod, {
            domain: appName ? "appManager" : "windows",
            operation: appName ? "unregisterWorkspaceApp" : "unregisterWorkspaceWindow",
            data: {
                windowId,
            }
        }, systemId ? { instance: systemId } : undefined);
    }

    public async askForSettings() {
        const systemId = (window as any).glue42core.communicationId;

        const result = await this._glue.interop.invoke<WorkspacesSystemConfig>(PlatformControlMethod, {
            domain: "workspaces",
            operation: "getWorkspacesConfig",
            data: {
            }
        }, systemId ? { instance: systemId } : undefined);

        return result.returned;
    }

    public async isOperationSupported(config: PlatformOperations) {
        try {
            const result = await this._glue.agm.invoke<OperationCheckResult>(PlatformControlMethod, {
                domain: config.domain,
                operation: "operationCheck",
                data: { operation: config.operation }
            });
            return result.returned.isSupported;
        } catch (error) {
            return false;
        }
    }
}
