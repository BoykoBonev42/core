import { Glue42Web } from "../../../packages/web/web";
import { Glue42WebPlatform } from "../../../packages/web-platform/platform";
import { Glue42Core } from "../../../packages/core/glue";
import { UnsubscribeFunction } from "callback-registry";
import { AppIdentifier, Context, IntentResolution, Listener } from '../gtf/fdc3/types';

export interface ControlArgs {
    operation: string;
    params: any;
}

export interface StreamFacade {
    close: () => Promise<void>;
    push: (data: object, branches?: string | string[]) => Promise<void>;
    name: string;
}

export interface SubscriptionFacade {
    onData: (callback: (data: any) => void) => void;
}

export interface CancellablePromise<T> extends Promise<T> {
    cancel: () => void;
}

export type CreateAppConfig = {
    name?: string;
    exposeFdc3?: boolean;
}

export type Fdc3AddIntentListenerReturnValue = {
    context?: any;
    privateChannel?: boolean;
};

export namespace Gtf {
    export interface Agm {
        getMethodName(): string;

        waitForMethodAdded(methodDefinition: string | Glue42Web.Interop.MethodDefinition, targetAgmInstance?: string, timeoutMilliseconds?: number): Promise<void>;

        waitForMethodRemoved(methodDefinition: string | Glue42Web.Interop.MethodDefinition, targetAgmInstance?: string, timeoutMilliseconds?: number): Promise<void>;

        unregisterAllMyNonSystemMethods(): Promise<void>;

        unregisterMyStreams(myStreams: Glue42Web.Interop.Stream[]): Promise<void>;

        compareServers(actualServer: Glue42Web.Interop.Instance, expectedServer: Glue42Web.Interop.Instance): boolean;
    }

    export interface App {
        agm: {
            instance: Glue42Web.Interop.Instance,
            register: (methodDefinition: string | Glue42Web.Interop.MethodDefinition) => Promise<void>;
            unregister: (methodDefinition: string | Glue42Web.Interop.MethodDefinition) => Promise<void>;
            registerAsync: (methodDefinition: string | Glue42Web.Interop.MethodDefinition, callback: (args: any, caller: Glue42Web.Interop.Instance, successCallback: (args?: any) => void, errorCallback: (error?: string | object) => void) => void) => Promise<void>;
            createStream: (methodDefinition: string | Glue42Web.Interop.MethodDefinition) => Promise<StreamFacade>;
            subscribe: (methodDefinition: string | Glue42Web.Interop.MethodDefinition, parameters?: Glue42Web.Interop.SubscriptionParams) => Promise<SubscriptionFacade>;
            unsubscribe: (methodDefinition: string | Glue42Web.Interop.MethodDefinition) => Promise<void>;
            waitForMethodAdded: (methodDefinition: string | Glue42Web.Interop.MethodDefinition, targetAgmInstance?: string) => Promise<void>;
        };

        intents: {
            addIntentListener: (intent: string | Glue42Web.Intents.AddIntentListenerRequest) => Promise<void>;
            unregisterIntent: (intent: string | Glue42Web.Intents.AddIntentListenerRequest) => Promise<void>
        };

        stop(): Promise<void>;

        contexts: {
            set(ctxName: string, ctxData: any): Promise<void>;
            update(ctxName: string, ctxData: any): Promise<void>;
            get(ctxName: string): Promise<any>;
            all(): Promise<string[]>;
            destroy(ctxName: string): Promise<void>;
            setPath(ctxName: string, path: string, data: any): Promise<void>;
            setPaths(ctxName: string, paths: Glue42Web.Contexts.PathValue[]): Promise<void>
        };

        fdc3?: {
            joinUserChannel(channelId: string): Promise<void>;
            broadcast(context: Context): Promise<void>;
            broadcastOnAppChannel(channelId: string, context: Context): Promise<void>;
            raiseIntent(intent: string, context: Context, app?: AppIdentifier): Promise<IntentResolution>;
            addContextListenerOnPrivateChannel(contextType: string): Promise<void>;
            unsubscribeFromPrivateChannelListener(): Promise<void>;
            disconnectFromPrivateChannel(): Promise<void>;
            addIntentListener(intent: string, returnValue?: Fdc3AddIntentListenerReturnValue): Promise<void>;
            unsubscribeIntentListener(intent: string): Promise<void>;
            getIntentListenerContext(intent: string): Promise<void>;
            createPrivateChannel(): Promise<void>;
        }
    }

    export interface Core {
        clearNullUndefined(obj: any): void;

        getName(): string;

        simpleWait(milliseconds: number): Promise<void>;

        wait(mSeconds: number, funcToCall: any): CancellablePromise<any>;

        waitFor(invocations: number, callback: () => any): () => void;

        waitForFetch(): Promise<void>;

        wrapPromise(): { promise: Promise<void>; resolve: () => void; reject: (reason?: any) => void };

        getWindowName(prefix?: string): string;

        getChannelsConfigDefinitions(): Glue42WebPlatform.Channels.ChannelDefinition[];

        getChannelNames(): Promise<string[]>;

        createApp(config?: string | CreateAppConfig): Promise<App>;

        post(url: string, body: string): Promise<Response>;
    }

    export interface Channels {
        resetContexts(): Promise<void[]>;
    }

    export interface Contexts {
        getContextName(): string;
        generateComplexObject(complexity: number): { superNestedObject: any, numberArr: number[], stringArr: string[], objectArr: any[], singleObject: any, dateArr: Date[] };
    }

    export interface Fdc3 {
        getContext(): Context;
        addActiveListener(listener: Listener): void;
        removeActiveListeners(): void;
        removeCreatedChannels(): Promise<void>;
    }

    export interface AppManager {
        getLocalApplications(): (Glue42Web.AppManager.Definition | Glue42WebPlatform.Applications.FDC3Definition)[];

        stopAllOtherInstances(): Promise<void>;
    }

    export interface Intents {
        flattenIntentsToIntentHandlers(intents: Glue42Web.Intents.Intent[]): (Glue42Web.Intents.IntentHandler & { intentName: string })[];

        waitForIntentListenerAdded(intent: string): Promise<void>;

        waitForIntentListenerRemoved(intent: string): Promise<void>;
    }

    export interface Connection {
        disconnectGlues(gluesToDisconnect: Glue42Web.API[]): Promise<void>;
    }

    export interface Logger {
        patchLogMessages(): void;

        register(): Promise<void>;
    }

    export interface Windows {
        getWindowName(): string;

        compareWindows(actualWindow: Glue42Web.Windows.WebWindow, expectedWindow: Glue42Web.Windows.WebWindow): Promise<boolean>;

        checkIsValidWebWindow(webWindow: Glue42Web.Windows.WebWindow, expect: Chai.ExpectStatic): void;

        closeAllOtherWindows(): Promise<void>;

        getPlatformWindow(): Promise<Glue42Web.Windows.WebWindow>;

        resetTitles(): Promise<void>;

        resetWindowContexts(): Promise<void>;

        resetWindowDimensions(): Promise<void>;
    }

    export interface DesktopGateway {
        port: number;
    }

    export interface GlueBaseClient {
        isConnected(): Promise<boolean>;
        registerMethod(name: string, callback: (args: any, caller: any) => any): Promise<void>;
        invokeMethod(name: string, args: any, target?: "best" | "all"): Promise<Glue42Core.Interop.InvocationResult>;
        waitContext(name: string, value: any): Promise<void>;
        getAllContexts(): Promise<string[]>;
        getContext(name: string): Promise<any>;
        setContext(name: string, data: any): Promise<void>;
        updateContext(name: string, data: any): Promise<void>;
        subscribeContext(name: string, callback: (data: any) => void): Promise<UnsubscribeFunction>;
        connected(callback: (server: string) => void): Promise<UnsubscribeFunction>;
        disconnected(callback: () => void): Promise<UnsubscribeFunction>;
        reconnected(callback: () => void): Promise<UnsubscribeFunction>;
        close(): Promise<void>;
        reload(): Promise<void>;
    }

    export interface GlueCoreClient extends GlueBaseClient { }

    export interface GlueWebClient extends GlueBaseClient { }

    export interface GlueWebPlatform extends GlueBaseClient {
        openClient(config?: Glue42Web.Config): Promise<GlueWebClient>;
        waitContextTrack(name: string, value: any): Promise<void>;
    }

    export interface Puppet {
        defaultGWUrl: string;
        defaultGWAuth: { username: string, password: string };
        startDesktopGateway(config?: { port: number; rejectConnection?: boolean }): Promise<DesktopGateway>;
        stopDesktopGateway(gateway: DesktopGateway): Promise<void>;
        startWebPlatform(config?: Glue42WebPlatform.Config): Promise<GlueWebPlatform>;
        startCoreClient(config?: Glue42Core.Config): Promise<GlueCoreClient>;
    }
}

export interface GtfApi extends Gtf.Core {
    agm: Gtf.Agm,
    channels: Gtf.Channels,
    appManager: Gtf.AppManager,
    intents: Gtf.Intents,
    connection: Gtf.Connection,
    logger: Gtf.Logger,
    windows: Gtf.Windows,
    puppet: Gtf.Puppet
}
