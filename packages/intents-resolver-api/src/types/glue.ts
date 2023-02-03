import { ResolverIntentHandler, IntentsResolver } from './types';

export type Intent = {
    name: string;
    handlers:  IntentHandler[];
}

export interface IntentHandler {
    applicationName: string;
    applicationTitle: string;
    applicationDescription?: string;
    applicationIcon?: string;
    contextTypes?: string[];
    displayName?: string;
    instanceId?: string;
    instanceTitle?: string;
    resultType?: string;
    type: "app" | "instance";
}

export interface IntentContext {
    readonly type?: string;
    readonly data?: { [key: string]: any };
}

export interface IntentRequest {
    readonly intent: string;
    readonly target?: "startNew" | "reuse" | { app?: string; instance?: string };
    readonly context?: IntentContext;
    readonly options?: ApplicationStartOptions;
    readonly handlers?: IntentHandler[]
}

export type SharedContext = {
    callerId: string;
    intent: string | IntentRequest;
    methodName: string;
}

export type IntentHandlersResponse = {
    instances: ResolverIntentHandler[];
    applications: ResolverIntentHandler[];
}

export type UnsubscribeFunction = () => void;

type IntentResult = {
    request: IntentRequest;
    handler: ResolverIntentHandler;
    result?: any;
}

export interface AddIntentListenerRequest {
    intent: string;
    contextTypes?: string[];
    displayName?: string;
    icon?: string;
    description?: string;
    resultType?: string;
}

type IntentFilter = {
    name?: string;
    contextType?: string;
}

export interface IntentInfo {
    name: string;
    displayName?: string;
    contexts: string[];
    resultType?: string;
}

type InstanceTarget = "best" | "all" | "skipMine" | { windowId?: string, instance?: string } | ServerInstance[];

type InteropMethodFilter = { name: string };

interface ApplicationStartOptions {
    top?: number;
    left?: number;
    width?: number;
    height?: number;
    relativeTo?: string;
    relativeDirection?: "top" | "left" | "right" | "bottom";
    waitForAGMReady?: boolean;
}

interface InteropInstance {
    api: string;
    application: string;
    applicationName: string;
    instance: string;
    environment: string;
    isLocal: boolean;
    peerId: string;
    pid: number;
    region: string;
    service: string;
    user: string;
    windowId: string;
}
export interface Instance {
    agm: InteropInstance,
    application: Application;
    id: string;
    getContext(): Promise<any>;
    stop(): Promise<void>;
}

export interface Application {
    name: string;
    instances: Instance[],
    userProperties: { [key: string]: any };
    title?: string;
    caption?: string;
    version?: string;
    icon?: string;
}

interface IntentsAPI {
    raise(request: string | IntentRequest): Promise<IntentResult>;
    all(): Promise<Intent[]>;
    addIntentListener(intent: string | AddIntentListenerRequest, handler: (context: IntentContext) => any): { unsubscribe: () => void };
    find(intentFilter?: string | IntentFilter): Promise<Intent[]>;
    resolver?: IntentsResolver
}

export interface ServerInstance {
    api: string;
    application: string;
    applicationName: string;
    environment: string;
    instance: string;
    isLocal: boolean;
    machine: string;
    peerId: string;
    pid: string;
    region: string;
    service: string;
    user: string;
    windowId: string;
    getMethods(): InteropMethod[]
}

interface InvocationResultCore {
    called_with: any;
    executed_by: InteropInstance;
    message: string;
    method: InteropMethod;
    returned: any;
    status: number;
}
export interface InvocationResult {
    all_errors: string[];
    all_return_values: InvocationResultCore[];
    called_with: any;
    executed_by: ServerInstance;
    message: string;
    method: InteropMethod;
    returned: any;
    status: number;
}

interface InteropMethod {
    accepts?: string;
    description?: string;
    displayName?: string;
    flags: { [key: string]: any };
    name: string;
    objectTypes: string[];
    returns?: string;
    supportsStreaming: boolean;
    version?: number;
    getServers(): ServerInstance[];
}

interface InteropAPI {
    instance: ServerInstance;
    servers(): ServerInstance[];
    register<T=any, R=any>(name: string, handler: (args: T, caller: ServerInstance) => void | R | Promise<R>): Promise<void>;
    unregister(name: string): void;
    invoke(methodName: string, argumentObj: any, target?: InstanceTarget): Promise<InvocationResult>;
    methods(filter?: string | InteropMethodFilter ): InteropMethod[];
    methodAdded(cb: (method: InteropMethod) => void): UnsubscribeFunction;
    serverMethodAdded(cb: (info: { server: ServerInstance, method: InteropMethod }) => void): UnsubscribeFunction;
    serverMethodRemoved(cb: (info: { server: ServerInstance, method: InteropMethod }) => void): UnsubscribeFunction;
}

interface AppManagerAPI {
    myInstance: Instance | undefined;
    applications(): Application[];
    application(name: string): Application | undefined;
    instances(): Instance[];
    onInstanceStarted(callback: (instance: Instance) => void): UnsubscribeFunction;
    onInstanceStopped(callback: (instance: Instance) => void): UnsubscribeFunction;
    onAppAdded(callback: (app: Application) => void): UnsubscribeFunction;
    onAppRemoved(callback: (app: Application) => void): UnsubscribeFunction;
}

interface WebWindow {
    id: string;
    name: string;
    getTitle(): Promise<string>;
    close(): Promise<WebWindow>;
    getContext(): Promise<any>;
}

export type RelativeDirection = "top" | "left" | "right" | "bottom";

export interface WindowSettings {
    top?: number;
    left?: number;
    width?: number;
    height?: number;
    context?: any;
    relativeTo?: string;
    relativeDirection?: RelativeDirection;
}

interface WindowsAPI {
    findById(id: string): WebWindow;
    my(): WebWindow;
}
export interface Glue42 {
    intents: IntentsAPI;
    interop: InteropAPI;
    appManager: AppManagerAPI;
    windows: WindowsAPI; 
}