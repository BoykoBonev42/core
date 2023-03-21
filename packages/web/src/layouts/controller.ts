/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { IoC } from "../shared/ioc";
import { LibController } from "../shared/types";
import {
    default as CallbackRegistryFactory,
    CallbackRegistry,
    UnsubscribeFunction,
} from "callback-registry";
import { Glue42Web } from "../../web";
import { GlueBridge } from "../communication/bridge";
import { glueLayoutDecoder, importModeDecoder, layoutsOperationTypesDecoder, layoutTypeDecoder, newLayoutOptionsDecoder, nonEmptyStringDecoder, restoreOptionsDecoder } from "../shared/decoders";
import { AllLayoutsFullConfig, AllLayoutsSummariesResult, GetAllLayoutsConfig, LayoutParseResult, LayoutsImportConfig, operations, OptionalSimpleLayoutResult, RestoreLayoutConfig, SaveLayoutConfig, SaveRequestClientResponse, PlatformSaveRequestConfig, SimpleLayoutConfig, SimpleLayoutResult, PermissionStateResult, SimpleAvailabilityResult } from "./protocol";
import { WindowsController } from "../windows/controller";

export class LayoutsController implements LibController {
    private readonly defaultLayoutRestoreTimeoutMS = 120000;
    private readonly registry: CallbackRegistry = CallbackRegistryFactory();
    private bridge!: GlueBridge;
    private logger!: Glue42Web.Logger.API;
    private windowsController!: WindowsController;
    private saveRequestSubscription?: (info?: Glue42Web.Layouts.SaveRequestContext) => Glue42Web.Layouts.SaveRequestResponse;

    public handlePlatformShutdown(): void {
        this.registry.clear();
    }

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("layouts.controller.web");

        this.logger.trace("starting the web layouts controller");

        this.bridge = ioc.bridge;

        this.windowsController = ioc.windowsController;

        this.addOperationsExecutors();

        const api = this.toApi();

        this.logger.trace("no need for platform registration, attaching the layouts property to glue and returning");

        (coreGlue as Glue42Web.API).layouts = api;
    }

    public async handleBridgeMessage(args: any): Promise<void> {
        const operationName = layoutsOperationTypesDecoder.runWithException(args.operation);

        const operation = operations[operationName];

        if (!operation.execute) {
            return;
        }

        let operationData: any = args.data;

        if (operation.dataDecoder) {
            operationData = operation.dataDecoder.runWithException(args.data);
        }

        return await operation.execute(operationData);
    }

    private toApi(): Glue42Web.Layouts.API {
        const api: Glue42Web.Layouts.API = {
            get: this.get.bind(this),
            getAll: this.getAll.bind(this),
            export: this.export.bind(this),
            import: this.import.bind(this),
            save: this.save.bind(this),
            restore: this.restore.bind(this),
            remove: this.remove.bind(this),
            onAdded: this.onAdded.bind(this),
            onChanged: this.onChanged.bind(this),
            onRemoved: this.onRemoved.bind(this),
            onSaveRequested: this.subscribeOnSaveRequested.bind(this),
            getMultiScreenPermissionState: this.getGlobalPermissionState.bind(this),
            requestMultiScreenPermission: this.requestGlobalPermission.bind(this),
            getGlobalTypeState: this.checkGlobalActivated.bind(this)
        };

        return Object.freeze(api);
    }

    private addOperationsExecutors(): void {
        operations.layoutAdded.execute = this.handleOnAdded.bind(this);
        operations.layoutChanged.execute = this.handleOnChanged.bind(this);
        operations.layoutRemoved.execute = this.handleOnRemoved.bind(this);
        operations.clientSaveRequest.execute = this.handleSaveRequest.bind(this);
    }

    private async get(name: string, type: Glue42Web.Layouts.LayoutType): Promise<Glue42Web.Layouts.Layout | undefined> {
        nonEmptyStringDecoder.runWithException(name);
        layoutTypeDecoder.runWithException(type);

        const result = await this.bridge.send<SimpleLayoutConfig, OptionalSimpleLayoutResult>("layouts", operations.get, { name, type });

        return result.layout;
    }

    private async getAll(type: Glue42Web.Layouts.LayoutType): Promise<Glue42Web.Layouts.LayoutSummary[]> {
        layoutTypeDecoder.runWithException(type);

        const result = await this.bridge.send<GetAllLayoutsConfig, AllLayoutsSummariesResult>("layouts", operations.getAll, { type });

        return result.summaries;
    }

    private async export(type: Glue42Web.Layouts.LayoutType): Promise<Glue42Web.Layouts.Layout[]> {
        layoutTypeDecoder.runWithException(type);

        const result = await this.bridge.send<GetAllLayoutsConfig, AllLayoutsFullConfig>("layouts", operations.export, { type });

        return result.layouts;
    }

    private async import(layouts: Glue42Web.Layouts.Layout[], mode: "replace" | "merge" = "replace"): Promise<void> {
        importModeDecoder.runWithException(mode);

        if (!Array.isArray(layouts)) {
            throw new Error("Import must be called with an array of layouts");
        }

        if (layouts.length > 1000) {
            throw new Error("Cannot import more than 1000 layouts at once in Glue42 Core.");
        }

        const parseResult = layouts.reduce<LayoutParseResult>((soFar, layout) => {

            const decodeResult = glueLayoutDecoder.run(layout);

            if (decodeResult.ok) {
                soFar.valid.push(layout);
            } else {
                this.logger.warn(`A layout with name: ${layout.name} was not imported, because of error: ${JSON.stringify(decodeResult.error)}`);
            }

            return soFar;

        }, { valid: [] });

        const layoutsToImport = layouts.filter((layout) => parseResult.valid.some((validLayout) => validLayout.name === layout.name));

        await this.bridge.send<LayoutsImportConfig, void>("layouts", operations.import, { layouts: layoutsToImport, mode });
    }

    private async save(layout: Glue42Web.Layouts.NewLayoutOptions): Promise<Glue42Web.Layouts.Layout> {
        newLayoutOptionsDecoder.runWithException(layout);

        const saveResult = await this.bridge.send<SaveLayoutConfig, SimpleLayoutResult>("layouts", operations.save, { layout });

        return saveResult.layout;
    }

    private async restore(options: Glue42Web.Layouts.RestoreOptions): Promise<void> {
        restoreOptionsDecoder.runWithException(options);

        // the user-provided timeout needs to be doubled for the invocation in order to allow time for the Global Layouts plugin to correctly honor the user timeout.
        const invocationTimeout = options.timeout ? options.timeout * 2 : this.defaultLayoutRestoreTimeoutMS;

        await this.bridge.send<RestoreLayoutConfig, void>("layouts", operations.restore, { layout: options }, { methodResponseTimeoutMs: invocationTimeout });
    }

    private async remove(type: Glue42Web.Layouts.LayoutType, name: string): Promise<void> {
        layoutTypeDecoder.runWithException(type);
        nonEmptyStringDecoder.runWithException(name);

        await this.bridge.send<SimpleLayoutConfig, void>("layouts", operations.remove, { type, name });
    }

    private async handleSaveRequest(config: PlatformSaveRequestConfig): Promise<SaveRequestClientResponse> {
        const response: SaveRequestClientResponse = {};

        if (this.saveRequestSubscription) {
            try {
                const onSaveRequestResponse = this.saveRequestSubscription(config);

                response.windowContext = onSaveRequestResponse?.windowContext;
            } catch (error) {
                this.logger.warn(`An error was thrown by the onSaveRequested callback, ignoring the callback: ${JSON.stringify(error)}`);
            }
        }

        return response;
    }

    private async getGlobalPermissionState(): Promise<{ state: "prompt" | "granted" | "denied" }> {
        const requestResult = await this.bridge.send<void, PermissionStateResult>("layouts", operations.getGlobalPermissionState, undefined);

        return requestResult;
    }

    private async requestGlobalPermission(): Promise<{ permissionGranted: boolean }> {

        const currentState = (await this.getGlobalPermissionState()).state;

        if (currentState === "denied") {
            return { permissionGranted: false };
        }

        if (currentState === "granted") {
            return { permissionGranted: true };
        }

        const myWindow = this.windowsController.my();

        const amIWorkspaceFrame = (window as any).glue42core.isPlatformFrame;

        if (myWindow.name !== "Platform" && !amIWorkspaceFrame) {
            throw new Error("Cannot request permission for multi-window placement from any app other than the Platform.");
        }

        const requestResult = await this.bridge.send<void, SimpleAvailabilityResult>("layouts", operations.requestGlobalPermission, undefined, { methodResponseTimeoutMs: 180000 });

        return { permissionGranted: requestResult.isAvailable };
    }

    private async checkGlobalActivated(): Promise<{ activated: boolean }> {
        const requestResult = await this.bridge.send<void, SimpleAvailabilityResult>("layouts", operations.checkGlobalActivated, undefined);

        return { activated: requestResult.isAvailable };
    }

    private onAdded(callback: (layout: Glue42Web.Layouts.Layout) => void): UnsubscribeFunction {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.export("Global").then((layouts) => layouts.forEach((layout) => callback(layout))).catch(() => { });
        this.export("Workspace").then((layouts) => layouts.forEach((layout) => callback(layout))).catch(() => { });

        return this.registry.add(operations.layoutAdded.name, callback);
    }

    private onChanged(callback: (layout: Glue42Web.Layouts.Layout) => void): UnsubscribeFunction {
        return this.registry.add(operations.layoutChanged.name, callback);
    }

    private onRemoved(callback: (layout: Glue42Web.Layouts.Layout) => void): UnsubscribeFunction {
        return this.registry.add(operations.layoutRemoved.name, callback);
    }

    private subscribeOnSaveRequested(callback: (info?: Glue42Web.Layouts.SaveRequestContext) => Glue42Web.Layouts.SaveRequestResponse): () => void {
        if (typeof callback !== "function") {
            throw new Error("Cannot subscribe to onSaveRequested, because the provided argument is not a valid callback function.");
        }

        if (this.saveRequestSubscription) {
            throw new Error("Cannot subscribe to onSaveRequested, because this client has already subscribed and only one subscription is supported. Consider unsubscribing from the initial one.");
        }

        this.saveRequestSubscription = callback;

        return () => {
            delete this.saveRequestSubscription;
        };
    }

    private async handleOnAdded(layout: Glue42Web.Layouts.Layout): Promise<void> {
        this.registry.execute(operations.layoutAdded.name, layout);
    }

    private async handleOnChanged(layout: Glue42Web.Layouts.Layout): Promise<void> {
        this.registry.execute(operations.layoutChanged.name, layout);
    }

    private async handleOnRemoved(layout: Glue42Web.Layouts.Layout): Promise<void> {
        this.registry.execute(operations.layoutRemoved.name, layout);
    }
}