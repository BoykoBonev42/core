import GoldenLayout from "@glue42/golden-layout";
import { Glue42Web } from "@glue42/web";
import { WorkspacesManager } from "../manager";
import { EmptyVisibleWindowName } from "../utils/constants";
import { IFrameController } from "../iframeController";
import { LayoutStateResolver } from "../state/resolver";
import store from "../state/store";
import { generateWindowId, getElementBounds, idAsString } from "../utils";
import createRegistry, { UnsubscribeFunction } from "callback-registry";
import { LoadingStrategy, Window, WindowSummary, Workspace, WorkspacesSystemConfig } from "../types/internal";
import { DelayedExecutor } from "../utils/delayedExecutor";
import { WorkspacesSystemSettingsProvider } from "../config/system";
import { RestoreWorkspaceConfig } from "../interop/types";
import { PlatformCommunicator } from "../interop/platformCommunicator";
import componentStateMonitor from "../componentStateMonitor";

export class ApplicationFactory {
    private readonly registry = createRegistry();
    private readonly WAIT_FOR_WINDOWS_TIMEOUT = 30000;
    private readonly idToWindowPromise: { [itemId: string]: Promise<void> } = {};

    constructor(
        private readonly _glue: Glue42Web.API,
        private readonly _stateResolver: LayoutStateResolver,
        private readonly _frameController: IFrameController,
        private readonly _manager: WorkspacesManager,
        private readonly _delayedExecutor: DelayedExecutor<void>,
        private readonly _platformCommunicator: PlatformCommunicator,
        private readonly _systemSettings: WorkspacesSystemSettingsProvider
    ) { }

    public async start(component: GoldenLayout.Component, workspaceId: string): Promise<void> {
        if (component.config.componentName === EmptyVisibleWindowName) {
            return;
        }

        if (this.idToWindowPromise[idAsString(component.config.id)]) {
            return this.idToWindowPromise[idAsString(component.config.id)];
        }

        const workspace = store.getById(workspaceId);

        if (!workspace) {
            return;
        }

        const startPromise = this.startCore(component, workspace);

        this.idToWindowPromise[idAsString(component.config.id)] = startPromise;

        const unsub = this._frameController.onFrameRemoved((frameId) => {
            if (frameId === idAsString(component.config.id)) {
                unsub();
                delete this.idToWindowPromise[frameId];
            }
        });

        return startPromise;
    }

    public getLoadingStrategy(systemSettings: WorkspacesSystemConfig, contentConfig: GoldenLayout.Config, restoreConfig?: RestoreWorkspaceConfig): LoadingStrategy {
        if (restoreConfig?.loadingStrategy) {
            return restoreConfig.loadingStrategy;
        } else if ((contentConfig?.workspacesOptions as any)?.loadingStrategy) {
            return (contentConfig.workspacesOptions as any).loadingStrategy;
        } else if (systemSettings?.loadingStrategy) {
            return systemSettings?.loadingStrategy?.defaultStrategy;
        }
    }

    public async startLazy(workspaceId: string): Promise<void[]> {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }
        const allComponentsInWorkspace = workspace.layout.root.getItemsByType("component");
        const result = this.getComponentsByVisibility(allComponentsInWorkspace.map((c) => c as GoldenLayout.Component));
        return Promise.all(result.visibleComponents.map((c) => this.start(c, workspaceId)));
    }

    public async startDelayed(workspaceId: string): Promise<void> {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }

        const allComponentsInWorkspace = workspace.layout.root.getItemsByType("component");
        const result = this.getComponentsByVisibility(allComponentsInWorkspace.map((c) => c as GoldenLayout.Component));
        const visiblePromises = result.visibleComponents.map((c) => this.start(c, workspaceId));

        const loadingStrategy = (await this._systemSettings.getSettings()).loadingStrategy;

        const loadPromises = Promise.all(visiblePromises).then(() => {
            return this._delayedExecutor.startExecution(
                result.notImmediatelyVisibleComponents.map((c) => ({
                    id: idAsString(c.config.id),
                    action: () => this.start(c, workspaceId)
                })),
                {
                    batchSize: loadingStrategy?.delayed?.batch || 1,
                    executionInterval: loadingStrategy?.delayed?.interval || 5000,
                    initialDelay: loadingStrategy?.delayed?.initialOffsetInterval || 1000
                }
            );
        });

        return loadPromises;
    }

    public async startDirect(workspaceId: string): Promise<void> {
        const workspace = store.getById(workspaceId);
        if (!workspace?.layout) {
            return;
        }
        const allComponentsInWorkspace = workspace.layout.root.getItemsByType("component");
        await Promise.all(allComponentsInWorkspace.map((c: GoldenLayout.Component) => {
            return this.start(c, workspaceId);
        }));
    }

    public onStarted(callback: (args: { summary: WindowSummary }) => void): UnsubscribeFunction {
        return this.registry.add("on-started", callback);
    }

    public onLoaded(callback: (args: { summary: WindowSummary }) => void): UnsubscribeFunction {
        return this.registry.add("on-loaded", callback);
    }

    public onFailed(callback: (args: { component: GoldenLayout.Component, workspaceId: string }) => void): UnsubscribeFunction {
        return this.registry.add("on-failed", callback);
    }

    public waitForWindows(workspaceId: string, windowComponentIds: string[]): Promise<void> {
        return new Promise<void>((res, rej) => {
            let loadedUnsub = () => { };
            let failedUnsub = () => { };
            let timeout: NodeJS.Timeout;


            const [ready, result] = this.waitFor(windowComponentIds.length, () => {
                res();
                loadedUnsub();
                failedUnsub();
                clearTimeout(timeout);
            });

            timeout = setTimeout(() => {
                rej(`Waiting for windows ${JSON.stringify(windowComponentIds)} in workspace ${workspaceId}, but only heard ${JSON.stringify(result())} in ${this.WAIT_FOR_WINDOWS_TIMEOUT} seconds`)
            }, this.WAIT_FOR_WINDOWS_TIMEOUT);

            loadedUnsub = this.onLoaded(({ summary }) => {
                if (summary.config.workspaceId === workspaceId && windowComponentIds.includes(summary.itemId)) {
                    ready(summary.itemId);
                }
            });

            failedUnsub = this.onFailed((args) => {
                if (args.workspaceId === workspaceId && windowComponentIds.includes(idAsString(args.component.config.id))) {
                    ready(args.component.config.id);
                }
            });
        });
    }

    public getUrlByAppName(appName: string): string {
        if (!appName) {
            return undefined;
        }
        return this._glue.appManager?.application(appName)?.userProperties?.details?.url;
    }

    private raiseFailed(component: GoldenLayout.Component, workspaceId: string): void {
        this.registry.execute("on-failed", { component, workspaceId });
    }

    private getTitleByAppName(appName: string): string {
        if (!appName) {
            return undefined;
        }
        return this._glue.appManager?.application(appName)?.title;
    }

    private getAppNameByWindowId(windowId: string): string {
        return this._glue.appManager?.instances()?.find(i => i.id === windowId)?.application?.name;
    }

    private waitFor(numberOfTriggers: number, callback: () => void): [(x: any) => void, () => void] {
        const triggersActivated = [] as any[];

        return [
            (x: any) => {
                triggersActivated.push(x);
                if (triggersActivated.length === numberOfTriggers) {
                    callback();
                }
            },
            () => triggersActivated
        ];
    }

    private validateTitle(title: string): string {
        if (!title?.length) {
            return undefined;
        }

        return title;
    }

    private getComponentsByVisibility(components: GoldenLayout.Component[]) {
        const visibleComponents = components.filter((c) => this._stateResolver.isWindowSelected(c.config.id));
        const notImmediatelyVisibleComponents = components.filter(c => !visibleComponents.includes(c));

        return {
            visibleComponents,
            notImmediatelyVisibleComponents
        };
    }

    private async startCore(component: GoldenLayout.Component, workspace: Workspace): Promise<void> {
        const newWindowBounds = getElementBounds(component.element);
        const { componentState } = component.config;
        const { title, appName } = componentState;
        let { windowId } = componentState;
        const componentId = idAsString(component.config.id);
        const applicationTitle = this.getTitleByAppName(appName);
        const windowTitle = this.validateTitle(title) || this.validateTitle(applicationTitle) || this.validateTitle(appName) || "Glue";
        const windowContext = component?.config.componentState?.context;
        let url = this.getUrlByAppName(componentState.appName) || (component.config.workspacesConfig as any)?.noAppWindowState?.createArgs?.url;

        const windowFromCollection = store.getWindow(componentId);
        const isNewWindow = !windowFromCollection || !store.getWindow(componentId).windowId;
        const isHibernatedWindow = workspace.hibernatedWindows.some(w => w.id === idAsString(component.config.id));

        store.addWindow({
            id: componentId,
            bounds: newWindowBounds,
            windowId,
            url,
            appName
        }, workspace.id);

        if (!url && windowId) {
            const win = this._glue.windows.list().find((w) => w.id === windowId);

            url = await win.getURL();
            const newlyAddedWindow = store.getWindow(componentId) as Window;

            newlyAddedWindow.url = url;
        }

        windowId = windowId || generateWindowId();

        if (component.config.componentState?.context) {
            delete component.config.componentState.context;
        }

        component.config.componentState.url = url;
        if (windowTitle) {
            component.setTitle(windowTitle);
            componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({ placementId: componentId, title: windowTitle });
        }
        if (isNewWindow && !isHibernatedWindow) {
            const windowSummary = this._stateResolver.getWindowSummarySync(component.config.id, component);
            this._manager.workspacesEventEmitter.raiseWindowEvent({
                action: "added",
                payload: {
                    windowSummary
                }
            });

            const glueWinOutsideOfWorkspace = this._glue.windows.findById(windowId);
            if (glueWinOutsideOfWorkspace) {
                try {
                    // Glue windows with the given id should be closed
                    await glueWinOutsideOfWorkspace.close();
                } catch (error) {
                    // because of chrome security policy this call can fail,
                    // however the opening of a new window should continue
                }
            }
        }

        try {
            await this._platformCommunicator.notifyFrameWillStart(windowId, appName, windowContext, windowTitle, workspace.id);
            await this._frameController.startFrame(componentId, url, undefined, windowId);
            const newlyAddedWindow = store.getWindow(componentId) as Window;

            component.config.componentState.windowId = windowId;
            newlyAddedWindow.windowId = windowId;
            componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({ placementId: componentId, windowId });

            const newlyOpenedWindow = this._glue.windows.findById(windowId);
            newlyOpenedWindow.getTitle().then((winTitle) => {
                if (this.validateTitle(windowTitle)) {
                    component.setTitle(winTitle);
                    componentStateMonitor.decoratedFactory.updateWorkspaceWindowTabs({ placementId: componentId, title: windowTitle });
                }
            }).catch((e) => {
                console.warn("Failed while setting the window title", e);
            });

            this._frameController.moveFrame(componentId, getElementBounds(component.element));
            if (isNewWindow && !isHibernatedWindow) {
                this._manager.workspacesEventEmitter.raiseWindowEvent({
                    action: "loaded",
                    payload: {
                        windowSummary: await this._stateResolver.getWindowSummary(componentId)
                    }
                });
            }

            if (!appName) {
                const appNameToUse = this.getAppNameByWindowId(windowId);
                if (!component.config.componentState) {
                    throw new Error(`Invalid state - the created component ${componentId} with windowId ${windowId} is missing its state object`);
                }
                component.config.componentState.appName = appNameToUse;

                newlyAddedWindow.appName = appNameToUse;
            }

            const maximizedItems = component.layoutManager.root.getItemsByFilter((ci) => ci.isMaximized && ci.type !== "component");
            const components = maximizedItems.reduce((acc, mi) => [...acc, ...mi.getItemsByFilter((ci) => ci.type === "component")], []);

            if (components.some(c => c === component)) {
                this._frameController.maximizeTab(componentId);
                this._frameController.selectionChanged([componentId], []);
            }

        } catch (error) {
            this.raiseFailed(component, workspace.id);

            if (url) {
                this._frameController.moveFrame(componentId, getElementBounds(component.element));
            } else {
                // Making sure the windowId is set so the platform can remove the window as well
                component.config.componentState.windowId = windowId;
                this._manager.closeTab(component, false);
            }
            // If a frame doesn't initialize properly remove its windowId
            component.config.componentState.windowId = undefined;

            const wsp = store.getById(workspace.id);
            if (!wsp) {
                throw new Error(`Workspace ${workspace.id} failed ot initialize because none of the specified windows were able to load
                Internal error: ${error}`);
            }
        } finally {
            workspace.hibernatedWindows = workspace.hibernatedWindows.filter((hw) => hw.id !== idAsString(component.config.id));
        }
    }
}