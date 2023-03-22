/* eslint-disable @typescript-eslint/no-explicit-any */
import { Glue42Core } from "@glue42/core";
import { IoC } from "../shared/ioc";
import { IntentRequestWithResolverInfo, IsRaiseOperationSupported, LibController, OperationCheckConfig, OperationCheckResult } from "../shared/types";
import { Glue42Web } from "../../web";
import { GlueBridge } from "../communication/bridge";
import { UnsubscribeFunction } from "callback-registry";
import { intentsOperationTypesDecoder, raiseRequestDecoder, findFilterDecoder, AddIntentListenerDecoder } from "../shared/decoders";
import { operations, WrappedIntentFilter, WrappedIntents } from "./protocol";
import { ADDITIONAL_BRIDGE_OPERATION_TIMEOUT, DEFAULT_RESOLVER_RESPONSE_TIMEOUT, GLUE42_FDC3_INTENTS_METHOD_PREFIX, INTENTS_RESOLVER_APP_NAME } from "./constants";
import { LegacyIntentsHelper } from "./legacyHelper";
import { systemOperations } from "../shared/systemOperations";

export class IntentsController implements LibController {
    private bridge!: GlueBridge;
    private logger!: Glue42Web.Logger.API;
    private interop!: Glue42Core.AGM.API;
    private legacyIntentsController!: LegacyIntentsHelper;
    private myIntents = new Set<string>();

    private useIntentsResolverUI = true;
    private intentsResolverAppName!: string;
    private intentResolverResponseTimeout!: number;

    private unregisterIntentPromises: Promise<void>[] = [];

    public async start(coreGlue: Glue42Core.GlueCore, ioc: IoC): Promise<void> {
        this.logger = coreGlue.logger.subLogger("intents.controller.web");

        this.logger.trace("starting the web intents controller");

        this.bridge = ioc.bridge;

        this.interop = coreGlue.interop;

        this.legacyIntentsController = ioc.legacyIntentsHelper;

        this.checkIfIntentsResolverIsEnabled(ioc.config);

        const api = this.toApi();

        this.logger.trace("no need for platform registration, attaching the intents property to glue and returning");

        (coreGlue as Glue42Web.API).intents = api;
    }

    public handlePlatformShutdown(): void {
        this.myIntents = new Set<string>();
        this.unregisterIntentPromises = [];
    }

    public async handleBridgeMessage(args: any): Promise<void> {
        const operationName = intentsOperationTypesDecoder.runWithException(args.operation);

        const operation = operations[operationName];

        if (!operation.execute) {
            return;
        }

        let operationData: any = args.data;

        if (operation.dataDecoder) {
            operationData = operation.dataDecoder.runWithException(args.data);
        }

        return await operation.execute(operationData);
    }

    private toApi(): Glue42Web.Intents.API {
        const api: Glue42Web.Intents.API = {
            raise: this.raise.bind(this),
            all: this.all.bind(this),
            addIntentListener: this.addIntentListener.bind(this),
            register: this.register.bind(this),
            find: this.find.bind(this)
        };

        return api;
    }

    private async raise(request: string | Glue42Web.Intents.IntentRequest): Promise<Glue42Web.Intents.IntentResult> {
        const validatedIntentRequest = raiseRequestDecoder.runWithException(request);

        const intentRequest: Glue42Web.Intents.IntentRequest = typeof validatedIntentRequest === "string"
            ? { intent: validatedIntentRequest }
            : validatedIntentRequest;

        await Promise.all(this.unregisterIntentPromises);

        const requestWithResolverInfo = this.buildIntentRequestWithResolverInfo(intentRequest);

        const isRaiseOperationSupported = await this.isRaiseOperationSupported();

        if (!isRaiseOperationSupported.supported) {
            this.logger.warn(`${isRaiseOperationSupported.reason}. Invoking legacy raise method`);

            return this.legacyIntentsController.raise(requestWithResolverInfo, this.find.bind(this));
        }

        this.logger.trace(`Sending raise request to the platform: ${JSON.stringify(request)} and method response timeout of ${this.intentResolverResponseTimeout}ms`);

        const response = await this.bridge.send<IntentRequestWithResolverInfo, Glue42Web.Intents.IntentResult>("intents", operations.raise, requestWithResolverInfo, { methodResponseTimeoutMs: this.intentResolverResponseTimeout + ADDITIONAL_BRIDGE_OPERATION_TIMEOUT });

        return response;
    }

    private buildIntentRequestWithResolverInfo(request: Glue42Web.Intents.IntentRequest): IntentRequestWithResolverInfo {
        return {
            intentRequest: request,
            resolverConfig: {
                enabled: this.useIntentsResolverUI,
                appName: this.intentsResolverAppName,
                waitResponseTimeout: this.intentResolverResponseTimeout
            }
        };
    }

    private async isRaiseOperationSupported(): Promise<IsRaiseOperationSupported> {
        try {
            const { isSupported } = await this.bridge.send<OperationCheckConfig, OperationCheckResult>("intents", systemOperations.operationCheck, { operation: "raise" });

            return {
                supported: isSupported,
                reason: isSupported ? "" : "The platform of this client is outdated and does not support \"raise\" operation"
            };
        } catch (error) {
            return {
                supported: false,
                reason: "The platform of this client is outdated and does not support \"operationCheck\" command"
            };
        }
    }

    private async all(): Promise<Glue42Web.Intents.Intent[]> {
        await Promise.all(this.unregisterIntentPromises);

        const result = await this.bridge.send<void, WrappedIntents>("intents", operations.getIntents, undefined);

        return result.intents;
    }

    private addIntentListener(intent: string | Glue42Web.Intents.AddIntentListenerRequest, handler: (context: Glue42Web.Intents.IntentContext) => any): { unsubscribe: UnsubscribeFunction } {
        AddIntentListenerDecoder.runWithException(intent);
        if (typeof handler !== "function") {
            throw new Error("Cannot add intent listener, because the provided handler is not a function!");
        }

        // eslint-disable-next-line prefer-const
        let registerPromise: Promise<void>;

        // `addIntentListener()` is sync.
        const intentName = typeof intent === "string" ? intent : intent.intent;
        const methodName = this.buildInteropMethodName(intentName);

        const alreadyRegistered = this.myIntents.has(intentName);

        if (alreadyRegistered) {
            throw new Error(`Intent listener for intent ${intentName} already registered!`);
        }
        this.myIntents.add(intentName);

        const result = {
            unsubscribe: (): void => {
                this.myIntents.delete(intentName);

                registerPromise
                    .then(() => this.interop.unregister(methodName))
                    .catch((err) => this.logger.trace(`Unregistration of a method with name ${methodName} failed with reason: ${err}`));
            }
        };

        let intentFlag: Omit<Glue42Web.Intents.AddIntentListenerRequest, "intent"> = {};

        if (typeof intent === "object") {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { intent: removed, ...rest } = intent;
            intentFlag = rest;
        }

        registerPromise = this.interop.register({ name: methodName, flags: { intent: intentFlag } }, (args: Glue42Web.Intents.IntentContext) => {
            if (this.myIntents.has(intentName)) {
                return handler(args);
            }
        });

        registerPromise.catch(err => {
            this.myIntents.delete(intentName);

            this.logger.warn(`Registration of a method with name ${methodName} failed with reason: ${err}`);
        });

        return result;
    }

    private async register(intent: string | Glue42Web.Intents.AddIntentListenerRequest, handler: (context: Glue42Web.Intents.IntentContext) => any): Promise<{ unsubscribe: UnsubscribeFunction }> {
        AddIntentListenerDecoder.runWithException(intent);

        if (typeof handler !== "function") {
            throw new Error("Cannot add intent listener, because the provided handler is not a function!");
        }

        await Promise.all(this.unregisterIntentPromises);

        const intentName = typeof intent === "string" ? intent : intent.intent;
        const methodName = this.buildInteropMethodName(intentName);

        const alreadyRegistered = this.myIntents.has(intentName);

        if (alreadyRegistered) {
            throw new Error(`Intent listener for intent ${intentName} already registered!`);
        }
        this.myIntents.add(intentName);

        let intentFlag: Omit<Glue42Web.Intents.AddIntentListenerRequest, "intent"> = {};

        if (typeof intent === "object") {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { intent: removed, ...rest } = intent;
            intentFlag = rest;
        }

        try {
            await this.interop.register({ name: methodName, flags: { intent: intentFlag } }, (args: Glue42Web.Intents.IntentContext) => {
                if (this.myIntents.has(intentName)) {
                    return handler(args);
                }
            });
        } catch (err) {
            this.myIntents.delete(intentName);

            throw new Error(`Registration of a method with name ${methodName} failed with reason: ${JSON.stringify(err)}`);
        }

        return {
            unsubscribe: () => this.unsubscribeIntent(intentName)
        };
    }

    private async find(intentFilter?: string | Glue42Web.Intents.IntentFilter): Promise<Glue42Web.Intents.Intent[]> {
        let data: WrappedIntentFilter | undefined = undefined;

        if (typeof intentFilter !== "undefined") {
            const intentFilterObj = findFilterDecoder.runWithException(intentFilter);

            if (typeof intentFilterObj === "string") {
                data = {
                    filter: {
                        name: intentFilterObj
                    }
                };
            } else if (typeof intentFilterObj === "object") {
                data = {
                    filter: intentFilterObj
                };
            }
        }

        await Promise.all(this.unregisterIntentPromises);

        const result = await this.bridge.send<WrappedIntentFilter | undefined, WrappedIntents>("intents", operations.findIntent, data);

        return result.intents;
    }

    private checkIfIntentsResolverIsEnabled(options: Glue42Web.Config): void {
        this.useIntentsResolverUI = typeof options.intents?.enableIntentsResolverUI === "boolean"
            ? options.intents.enableIntentsResolverUI
            : true;

        this.intentsResolverAppName = options.intents?.intentsResolverAppName ?? INTENTS_RESOLVER_APP_NAME;

        this.intentResolverResponseTimeout = options.intents?.methodResponseTimeoutMs ?? DEFAULT_RESOLVER_RESPONSE_TIMEOUT;
    }

    private clearUnregistrationPromise(promiseToRemove: Promise<void>): void {
        this.unregisterIntentPromises = this.unregisterIntentPromises.filter(promise => promise !== promiseToRemove);
    }

    private buildInteropMethodName(intentName: string): string {
        return `${GLUE42_FDC3_INTENTS_METHOD_PREFIX}${intentName}`;
    }

    private unsubscribeIntent(intentName: string): void {
        this.myIntents.delete(intentName);

        const methodName = this.buildInteropMethodName(intentName);

        // typings are wrong and mark unregister as a sync method
        const unregisterPromise = this.interop.unregister(methodName) as unknown as Promise<void>;

        this.unregisterIntentPromises.push(unregisterPromise);

        unregisterPromise
            .then(() => {
                this.clearUnregistrationPromise(unregisterPromise);
            })
            .catch((err) => {
                this.logger.error(`Unregistration of a method with name ${methodName} failed with reason: ${err}`);

                this.clearUnregistrationPromise(unregisterPromise);
            });
    }
}
