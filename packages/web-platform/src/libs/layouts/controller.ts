/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "@glue42/web";
import { defaultNoAppWindowComponentAppName } from "../../common/constants";
import { defaultPlatformConfig } from "../../common/defaultConfig";
import { BridgeOperation, InternalLayoutsConfig, InternalPlatformConfig, LibController, OperationCheckConfig, OperationCheckResult, SessionWindowData } from "../../common/types";
import { GlueController } from "../../controllers/glue";
import { SessionStorageController } from "../../controllers/session";
import { operationCheckConfigDecoder, operationCheckResultDecoder } from "../../shared/decoders";
import logger from "../../shared/logger";
import { PromiseWrap } from "../../shared/promisePlus";
import { extractErrorMsg, objEqual } from "../../shared/utils";
import { WindowsController } from "../windows/controller";
import { allLayoutsFullConfigDecoder, allLayoutsSummariesResultDecoder, getAllLayoutsConfigDecoder, layoutsImportConfigDecoder, layoutsOperationTypesDecoder, optionalSimpleLayoutResult, permissionStateResultDecoder, restoreLayoutConfigDecoder, saveLayoutConfigDecoder, saveRequestClientResponseDecoder, rawWindowsLayoutDataRequestConfigDecoder, windowsRawLayoutDataDecoder, simpleAvailabilityResultDecoder, simpleLayoutConfigDecoder } from "./decoders";
import { IdbLayoutsStore } from "./idbStore";
import { AllLayoutsFullConfig, AllLayoutsSummariesResult, GetAllLayoutsConfig, LayoutsImportConfig, LayoutsOperationTypes, OptionalSimpleLayoutResult, RestoreLayoutConfig, SaveLayoutConfig, RawWindowsLayoutDataRequestConfig, SaveRequestClientResponse, SimpleLayoutConfig, SimpleLayoutResult, WindowRawLayoutData, PermissionStateResult, SimpleAvailabilityResult, WindowsRawLayoutData } from "./types";

export class LayoutsController implements LibController {

    private started = false;
    private config!: InternalLayoutsConfig;

    public operations: { [key in LayoutsOperationTypes]: BridgeOperation } = {
        get: { name: "get", dataDecoder: simpleLayoutConfigDecoder, resultDecoder: optionalSimpleLayoutResult, execute: this.handleGetLayout.bind(this) },
        getAll: { name: "getAll", dataDecoder: getAllLayoutsConfigDecoder, resultDecoder: allLayoutsSummariesResultDecoder, execute: this.handleGetAll.bind(this) },
        export: { name: "export", dataDecoder: getAllLayoutsConfigDecoder, resultDecoder: allLayoutsFullConfigDecoder, execute: this.handleExport.bind(this) },
        import: { name: "import", dataDecoder: layoutsImportConfigDecoder, execute: this.handleImport.bind(this) },
        remove: { name: "remove", dataDecoder: simpleLayoutConfigDecoder, execute: this.handleRemove.bind(this) },
        save: { name: "save", dataDecoder: saveLayoutConfigDecoder, execute: this.handleSave.bind(this) },
        restore: { name: "restore", dataDecoder: restoreLayoutConfigDecoder, execute: this.handleRestore.bind(this) },
        getRawWindowsLayoutData: { name: "getRawWindowsLayoutData", dataDecoder: rawWindowsLayoutDataRequestConfigDecoder, resultDecoder: windowsRawLayoutDataDecoder, execute: this.handleGetRawWindowsLayoutData.bind(this) },
        clientSaveRequest: { name: "clientSaveRequest", dataDecoder: rawWindowsLayoutDataRequestConfigDecoder, resultDecoder: saveRequestClientResponseDecoder, execute: async () => { } },
        getGlobalPermissionState: { name: "getGlobalPermissionState", resultDecoder: permissionStateResultDecoder, execute: this.handleGetGlobalPermissionState.bind(this) },
        requestGlobalPermission: { name: "requestGlobalPermission", resultDecoder: simpleAvailabilityResultDecoder, execute: this.handleRequestGlobalPermission.bind(this) },
        checkGlobalActivated: { name: "checkGlobalActivated", resultDecoder: simpleAvailabilityResultDecoder, execute: this.handleCheckGlobalActivated.bind(this) },
        operationCheck: { name: "operationCheck", dataDecoder: operationCheckConfigDecoder, resultDecoder: operationCheckResultDecoder, execute: this.handleOperationCheck.bind(this) }
    };

    constructor(
        private readonly glueController: GlueController,
        private readonly idbStore: IdbLayoutsStore,
        private readonly sessionStore: SessionStorageController,
        private readonly windowsController: WindowsController
    ) { }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("layouts.controller");
    }

    public handlePlatformShutdown(): void {
        this.started = false;

        if (this.config.mode === "idb") {
            this.idbStore.clear("Global").catch((error) => this.logger?.warn(extractErrorMsg(error)));
            this.idbStore.clear("Workspace").catch((error) => this.logger?.warn(extractErrorMsg(error)));
        }
    }

    public async start(config: InternalPlatformConfig): Promise<void> {
        this.config = config.layouts;

        this.logger?.trace(`initializing with mode: ${this.config.mode}`);

        if (this.config.local && this.config.local.length) {

            const localGlobalLayouts = this.config.local.filter((layout) => layout.type === "Global");
            const localWorkspaceLayouts = this.config.local.filter((layout) => layout.type === "Workspace");

            await Promise.all([
                this.mergeImport(localGlobalLayouts, "Global"),
                this.mergeImport(localWorkspaceLayouts, "Workspace")
            ]);
        }

        this.started = true;

        this.logger?.trace("initialization is completed");
    }

    public async handleControl(args: any): Promise<any> {
        if (!this.started) {
            new Error("Cannot handle this windows control message, because the controller has not been started");
        }

        const layoutsData = args.data;

        const commandId = args.commandId;

        const operationValidation = layoutsOperationTypesDecoder.run(args.operation);

        if (!operationValidation.ok) {
            throw new Error(`This layouts request cannot be completed, because the operation name did not pass validation: ${JSON.stringify(operationValidation.error)}`);
        }

        const operationName: LayoutsOperationTypes = operationValidation.result;

        const incomingValidation = this.operations[operationName].dataDecoder?.run(layoutsData);

        if (incomingValidation && !incomingValidation.ok) {
            throw new Error(`Layouts request for ${operationName} rejected, because the provided arguments did not pass the validation: ${JSON.stringify(incomingValidation.error)}`);
        }

        this.logger?.debug(`[${commandId}] ${operationName} command is valid with data: ${JSON.stringify(layoutsData)}`);

        const result = await this.operations[operationName].execute(layoutsData, commandId);

        const resultValidation = this.operations[operationName].resultDecoder?.run(result);

        if (resultValidation && !resultValidation.ok) {
            throw new Error(`Layouts request for ${operationName} could not be completed, because the operation result did not pass the validation: ${JSON.stringify(resultValidation.error)}`);
        }

        this.logger?.trace(`[${commandId}] ${operationName} command was executed successfully`);

        return result;
    }

    public async handleSave(config: SaveLayoutConfig, commandId: string): Promise<SimpleLayoutResult> {
        this.logger?.trace(`[${commandId}] handling save layout with config: ${JSON.stringify(config)}`);

        throw new Error("This Web Platform cannot save Global Layouts.");
    }

    public async handleRestore(config: RestoreLayoutConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling restore layout with config: ${JSON.stringify(config)}`);

        throw new Error("This Web Platform cannot restore Global Layouts.");
    }

    public async handleGetAll(config: GetAllLayoutsConfig, commandId: string): Promise<AllLayoutsSummariesResult> {
        this.logger?.trace(`[${commandId}] handling get all layout summaries request for type: ${config.type}`);

        const allLayouts = await this.getAll(config.type);

        const summaries = allLayouts.map<Glue42Web.Layouts.LayoutSummary>((layout) => {
            return {
                name: layout.name,
                type: layout.type,
                context: layout.context,
                metadata: layout.metadata
            };
        });

        this.logger?.trace(`[${commandId}] all summaries have been compiled, responding to caller`);

        return { summaries };
    }

    public async handleExport(config: GetAllLayoutsConfig, commandId: string): Promise<AllLayoutsFullConfig> {
        this.logger?.trace(`[${commandId}] handling get all layout full request for type: ${config.type}`);

        const layouts = await this.getAll(config.type);

        this.logger?.trace(`[${commandId}] full layouts collection have been compiled, responding to caller`);

        return { layouts };
    }

    public async handleImport(config: LayoutsImportConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling mass import request for layout names: ${config.layouts.map((l) => l.name).join(", ")}`);

        const importExecution = config.mode === "merge" ? this.mergeImport.bind(this) : this.replaceImport.bind(this);

        this.logger?.trace(`[${commandId}] importing the layouts in ${config.mode} mode`);

        const workspaceLayouts = config.layouts.filter((layout) => layout.type === "Workspace");
        const globalLayouts = config.layouts.filter((layout) => layout.type === "Global");

        await Promise.all([
            importExecution(globalLayouts, "Global"),
            importExecution(workspaceLayouts, "Workspace")
        ]);

        this.logger?.trace(`[${commandId}] mass import completed, responding to caller`);
    }

    public async handleRemove(config: SimpleLayoutConfig, commandId: string): Promise<void> {
        this.logger?.trace(`[${commandId}] handling remove request for ${JSON.stringify(config)}`);

        const layout = (await this.getAll(config.type)).find((l) => l.name === config.name && l.type === config.type);

        if (layout) {
            await this.delete(config.name, config.type);
            this.emitStreamData("layoutRemoved", layout);
        }

        const operationMessage = layout ? "has been removed" : "has not been removed, because it does not exist";

        this.logger?.trace(`[${commandId}] ${config.name} of type ${config.type} ${operationMessage}`);
    }

    public async handleGetLayout(config: SimpleLayoutConfig, commandId: string): Promise<OptionalSimpleLayoutResult> {
        this.logger?.trace(`[${commandId}] handling get layout request for name: ${config.name} and type: ${config.type}`);

        const allLayouts = await this.getAll(config.type);

        const layout = allLayouts.find((l) => l.name === config.name);

        this.logger?.trace(`[${commandId}] request completed, responding to the caller`);

        return { layout };
    }

    public async handleGetRawWindowsLayoutData(config: RawWindowsLayoutDataRequestConfig, commandId: string): Promise<WindowsRawLayoutData> {
        this.logger?.trace(`[${commandId}] handling send save requests for layout: ${config.layoutName} to instances: ${config.instances?.join(", ")}`);

        const glueWindowsRawData = await Promise.all(
            this.getEligibleGlueWindows(config.instances, config.ignoreInstances).map((glueWindow) => this.buildRawGlueWindowData(glueWindow, config, commandId))
        );

        const nonGlueWindowsRawData = await Promise.all(
            this.getEligibleNonGlueWindows(config.instances, config.ignoreInstances).map((glueWindow) => this.buildRawNonGlueWindowData(glueWindow, config, commandId))
        );

        const result: WindowsRawLayoutData = {
            windows: [...glueWindowsRawData, ...nonGlueWindowsRawData]
        };

        this.logger?.trace(`[${commandId}] request completed, responding to the caller`);

        return result;
    }

    private async handleOperationCheck(config: OperationCheckConfig): Promise<OperationCheckResult> {
        const operations = Object.keys(this.operations);

        const isSupported = operations.some((operation) => operation.toLowerCase() === config.operation.toLowerCase());

        return { isSupported };
    }

    private async buildRawGlueWindowData(windowData: SessionWindowData, requestConfig: RawWindowsLayoutDataRequestConfig, commandId: string): Promise<WindowRawLayoutData> {
        const timeoutMessage = `Cannot fetch the layout save data from: ${windowData.name} with id: ${windowData.windowId}`;

        if (!windowData.initialUrl) {
            throw new Error(`Missing URL for client: ${windowData.name}`);
        }

        // the response will throw when communicating with an older Glue Web client which cannot service this message 
        const saveRequestResponse = await PromiseWrap<SaveRequestClientResponse>(async () => {
            try {
                const clientResponse = await this.glueController.callWindow<RawWindowsLayoutDataRequestConfig, SaveRequestClientResponse>("layouts", this.operations.clientSaveRequest, requestConfig, { windowId: windowData.windowId });
                return clientResponse;
            } catch (error) {
                return {};
            }

        }, 15000, timeoutMessage);

        const instanceData = this.sessionStore.getAllInstancesData().find((instance) => instance.id === windowData.windowId);

        const windowBounds = await this.windowsController.getWindowBounds(windowData.windowId, commandId);

        const clientProvidedContext = saveRequestResponse.windowContext ?? {};

        return {
            bounds: windowBounds,
            windowContext: clientProvidedContext,
            url: windowData.initialUrl,
            name: windowData.name,
            application: instanceData ? instanceData.applicationName : defaultNoAppWindowComponentAppName,
            initialContext: windowData.initialContext,
            windowId: windowData.windowId,
            layoutComponentId: windowData.layoutComponentId
        };
    }

    private async buildRawNonGlueWindowData(windowData: SessionWindowData, requestConfig: RawWindowsLayoutDataRequestConfig, commandId: string): Promise<WindowRawLayoutData> {
        if (!windowData.initialUrl) {
            throw new Error(`Missing URL for client: ${windowData.name}`);
        }

        const instanceData = this.sessionStore.getAllInstancesData().find((instance) => instance.id === windowData.windowId);

        return {
            bounds: windowData.initialBounds ?? defaultPlatformConfig.windows.defaultWindowOpenBounds,
            windowContext: {},
            url: windowData.initialUrl,
            name: windowData.name,
            application: instanceData ? instanceData.applicationName : defaultNoAppWindowComponentAppName,
            initialContext: windowData.initialContext,
            windowId: windowData.windowId,
            layoutComponentId: windowData.layoutComponentId
        };
    }

    public async handleGetGlobalPermissionState(args: unknown, commandId: string): Promise<PermissionStateResult> {
        this.logger?.trace(`[${commandId}] handling Get Global Permission State request`);

        const { state }: { state: "granted" | "prompt" | "denied" } = await (navigator as any).permissions.query({ name: "window-placement" });

        this.logger?.trace(`[${commandId}] request completed with state: ${state}, responding to the caller`);

        return { state };
    }

    public async handleRequestGlobalPermission(args: unknown, commandId: string): Promise<SimpleAvailabilityResult> {
        this.logger?.trace(`[${commandId}] handling Request Global Permission command`);

        const { state }: { state: "granted" | "prompt" | "denied" } = await (navigator as any).permissions.query({ name: "window-placement" });

        if (state === "granted") {
            return { isAvailable: true };
        }

        if (state === "denied") {
            return { isAvailable: false };
        }

        try {
            await (window as any).getScreenDetails();

            this.logger?.trace(`[${commandId}] request completed, responding to the caller`);

            return { isAvailable: true };
        } catch (error) {
            this.logger?.trace(`[${commandId}] request completed, responding to the caller`);

            return { isAvailable: false };
        }
    }

    public async handleCheckGlobalActivated(args: unknown, commandId: string): Promise<SimpleAvailabilityResult> {
        this.logger?.trace(`[${commandId}] handling Check Global Activated request`);

        this.logger?.trace(`[${commandId}] request completed, responding to the caller`);

        // if this request is not intercepted, then the Global Layouts are not activated
        return { isAvailable: false };
    }

    private emitStreamData(operation: "layoutChanged" | "layoutAdded" | "layoutRemoved", data: any): void {
        this.logger?.trace(`sending notification of event: ${operation} with data: ${JSON.stringify(data)}`);

        this.glueController.pushSystemMessage("layouts", operation, data);
    }

    private async mergeImport(layouts: Glue42Web.Layouts.Layout[], type: Glue42Web.Layouts.LayoutType): Promise<void> {
        const currentLayouts = await this.getAll(type);
        const pendingEvents: Array<{ operation: "layoutChanged" | "layoutAdded" | "layoutRemoved"; layout: Glue42Web.Layouts.Layout }> = [];

        for (const layout of layouts) {
            const defCurrentIdx = currentLayouts.findIndex((app) => app.name === layout.name);

            if (defCurrentIdx > -1 && !objEqual(layout, currentLayouts[defCurrentIdx])) {
                this.logger?.trace(`change detected at layout ${layout.name}`);
                pendingEvents.push({ operation: "layoutChanged", layout });

                currentLayouts[defCurrentIdx] = layout;

                continue;
            }

            if (defCurrentIdx < 0) {
                this.logger?.trace(`new layout: ${layout.name} detected, adding and announcing`);
                pendingEvents.push({ operation: "layoutAdded", layout });
                currentLayouts.push(layout);
            }
        }

        await this.cleanSave(currentLayouts, type);
        await this.announceEvents(pendingEvents);
    }

    private async replaceImport(layouts: Glue42Web.Layouts.Layout[], type: Glue42Web.Layouts.LayoutType): Promise<void> {
        const currentLayouts = await this.getAll(type);
        const pendingEvents: Array<{ operation: "layoutChanged" | "layoutAdded" | "layoutRemoved"; layout: Glue42Web.Layouts.Layout }> = [];

        for (const layout of layouts) {
            const defCurrentIdx = currentLayouts.findIndex((app) => app.name === layout.name);

            if (defCurrentIdx < 0) {
                this.logger?.trace(`new layout: ${layout.name} detected, adding and announcing`);
                pendingEvents.push({ operation: "layoutAdded", layout });
                continue;
            }

            if (!objEqual(layout, currentLayouts[defCurrentIdx])) {
                this.logger?.trace(`change detected at layout ${layout.name}`);
                pendingEvents.push({ operation: "layoutChanged", layout });
            }

            currentLayouts.splice(defCurrentIdx, 1);
        }

        // everything that is left in the old snap here, means it is removed in the latest one
        currentLayouts.forEach((layout) => {
            this.logger?.trace(`layout ${layout.name} missing, removing and announcing`);
            pendingEvents.push({ operation: "layoutRemoved", layout });
        });

        await this.cleanSave(layouts, type);
        await this.announceEvents(pendingEvents);
    }

    private async announceEvents(events: Array<{ operation: "layoutChanged" | "layoutAdded" | "layoutRemoved", layout: Glue42Web.Layouts.Layout }>): Promise<void> {

        let batchCount = 0;

        for (const event of events) {
            ++batchCount;

            if (batchCount % 10 === 0) {
                await this.waitEventFlush();
            }

            this.emitStreamData(event.operation, event.layout);
        }
    }

    private async getAll(type: Glue42Web.Layouts.LayoutType): Promise<Glue42Web.Layouts.Layout[]> {
        let all: Glue42Web.Layouts.Layout[];

        if (this.config.mode === "idb") {
            all = await this.idbStore.getAll(type);
        } else {
            all = this.sessionStore.getLayoutSnapshot(type).layouts;
        }

        return all;
    }

    private async cleanSave(layouts: Glue42Web.Layouts.Layout[], type: Glue42Web.Layouts.LayoutType): Promise<void> {
        if (this.config.mode === "idb") {
            await this.idbStore.clear(type);

            for (const layout of layouts) {
                await this.idbStore.store(layout, layout.type);
            }
            return;
        }

        this.sessionStore.saveLayoutSnapshot({ layouts }, type);
    }

    private async delete(name: string, type: Glue42Web.Layouts.LayoutType): Promise<void> {
        if (this.config.mode === "idb") {
            await this.idbStore.delete(name, type);
            return;
        }

        const all = this.sessionStore.getLayoutSnapshot(type).layouts;

        const idxToRemove = all.findIndex((l) => l.name === name && l.type);

        if (idxToRemove > -1) {
            all.splice(idxToRemove, 1);
        }

        this.sessionStore.saveLayoutSnapshot({ layouts: all }, type);
    }

    private getEligibleNonGlueWindows(requestedInstances?: string[], ignoreInstances?: string[]): SessionWindowData[] {
        const allEligibleWindows = this.getAllEligibleWindows(requestedInstances, ignoreInstances);

        const allNonGlueWindows = this.sessionStore.getAllNonGlue();

        const allWorkspaceClients = this.sessionStore.pickWorkspaceClients(() => true);

        return allEligibleWindows
            .filter((eligibleWindow) =>
                allNonGlueWindows.some((nonGlueWebWindow) => nonGlueWebWindow.windowId === eligibleWindow.windowId) &&
                allWorkspaceClients.every((workspaceClient) => workspaceClient.windowId !== eligibleWindow.windowId)
            );
    }

    private getEligibleGlueWorkspaceWindows(requestedInstances?: string[], ignoreInstances?: string[]): SessionWindowData[] {
        let allEligibleWindows = this.getAllEligibleWindows(requestedInstances, ignoreInstances);

        const allNonGlueWindows = this.sessionStore.getAllNonGlue();

        allEligibleWindows = allEligibleWindows.filter((eligibleWindow) => allNonGlueWindows.every((nonGlueWebWindow) => nonGlueWebWindow.windowId !== eligibleWindow.windowId));

        const allWorkspaceClients = this.sessionStore.pickWorkspaceClients(() => true);

        const allFrames = this.sessionStore.getAllFrames();

        const platformFrame = allFrames.find((frame) => frame.isPlatform);

        return allEligibleWindows
            .filter((eligibleWindow) => {
                const correspondingWorkspaceWindow = allWorkspaceClients.find((wspClient) => wspClient.windowId === eligibleWindow.windowId);

                if (platformFrame) {
                    return !(correspondingWorkspaceWindow && correspondingWorkspaceWindow.frameId === platformFrame.windowId);
                }

                return !!correspondingWorkspaceWindow;
            });
    }

    private getEligibleGlueWindows(requestedInstances?: string[], ignoreInstances?: string[]): SessionWindowData[] {
        const allEligibleWindows = this.getAllEligibleWindows(requestedInstances, ignoreInstances);

        const allNonGlueWindows = this.sessionStore.getAllNonGlue();

        const allWorkspaceClients = this.sessionStore.pickWorkspaceClients(() => true);

        return allEligibleWindows
            .filter((eligibleWindow) =>
                allWorkspaceClients.every((workspaceClient) => workspaceClient.windowId !== eligibleWindow.windowId) &&
                allNonGlueWindows.every((nonGlueWebWindow) => nonGlueWebWindow.windowId !== eligibleWindow.windowId)
            );
    }

    private getAllEligibleWindows(requestedInstances?: string[], ignoreInstances?: string[]): SessionWindowData[] {
        let allNonPlatformWindows = this.sessionStore.getAllWindowsData().filter((webWindow) => webWindow.name !== "Platform");

        if (requestedInstances && requestedInstances.length) {
            const requestedServers = this.glueController.getServers().filter((server) => requestedInstances.some((instanceId) => server.instance === instanceId));

            allNonPlatformWindows = allNonPlatformWindows.filter((eligibleWindow) => requestedServers.some((server) => server.windowId === eligibleWindow.windowId));
        }

        if (ignoreInstances && ignoreInstances.length) {
            const ignoredServers = this.glueController.getServers().filter((server) => ignoreInstances.some((instanceId) => server.instance === instanceId));

            allNonPlatformWindows = allNonPlatformWindows.filter((eligibleWindow) => ignoredServers.every((server) => server.windowId !== eligibleWindow.windowId));
        }

        return allNonPlatformWindows;
    }

    private waitEventFlush(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 10));
    }
}
