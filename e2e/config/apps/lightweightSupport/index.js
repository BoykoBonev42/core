const controlMethodName = 'G42Core.E2E.Lightweight.Control';

/* { [intentName: string]: Listener } */
let intentListeners = {};

const fdc3AddContextListener = async({ contextType }, success, error) => {
    try {
        await fdc3.addContextListener(contextType, (context) => {
            return context;
        });
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3AddIntentListener = async ({ intent, returnValue, methodResponseTimeoutMs }, success, error) => {
    try {
        const listener = await fdc3.addIntentListener(intent, async (context) => {
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
                return context;
            }

            if (returnValue.privateChannel) {
                return privateChannel;
            }
        });
        intentListeners[intent] = listener;
        success();
    } catch (err) {
        error(err);
    }
};

const raiseIntent = async ({ intent }, success, error) => {
    try {
        await glue.intents.raise(intent);
        success();
    } catch (err) {
        error(err);
    }
};

const addIntentListener = async({ intent, waitTimeoutMs }, success, error) => {
    try {
        const listener = glue.intents.addIntentListener(intent, async(context) => {
            if (waitTimeoutMs) {
                const promise = new Promise((resolve) => {
                    setTimeout(resolve, waitTimeoutMs);
                });

                await promise;
            }

            return context;
        });

        intentListeners[intent] = listener;

        success();
    } catch (err) {
        error(err)
    }
};

const registerIntent = async({ intent, waitTimeoutMs }, success, error) => {
    try {
        const listener = await glue.intents.register(intent, async(context) => {
            if (waitTimeoutMs) {
                const promise = new Promise((resolve) => {
                    setTimeout(resolve, waitTimeoutMs);
                });

                await promise;
            }

            return context;
        });

        intentListeners[intent] = listener;

        success();
    } catch (err) {
        error(err);
    }
}

const unregisterIntent = async({ intent }, success, error) => {
    const listener = intentListeners[intent];

    if (!listener) {
        error(`No intent listener for intent ${intent}`);
    }

    try {
        listener.unsubscribe();
        success();
    } catch (err) {
        error(err);
    }
};

const operations = [
    { name: "fdc3AddIntentListener", execute: fdc3AddIntentListener },
    { name: "fdc3AddContextListener", execute: fdc3AddContextListener },
    { name: "raiseIntent", execute: raiseIntent },
    { name: "addIntentListener", execute: addIntentListener },
    { name: "registerIntent", execute: registerIntent },
    { name: "unregisterIntent", execute: unregisterIntent }
]

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

const glueConfig = {
    intents: {
        enableIntentsResolverUI: false
    }
};

GlueWeb(glueConfig)
    .then((glue) => {
        window.glue = glue;

        return glue.interop.registerAsync(controlMethodName, handleControl);
    })
    .catch(console.error);
