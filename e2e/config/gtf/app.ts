import { Glue42Web } from "../../../packages/web/web";
import { Fdc3IntentResolution, AppIdentifier, Context, IntentResolution } from './fdc3/types';
import { Gtf, ControlArgs, SubscriptionFacade, StreamFacade, CreateAppConfig, FDC3AddIntentListenerRequest } from "./gtf";

export class GtfApp implements Gtf.App {
    private registerResponseCounter = 0;
    private fdc3Ready?: Promise<void>;

    constructor(
        private readonly glue: Glue42Web.API,
        public readonly myInstance: Glue42Web.AppManager.Instance,
        private readonly controlMethodName: string,
        private readonly config: CreateAppConfig
    ) {
        if (this.config.exposeFdc3) {
            this.fdc3Ready = this.initializeFdc3();
        }
    }

    public get agm() {
        const methodDefinitionToParams = (methodDefinition: string | Glue42Web.Interop.MethodDefinition) => {
            let params;

            if (typeof methodDefinition === "string") {
                params = {
                    methodDefinition: {
                        name: methodDefinition
                    }
                };
            } else {
                params = {
                    methodDefinition
                };
            }

            return params;
        };

        return {
            instance: this.myInstance.agm,
            register: (methodDefinition: string | Glue42Web.Interop.MethodDefinition): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "register",
                    params: methodDefinitionToParams(methodDefinition)
                };
                return this.sendControl<void>(controlArgs);
            },
            unregister: (methodDefinition: string | Glue42Web.Interop.MethodDefinition): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "unregisterMethod",
                    params: methodDefinitionToParams(methodDefinition)
                };
                return this.sendControl<void>(controlArgs);
            },
            registerAsync: async (methodDefinition: string | Glue42Web.Interop.MethodDefinition, callback: (args: any, caller: Glue42Web.Interop.Instance, successCallback: (args?: any) => void, errorCallback: (error?: string | object) => void) => void): Promise<void> => {
                const responseMethodName = `agm.integration.tests.onMethodInvoke.${this.myInstance.id}.${++this.registerResponseCounter}`;

                await this.glue.interop.register(responseMethodName, (args) => {
                    const success = () => {};

                    const error = () => {};

                    return callback(args.args, this.myInstance.agm, success, error);
                });

                const controlArgs: ControlArgs = {
                    operation: "registerAsync",
                    params: {
                        ...methodDefinitionToParams(methodDefinition),
                        responseName: responseMethodName
                    }
                };

                await this.sendControl<void>(controlArgs);
            },
            createStream: async (methodDefinition: string | Glue42Web.Interop.MethodDefinition): Promise<StreamFacade> => {
                const params = methodDefinitionToParams(methodDefinition);

                const registerStreamOptions: ControlArgs = {
                    operation: "createStream",
                    params
                };

                const closeStream = async (): Promise<void> => {
                    const closeStreamOptions: ControlArgs = {
                        operation: "closeStream",
                        params
                    };

                    await this.sendControl<void>(closeStreamOptions);
                };

                const pushStream = async (data: object, branches: string | string[] = []): Promise<void> => {
                    const pushStreamOptions: ControlArgs = {
                        operation: "pushStream",
                        params: {
                            ...params,
                            data,
                            branches
                        }
                    };

                    await this.sendControl<void>(pushStreamOptions);
                };

                await this.sendControl<void>(registerStreamOptions);

                const streamFacade: StreamFacade = {
                    close: closeStream,
                    push: pushStream,
                    name: (methodDefinition as Glue42Web.Interop.MethodDefinition).name || methodDefinition as string
                };

                return streamFacade;
            },
            subscribe: async (methodDefinition: string | Glue42Web.Interop.MethodDefinition, parameters: Glue42Web.Interop.SubscriptionParams = {}): Promise<SubscriptionFacade> => {
                const callbacks: ((data: any) => void)[] = [];
                const responseMethodName = `agm.integration.tests.onSubscriptionData.${this.myInstance.id}.${++this.registerResponseCounter}`;

                await this.glue.interop.register(responseMethodName, (args) => {
                    callbacks.forEach((callback) => callback(args));
                });

                const controlArgs: ControlArgs = {
                    operation: "subscribe",
                    params: {
                        ...methodDefinitionToParams(methodDefinition),
                        parameters,
                        responseName: responseMethodName
                    }
                };

                await this.sendControl<void>(controlArgs);

                const subscriptionFacade: SubscriptionFacade = {
                    onData: (callback: (data: any) => void): void => {
                        callbacks.push(callback);
                    }
                };

                return subscriptionFacade;
            },
            unsubscribe: (methodDefinition: string | Glue42Web.Interop.MethodDefinition): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "unsubscribe",
                    params: methodDefinitionToParams(methodDefinition)
                };
                return this.sendControl<void>(controlArgs);
            },
            waitForMethodAdded: (methodDefinition: string | Glue42Web.Interop.MethodDefinition, targetAgmInstance: string = this.glue.interop.instance.instance): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "waitForMethodAdded",
                    params: {
                        ...methodDefinitionToParams(methodDefinition),
                        targetAgmInstance
                    }
                };
                return this.sendControl<void>(controlArgs);
            }
        }
    }

    public get intents() {
        return {
            addIntentListener: (intent: string | Glue42Web.Intents.AddIntentListenerRequest): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'addIntentListener',
                    params: {
                        intent: typeof intent === "string" ? { intent } : intent
                    }
                };

                return this.sendControl<void>(controlArgs);
            },
            unregisterIntent: (intent: string | Glue42Web.Intents.AddIntentListenerRequest): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'unregisterIntent',
                    params: {
                        intent: typeof intent === "string" ? { intent } : intent
                    }
                };

                return this.sendControl<void>(controlArgs);
            }
        };
    }

    public get channels() {
        return {
            publish: (data: any, name: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'publish',
                    params: {
                        data,
                        name
                    }
                };

                return this.sendControl<void>(controlArgs);
            }
        };
    }

    public async stop(): Promise<void> {
        await this.myInstance.stop();
    }

    public get contexts() {
        return {
            all: (): Promise<string[]> => {
                const controlArgs: ControlArgs = {
                    operation: "getAllContextNames",
                    params: {}
                };

                return this.sendControl<string[]>(controlArgs);
            },

            set: (ctxName: string, ctxData: any): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "setContext",
                    params: {
                        name: ctxName,
                        data: ctxData
                    }
                };

                return this.sendControl<void>(controlArgs);
            },

            update: (ctxName: string, ctxData: any): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "updateContext",
                    params: {
                        name: ctxName,
                        data: ctxData
                    }
                };

                return this.sendControl<void>(controlArgs);
            },

            get: (ctxName: string): Promise<any> => {
                const controlArgs: ControlArgs = {
                    operation: "getContext",
                    params: {
                        name: ctxName
                    }
                };

                return this.sendControl<any>(controlArgs);
            },

            destroy: (ctxName: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "destroyContext",
                    params: {
                        name: ctxName
                    }
                };

                return this.sendControl<any>(controlArgs);
            },

            setPath: (ctxName: string, path: string, data: any): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "setPathContext",
                    params: {
                        name: ctxName,
                        path,
                        data
                    }
                };

                return this.sendControl<any>(controlArgs);
            },

            setPaths: (ctxName: string, paths: Glue42Web.Contexts.PathValue[]): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "setPathsContext",
                    params: {
                        name: ctxName,
                        paths
                    }
                };

                return this.sendControl<any>(controlArgs);
            }
        };
    }

    public get search() {
        return {
            createSimpleProvider: async () => {
                const controlArgs: ControlArgs = {
                    operation: "createSimpleSearchProvider",
                    params: {}
                };

                return this.sendControl<void>(controlArgs);
            }
        }
    }

    public get fdc3() {
        return {
            joinUserChannel: async (channelId: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3JoinUserChannel",
                    params: { channelId }
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            broadcast: async (context: Context): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3Broadcast",
                    params: { context }
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            broadcastOnAppChannel: async (channelId: string, context: Context): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3BroadcastOnAppChannel",
                    params: { channelId, context }
                }

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            broadcastOnPrivateChannel: async (context: Context): Promise<void> => {
                const controlArgs = {
                    operation: "fdc3BroadcastOnPrivateChannel",
                    params: { context }
                }

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            raiseIntent: async (intent: string, context: Context, app?: AppIdentifier): Promise<IntentResolution> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3RaiseIntent",
                    params: { intent, context }
                };

                if (app) {
                    controlArgs.params.app = app;
                }

                await this.fdc3Ready;

                const { resolutionResult, data } = await this.sendControl<Fdc3IntentResolution>(controlArgs);

                return {
                    ...data,
                    getResult: () => Promise.resolve(resolutionResult)
                }
            },
            addContextListenerOnPrivateChannel: async (contextType: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3AddContextListenerOnPrivateChannel",
                    params: { contextType }
                }

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            unsubscribeFromPrivateChannelListener: async (): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3UnsubscribeFromPrivateChannelListener",
                    params: {}
                }

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            disconnectFromPrivateChannel: async (): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: "fdc3DisconnectFromPrivateChannel",
                    params: {}
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            addIntentListener: async ({ intent, returnValue, methodResponseTimeoutMs }: FDC3AddIntentListenerRequest): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'fdc3AddIntentListener',
                    params: { intent, returnValue, methodResponseTimeoutMs }
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            unsubscribeIntentListener: async (intent: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'fdc3UnsubscribeIntentListener',
                    params: { intent }
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            getIntentListenerContext: async (intent: string): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'fdc3GetIntentListenerContext',
                    params: { intent }
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            },
            createPrivateChannel: async (): Promise<void> => {
                const controlArgs: ControlArgs = {
                    operation: 'fdc3CreatePrivateChannel',
                    params: {}
                };

                await this.fdc3Ready;

                return this.sendControl<void>(controlArgs);
            }
        };
    }

    private async initializeFdc3() {
        const controlArgs: ControlArgs = {
            operation: "initFdc3",
            params: {}
        };

        return this.sendControl<void>(controlArgs);
    }

    private async sendControl<T>(controlArgs: ControlArgs): Promise<T> {
        const invResult = await this.glue.interop.invoke<{ result: T }>(this.controlMethodName, controlArgs, this.myInstance.agm);

        return invResult.returned.result;
    }
}
