const controlMethodName = "G42Core.E2E.Lightweight.Control";

const fdc3AddContextListener = async ({ contextType }, success, error) => {
    try {
        await fdc3.addContextListener(contextType, (context) => {
            return context;
        });
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3JoinUserChannel = async ({ channelId }, success, error) => {
    try {
        await fdc3.joinUserChannel(channelId);
        success();
    } catch (err) {
        error(err);
    }
};

const fdc3AddContextListenerOnAppChannel = async ({ channelId, contextType }, success, error) => {
    try {
        const channel = await fdc3.getOrCreateChannel(channelId);

        await channel.addContextListener(contextType, (context) => {
            return context;
        });

        success();
    } catch (err) {
        error(err);
    }
};

const closeWindow = (_, success) => {
    success();
    parent.window.close();
};

const operations = [
    { name: "fdc3AddContextListener", execute: fdc3AddContextListener },
    { name: "fdc3JoinUserChannel", execute: fdc3JoinUserChannel },
    { name: "fdc3AddContextListenerOnAppChannel", execute: fdc3AddContextListenerOnAppChannel },
    { name: "closeWindow", execute: closeWindow },
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

const glueConfig = {
    intents: {
        enableIntentsResolverUI: false,
    },
};

GlueWeb(glueConfig)
    .then((glue) => {
        window.glue = glue;

        return glue.interop.registerAsync(controlMethodName, handleControl);
    })
    .catch(console.error);
