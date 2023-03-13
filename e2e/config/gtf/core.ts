import { Glue42Web } from "../../../packages/web/web.d";
import { GtfApp } from "./app";
import { CancellablePromise, CreateAppConfig, Gtf } from "./gtf";
import { Glue42WebPlatform } from "../../../packages/web-platform/platform.d";
import { Glue42Search } from "../../../packages/search-api/search.d";
import { channelsConfig, remoteStoreConfig } from "./config";

export class GtfCore implements Gtf.Core {
    private readonly controlMethodName = "G42Core.E2E.Control";
    private readonly defaultSupportAppName = "coreSupport";
    private readonly defaultSupportAppUrl = "http://localhost:4242/coreSupport/index.html";
    private windowNameCounter = 0;
    private counter = 0;
    private activeWindowHooks: (() => void | Promise<void>)[] = [];
    private unsubFuncs: (() => void)[] = [];

    constructor(private readonly glue?: Glue42Web.API) {
        console.log("GTF CREATED");
    }

    public clearNullUndefined(obj: any): void {
        Object.keys(obj).forEach(key => {
            if (obj[key] === null || obj[key] === undefined) {
                delete obj[key];
            }
        });
    }

    public wrapPromise(): { promise: Promise<void>; resolve: () => void, reject: (reason?: any) => void } {
        let wrapperResolve;
        let wrapperReject;

        const promise = new Promise<void>((resolve, reject) => {
            wrapperResolve = resolve;
            wrapperReject = reject;
        });

        return { promise, resolve: wrapperResolve, reject: wrapperReject };
    }

    public simpleWait(milliseconds: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
    }

    public getName(): string {
        this.counter++;
        return `core.e2e.name.${Date.now()}.${this.counter}`;
    }

    public addUnsubFunc(hook: () => void): void {
        if (typeof hook !== "function") {
            throw new Error('Tried to add a non-function hook.');
        }

        this.unsubFuncs.push(hook);
    }

    public async withUnsub(unsub: () => void | Promise<() => void>): Promise<void> {

        const un = await unsub;

        if (typeof un !== "function") {
            throw new Error('Tried to add a non-function hook.');
        }

        this.unsubFuncs.push(un);
    }

    public clearAllUnsubFuncs(): void {
        this.unsubFuncs.forEach((unsub) => unsub());

        this.unsubFuncs = [];
    }

    public addWindowHook(hook: () => void | Promise<void>): void {
        if (typeof hook !== "function") {
            throw new Error('Tried to add a non-function hook.');
        }

        this.activeWindowHooks.push(hook);
    }

    public async clearWindowActiveHooks(): Promise<void> {
        const clearWindowActiveHooksPromises = this.activeWindowHooks.map((hook) => Promise.resolve(hook()));

        await Promise.all(clearWindowActiveHooksPromises);

        this.activeWindowHooks = [];
    }

    public wait(mSeconds: number, funcToCall: any): CancellablePromise<any> {
        let fakePromiseResolve: (value?: unknown) => void;
        let isCancelled = false;

        const fakePromise = new Promise((res, rej) => {
            fakePromiseResolve = res;
        });

        const promise = new Promise<void>((res, rej) => {
            setTimeout(() => {
                if (isCancelled) {
                    return;
                }
                try {
                    if (funcToCall) {
                        funcToCall();
                    }
                    res();
                } catch (error) {
                    rej(error);
                }
            }, mSeconds);
        });

        fakePromise.then(() => {
            isCancelled = true;
        });

        Promise.race([promise, fakePromise]);

        const cancel = () => {
            fakePromiseResolve();
        };

        (promise as any).cancel = cancel;

        return promise as CancellablePromise<any>;
    }

    public waitFor(invocations: number, callback: () => any): () => void {
        let left = invocations;
        return () => {
            left--;

            if (left === 0) {
                callback();
            }
        };
    }

    public async waitForFetch(): Promise<void> {
        if (typeof remoteStoreConfig === "undefined") {
            throw new Error("No remote store provided!");
        }

        const pollingInterval = remoteStoreConfig.pollingInterval || 3000;

        const extraInterval = 2000;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, pollingInterval + extraInterval);
        });
    }

    public getWindowName(prefix = "windows"): string {
        this.windowNameCounter++;
        return `${prefix}.${Date.now()}.${this.windowNameCounter}`;
    }

    public getChannelsConfigDefinitions(): Glue42WebPlatform.Channels.ChannelDefinition[] {
        return channelsConfig.definitions;
    }

    public async getChannelNames(): Promise<string[]> {
        return channelsConfig.definitions.map((channelContext) => channelContext.name);
    }

    public async createApp(appConfig?: string | CreateAppConfig): Promise<Gtf.App> {
        const appName = typeof appConfig === "string"
            ? appConfig
            : appConfig && appConfig.name
                ? appConfig.name
                : this.defaultSupportAppName;

        if (!this.glue) {
            throw new Error("GTF cannot create an app, because it is running in Puppet mode, please use the gtf.puppet API");
        }

        const foundApp = this.glue.appManager.application(appName);

        if (!foundApp) {
            throw new Error(`Support application: ${appName} was not found!`);
        }

        const supportInstance = await foundApp.start();

        if (typeof appConfig === "object" && appConfig.exposeFdc3 && foundApp.userProperties.details.url !== this.defaultSupportAppUrl) {
            throw new Error(`GTF does not support exposing FDC3 in ${appName} app. Use coreSupport app instead`);
        }

        return new GtfApp(this.glue, supportInstance, this.controlMethodName, typeof appConfig === "object" ? appConfig : {});
    }

    public post(url: string, body: string): Promise<Response> {
        const init = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body
        };

        return fetch(url, init);
    }

    public compareSearchResult(sent: Glue42Search.QueryResult, received: Glue42Search.QueryResult, expect: Chai.ExpectStatic): void {
        expect(sent.type).to.eql(received.type);
        expect(sent.action).to.eql(received.action);
        expect(sent.description).to.eql(received.description);
        expect(sent.displayName).to.eql(received.displayName);
        expect(sent.id).to.eql(received.id);
        expect(sent.id).to.eql(received.id);
        expect(sent.secondaryActions).to.eql(received.secondaryActions);
    }

}
