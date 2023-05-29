import { Glue42Web } from "@glue42/web";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type IntentsOperationTypes = "findIntent" | "getIntents" | "raiseIntent" | "operationCheck" | "raise";

export type IntentRequestResolverConfig = {
    enabled?: boolean;
    appName: string;
    waitResponseTimeout: number
}

export type ResolverInstance = {
    instanceId?: string;
}

export type ShouldResolverOpen = {
    open: boolean;
    reason?: string
}

export type IntentRequestTarget = "startNew" | "reuse" | { app?: string; instance?: string };

export interface IntentRequest {
    intent: string;
    target?: IntentRequestTarget;
    context?: Glue42Web.Intents.IntentContext;
    options?: Glue42Web.AppManager.ApplicationStartOptions;
    handlers?: Glue42Web.Intents.IntentHandler[];
    timeout?: number,
    waitUserResponseIndefinitely?: boolean;
}

export interface WaitForMethodOptions {
    instanceId?: string;
    waitTimeoutMs?: number;
    errorMsg?: string;
}

export interface ResolverIntentHandler {
    applicationName: string;
    applicationIcon?: string;
    instanceId?: string;
}

export interface RaiseIntentRequestWithResolverConfig {
    intentRequest: IntentRequest;
    resolverConfig: IntentRequestResolverConfig;
}

export interface IntentInfo {
    name: string;
    displayName?: string;
    contexts: string[];
    resultType?: string;
}

export interface AppDefinitionWithIntents {
    name: string;
    title: string;
    caption?: string;
    icon?: string;
    intents: IntentInfo[];
}

export interface IntentStore {
    [name: string]: Glue42Web.Intents.IntentHandler[];
}

export interface WrappedIntentFilter {
    filter?: Glue42Web.Intents.IntentFilter;
}

export interface WrappedIntents {
    intents: Glue42Web.Intents.Intent[];
}

export interface IntentsResolverResponse {
    intent: string;
    handler: Glue42Web.Intents.IntentHandler;
}

export interface IntentsResolverResponsePromise {
    intent: string;
    methodName: string;
    promise: Promise<IntentsResolverResponse>;
    resolve: (arg: IntentsResolverResponse) => void;
    reject: (reason: string) => void;
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

export interface IntentResolverTarget {
    app?: string;
    instance?: string;
}

export interface StartResolverAppArgs {
    requestWithResolverInfo: RaiseIntentRequestWithResolverConfig;
    callerId: string;
    commandId: string;
    resolverInstance?: ResolverInstance;
}

export interface CoreRaiseIntentArgs {
    request: RaiseIntentRequestWithResolverConfig;
    resolverInstance: ResolverInstance;
    timeout: number;
    commandId: string;
    callerId: string
}
