import { ENTERPRISE_NO_APP_NAME, GLUE42_FDC3_INTENTS_METHOD_PREFIX } from '../shared/constants';
import { StartContextDecoder } from '../shared/decoders';
import { validateGlue } from '../shared/utils';
import { Application, Glue42, Intent, IntentHandler, IntentRequest, InvocationResult, ServerInstance, UnsubscribeFunction } from '../types/glue';
import { ResolverIntentHandler } from '../types/types';

export class GlueController {
    private glue!: Glue42;

    private _intent!: string | IntentRequest;
    private _callerId!: string;
    private _methodName!: string;

    public async initialize(glue: Glue42) {
        validateGlue(glue);

        this.glue = glue;

        const context = await this.glue.windows.my().getContext();

        const decodedContext = StartContextDecoder.runWithException(context);

        this._intent = decodedContext.intent;
        this._callerId = decodedContext.callerId;
        this._methodName = decodedContext.methodName;
    }

    public get intent(): string | IntentRequest {
        return this._intent;
    }

    public async sendInteropMethodResponse(handler: ResolverIntentHandler): Promise<InvocationResult | undefined> {
        const extendedHandler = await this.getIntentHandler(handler);

        const methodIsRegistered = this.isMethodRegistered();

        if (!this.isInstanceStillRunning()) {
            this.glue.windows.my().close();
            return;
        }

        if (!methodIsRegistered) {
            return this.waitForResponseMethodAdded(extendedHandler);
        }

        return this.glue.interop.invoke(this._methodName, { intent: this.getIntentName(), handler: extendedHandler }, { instance: this._callerId });
    }

    public subscribeForServerMethodAdded(callback: (handler: ResolverIntentHandler) => void): UnsubscribeFunction {
        return this.glue.interop.serverMethodAdded(({ server, method }) => {
            const isInstanceHandler = this.checkIfInstanceIntentHandler(server, method.name);

            if (!isInstanceHandler) {
                return;
            }

            const builtHandler = this.buildIntentHandler(server.applicationName, server.instance);

            callback(builtHandler);
        });
    }

    public subscribeForServerMethodRemoved(callback: (handler: ResolverIntentHandler) => void): UnsubscribeFunction {
        return this.glue.interop.serverMethodRemoved(({ server, method }) => {
            const isInstanceHandler = this.checkIfInstanceIntentHandler(server, method.name);

            if (!isInstanceHandler) {
                return;
            }

            const builtInstance = this.buildIntentHandler(server.applicationName, server.instance);

            callback(builtInstance);
        });
    }

    public subscribeOnAppAdded(callback: (handler: ResolverIntentHandler) => void): UnsubscribeFunction {
        return this.glue.appManager.onAppAdded(async (app: Application) => {
            const isIntentHandler = await this.checkIfAppIntentHandler(app);

            if (!isIntentHandler) {
                return;
            }

            const builtHandler = this.buildIntentHandler(app.name);

            callback(builtHandler);
        });
    }

    public subscribeOnAppRemoved(callback: (handler: ResolverIntentHandler) => void): UnsubscribeFunction {
        return this.glue.appManager.onAppRemoved(async (app: Application) => {
            const isIntentHandler = await this.checkIfAppIntentHandler(app);

            if (!isIntentHandler) {
                return;
            }

            const builtHandler = this.buildIntentHandler(app.name);

            callback(builtHandler);
        });
    }

    private getIntentName(): string {
        return typeof this.intent === "object" ? this.intent.intent : this.intent;
    }

    private waitForResponseMethodAdded(handler: ResolverIntentHandler): Promise<InvocationResult> {
        const responsePromise: Promise<InvocationResult> = new Promise((resolve, reject) => {
            const unsub = this.glue.interop.serverMethodAdded(async ({ server, method }) => {
                if (server.instance !== this._callerId || method.name !== this._methodName) {
                    return;
                }

                try {
                    const invocationRes = await this.glue.interop.invoke(this._methodName, { intent: this.intent, handler }, { instance: this._callerId });
                    resolve(invocationRes);
                } catch (error) {
                    reject(error);
                }

                if (unsub) {
                    unsub();
                }
            });
        });

        return responsePromise;
    }

    private async checkIfAppIntentHandler(app: Application): Promise<boolean> {
        const intentName = this.getIntentName();

        if (typeof this.intent === "object" && this.intent.handlers) {
            return this.checkIfAppInPassedHandlers(app);
        }

        if ((window as any).glue42core && (window as any).glue42core.webStarted) {
            return this.checkInCoreIfAppShouldShow(app, intentName);
        }

        if ((window as any).glue42gd) {
            return this.checkInEnterpriseIfAppShouldShow(app, intentName);
        }

        return false;
    }

    private checkIfInstanceIntentHandler(server: ServerInstance, methodName: string): boolean {
        const isMethodForCurrentIntent = this.checkIfMethodIsForCurrentIntent(methodName);

        if (!isMethodForCurrentIntent) {
            return false;
        }

        if (typeof this.intent === "object" && this.intent.handlers && !this.checkIfInstanceInPassedHandlers(server)) {
            return false;
        }

        return true;
    }

    private checkIfAppInPassedHandlers(app: Application): boolean {
        const handlersForApp = (this.intent as IntentRequest).handlers?.filter(handler => handler.applicationName === app.name);

        if (!handlersForApp?.length) return false;

        if ((this.intent as IntentRequest).target === "startNew") {
            return !!handlersForApp.find((handler) => handler.type === "app")
        }

        if ((this.intent as IntentRequest).target === "reuse") {
            const openedInstance = handlersForApp.find(handler => handler.type === "instance");

            // show the app ONLY if there's no opened instance 
            return !openedInstance;
        }

        return !!handlersForApp.find(handler => handler.type === "app");
    }

    private async checkInCoreIfAppShouldShow(app: Application, intentName: string): Promise<boolean> {
        // show instances and apps which do NOT have opened instances
        if (typeof this.intent === "object" && this.intent.target === "reuse") {
            // check if app registers the intent in its app definition
            const currentIntent = app.userProperties.intents?.find((intent: Intent) => intent.name === intentName);

            if (!currentIntent) return false;

            const intent = (await this.glue.intents.find(intentName)).find(intent => intent.name === intentName);

            if (!intent) return false;

            return !intent.handlers.find(handler => handler.applicationName === app.name && handler.type === "instance" && handler.instanceId)
        }

        return !!app.userProperties.intents?.find((intent: Intent) => intent.name === intentName);
    }

    private async checkInEnterpriseIfAppShouldShow(app: Application, intentName: string): Promise<boolean> {
        const intent = (await this.glue.intents.find(intentName)).find(intent => intent.name === intentName);

        if (!intent) return false;

        if (typeof this.intent === "object" && this.intent.target === "reuse") {
            const handlersForCurrentIntent = intent.handlers.filter(handler => handler.applicationName === app.name);

            if (!handlersForCurrentIntent.length) return false;

            const openedInstance = handlersForCurrentIntent.some(handler => handler.instanceId);

            return !openedInstance;
        }

        return !!intent.handlers.find((handler) => handler.applicationName === app.name);
    }

    private checkIfInstanceInPassedHandlers(server: ServerInstance): boolean {
        return !!(this.intent as IntentRequest).handlers?.find(handler => handler.applicationName === server.application && server.windowId === handler.instanceId);
    }

    private buildIntentHandler(appName: string, instanceId?: string): ResolverIntentHandler {
        const foundApp = this.glue.appManager.application(appName);

        const serverInstance = this.glue.interop.servers().find(server => server.instance === instanceId);

        // iframe will no be found as an app but it can still be a valid handler
        if (foundApp) {
            /* Handle cases where a window is opened via glue.windows.open() and it adds a intent listener for the current intent:
                Glue42 Core -> there will be no application in AppManager API
                Glue42 Enterprise -> there will be an instance of an application called "no-app-window" in AppManager API 
            */
            return {
                applicationName: foundApp.name !== ENTERPRISE_NO_APP_NAME ? foundApp.name : serverInstance?.application || serverInstance?.applicationName || "",
                applicationIcon: foundApp?.icon,
                instanceId
            }
        }

        return {
            applicationName: serverInstance?.application || serverInstance?.applicationName || serverInstance?.instance || "",
            applicationIcon: "",
            instanceId
        }
    }

    private async getIntentHandler(userHandler: ResolverIntentHandler): Promise<IntentHandler> {
        const intentName = this.getIntentName();

        const searchedIntent = (await this.glue.intents.find(intentName)).find(intent => intent.name === intentName);

        if (!searchedIntent) {
            throw new Error(`Intent with name ${intentName} does not exist`);
        }

        const handler = this.findHandlerByFilter({ instanceId: userHandler.instanceId, applicationName: userHandler.applicationName }, searchedIntent.handlers);

        if (!handler) {
            throw new Error(`There's no such existing intent handler: ${JSON.stringify(userHandler)}`);
        }

        return handler;
    }

    private findHandlerByFilter(filterObject: { instanceId?: string, applicationName?: string }, handlers: IntentHandler[]): IntentHandler | undefined {
        if (filterObject.instanceId) {
            return handlers.find(handler => handler.instanceId === filterObject.instanceId);
        }

        if (filterObject.applicationName) {
            return handlers.find(handler => handler.applicationName === filterObject.applicationName);
        }
    }

    private isMethodRegistered(): boolean {
        return !!this.glue.interop.methods(this._methodName).length;
    }

    private isInstanceStillRunning(): boolean {
        return !!this.glue.interop.servers().find(server => server.windowId === this._callerId);
    }

    private checkIfMethodIsForCurrentIntent(methodName: string): boolean {
        const intentName = this.getIntentName();

        const expectedMethodName = `${GLUE42_FDC3_INTENTS_METHOD_PREFIX}${intentName}`;

        return expectedMethodName === methodName;
    }
}
