/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { Glue42Web } from "@glue42/web";
import { ApplicationStartConfig, BridgeOperation, LibController, OperationCheckConfig, OperationCheckResult } from "../../common/types";
import { GlueController } from "../../controllers/glue";
import { IoC } from "../../shared/ioc";
import { PromisePlus } from "../../shared/promisePlus";
import { intentsOperationTypesDecoder, wrappedIntentsDecoder, wrappedIntentFilterDecoder, intentRequestDecoder, intentResultDecoder, raiseIntentRequestDecoder } from "./decoders";
import { IntentsOperationTypes, AppDefinitionWithIntents, IntentInfo, IntentStore, WrappedIntentFilter, WrappedIntents, RaiseIntentRequestWithResolverConfig, IntentRequestResolverConfig, ShouldResolverOpen } from "./types";
import logger from "../../shared/logger";
import { GlueWebIntentsPrefix } from "../../common/constants";
import { AppDirectory } from "../applications/appStore/directory";
import { operationCheckConfigDecoder, operationCheckResultDecoder } from "../../shared/decoders";
import { IntentsResolverHelper } from './resolverHelper';

export class IntentsController implements LibController {
    private operations: { [key in IntentsOperationTypes]: BridgeOperation } = {
        getIntents: { name: "getIntents", resultDecoder: wrappedIntentsDecoder, execute: this.getWrappedIntents.bind(this) },
        findIntent: { name: "findIntent", dataDecoder: wrappedIntentFilterDecoder, resultDecoder: wrappedIntentsDecoder, execute: this.findIntent.bind(this) },
        raiseIntent: { name: "raiseIntent", dataDecoder: intentRequestDecoder, resultDecoder: intentResultDecoder, execute: this.raiseIntent.bind(this) },
        raise: { name: "raise", dataDecoder: raiseIntentRequestDecoder, resultDecoder: intentResultDecoder, execute: this.raise.bind(this) },
        operationCheck: { name: "operationCheck", dataDecoder: operationCheckConfigDecoder, resultDecoder: operationCheckResultDecoder, execute: this.handleOperationCheck.bind(this) }
    };
    private started = false;

    constructor(
        private readonly glueController: GlueController,
        private readonly resolverHelper: IntentsResolverHelper,
        private readonly appDirectory: AppDirectory,
        private readonly ioc: IoC
    ) { }

    private get logger(): Glue42Core.Logger.API | undefined {
        return logger.get("intents.controller");
    }

    public async start(): Promise<void> {
        this.started = true;
    }

    public async handleControl(args: any): Promise<any> {
        if (!this.started) {
            new Error("Cannot handle this intents control message, because the controller has not been started");
        }

        const intentsData = args.data;

        const commandId = args.commandId;

        const callerId = args.callerId;

        const operationValidation = intentsOperationTypesDecoder.run(args.operation);

        if (!operationValidation.ok) {
            throw new Error(`This intents request cannot be completed, because the operation name did not pass validation: ${JSON.stringify(operationValidation.error)}`);
        }

        const operationName = operationValidation.result;

        const incomingValidation = this.operations[operationName].dataDecoder?.run(intentsData);

        if (incomingValidation && !incomingValidation.ok) {
            throw new Error(`Intents request for ${operationName} rejected, because the provided arguments did not pass the validation: ${JSON.stringify(incomingValidation.error)}`);
        }

        this.logger?.debug(`[${commandId}] ${operationName} command is valid with data: ${JSON.stringify(intentsData)}`);

        const result = await this.operations[operationName].execute(intentsData, commandId, callerId);

        const resultValidation = this.operations[operationName].resultDecoder?.run(result);

        if (resultValidation && !resultValidation.ok) {
            throw new Error(`Intents request for ${operationName} could not be completed, because the operation result did not pass the validation: ${JSON.stringify(resultValidation.error)}`);
        }

        this.logger?.trace(`[${commandId}] ${operationName} command was executed successfully`);

        return result;
    }

    private async handleOperationCheck(config: OperationCheckConfig): Promise<OperationCheckResult> {
        const operations = Object.keys(this.operations);

        const isSupported = operations.some((operation) => operation.toLowerCase() === config.operation.toLowerCase());

        return { isSupported };
    }

    private extractAppIntents(apps: AppDefinitionWithIntents[]): IntentStore {
        const intents: IntentStore = {};

        const appsWithIntents = apps.filter((app) => app.intents.length > 0);
        //  Gather app handlers from application definitions.
        for (const app of appsWithIntents) {
            for (const intentDef of app.intents) {
                if (!intents[intentDef.name]) {
                    intents[intentDef.name] = [];
                }

                const handler: Glue42Web.Intents.IntentHandler = {
                    applicationName: app.name,
                    applicationTitle: app.title,
                    applicationDescription: app.caption,
                    displayName: intentDef.displayName,
                    contextTypes: intentDef.contexts,
                    applicationIcon: app.icon,
                    type: "app",
                    resultType: intentDef.resultType
                };

                intents[intentDef.name].push(handler);
            }
        }

        return intents;
    }

    private async getInstanceIntents(apps: AppDefinitionWithIntents[], commandId: string): Promise<IntentStore> {
        const intents: IntentStore = {};

        // Discover all running instances that provide intents, and add them to the corresponding intent.
        for (const server of this.glueController.getServers()) {
            const serverIntentsMethods = (server.getMethods?.() || []).filter((method) => method.name.startsWith(GlueWebIntentsPrefix));

            await Promise.all(serverIntentsMethods.map(async (method) => {
                const intentName = method.name.replace(GlueWebIntentsPrefix, "");
                if (!intents[intentName]) {
                    intents[intentName] = [];
                }

                const info = method.flags.intent as Omit<Glue42Web.Intents.AddIntentListenerRequest, "intent">;

                const app = apps.find((appDef) => appDef.name === server.application);
                let appIntent: IntentInfo | undefined;
                // app can be undefined in the case of a dynamic intent.
                if (app && app.intents) {
                    appIntent = app.intents.find((appDefIntent) => appDefIntent.name === intentName);
                }

                let title: string | undefined;

                if (server.windowId) {
                    title = await this.ioc.windowsController.getWindowTitle(server.windowId, commandId);
                }

                const handler: Glue42Web.Intents.IntentHandler = {
                    // IFrames do not have windowIds but can still register intents.
                    instanceId: server.windowId || server.instance,
                    applicationName: server.application || "",
                    applicationIcon: info.icon || app?.icon,
                    applicationTitle: app?.title || "",
                    applicationDescription: info.description || app?.caption,
                    displayName: info.displayName || appIntent?.displayName,
                    contextTypes: info.contextTypes || appIntent?.contexts,
                    instanceTitle: title,
                    type: "instance",
                    resultType: appIntent?.resultType || info.resultType
                };

                intents[intentName].push(handler);
            }));
        }

        return intents;
    }

    private mergeIntentStores(storeOne: IntentStore, storeTwo: IntentStore): IntentStore {
        const intents: IntentStore = {};

        for (const name of new Set([...Object.keys(storeOne), ...Object.keys(storeTwo)])) {
            intents[name] = [...(storeOne[name] || []), ...(storeTwo[name] || [])];
        }

        return intents;
    }

    private wrapIntents(intents: Glue42Web.Intents.Intent[]): WrappedIntents {
        return {
            intents
        };
    }

    private async getIntents(commandId: string): Promise<Glue42Web.Intents.Intent[]> {
        /*
            Gathers all intents from:
            1. Application definitions
            2. Running instances (application can register dynamic intents by calling `addIntentListener()` that aren't predefined inside of their application definitions)
            It also populates intent handlers (actual entities that can handle the intent).
        */
        const apps: AppDefinitionWithIntents[] = (await this.appDirectory.getAll()).map((app) => {
            return {
                name: app.name,
                title: app.title || "",
                icon: app.icon,
                caption: app.caption,
                intents: app.userProperties.intents || []
            };
        });

        const appIntentsStore = this.extractAppIntents(apps);
        this.logger?.trace(`[${commandId}] got app intents`);

        const instanceIntentsStore = await this.getInstanceIntents(apps, commandId);
        this.logger?.trace(`[${commandId}] got instance intents`);

        const allIntentsStore = this.mergeIntentStores(appIntentsStore, instanceIntentsStore);

        const intents = Object.keys(allIntentsStore).map((name) => ({ name, handlers: allIntentsStore[name] }));

        return intents;
    }

    private async getWrappedIntents(commandId: string): Promise<WrappedIntents> {
        this.logger?.trace(`[${commandId}] handling getIntents command`);

        const intents = await this.getIntents(commandId);

        this.logger?.trace(`[${commandId}] getIntents command completed`);

        return this.wrapIntents(intents);
    }

    private async findIntent(wrappedIntentFilter: WrappedIntentFilter, commandId: string): Promise<WrappedIntents> {
        this.logger?.trace(`[${commandId}] handling findIntent command`);

        const intentFilter = wrappedIntentFilter.filter;

        let intents = await this.getIntents(commandId);

        if (!intentFilter) {
            return this.wrapIntents(intents);
        }

        if (typeof intentFilter === "string") {
            return this.wrapIntents(intents.filter((intent) => intent.name === intentFilter));
        }

        if (intentFilter.contextType) {
            const ctToLower = intentFilter.contextType.toLowerCase();
            intents = intents.filter((intent) => intent.handlers.some((handler) => handler.contextTypes?.some((ct) => ct.toLowerCase() === ctToLower)));
        }

        if (intentFilter.name) {
            intents = intents.filter((intent) => intent.name === intentFilter.name);
        }

        if (intentFilter.resultType) {
            const resultTypeToLower = intentFilter.resultType.toLowerCase();
            intents = intents.filter((intent) => intent.handlers.some(handler => handler.resultType?.toLowerCase() === resultTypeToLower));
        }

        this.logger?.trace(`[${commandId}] findIntent command completed`);

        return this.wrapIntents(intents);
    }

    private async getIntent(intent: string, commandId: string): Promise<Glue42Web.Intents.Intent | undefined> {
        return (await this.getIntents(commandId)).find((registeredIntent) => registeredIntent.name === intent);
    }

    private async startApp(config: ApplicationStartConfig, commandId: string): Promise<string> {
        const instance = await this.ioc.applicationsController.handleApplicationStart(config, commandId);

        return instance.id;
    }

    private async waitForServer(instanceId: string): Promise<Glue42Web.Interop.Instance> {
        let unsub: () => void;

        const waitTimeoutMs = 30 * 1000;

        this.logger?.trace(`Waiting ${waitTimeoutMs}ms for server instance with id ${instanceId}`);

        const executor = (resolve: (value: Glue42Web.Interop.Instance) => void): void => {
            unsub = this.glueController.subscribeForServerAdded((server) => {
                if (server.windowId === instanceId || server.instance === instanceId) {
                    resolve(server);
                }
            });
        };

        return PromisePlus(executor, waitTimeoutMs, `Can not find interop server for instance ${instanceId}`).finally(() => unsub());
    }

    private async waitForMethod(methodName: string, instanceId: string): Promise<Glue42Web.Interop.MethodDefinition> {
        let unsub: () => void;

        const waitTimeoutMs = 10 * 1000;

        this.logger?.trace(`Waiting ${waitTimeoutMs}ms for server instance with id ${instanceId} to register method ${methodName}`);

        const executor = (resolve: (value: Glue42Web.Interop.MethodDefinition) => void): void => {
            unsub = this.glueController.subscribeForMethodAdded((addedMethod) => {
                if (addedMethod.name === methodName) {
                    resolve(addedMethod);
                }
            });
        };

        return PromisePlus(executor, waitTimeoutMs, `Can not find interop method ${methodName} for instance ${instanceId}`).finally(() => unsub());
    }

    private instanceIdToInteropInstance(instanceId: string): string | undefined {
        const servers = this.glueController.getServers();

        return servers.find((server) => server.windowId === instanceId || server.instance === instanceId)?.instance;
    }

    private async raiseIntent(intentRequest: Glue42Web.Intents.IntentRequest, commandId: string): Promise<Glue42Web.Intents.IntentResult> {
        this.logger?.trace(`[${commandId}] handling raiseIntent command with intentRequest: ${JSON.stringify(intentRequest)}`);

        const intentName = intentRequest.intent;
        const intentDef = await this.getIntent(intentName, commandId);

        if (!intentDef) {
            throw new Error(`Intent ${intentName} not found!`);
        }

        this.logger?.trace(`Raised intent definition: ${JSON.stringify(intentDef)}`);

        const firstFoundAppHandler = intentRequest.handlers ? this.findHandlerByFilter(intentRequest.handlers, { type: "app" }) : this.findHandlerByFilter(intentDef.handlers, { type: "app" });

        const firstFoundInstanceHandler = intentRequest.handlers ? this.findHandlerByFilter(intentRequest.handlers, { type: "instance" }) : this.findHandlerByFilter(intentDef.handlers, { type: "instance" });

        let handler: Glue42Web.Intents.IntentHandler | undefined;

        // target the first found instance or start a new one if there isn't
        if (!intentRequest.target || intentRequest.target === "reuse") {
            handler = firstFoundInstanceHandler || firstFoundAppHandler;
        }

        // start new instance of the first handler in handlers / intentDef.handlers
        if (intentRequest.target === "startNew") {
            handler = firstFoundAppHandler;
        }

        // open a new app from the list of intentRequest.handlers (if passed) or intentDef.handlers
        if (typeof intentRequest.target === "object" && intentRequest.target.app) {
            handler = this.findHandlerByFilter(intentDef.handlers, { app: intentRequest.target.app });
        }

        // target the instance in the list of intentRequest.handlers (if passed) or intentDef.handlers
        if (typeof intentRequest.target === "object" && intentRequest.target.instance) {
            handler = this.findHandlerByFilter(intentDef.handlers, { instance: intentRequest.target.instance, app: intentRequest.target.app });
        }

        if (!handler) {
            throw new Error(`Can not raise intent for request ${JSON.stringify(intentRequest)} - can not find intent handler!`);
        }

        const result = await this.raiseIntentToTargetHandler(intentRequest, handler, commandId);

        return result;
    }

    private findHandlerByFilter(handlers: Glue42Web.Intents.IntentHandler[], filter: { app?: string, instance?: string, type?: "app" | "instance" }) {
        if (filter.type) {
            return handlers.find(handler => handler.type === filter.type);
        }

        if (filter.instance) {
            return handlers.find(handler => filter.app
                ? handler.applicationName === filter.app && handler.instanceId === filter.instance
                : handler.instanceId === filter.instance
            );
        }

        if (filter.app) {
            return handlers.find(handler => handler.applicationName === filter.app);
        }
    }

    private async raiseIntentToTargetHandler(request: Glue42Web.Intents.IntentRequest, handler: Glue42Web.Intents.IntentHandler, commandId: string): Promise<Glue42Web.Intents.IntentResult> {
        this.logger?.trace(`Raising intent to target handler:${JSON.stringify(handler)}`);

        const instanceId = handler.instanceId || await this.startApp({ name: handler.applicationName, ...request.options, context: request.context }, commandId);

        const methodName = `${GlueWebIntentsPrefix}${request.intent}`;

        this.logger?.trace(`Searching for interop server offering method ${methodName}`);

        let interopServer = this.glueController.getServers().find((server) => server.windowId === handler.instanceId || server.instance === handler.instanceId);

        if (!interopServer) {
            this.logger?.trace(`Interop server for method ${methodName} does not exist`);

            interopServer = await this.waitForServer(instanceId);
        }

        const method = interopServer.getMethods?.().find((registeredMethod) => registeredMethod.name === methodName);

        if (!method) {
            this.logger?.trace(`Server with id ${interopServer.instance} does not offer yet offer method ${methodName}`);

            await this.waitForMethod(methodName, instanceId);
        }

        const result = await this.glueController.invokeMethod<any>(methodName, request.context, { instance: this.instanceIdToInteropInstance(instanceId) });

        this.logger?.trace(`[${commandId}] raiseIntent command completed. Returning result: ${JSON.stringify(result)}`);

        return {
            request,
            handler: { ...handler, instanceId, type: "instance" },
            result: result.returned
        };
    }

    private async raise(request: RaiseIntentRequestWithResolverConfig, commandId: string, callerId?: string): Promise<Glue42Web.Intents.IntentResult> {
        this.logger?.trace(`[${commandId}] Receive raise command with config: ${JSON.stringify(request)}`);

        if (!callerId) {
            throw new Error(`Cannot raise intent - callerId is not defined`);
        }

        const { resolverConfig, intentRequest } = request;

        const intent = (await this.findIntent({ filter: { name: intentRequest.intent } }, commandId)).intents.find(intent => intent.name === intentRequest.intent);

        if (!intent) {
            throw new Error(`Intent with name ${intentRequest.intent} not found`);
        }

        this.logger?.trace(`[${commandId}] Intent to be handled: ${JSON.stringify(intent)}`);

        const { open, reason } = this.checkIfResolverShouldBeOpened(intent, intentRequest, resolverConfig);

        if (!open) {
            this.logger?.trace(`[${commandId}] Intent Resolver UI won't be used. Reason: ${reason}`);

            return this.raiseIntent(intentRequest, commandId);
        }

        this.logger?.trace(`[${commandId}] Starting Intent Resolver app for intent request: ${request}`);

        const resolverHandler = await this.resolverHelper.startResolverApp(request, callerId, commandId);

        this.logger?.trace(`Raising intent to target handler: ${JSON.stringify(resolverHandler)}`);

        const result = await this.raiseIntentToTargetHandler(intentRequest, resolverHandler, commandId);

        this.logger?.trace(`Result from raise() method for intent ${JSON.stringify(intentRequest.intent)}: ${JSON.stringify(result)}`);

        return result;
    }

    private checkIfIntentHasMoreThanOneHandler(intent: Glue42Web.Intents.Intent, request: Glue42Web.Intents.IntentRequest): boolean {
        // no target => show resolver if request.handlers > 1 || intent.handlers.length > 1
        // reuse => show resolver if 2+ instances in request.handlers || show resolver if intent.handlers.length > 1
        // startNew => show resolver if 2+ apps in request.handler || intent.handlers as apps > 1
        // app => do not show resolver

        if (!request.target) {
            return request.handlers
                ? request.handlers.length > 1
                : intent.handlers.length > 1;
        }

        if (request.target === "reuse") {
            return request.handlers
                ? request.handlers.filter(handler => handler.type === "instance" && handler.instanceId).length > 1 || request.handlers.filter(handler => handler.type === "app").length > 1
                : intent.handlers.filter(handler => handler.type === "instance" && handler.instanceId).length > 1 || intent.handlers.filter(handler => handler.type === "app").length > 1;
        }

        if (request.target === "startNew") {
            return request.handlers
                ? request.handlers.filter(handler => handler.type === "app").length > 1
                : intent.handlers.filter(handler => handler.type === "app").length > 1;
        }

        if (typeof request.target === "object") {
            return false;
        }

        return false;
    }

    private checkIfResolverShouldBeOpened(intent: Glue42Web.Intents.Intent, intentRequest: Glue42Web.Intents.IntentRequest, resolverConfig: IntentRequestResolverConfig): ShouldResolverOpen {
        if (!resolverConfig.enabled) {
            return { open: false, reason: `Intent Resolver is disabled. Raising intent to first found handler` };
        }

        const intentsResolverApp = this.glueController.clientGlue.appManager.application(resolverConfig.appName);

        if (!intentsResolverApp) {
            return { open: false, reason: `Application with name ${resolverConfig.appName} not found` };
        }

        const hasMoreThanOneHandler = this.checkIfIntentHasMoreThanOneHandler(intent, intentRequest);

        if (!hasMoreThanOneHandler) {
            return { open: false, reason: `Raised intent has only one handler` };
        }

        return { open: true };
    }
}
