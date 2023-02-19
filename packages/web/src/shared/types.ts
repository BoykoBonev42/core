/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42 } from "@glue42/desktop";
import { Decoder } from "decoder-validate";
import { Glue42Web } from "../../web";
import { IoC } from "./ioc";

export interface ParsedConfig extends Glue42Web.Config {
    logger: any;
    exposeGlue: boolean;
    isPlatformInternal: boolean;
    libraries: Array<(glue: Glue42Web.API, config?: Glue42Web.Config | Glue42.Config) => Promise<void>>;
    identity?: { [key: string]: string | number | boolean };
}

export interface LibController {
    start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void>;
    handleBridgeMessage(args: any): Promise<void>;
}

export type LibDomains = "system" | "windows" | "appManager" | "layouts" | "notifications" | "intents" | "channels" | "extension" | "themes";

export interface BridgeOperation {
    name: string;
    dataDecoder?: Decoder<any>;
    resultDecoder?: Decoder<any>;
    execute?: (args: any) => Promise<any>;
}

export type PlatformMessages = "transportSwitchRequest" | "transportSwitchResponse" | "getCurrentTransport" |
    "platformUnload" | "getCurrentTransportResponse" | "checkPreferredLogic" | "checkPreferredConnection" |
    "checkPreferredLogicResponse" | "checkPreferredConnectionResponse";

export interface Transaction<T> {
    id: string;
    lock: Promise<T>;
    lift: (value: T) => void;
    fail: (reason?: any) => void;
}

export interface TransportState extends Glue42Core.Connection.TransportSwitchSettings {
    transportName: string;
}

export interface SessionWebSettings {
    clientInstanceId: string;
}

export interface IntentsResolverStartContext {
    intent: string | Glue42Web.Intents.IntentRequest;
    callerId: string;
    methodName: string;
}

export interface IntentResolverResponse {
    intent: string;
    handler: Glue42Web.Intents.IntentHandler;
}

export type ShouldResolverOpen = {
    open: boolean;
    reason?: string
}

export interface IntentRequestResolverConfig {
    enabled: boolean;
    appName: string;
    waitResponseTimeout: number;
}

export interface IntentRequestWithResolverInfo {
    intentRequest: Glue42Web.Intents.IntentRequest;
    resolverConfig: IntentRequestResolverConfig;
}

export interface IsRaiseOperationSupported {
    supported: boolean;
    reason?: string;
}

export interface ResolverIntentHandler {
    applicationName?: string;
    applicationIcon?: string;
    instanceId?: string;
}

export interface Glue42EventPayload {
    glue42core?: any;
    glue42?: any;
}

export interface SimpleItemIdRequest {
    itemId: string;
}

export interface WorkspaceFrameBoundsResult {
    bounds: Glue42Web.Windows.Bounds;
}

export interface OperationCheckResult {
    isSupported: boolean;
}

export interface OperationCheckConfig {
    operation: string;
}
