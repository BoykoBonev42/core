import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "@glue42/web";
import shortid from "shortid";
import logger from "../../shared/logger";
import { GlueController } from "../../controllers/glue";
import { intentResolverResponseDecoder } from "./decoders";
import { INTENTS_RESOLVER_HEIGHT, INTENTS_RESOLVER_INTEROP_PREFIX, INTENTS_RESOLVER_WIDTH } from "./constants";
import { IntentResolverResponse, IntentsResolverResponse, IntentsResolverResponsePromise, IntentsResolverStartContext, StartResolverAppArgs } from "./types";
import { WorkspacesController } from "../workspaces/controller";
import { PromisePlus } from "../../shared/promisePlus";
import { WindowsController } from "../windows/controller";
import { SimpleWindowCommand, WindowBoundsResult } from "../windows/types";

export class IntentsResolverHelper {
    private intentsResolverResponsePromises: { [instanceId: string]: IntentsResolverResponsePromise } = {};

    constructor(
        private readonly glueController: GlueController,
        private readonly workspacesController: WorkspacesController,
        private readonly windowsController: WindowsController
    ) { }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("intents.resolver.controller");
    }

    public async startResolverApp({ requestWithResolverInfo, commandId, callerId, resolverInstance }: StartResolverAppArgs): Promise<Glue42Web.Intents.IntentHandler> {
        const { intentRequest, resolverConfig } = requestWithResolverInfo;

        this.logger?.trace(`[${commandId}] Intents Resolver UI with app name ${resolverConfig.appName} will be used for request: ${JSON.stringify(intentRequest)}`);

        const responseMethodName = await this.registerResponseMethod();

        this.logger?.trace(`[${commandId}] Registered interop method ${responseMethodName}`);

        const startContext = this.buildStartContext(intentRequest, responseMethodName);

        const startOptions = await this.buildStartOptions(callerId, commandId);

        this.logger?.trace(`[${commandId}] Starting Intents Resolver UI with context: ${JSON.stringify(startContext)} and options: ${startOptions}`);

        const instance = await this.glueController.clientGlue.appManager.application(resolverConfig.appName).start(startContext, startOptions);

        if (resolverInstance) {
            resolverInstance.instanceId = instance.id;
        }

        this.logger?.trace(`[${commandId}] Intents Resolver instance with id ${instance.id} opened`);

        this.subscribeOnInstanceStopped(instance);

        this.createResponsePromise(intentRequest.intent, instance.id, responseMethodName, resolverConfig.waitResponseTimeout);

        const handler = await this.handleInstanceResponse(instance.id, commandId);

        return handler;
    }

    public stopResolverInstance(instanceId: string): void {
        const searchedInstance = this.glueController.clientGlue.appManager.instances().find(inst => inst.id === instanceId);

        if (!searchedInstance) {
            return;
        }

        searchedInstance.stop().catch(err => this.logger?.error(err));
    }

    private async handleInstanceResponse(instanceId: string, commandId: string): Promise<Glue42Web.Intents.IntentHandler> {
        try {
            const { handler, intent } = await this.intentsResolverResponsePromises[instanceId].promise;

            this.logger?.trace(`[${commandId}] Intent handler chosen for intent ${intent}: ${JSON.stringify(handler)}. Stopping resolver instance with id ${instanceId}`);

            this.stopResolverInstance(instanceId);
            
            this.logger?.trace(`[${commandId}] Instance with id ${instanceId} successfully stopped`);

            return handler;

        } catch (error) {
            this.stopResolverInstance(instanceId);

            throw new Error(error as string);
        }
    }

    private async registerResponseMethod(): Promise<string> {
        const methodName = INTENTS_RESOLVER_INTEROP_PREFIX + shortid();

        await this.glueController.clientGlue.interop.register(methodName, this.responseHandler.bind(this));

        return methodName;
    }

    private createResponsePromise(intent: string, instanceId: string, methodName: string, timeout: number): void {
        let resolve: (arg: IntentsResolverResponse) => void = () => { };
        let reject: (reason: string) => void = () => { };

        const promise = PromisePlus<IntentResolverResponse>((res, rej) => {
            resolve = res;
            reject = rej;
        }, timeout, `Timeout of ${timeout}ms hit waiting for the user to choose a handler for intent ${intent}`);

        this.intentsResolverResponsePromises[instanceId] = { intent, resolve, reject, promise, methodName };
    }

    private buildStartContext(requestObj: Glue42Web.Intents.IntentRequest, methodName: string) {
        const startContext: IntentsResolverStartContext = {
            intent: requestObj,
            callerId: this.glueController.clientGlue.interop.instance.instance!,
            methodName
        };

        return startContext;
    }

    private async buildStartOptions(windowId: string, commandId: string): Promise<Glue42Web.AppManager.ApplicationStartOptions> {
        const bounds = await this.getTargetBounds(windowId, commandId);

        if (!bounds) {
            throw new Error(`[${commandId}] Cannot find window with id: ${windowId} - the client which sent the "raise" command is no longer opened`);
        }

        return {
            top: (bounds.height - INTENTS_RESOLVER_HEIGHT) / 2 + bounds.top,
            left: (bounds.width - INTENTS_RESOLVER_WIDTH) / 2 + bounds.left,
            width: INTENTS_RESOLVER_WIDTH,
            height: INTENTS_RESOLVER_HEIGHT
        };
    }

    private async getTargetBounds(windowId: string, commandId: string): Promise<Glue42Web.Windows.Bounds> {
        const bounds = await this.tryGetWindowBasedBounds(windowId, commandId) || await this.tryGetWorkspaceBasedBounds(windowId, commandId);

        if (bounds) {
            this.logger?.trace(`[${commandId}] Opening Intents Resolver UI with bounds: ${JSON.stringify(bounds)}`);

            return bounds;
        }

        const defaultBounds: Glue42Web.Windows.Bounds = {
            top: (window as any).screen.availTop || 0,
            left: (window as any).screen.availLeft || 0,
            width: window.screen.width,
            height: window.screen.height
        };

        this.logger?.trace(`[${commandId}] Opening Intents Resolver UI relative to my screen bounds: ${JSON.stringify(defaultBounds)}`);

        return defaultBounds;
    }

    private async tryGetWindowBasedBounds(windowId: string, commandId: string): Promise<Glue42Web.Windows.Bounds | undefined> {
        const win = this.glueController.clientGlue.windows.findById(windowId);

        const serverInstance = this.getServerInstanceByWindowId(windowId);

        if (!win && !serverInstance) {
            throw new Error(`Client with id "${windowId}" does not exist`);
        }

        if (!win && serverInstance) {
            return this.getWindowBoundsByServerInstance(serverInstance, windowId, commandId);
        }

        if (!win) {
            throw new Error(`Client with id "${windowId}" does not exist`);
        }

        try {
            const bounds = await win.getBounds();

            this.logger?.trace(`[${commandId}] Opening the resolver UI with bounds: ${JSON.stringify(bounds)}, relative to a window with id: ${windowId}`);

            return bounds;
        } catch (error) {
            this.logger?.trace(`[${commandId}] Failure to get bounds of a window with id ${windowId}. Error: ${JSON.stringify(error)}`);

            return;
        }
    }

    private getServerInstanceByWindowId(windowId: string): Glue42Core.AGM.Instance | undefined {
        return this.glueController.clientGlue.interop.servers().find(server => server.instance === windowId);
    }

    private async getWindowBoundsByServerInstance(serverInstance: Glue42Core.Interop.Instance, windowId: string, commandId: string): Promise<Glue42Web.Windows.Bounds | undefined> {
        try {
            const { bounds } = await this.glueController.callWindow<SimpleWindowCommand, WindowBoundsResult>("windows", this.windowsController.getBoundsOperation, { windowId }, { instance: serverInstance.instance as string });

            return bounds;
        } catch (error) {
            this.logger?.trace(`[${commandId}] Failure to get bounds of a window with instance ${serverInstance.instance}. Error: ${JSON.stringify(error)}`);
        }
    }

    private async tryGetWorkspaceBasedBounds(windowId: string, commandId: string): Promise<Glue42Web.Windows.Bounds | undefined> {
        try {
            const { bounds } = await this.workspacesController.getWorkspaceWindowFrameBounds({ itemId: windowId }, commandId);

            this.logger?.trace(`[${commandId}] Opening the resolver UI relative to my workspace frame window bounds: ${JSON.stringify(bounds)}`);

            return bounds;
        } catch (error) {
            this.logger?.trace(`[${commandId}] Failure to get my workspace frame window bounds. Error: ${JSON.stringify(error)}`);
        }
    }

    private responseHandler(args: any, callerId: Glue42Web.Interop.Instance): void {
        const response = intentResolverResponseDecoder.run(args);

        const instanceId = callerId.instance;

        if (response.ok) {
            this.logger?.trace(`Intent Resolver instance with id ${instanceId} send a valid response: ${JSON.stringify(response.result)}`);

            return this.intentsResolverResponsePromises[instanceId!].resolve(response.result);
        }

        this.logger?.trace(`Intent Resolver instance with id ${instanceId} sent an invalid response. Error: ${JSON.stringify(response.error)}`);

        this.intentsResolverResponsePromises[instanceId!].reject(response.error.message);

        this.stopResolverInstance(instanceId!);
    }

    private subscribeOnInstanceStopped(instance: Glue42Web.AppManager.Instance): void {
        const { application } = instance;

        const unsub = application.onInstanceStopped((inst: Glue42Web.AppManager.Instance) => {
            if (inst.id !== instance.id) {
                return;
            }

            const intentPromise = this.intentsResolverResponsePromises[inst.id];

            if (!intentPromise) {
                return unsub();
            }

            intentPromise.reject(`Cannot resolve raised intent ${intentPromise.intent} - User closed ${application.name} app without choosing an intent handler`);

            this.cleanUpIntentResolverPromise(inst.id);

            unsub();
        });
    }

    private async cleanUpIntentResolverPromise(instanceId: string): Promise<void> {
        const intentPromise = this.intentsResolverResponsePromises[instanceId];

        if (!intentPromise) {
            return;
        }

        // typings are wrong and mark unregister as a sync method
        const unregisterPromise = this.glueController.clientGlue.interop.unregister(intentPromise.methodName) as unknown as Promise<void>;

        unregisterPromise.catch((error) => this.logger?.warn(error));

        delete this.intentsResolverResponsePromises[instanceId];
    }
}
