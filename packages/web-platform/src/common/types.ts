/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42 } from "@glue42/desktop";
import { Glue42Web } from "@glue42/web";
import { Decoder } from "decoder-validate";
import { Glue42WebPlatform } from "../../platform";
import { DBSchema } from "idb";
import { Glue42Core } from "@glue42/core";

export type Glue42API = Glue42.Glue;
export type Glue42Config = Glue42.Config;
export type LibDomains = "system" | "windows" | "appManager" | "layouts" | "workspaces" | "intents" | "channels" | "notifications" | "extension";

export interface OperationCheckConfig {
    operation: string;
}

export interface OperationCheckResult {
    isSupported: boolean;
}

export interface InternalWindowsConfig {
    windowResponseTimeoutMs: number;
    defaultWindowOpenBounds: Glue42Web.Windows.Bounds;
}

export interface InternalApplicationsConfig {
    local: Array<Glue42Web.AppManager.Definition | Glue42WebPlatform.Applications.FDC3Definition>;
    remote?: Glue42WebPlatform.RemoteStore;
}

export interface InternalLayoutsConfig {
    mode: "idb" | "session";
    local: Array<Glue42Web.Layouts.Layout>;
}

export interface Glue42CoreDB extends DBSchema {
    workspaceLayouts: {
        key: string;
        value: Glue42Web.Layouts.Layout;
    };
    autoLayouts: {
        key: string;
        value: Glue42Web.Layouts.Layout;
    };
    globalLayouts: {
        key: string;
        value: Glue42Web.Layouts.Layout;
    };
    serviceWorker: {
        key: "workerData";
        value: ServiceWorkerDbData;
    };
}

export interface ServiceWorkerDbData {
    platformUrl: string;
}

export interface InternalPlatformConfig {
    glueFactory?: (config?: Glue42Web.Config) => Promise<Glue42Web.API>;
    glue?: Glue42Web.Config;
    gateway?: Glue42WebPlatform.Gateway.Config;
    windows: InternalWindowsConfig;
    applications: InternalApplicationsConfig;
    layouts: InternalLayoutsConfig;
    channels: {
        definitions: Glue42WebPlatform.Channels.ChannelDefinition[];
    };
    plugins?: {
        definitions: Glue42WebPlatform.Plugins.PluginDefinition[];
    };
    serviceWorker?: Glue42WebPlatform.ServiceWorker.Config;
    workspaces?: Glue42WebPlatform.Workspaces.Config;
    corePlus?: Glue42WebPlatform.CorePlus.Config;
    connection: Glue42WebPlatform.Connection.Config;
    environment: any;
    workspacesFrameCache: boolean;
}

export interface CoreClientData {
    windowId: string;
    win: Window;
}

export interface LibController {
    start(config: InternalPlatformConfig): Promise<void>;
    handleControl(args: Glue42WebPlatform.ControlMessage): Promise<any>;
    handleClientUnloaded?(windowId: string, win: Window): void;
}

export interface SessionNonGlueData {
    windowId: string;
}

export interface SessionWindowData {
    windowId: string;
    name: string;
    initialBounds?: Glue42Web.Windows.Bounds;
    initialUrl?: string;
    initialContext?: any;
}

export interface WorkspaceWindowSession {
    windowId: string;
    frameId: string;
    initialTitle?: string;
}

export interface BridgeOperation {
    name: string;
    execute: (args: any, commandId: string) => Promise<any>;
    dataDecoder?: Decoder<any>;
    resultDecoder?: Decoder<any>;
}

export interface ModeExecutor {
    setup(): Promise<void>;
}

export interface ApplicationStartConfig {
    name: string;
    id?: string;
    context?: any;
    top?: number;
    left?: number;
    width?: number;
    height?: number;
    relativeTo?: string;
    relativeDirection?: "top" | "left" | "right" | "bottom";
    waitForAGMReady?: boolean;
    forceChromeTab?: boolean;
}

export type SystemOperationTypes = "getEnvironment" | "getBase" | "operationCheck";

export interface ClientTransportSwitchLock {
    promise: Promise<void>;
    lift: (value: void | PromiseLike<void>) => void;
    fail: (reason?: any) => void;
}

export interface Transaction<T> {
    id: string;
    lock: Promise<T>;
    lift: (value: T) => void;
    fail: (reason?: any) => void;
}

export interface TransportState extends Glue42Core.Connection.TransportSwitchSettings {
    transportName: string;
}

export interface ClientPortRequest {
    type: string;
    clientId: string;
    timeout?: number;
    args?: any;
}

export interface SessionSystemSettings {
    systemInstanceId: string;
    ctxTrackInstanceId: string;
}

export interface InterceptorInquiry {
    domain: LibDomains;
    operation: string;
}

export interface InterceptorInquiryResult {
    name: string;
    intercept: (config: Glue42WebPlatform.ControlMessage) => Promise<any>;
}

export interface InterceptorEntry {
    registrantName: string;
    domain: LibDomains;
    operation: string;
    callInterceptor: (config: Glue42WebPlatform.ControlMessage) => Promise<any>;
}

export interface PluginsConfig {
    platformConfig: InternalPlatformConfig;
    plugins?: Glue42WebPlatform.Plugins.PluginDefinition[];
    api: Glue42WebPlatform.API;
    handlePluginMessage: (args: Glue42WebPlatform.Plugins.BaseControlMessage, pluginName: string) => Promise<any>;
}