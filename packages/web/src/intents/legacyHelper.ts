import { Glue42Core } from "@glue42/core";
import shortid from "shortid";
import { Glue42Web } from "../../web";
import { AppManagerController } from "../appManager/controller";
import { GlueBridge } from "../communication/bridge";
import { intentResolverResponseDecoder } from "../shared/decoders";
import { PromisePlus } from "../shared/promise-plus";
import { systemOperations } from "../shared/systemOperations";
import { IntentRequestWithResolverInfo, IntentsResolverStartContext, LibDomains, OperationCheckConfig, OperationCheckResult, SimpleItemIdRequest, WorkspaceFrameBoundsResult, ShouldResolverOpen, IntentRequestResolverConfig, IntentResolverResponse } from "../shared/types";
import { WindowsController } from "../windows/controller";
import { INTENTS_RESOLVER_HEIGHT, INTENTS_RESOLVER_INTEROP_PREFIX, INTENTS_RESOLVER_WIDTH } from "./constants";
import { IntentsResolverResponse, IntentsResolverResponsePromise, operations } from "./protocol";

export class LegacyIntentsHelper {
    private logger!: Glue42Web.Logger.API;

    private intentsResolverResponsePromises: { [instanceId: string]: IntentsResolverResponsePromise } = {};

    constructor(
        logger: Glue42Web.Logger.API,
        private readonly bridge: GlueBridge,
        private readonly interop: Glue42Core.AGM.API,
        private readonly appManagerController: AppManagerController,
        private readonly windowsController: WindowsController
    ) {
        this.logger = this.configureLogger(logger);
    }

    public async raise(requestWithResolverInfo: IntentRequestWithResolverInfo, findIntentFn: (intentFilter?: string | Glue42Web.Intents.IntentFilter | undefined) => Promise<Glue42Web.Intents.Intent[]>): Promise<Glue42Web.Intents.IntentResult> {
        const { intentRequest, resolverConfig } = requestWithResolverInfo;

        const intent = (await findIntentFn(intentRequest.intent)).find(intent => intent.name === intentRequest.intent);

        if (!intent) {
            throw new Error(`Intent with name ${intentRequest.intent} not found`);
        }

        const { open, reason } = this.checkIfResolverShouldBeOpened(intent, intentRequest, resolverConfig);

        if (!open) {
            this.logger?.trace(`Intent Resolver UI won't be used. Reason: ${reason}`);

            return this.invokeRaiseIntent(intentRequest);
        }

        const intentResult = await this.raiseIntentWithResolverApp(requestWithResolverInfo);

        return intentResult;
    }

    private configureLogger(loggerInst: Glue42Web.Logger.API): Glue42Web.Logger.API {
        return loggerInst.subLogger("intents.legacy.helper.web");
    }

    private async raiseIntentWithResolverApp(requestWithResolverInfo: IntentRequestWithResolverInfo): Promise<Glue42Web.Intents.IntentResult> {
        const { intentRequest, resolverConfig } = requestWithResolverInfo;

        this.logger.trace(`Intents Resolver UI with app name ${resolverConfig.appName} will be used`);

        const responseMethodName = await this.registerResponseMethod();

        this.logger.trace(`Registered interop method ${responseMethodName}`);

        const resolverInstance = await this.openIntentResolverApplication(requestWithResolverInfo, responseMethodName);

        this.logger.trace(`Intents Resolver Instance with id ${resolverInstance.id} opened`);

        const handler = await this.handleInstanceResponse(resolverInstance.id);

        const target = handler.type === "app"
            ? { app: handler.applicationName }
            : { instance: handler.instanceId };

        this.logger.trace(`Intent handler chosen by the user: ${JSON.stringify(target)}`);

        const intentResult = await this.invokeRaiseIntent({ ...intentRequest, target });

        return intentResult;
    }

    private async handleInstanceResponse(instanceId: string): Promise<Glue42Web.Intents.IntentHandler> {
        try {
            const { handler, intent } = await this.intentsResolverResponsePromises[instanceId].promise;

            this.logger?.trace(`Intent handler chosen for intent ${intent}: ${JSON.stringify(handler)}`);

            this.stopResolverInstance(instanceId);

            return handler;

        } catch (error) {
            this.stopResolverInstance(instanceId);

            throw new Error(error as string);
        }
    }

    private invokeRaiseIntent(requestObj: Glue42Web.Intents.IntentRequest): Promise<Glue42Web.Intents.IntentResult> {
        return this.bridge.send<Glue42Web.Intents.IntentRequest, Glue42Web.Intents.IntentResult>("intents", operations.raiseIntent, requestObj);
    }

    private async registerResponseMethod(): Promise<string> {
        const methodName = INTENTS_RESOLVER_INTEROP_PREFIX + shortid();

        await this.interop.register(methodName, this.resolverResponseHandler.bind(this));

        return methodName;
    }

    private async openIntentResolverApplication(requestWithResolverInfo: IntentRequestWithResolverInfo, methodName: string): Promise<Glue42Web.AppManager.Instance> {
        const { intentRequest, resolverConfig } = requestWithResolverInfo;

        const startContext = this.buildStartContext(intentRequest, methodName);

        const startOptions = await this.buildStartOptions();

        this.logger.trace(`Starting Intents Resolver UI with context: ${JSON.stringify(startContext)} and options: ${startOptions}`);

        const instance = await this.appManagerController.getApplication(resolverConfig.appName).start(startContext, startOptions);

        this.logger.trace(`Intents Resolver instance with id ${instance.id} opened`);

        this.subscribeOnInstanceStopped(instance);

        this.createResponsePromise(intentRequest.intent, instance.id, methodName, resolverConfig.waitResponseTimeout);

        return instance;
    }

    private async cleanUpIntentResolverPromise(instanceId: string): Promise<void> {
        const intentPromise = this.intentsResolverResponsePromises[instanceId];

        if (!intentPromise) {
            return;
        }

        // typings are wrong and mark unregister as a sync method
        const unregisterPromise = this.interop.unregister(intentPromise.methodName) as unknown as Promise<void>;

        unregisterPromise.catch((error) => this.logger.warn(error));

        delete this.intentsResolverResponsePromises[instanceId];
    }

    private buildStartContext(requestObj: Glue42Web.Intents.IntentRequest, methodName: string): IntentsResolverStartContext {
        return {
            intent: requestObj,
            callerId: this.interop.instance.instance!,
            methodName
        };
    }

    private async buildStartOptions(): Promise<Glue42Web.AppManager.ApplicationStartOptions> {
        const bounds = await this.getTargetBounds();

        return {
            top: (bounds.height - INTENTS_RESOLVER_HEIGHT) / 2 + bounds.top,
            left: (bounds.width - INTENTS_RESOLVER_WIDTH) / 2 + bounds.left,
            width: INTENTS_RESOLVER_WIDTH,
            height: INTENTS_RESOLVER_HEIGHT
        };
    }

    private async getTargetBounds(): Promise<Glue42Web.Windows.Bounds> {
        const bounds = await this.tryGetWindowBasedBounds() || await this.tryGetWorkspaceBasedBounds();

        if (bounds) {
            this.logger.trace(`Opening Intents Resolver UI with bounds: ${JSON.stringify(bounds)}`);

            return bounds;
        }

        const defaultBounds: Glue42Web.Windows.Bounds = {
            top: (window as any).screen.availTop || 0,
            left: (window as any).screen.availLeft || 0,
            width: window.screen.width,
            height: window.screen.height
        };

        this.logger.trace(`Opening Intents Resolver UI relative to my screen bounds: ${JSON.stringify(defaultBounds)}`);

        return defaultBounds;
    }

    private async tryGetWindowBasedBounds(): Promise<Glue42Web.Windows.Bounds | undefined> {
        try {
            const myWindowBounds = await this.windowsController.my().getBounds();

            this.logger.trace(`Opening the resolver UI relative to my window bounds: ${JSON.stringify(myWindowBounds)}`);

            return myWindowBounds;
        } catch (error) {
            this.logger.trace(`Failure to get my window bounds: ${JSON.stringify(error)}`);
        }
    }

    private async tryGetWorkspaceBasedBounds(): Promise<Glue42Web.Windows.Bounds | undefined> {
        try {
            await this.bridge.send<OperationCheckConfig, OperationCheckResult>("workspaces" as LibDomains, systemOperations.operationCheck, { operation: "getWorkspaceWindowFrameBounds" });

            const bridgeResponse = await this.bridge.send<SimpleItemIdRequest, WorkspaceFrameBoundsResult>("workspaces" as LibDomains, systemOperations.getWorkspaceWindowFrameBounds, { itemId: this.windowsController.my().id });

            const myWorkspaceBounds = bridgeResponse.bounds;

            this.logger.trace(`Opening the resolver UI relative to my workspace frame window bounds: ${JSON.stringify(myWorkspaceBounds)}`);

            return myWorkspaceBounds;
        } catch (error) {
            this.logger.trace(`Failure to get my workspace frame window bounds: ${JSON.stringify(error)}`);
        }
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

            intentPromise.reject(`Cannot resolve raised intent "${intentPromise.intent}" - User closed ${application.name} app without choosing an intent handler`);

            this.cleanUpIntentResolverPromise(inst.id);

            unsub();
        });
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

    private resolverResponseHandler(args: any, callerId: Glue42Web.Interop.Instance): void {
        const response = intentResolverResponseDecoder.run(args);

        const instanceId = callerId.instance;

        if (response.ok) {
            this.logger.trace(`Intent Resolver instance with id ${instanceId} send a valid response: ${JSON.stringify(response.result)}`);

            return this.intentsResolverResponsePromises[instanceId!].resolve(response.result);
        }

        this.logger.trace(`Intent Resolver instance with id ${instanceId} sent an invalid response. Error: ${JSON.stringify(response.error)}`);

        this.intentsResolverResponsePromises[instanceId!].reject(response.error.message);

        this.stopResolverInstance(instanceId!);
    }

    private stopResolverInstance(instanceId: string): void {
        const searchedInstance = this.appManagerController.getInstances().find((inst: Glue42Web.AppManager.Instance) => inst.id === instanceId);

        if (!searchedInstance) {
            return;
        }

        searchedInstance.stop().catch(err => this.logger.error(err));
    }

    private checkIfIntentHasMoreThanOneHandler(intent: Glue42Web.Intents.Intent, request: Glue42Web.Intents.IntentRequest): boolean {
        // if a specific app / instance is passed, do not open the resolver
        if (typeof request.target === "object") {
            return false;
        }

        return request.handlers ? request.handlers.length > 1 : intent.handlers.length > 1;
    }

    private checkIfResolverShouldBeOpened(intent: Glue42Web.Intents.Intent, intentRequest: Glue42Web.Intents.IntentRequest, resolverConfig: IntentRequestResolverConfig): ShouldResolverOpen {
        if (!resolverConfig.enabled) {
            return { open: false, reason: "Intent Resolver is disabled. Raising intent to first found handler" };
        }

        const intentsResolverApp = this.appManagerController.getApplication(resolverConfig.appName);

        if (!intentsResolverApp) {
            return { open: false, reason: `Application with name ${resolverConfig.appName} not found` };
        }

        const hasMoreThanOneHandler = this.checkIfIntentHasMoreThanOneHandler(intent, intentRequest);

        if (!hasMoreThanOneHandler) {
            return { open: false, reason: "Raised intent has only one handler" };
        }

        return { open: true };
    }
}