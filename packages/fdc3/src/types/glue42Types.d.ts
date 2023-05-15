type ApplicationStartOptions = {
    waitForAGMReady?: boolean;
    ignoreSavedLayout?: boolean;
}

type ChannelContext = {
    name: string;
    meta: any;
    data: any;
}

export type GlueIntent = {
    name: string;
    handlers: GlueIntentHandler[];
}

export type GlueIntentContext = {
    type: string;
    data: any;
}

export type didCallbackReplayed = { replayed: boolean };

type IntentContext = {
    type?: string;
    data?: { [key: string]: any };
}

export type GlueIntentRequest = {
    intent: string;
    target?: "startNew" | "reuse" | { app?: string; instance?: string };
    context?: IntentContext;
    options?: ApplicationStartOptions;
    handlers?: GlueIntentHandler[];
}

export type GlueIntentHandler = {
    applicationName: string;
    applicationTitle: string;
    applicationDescription?: string;
    applicationIcon?: string;
    type: "app" | "instance";
    displayName?: string;
    contextTypes?: string[];
    instanceId?: string;
    instanceTitle?: string;
    resultType?: string;
}

type IntentResult = {
    request: GlueIntentRequest;
    handler: GlueIntentHandler;
    result?: any;
}

type AddIntentListenerRequest = {
    intent: string;
    contextTypes?: string[];
    displayName?: string;
    icon?: string;
    description?: string;
}

type IntentFilter = {
    name?: string;
    contextType?: string;
    resultType?: string;
}

type UnsubscribeFunction = {
    (): void;
}

type Application = {
    name: string;
    title?: string;
    version?: string;
    icon?: string;
    caption?: string;
    userProperties: any;
    instances: Instance[];
    start(context?: object, options?: ApplicationStartOptions): Promise<Instance>;
    onInstanceStarted(callback: (instance: Instance) => any): void;
    onInstanceStopped(callback: (instance: Instance) => any): void;
    getConfiguration(): Promise<any>;
}

type Instance = {
    id: string;
    application: Application;
    activity: any;
    activityInstances: Instance[];
    activityOwnerInstance: Instance;
    window: any;
    context: object;
    title: string;
    isActivityInstance: boolean;
    activityId: string;
    inActivity: boolean;
    isSingleWindowApp: boolean;
    agm: any;
    stop(): Promise<void>;
    activate(): Promise<any>;
    onAgmReady(callback: (instance: Instance) => any): UnsubscribeFunction;
    onStopped(callback: (instance: Instance) => any): UnsubscribeFunction;
    getContext(): Promise<object>;
    getWindow(): Promise<any>;
}

type ImportResult = {
    imported: string[];
    errors: Array<{ app: string; error: string }>;
}

type PathValue = {
    path: string;
    value: any;
}

type GDWindow = {
    id: string;
    getContext(): Promise<any>;
}

type InstanceTarget = "best" | "all" | "skipMine" | { instance: string } | ServerInstance[];

interface ChannelsAPI {
    subscribe(callback: (data: any, context: ChannelContext, updaterId: string) => void): () => void;
    subscribeFor(name: string, callback: (data: any, context: ChannelContext, updaterId: string) => void): Promise<() => void>;
    publish(data: any, name?: string): Promise<void>;
    all(): Promise<string[]>;
    list(): Promise<ChannelContext[]>;
    get(name: string): Promise<ChannelContext>;
    getMy(): Promise<ChannelContext>;
    join(name: string, windowId?: string): Promise<void>;
    leave(windowId?: string): Promise<void>;
    my(): string;
    onChanged(callback: (channel: string) => void): () => void;
    add(info: ChannelContext): Promise<ChannelContext>;
    current(): string;
    changed(callback: (channel: string) => void): () => void;
}

interface IntentsAPI {
    raise(request: string | GlueIntentRequest): Promise<IntentResult>;
    all(): Promise<GlueIntent[]>;
    addIntentListener(intent: string | AddIntentListenerRequest, handler: (context: IntentContext) => any): { unsubscribe: UnsubscribeFunction };
    register?(intent: string | AddIntentListenerRequest, handler: (context: IntentContext) => any): { unsubscribe: UnsubscribeFunction };
    find(intentFilter?: string | IntentFilter): Promise<GlueIntent[]>;
}

interface AppManagerAPI {
    myInstance: Instance;
    inMemory: InMemoryStore;
    application(name: string): Application;
    applications(): Application[];
    instances(): Instance[];
    onInstanceStarted(callback: (instance: Instance) => any): UnsubscribeFunction;
    onInstanceStartFailed(callback: (instance: Instance) => any): UnsubscribeFunction;
    onInstanceStopped(callback: (instance: Instance) => any): UnsubscribeFunction;
    onInstanceUpdated(callback: (instance: Instance) => any): UnsubscribeFunction;
    onAppAdded(callback: (app: Application) => any): UnsubscribeFunction;
    onAppRemoved(callback: (app: Application) => any): UnsubscribeFunction;
    onAppAvailable(callback: (app: Application) => any): UnsubscribeFunction;
    onAppUnavailable(callback: (app: Application) => any): UnsubscribeFunction;
    onAppChanged(callback: (app: Application) => any): UnsubscribeFunction;
}

interface WindowsAPI {
    my(): GDWindow;
}

export interface ServerMethodFilter {
    accepts?: string;
    description?: string;
    displayName?: string;
    name?: string;
    objectTypes?: string[];
    returns?: string;
}

export interface ServerInstance {
    peerId: string;
    instance: string;
    applicationName: string;
    windowId: string;
    getMethods(): InteropMethod[]
}

interface InteropMethodDefinition {
    name: string;
    objectTypes?: string[];
    displayName?: string;
    accepts?: string;
    returns?: string;
    description?: string;
    version?: number;
    supportsStreaming?: boolean;
    flags?: { [key: string]: any };
    getServers?(): ServerInstance[];
}

interface InteropMethod extends InteropMethodDefinition {
    objectTypes: string[];
    supportsStreaming: boolean;
    flags: { [key: string]: any };
    getServers(): ServerInstance[];
}

interface InteropMethodFilter {
    name: string;
}

interface InvocationResultCore<T> {
    called_with: any;
    executed_by: ServerInstance;
    message: string;
    method: InteropMethodDefinition;
    returned: T;
    status: number;
}
export interface InvocationResult<T> {
    all_errors: any[];
    all_return_values: InvocationResultCore<T>[];
    called_with: any;
    executed_by: ServerInstance;
    message: string;
    method: InteropMethodDefinition;
    returned: T;
    status: number;
}

interface InteropAPI {
    instance: ServerInstance;
    servers(methodFilter?: ServerMethodFilter): ServerInstance[];
    register<T = any, R = any>(name: string, handler: (args: T, caller: ServerInstance) => void | R | Promise<R>): Promise<void>;
    unregister(name: string): Promise<void>;
    invoke<T>(methodName: string, argumentObj: any, target?: InstanceTarget): Promise<InvocationResult<T>>;
    methods(filter?: string | InteropMethodFilter): InteropMethod[]
}

interface ContextsAPI {
    setPathSupported: boolean;
    all(): string[];
    update(name: string, data: any): Promise<void>;
    set(name: string, data: any): Promise<void>;
    setPath(name: string, path: string, data: any): Promise<void>;
    setPaths(name: string, paths: PathValue[]): Promise<void>;
    subscribe(name: string, callback: (data: any, delta: any, removed: string[], unsubscribe: () => void, extraData?: any) => void): Promise<() => void>;
    get(name: string): Promise<any>;
    destroy(name: string): Promise<any>;
}

export type GlueValidator = {
    isValid: boolean;
    error?: { message: string }
}

export type Definition = {
    name: string;
    type: string;
    title?: string;
    version?: string;
    details: any;
    customProperties?: any;
    icon?: string;
    caption?: string;
    intents?: GlueIntent[];
    allowCapture?: boolean;
}

export type FDC3Definition = {
    name: string;
    title?: string;
    version?: string;
    appId: string;
    manifest: string;
    manifestType: string;
    tooltip?: string;
    description?: string;
    contactEmail?: string;
    supportEmail?: string;
    publisher?: string;
    images?: any[];
    icons?: any[];
    customConfig?: any;
    intents?: GlueIntent[];
}

export type InMemoryStore = {
    import(definitions: Array<Definition | FDC3Definition>, mode?: "replace" | "merge"): Promise<ImportResult>;
    export(): Promise<Definition[]>;
    remove(name: string): Promise<void>;
    clear(): Promise<void>;
}

export type Config = {
    application?: string;
    contexts?: any;
    bus?: boolean;
    logger?: any;
    customLogger?: any;
}

export type Glue42GD = {
    fdc3InitsGlue: boolean;
    originalGlue?: any;
};

export type Glue42FDC3ChannelContext = {
    data: any;
    latest_fdc3_type: string;
}

export interface SystemMethodEventPayload {
    channelId: string;
    clientId: string;
    contextType?: string | null;
    replayContextTypes?: string[];
}
export interface SystemMethodEventArgument {
    action: string;
    payload: SystemMethodEventPayload
}

export interface ContextListenerInvokedArgument {
    listenerInvoked: boolean;
}

export type LogLevel = "off" | "trace" | "debug" | "info" | "warn" | "error";

export interface Logger {

    /** Name of the logger. */
    name: string;

    /** Version of the Logging API. */
    version?: string;

    /**
     * Creates a new logger which is a sub-logger of the current one.
     * @param name Name for the sub-logger.
     */
    subLogger(name: string): Logger;

    /**
     * Sets or gets the current threshold level for publishing to a file.
     * @param level Logger level.
     */
    publishLevel(level?: LogLevel): LogLevel | undefined;

    /**
     * Sets or gets the current threshold level for writing to the console.
     * @param level Logger level.
     */
    consoleLevel(level?: LogLevel): LogLevel | undefined;

    /**
     * Logging method.
     * @param message Message to log.
     * @param level Logging level for the message.
     */
    log(message: string, level?: LogLevel): void;

    /**
     * Method for logging messages at "trace" level.
     * @param message Message to log.
     */
    trace(message: string): void;

    /**
     * Method for logging messages at "debug" level.
     * @param message Message to log.
     */
    debug(message: string): void;

    /**
     * Method for logging messages at "info" level.
     * @param message Message to log.
     */
    info(message: string): void;

    /**
     * Method for logging messages at "warn" level.
     * @param message Message to log.
     */
    warn(message: string): void;

    /**
     * Method for logging messages at "error" level.
     * @param message Message to log.
     */
    error(message: string, err?: Error): void;

    /**
     * Checks if the logger can publish a log level
     * @param level
     */
    canPublish(level: LogLevel): boolean;
}



export interface Glue42 {
    contexts: ContextsAPI
    channels: ChannelsAPI;
    intents: IntentsAPI;
    interop: InteropAPI;
    appManager: AppManagerAPI;
    windows: any;
    version?: string;
    logger: Logger;
}