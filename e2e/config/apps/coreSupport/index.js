import { isChannel, extractChannelMetadata } from '../shared/utils.js';

const controlMethodName = 'G42Core.E2E.Control';

let myStreams = [];
let mySubscriptions = [];
const intentToUnsubObj = {};

let privateChannel;
let privateChannelListener;

/* whenever FDC3 intent listener is added or invoked, add its listener and context in this dictionary */
/*
    {
        intentName: {
            context: Context;
            listener: Listener;
        }
    }
*/
const fdc3IntentContextAndListener = {};

const setContext = async ({ name, data }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation setContext!`);
    }
    if (!data) {
        return error(`Context data is not provided to operation setContext!`);
    }

    await glue.contexts.set(name, data);

    success();
};

const updateContext = async ({ name, data }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation setContext!`);
    }
    if (!data) {
        return error(`Context data is not provided to operation setContext!`);
    }

    await glue.contexts.update(name, data);

    success();
};

const getContext = async ({ name }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation getContext`);
    }

    const context = await glue.contexts.get(name);

    success({ result: context });
};

const getAllContextNames = async (_, success) => {
    const contextNames = glue.contexts.all();

    success({ result: contextNames });
};

const destroyContext = async ({ name }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation destroyContext`);
    }

    await glue.contexts.destroy(name);

    success();
};

const setPathContext = async ({ name, path, data }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation setPathContext`);
    }

    await glue.contexts.setPath(name, path, data);

    success();
};

const setPathsContext = async ({ name, paths }, success, error) => {
    if (!name) {
        return error(`Context name is not provided to operation setPathsContext`);
    }

    await glue.contexts.setPaths(name, paths);

    success();
};

const register = async ({ methodDefinition }, success) => {
    await glue.interop.register(methodDefinition, (args) => {
        const shouldFail = args.shouldFail;

        if (typeof shouldFail !== 'undefined') {
            if ((typeof shouldFail === 'boolean' && shouldFail) ||
                (shouldFail.application === glue.interop.instance.application) ||
                (shouldFail.instance === glue.interop.instance.instance) ||
                (Array.isArray(shouldFail) && shouldFail.some((app) => app.instance === glue.interop.instance.instance))) {
                throw new Error('Failing on purpose!');
            }
        }

        return args;
    });
    success();
};

const unregisterMethod = async ({ methodDefinition }, success) => {
    glue.interop.unregister(methodDefinition);
    success();
};

const registerAsync = async ({ methodDefinition, responseName }, success) => {
    await glue.interop.registerAsync(methodDefinition, async (args, _, successCallback, errorCallback) => {
        const shouldFail = args.shouldFail;

        if (typeof shouldFail !== 'undefined') {
            if ((typeof shouldFail === 'boolean' && shouldFail) ||
                (shouldFail.application === glue.interop.instance.application) ||
                (shouldFail.instance === glue.interop.instance.instance) ||
                (Array.isArray(shouldFail) && shouldFail.some((app) => app.instance === glue.interop.instance.instance))) {

                errorCallback('Failing on purpose!');

                return;
            }
        }

        await glue.interop.invoke(responseName, { args });

        successCallback();
    });
    success();
};

const createStream = async ({ methodDefinition }, success) => {
    let publicData;
    let newStream;

    const subscriptionRequestHandler = (request) => {
        if (request.arguments.reject) {
            request.reject();
            return;
        }

        if (request.arguments.publicData) {
            publicData = request.arguments.publicData;
        }

        const branchKey = request.arguments.branchKey;
        if (branchKey) {
            request.acceptOnBranch(branchKey);
            return;
        }

        request.accept();
    };

    const subscriptionAddedHandler = (subscription) => {
        const privateData = subscription.arguments.privateData;
        if (privateData) {
            const data = {
                private: privateData
            };

            subscription.push(data);
            return;
        }

        if (subscription.arguments.closeMe) {
            setTimeout(() => {
                subscription.close();
            }, subscription.arguments.closeMeAfter || 1000);
            return;
        }

        if (publicData) {
            const data = {
                public: publicData
            };
            newStream.push(data);
        }
    };

    newStream = await glue.interop.createStream(methodDefinition, {
        subscriptionAddedHandler,
        subscriptionRequestHandler
    });
    myStreams.push(newStream);
    success();
};

const pushStream = async ({ methodDefinition, data, branches }, success) => {
    const stream = myStreams.find((myStream) => myStream.definition.name === methodDefinition.name);

    if (typeof stream === 'undefined') {
        throw new Error('You need to open a coreSupport stream before you use it!');
    }

    stream.push(data, branches);

    success();
};

const closeStream = async ({ methodDefinition }, success) => {
    const stream = myStreams.find((myStream) => myStream.definition.name === methodDefinition.name);

    if (typeof stream === 'undefined') {
        throw new Error('You are trying to close a stream that is not opened(was never opened or was closed).Remember to call the`createStream()` method on a coreSupport object before trying to close a stream.');
    }

    stream.close();
    myStreams = myStreams.filter((myStream) => myStream.definition.name !== methodDefinition.name);

    success();
};

const subscribe = async ({ methodDefinition, parameters, responseName }, success, error) => {
    try {
        const newSubscription = await glue.interop.subscribe(methodDefinition, parameters);
        mySubscriptions.push(newSubscription);
        newSubscription.onData(({ data, requestArguments }) => {
            glue.interop.invoke(responseName, { data, requestArguments });
        });

        success();
    } catch (err) {
        error('Subscription rejected!');
    }
};

const unsubscribe = async ({ methodDefinition }, success) => {
    const subscription = mySubscriptions.find((mySubscription) => mySubscription.stream.name === methodDefinition.name);

    if (typeof subscription === 'undefined') {
        throw new Error('You are trying to unsubscribe from a stream you are not subscribed to.Remember to call the`subscribe()` method on a coreSupport object before trying to unsubscribe from a stream.');
    }

    subscription.close();
    mySubscriptions = mySubscriptions.filter((mySubscription) => mySubscription.stream.name !== methodDefinition.name);

    success();
};

const waitForMethodAdded = async ({ methodDefinition, targetAgmInstance }, success) => {
    await new Promise((resolve) => {
        const unsub = glue.interop.serverMethodAdded(({ method, server }) => {
            if (method.name === methodDefinition.name) {
                if (typeof targetAgmInstance === "undefined") {
                    unsub();
                    resolve();
                } else {
                    if (targetAgmInstance === server.instance) {
                        unsub();
                        resolve();
                    }
                }
            }
        });
    });
    success();
};

const addIntentListener = async ({ intent }, success, error) => {
    const intentName = intent.intent;
    if (typeof intentToUnsubObj[intentName] === 'undefined') {
        const unsubObj = glue.intents.addIntentListener(intent, (context) => {
            return context;
        });

        intentToUnsubObj[intentName] = unsubObj;
        success();
    } else {
        error(`Intent ${intentName} already registered!`);
    }
};

const unregisterIntent = ({ intent }, success, error) => {
    const intentName = intent.intent;
    if (typeof intentToUnsubObj[intentName] === 'undefined') {
        error(`Intent ${intentName} already unregistered!`);
    } else {
        intentToUnsubObj[intentName].unsubscribe();

        delete intentToUnsubObj[intentName];

        success();
    }
};

const publish = async ({ data, name }, success) => {
    await glue.channels.publish(data, name);

    success();
};

const fdc3JoinUserChannel = async ({ channelId }, success, error) => {
    try {
        await fdc3.joinUserChannel(channelId);
        success();
    } catch (err) {
        error(err);
    }
}

const fdc3Broadcast = async ({ context }, success, error) => {
    try {
        await fdc3.broadcast(context);
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3RaiseIntent = async (params, success, error) => {
    try {
        const resolution = await fdc3.raiseIntent(params.intent, params.context, params.app);

        const { getResult, ...data } = resolution;

        const resolutionResult = await getResult();

        if (!resolutionResult) {
            success({ result: { data, resolutionResult } });
            return;
        }

        const resultIsChannel = isChannel(resolutionResult);

        if (resultIsChannel) {
            privateChannel = resolutionResult;
        }

        const result = {
            data,
            resolutionResult:
                resultIsChannel // if result is a channel => return the metadata only
                    ? extractChannelMetadata(resolutionResult)
                    : resolutionResult
        };

        success({ result });
    } catch (err) {
        error(err);
    }
};

const fdc3BroadcastOnAppChannel = async ({ channelId, context }, success, error) => {
    const channel = await fdc3.getOrCreateChannel(channelId);

    if (!channel) {
        error("No channel with such name");
    }

    try {
        await channel.broadcast(context);
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3BroadcastOnPrivateChannel = async ({ context }, success, error) => {
    try {
        await privateChannel.broadcast(context);
        success();
    } catch (err) {
        error(err);
    }
}

const fdc3AddContextListenerOnPrivateChannel = async ({ contextType }, success, error) => {
    const handler = () => {};

    try {
        privateChannelListener = await privateChannel.addContextListener(contextType, handler);
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3UnsubscribeFromPrivateChannelListener = async (_, success, error) => {
    try {
        privateChannelListener.unsubscribe();
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3AddIntentListener = async ({ intent, returnValue, methodResponseTimeoutMs }, success, error) => {
    try {
        const listener = await fdc3.addIntentListener(intent, async (context) => {
            fdc3IntentContextAndListener[intent] = { ...fdc3IntentContextAndListener[intent], context };

            if (methodResponseTimeoutMs) {
                const promise = new Promise((resolve) => {
                    setTimeout(resolve, methodResponseTimeoutMs);
                });

                await promise;
            } 

            if (!returnValue) {
                return;
            }

            if (returnValue.context) {
                return returnValue.context;
            }

            if (returnValue.privateChannel) {
                return privateChannel;
            }
        });
        fdc3IntentContextAndListener[intent] = { ...fdc3IntentContextAndListener[intent], listener };
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3UnsubscribeIntentListener = async ({ intent }, success, error) => {
    const intentListenerAndContext = fdc3IntentContextAndListener[intent];

    if (!intentListenerAndContext) {
        error(`No handler registered for passed intent ${intent}`);
    }

    intentListenerAndContext.listener.unsubscribe();

    delete fdc3IntentContextAndListener[intent];

    success();
};

const fdc3GetIntentListenerContext = async ({ intent }, success, error) => {
    const intentListenerAndContext = fdc3IntentContextAndListener[intent];

    if (!intentListenerAndContext) {
        error(`No handler registered for passed intent ${intent}`);
    }

    const { context } = intentListenerAndContext;

    success({ result: context });
};

const fdc3CreatePrivateChannel = async (_, success, error) => {
    try {
        privateChannel = await fdc3.createPrivateChannel();
        success();
    } catch (err) {
        error(err);
    }
}

const initFdc3 = async (_, success, error) => {
    const fdc3Ready = new Promise((resolve) => {
        window.addEventListener("fdc3Ready", resolve);
    });

    await import("../libs/fdc3.umd.js");

    await fdc3Ready;

    success();
};

const fdc3DisconnectFromPrivateChannel = async (_, success, error) => {
    try {
        await privateChannel.disconnect();
        success();
    } catch (err) {
        error(err);
    }
};

const createSimpleSearchProvider = async (_, success, error) => {

    const provider = await glue.search.registerProvider({ name: "support" });

    provider.onQuery(async (query) => {
        if (!query.search || !query.search.length) {
            query.done();
            return;
        }

        const allApps = glue.appManager.applications();

        const firstLevel = allApps.filter((app) => !!app.title?.toLowerCase().includes(query.search.toLowerCase()));
        const secondLevel = allApps.filter((app) => !!app.caption?.toLowerCase().includes(query.search.toLowerCase()));
        const thirdLevel = allApps.filter((app) => app.name.toLowerCase().includes(query.search.toLowerCase()));

        const foundApps = Array.from(new Set([...firstLevel, ...secondLevel, ...thirdLevel]));

        const appQueryResults = foundApps.map((app) => {
            return {
                type: {
                    name: "application",
                    displayName: "Applications"
                },
                id: app.name,
                displayName: app.title,
                description: app.caption,
                iconURL: app.icon
            }
        });

        try {
            appQueryResults.forEach((queryResult) => query.sendResult(queryResult));
        } catch (error) {
            console.warn(error)
        }

        const allLayouts = await glue.layouts.getAll("Global");

        const filteredGlobal = allLayouts.filter((layout) => layout.name.toLowerCase().includes(query.search.toLowerCase()));

        const allWorkspaces = await glue.layouts.getAll("Workspace");

        const filteredWorkspace = allWorkspaces.filter((workspace) => workspace.name.toLowerCase().includes(query.search.toLowerCase()));

        const layoutQueryResults = [...filteredGlobal, ...filteredWorkspace].map((layout) => {
            return {
                type: {
                    name: layout.type === "Global" ? "layout" : "workspace",
                    displayName: layout.type === "Global" ? "Layouts" : "Workspaces"
                },
                id: layout.name,
                displayName: layout.name
            }
        });

        try {
            layoutQueryResults.forEach((queryResult) => query.sendResult(queryResult));
        } catch (error) {
            console.warn(error);
        }

        query.done();
    });

    success();
};

const operations = [
    { name: 'setContext', execute: setContext },
    { name: 'updateContext', execute: updateContext },
    { name: 'getContext', execute: getContext },
    { name: 'getAllContextNames', execute: getAllContextNames },
    { name: 'destroyContext', execute: destroyContext },
    { name: 'setPathContext', execute: setPathContext },
    { name: 'setPathsContext', execute: setPathsContext },
    { name: 'register', execute: register },
    { name: 'unregisterMethod', execute: unregisterMethod },
    { name: 'registerAsync', execute: registerAsync },
    { name: 'createStream', execute: createStream },
    { name: 'pushStream', execute: pushStream },
    { name: 'closeStream', execute: closeStream },
    { name: 'subscribe', execute: subscribe },
    { name: 'unsubscribe', execute: unsubscribe },
    { name: 'waitForMethodAdded', execute: waitForMethodAdded },
    { name: 'addIntentListener', execute: addIntentListener },
    { name: 'unregisterIntent', execute: unregisterIntent },
    { name: 'publish', execute: publish },
    { name: 'initFdc3', execute: initFdc3 },
    { name: 'fdc3JoinUserChannel', execute: fdc3JoinUserChannel },
    { name: 'fdc3Broadcast', execute: fdc3Broadcast },
    { name: 'fdc3RaiseIntent', execute: fdc3RaiseIntent },
    { name: 'fdc3BroadcastOnAppChannel', execute: fdc3BroadcastOnAppChannel },
    { name: 'fdc3BroadcastOnPrivateChannel', execute: fdc3BroadcastOnPrivateChannel },
    { name: 'fdc3AddContextListenerOnPrivateChannel', execute: fdc3AddContextListenerOnPrivateChannel },
    { name: 'fdc3UnsubscribeFromPrivateChannelListener', execute: fdc3UnsubscribeFromPrivateChannelListener },
    { name: 'fdc3DisconnectFromPrivateChannel', execute: fdc3DisconnectFromPrivateChannel },
    { name: 'fdc3AddIntentListener', execute: fdc3AddIntentListener },
    { name: 'fdc3UnsubscribeIntentListener', execute: fdc3UnsubscribeIntentListener },
    { name: 'fdc3GetIntentListenerContext', execute: fdc3GetIntentListenerContext },
    { name: "fdc3CreatePrivateChannel", execute: fdc3CreatePrivateChannel },
    { name: "createSimpleSearchProvider", execute: createSimpleSearchProvider }
];

const handleControl = (args, _, success, error) => {
    const operation = args.operation;
    const params = args.params;

    const foundOperation = operations.find((op) => op.name === operation);

    if (!foundOperation) {
        error(`Unrecognized operation: ${operation}`);
        return;
    }

    foundOperation.execute(params, success, error);
};

GlueWeb({ libraries: [window.GlueSearch], systemLogger: {level: "warn"} }).then((glue) => {
    window.glue = glue;

    glue.intents.addIntentListener('core-intent', (context) => context);

    return glue.interop.registerAsync(controlMethodName, handleControl);
}).catch(console.error);
