import { Context, Listener, AppIntent, Channel, IntentResolution, IntentResult, IntentHandler, ResolveError, ResultError } from "@finos/fdc3";
import { GlueController } from "./glue";
import { GlueIntentHandler, GlueIntent, IntentContext, IntentResult as GlueIntentResult, GlueIntentRequest, Logger } from "../types/glue42Types";
import { IntentHandlerResultTypes, fdc3NothingContextType } from "../shared/constants";
import { ChannelsFactory } from "../channels/factory";
import { extractChannelMetadata, isChannel, isChannelMetadata, isContext } from "../channels/utils";
import { ChannelsController } from "../channels/controller";
import { AddIntentListenerConfig, FindIntentConfig, FindIntentsByContextConfig, RaiseIntentConfig, RaiseIntentForContextConfig } from "../types/fdc3Types";

export class IntentsController {
    private _logger?: Logger;

    constructor(
        private readonly glueController: GlueController,
        private readonly channelsController: ChannelsController,
        private readonly channelsFactory: ChannelsFactory
    ) {}

    public get logger(): Logger {
        if (!this._logger) {
            this._logger = this.glueController.initSubLogger("fdc3.intents.controller");
        }

        return this._logger;
    }

    public async findIntent({ commandId, intent, context, resultType}: FindIntentConfig): Promise<AppIntent> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - findIntent() invoked for intent ${intent} with contextType ${context?.type} and resultType ${resultType}`);

        const glueIntents = await this.glueController.findIntents({ name: intent });

        if (!glueIntents.length) {
            throw new Error(`${ResolveError.NoAppsFound} - There are no apps handling the passed intent ${intent}`);
        }

        // glue.intents.find() returns Intent[] grouped by intent name
        const searchedGlueIntent = glueIntents.find((glueIntent) => glueIntent.name === intent);

        if (!searchedGlueIntent) {
            throw new Error(`${ResolveError.NoAppsFound} - There are not apps handling the passed intent ${intent}`);
        }

        if (!context && !resultType) {
            return this.convertGlue42IntentToFDC3Intent(searchedGlueIntent);
        }

        const contextType = (context && context.type === fdc3NothingContextType) ? undefined : context?.type;

        const filteredIntent = this.getGlueIntentWithFilteredHandlers(searchedGlueIntent, { contextType, resultType });

        if (!filteredIntent.handlers.length) {
            throw new Error(`${ResolveError.NoAppsFound} - No apps handling intent ${intent} with contextType ${context?.type} and resultType ${resultType}`);
        }

        return this.convertGlue42IntentToFDC3Intent(filteredIntent);
    }

    public async findIntentsByContext({ commandId, context, resultType }: FindIntentsByContextConfig): Promise<AppIntent[]> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - findIntentsByContext() invoked for context type ${context.type} and resultType ${resultType}`);

        const glueIntents = await this.glueController.findIntents({ contextType: context.type, resultType });

        if (!glueIntents.length) {
            throw new Error(ResolveError.NoAppsFound);
        }

        this.logger.info(`[${commandId}] - parsing glue intents to fdc3 intents and returning`);

        return glueIntents.map((glueIntent) => {
            const intentWithFilteredHandlers = this.getGlueIntentWithFilteredHandlers(glueIntent, { contextType: context.type, resultType });

            return this.convertGlue42IntentToFDC3Intent(intentWithFilteredHandlers);
        });
    }

    public async raiseIntent({ commandId , intent, context, target }: RaiseIntentConfig): Promise<IntentResolution> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - raiseIntent() invoked for intent ${intent} with contextType: ${context.type} and target: ${target}`);

        const glueContext = { type: context.type, data: { ...context } };

        const searchedGlueIntent = (await this.glueController.findIntents({ name: intent, contextType: context.type === fdc3NothingContextType ? undefined : context.type })).find(glueIntent => glueIntent.name === intent);

        if (!searchedGlueIntent) {
            throw new Error(`${ResolveError.NoAppsFound} - There's no app registering an intent with passed name`);
        }

        this.logger.info(`[${commandId}] - filtering found intent handlers by context type`);

        const filteredGlueIntent = context.type === fdc3NothingContextType
            ? searchedGlueIntent
            : this.getGlueIntentWithFilteredHandlers(searchedGlueIntent, { contextType: context.type });

        if (!filteredGlueIntent.handlers.length) {
            throw new Error(`${ResolveError.NoAppsFound} - There's no app registering an intent with the passed context type ${context.type}`);
        }

        if (!target) {
            this.logger.info(`[${commandId}] - raising intent ${intent} with contextType ${context.type} and handlers ${filteredGlueIntent.handlers.map(h => h.applicationName && h.instanceId)}`);

            return this.invokeRaiseIntent(commandId, { intent, context: glueContext, handlers: filteredGlueIntent.handlers });
        }

        const appName = typeof target === "string" ? target : target.appId;

        const app = this.glueController.getApplication(appName);

        if (!app) {
            throw new Error(`${ResolveError.TargetAppUnavailable} - There's no such target app (${JSON.stringify(target)})`);
        }

        this.logger.info(`[${commandId}] - target app ${appName} found`);

        const isTargetAppAValidHandler = filteredGlueIntent.handlers.find(handler => handler.applicationName === appName);

        if (!isTargetAppAValidHandler) {
            throw new Error(`${ResolveError.TargetAppUnavailable} - The passed target (${JSON.stringify(target)}) is not a handler for the passed intent`);
        }

        if (typeof target === "string" || !target.instanceId) {
            this.logger.info(`[${commandId}] - target app ${appName} is a valid handler. Raising intent ${intent} with contextType ${context.type} and handlers ${filteredGlueIntent.handlers}`);

            return this.invokeRaiseIntent(commandId, {
                intent,
                context: glueContext,
                target: { app: appName, instance: app.instances[0]?.id }
            });
        }

        // target is an object with instanceId prop
        const isTargetInstanceAValidHandler = filteredGlueIntent.handlers.find(handler => handler.instanceId === target.instanceId);

        if (!isTargetInstanceAValidHandler) {
            throw new Error(`${ResolveError.TargetInstanceUnavailable} - The passed target (${JSON.stringify(target)}) is not a handler for the passed intent`);
        }

        this.logger.info(`[${commandId}] - raising intent ${intent} with contextType ${context.type} to target instance of app ${appName} and id ${target.instanceId}`);

        return this.invokeRaiseIntent(commandId, {
            intent,
            context: glueContext,
            target: { instance: target.instanceId }
        });
        
    }

    public async raiseIntentForContext({ commandId, context, target }: RaiseIntentForContextConfig): Promise<IntentResolution> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - raiseIntentForContext() invoked with contextType ${context.type} and target ${target}`);

        const appIntents: AppIntent[] = await this.findIntentsByContext({ commandId, context });

        if (!appIntents || appIntents.length === 0) {
            throw new Error(ResolveError.NoAppsFound);
        }

        return this.raiseIntent({ commandId, intent: appIntents[0].intent.name, context, target });
    }

    public async addIntentListener({ commandId, intent, handler}: AddIntentListenerConfig): Promise<Listener> {
        await this.glueController.gluePromise;

        this.logger.info(`[${commandId}] - addIntentListener() invoked for intent ${intent}`);

        const wrappedHandler = this.getWrappedIntentHandler(handler);

        return this.glueController.addIntentListener(intent, wrappedHandler);
    }

    private async getResult(commandId: string, glueIntentResult: GlueIntentResult): Promise<IntentResult> {
        this.logger.info(`[${commandId}] - getResult() of IntentResolution invoked`);

        const { result } = glueIntentResult;

        const isResultChannelMetadata = isChannelMetadata(result);

        if (!isResultChannelMetadata) {
            return result;
        }

        const { clientId, creatorId } = await this.glueController.getContext(result.id);

        this.logger.info(`[${commandId}] - result is a private channel with creatorId ${creatorId} and clientId ${clientId}`);

        const myInteropInstanceId = this.glueController.getMyInteropInstanceId();

        if ((creatorId && creatorId !== myInteropInstanceId) && (clientId && clientId !== myInteropInstanceId)) {
            /* Private channels are created to support secure communication between two applications */
            throw new Error(`${ResultError.NoResultReturned} - There are already two parties on this private channel`);
        }

        const channel = this.channelsFactory.buildModel(result);

        if (myInteropInstanceId && myInteropInstanceId !== creatorId) {
            this.logger.info(`[${commandId}] - the current user is the second party of the private channel. Adding my id ${myInteropInstanceId} as a clientId`);

            await this.channelsController.addClientToPrivateChannel(commandId, channel.id, myInteropInstanceId);
        }

        this.logger.info(`[${commandId}] - returning private channel`);

        return channel;
    }

    private convertGlue42IntentToFDC3Intent(glueIntent: GlueIntent): AppIntent {
        const { name, handlers } = glueIntent;

        const appIntent: AppIntent = {
            /* Issue with the FDC3 specification: there are multiple displayNames */
            intent: { name, displayName: handlers[0].displayName || "" },
            apps: handlers.map((handler: GlueIntentHandler) => {
                const appName = handler.applicationName;
                const app = this.glueController.getApplication(appName);

                return {
                    appId: appName,
                    instanceId: handler.instanceId,
                    name: appName,
                    title: handler.applicationTitle || handler.instanceTitle || appName,
                    tooltip: app?.userProperties.tooltip || `${appName} (${handler.type})`,
                    description: handler.applicationDescription,
                    icons: handler.applicationIcon ? [handler.applicationIcon, ...(app?.userProperties.icons || [])] : app?.userProperties.icons,
                    images: app?.userProperties.images,
                    resultType: handler.resultType
                };
            })
        };

        return appIntent;
    }

    private getResultType(data: any): IntentHandlerResultTypes {
        if (isChannel(data)) {
            return IntentHandlerResultTypes.Channel;
        }

        if (isContext(data)) {
            return IntentHandlerResultTypes.Context;
        }

        throw new Error("Async handler function should return a promise that resolves to a Context or Channel");
    }

    private getWrappedIntentHandler(handler: IntentHandler): (context: IntentContext) => Promise<any> {
        const wrappedHandler = async (glue42Context: IntentContext): Promise<any> => {
            const handlerResult = await handler({ ...glue42Context.data, type: glue42Context.type || "" });

            if (!handlerResult) {
                return;
            }

            const handlerResultType = this.getResultType(handlerResult);

            return handlerResultType === IntentHandlerResultTypes.Channel
                ? extractChannelMetadata(handlerResult as Channel)
                : handlerResult as Context;
        };

        return wrappedHandler;
    }

    private getGlueIntentWithFilteredHandlers(glueIntent: GlueIntent, filter: { contextType?: string, resultType?: string }): GlueIntent {
        const { name, handlers } = glueIntent;

        let filteredHandlers = handlers;

        if (filter.contextType) {
            filteredHandlers = handlers.filter((handler) => handler.contextTypes?.includes(filter.contextType as string));
        }

        if (filter.resultType) {
            filteredHandlers = handlers.filter((handler) => handler.resultType?.includes(filter.resultType as string));
        }

        return { name, handlers: filteredHandlers };
    }

    private async invokeRaiseIntent(commandId: string, request: GlueIntentRequest): Promise<IntentResolution> {
        try {
            const glueIntentResult = await this.glueController.raiseIntent(request);

            return {
                source: {
                    appId: glueIntentResult.handler.applicationName,
                    instanceId: glueIntentResult.handler.instanceId
                },
                intent: request.intent,
                getResult: (() => this.getResult(commandId, glueIntentResult)).bind(this)
            };
        } catch (error) {
            throw new Error(`${ResolveError.IntentDeliveryFailed}. Reason: ${typeof error === "string" ? error : JSON.stringify((error as { message: string }).message)}`);
        }
    }
}
