describe("raiseIntent()", function () {
    let definitionsOnStart;
    
    const supportAppName1 = 'fdc3Support1';
    let intentName1;
    let contextType1;
    let supportApp1;
    
    const supportAppName2 = 'fdc3Support2';
    let intentName2;
    let contextType2;
    let supportApp2;

    before(async () => {
        await coreReady;

        definitionsOnStart = await glue.appManager.inMemory.export();
    });

    beforeEach(async () => {
        intentName1 = `fdc3.intent.1.${Date.now()}`;
        contextType1 = `fdc3.context.1.${Date.now()}`;
        const appDef1 = {
            name: supportAppName1,
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName1,
                    contexts: [contextType1]
                }
            ]
        };

        intentName2 = `fdc3.intent.2.${Date.now()}`;
        contextType2 = `fdc3.context.2.${Date.now()}`;
        const appDef2 = {
            name: supportAppName2,
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName2,
                    contexts: [contextType2]
                }
            ]
        };

        await glue.appManager.inMemory.import([appDef1, appDef2], "merge");

        supportApp1 = await gtf.createApp({ name: appDef1.name, exposeFdc3: true });
        supportApp2 = await gtf.createApp({ name: appDef2.name, exposeFdc3: true });
    });

    afterEach(async () => {
        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));

        await glue.appManager.inMemory.import(definitionsOnStart, "replace");

        supportApp1 = undefined;
        supportApp2 = undefined;
    });

    it("Should throw when invoked without arguments", (done) => {
        fdc3.raiseIntent()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    [undefined, null, "", true, false, { test: 42 }, [], () => { }, 42].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid intent - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntent(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [undefined, null, "", true, false, { test: 42 }, [], () => { }, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid context - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntent("core-intent", invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [null, "", true, false, { test: 42 }, [], () => { }, 42].forEach((invalidArg) => {
        it(`"Should throw when invoked with invalid TargetApp as third argument - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntent("core-intent", { type: "fdc3.type" }, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should return an object", async () => {
        await supportApp1.fdc3.addIntentListener(intentName1);

        const context = { ...gtf.fdc3.getContext(), type: contextType1 };
        const resolution = await fdc3.raiseIntent(intentName1, context);

        expect(resolution).to.be.an("object");
    });

    it("Should return a valid IntentResolution object", async () => {
        await supportApp1.fdc3.addIntentListener(intentName1);

        const context = { ...gtf.fdc3.getContext(), type: contextType1 };
        const resolution = await fdc3.raiseIntent(intentName1, context);

        expect(resolution.source).to.be.an("object");
        expect(resolution.intent).to.be.a("string");
        expect(resolution.getResult).to.be.a("function");
    });

    it("Should return correct IntentResolution object", async () => {
        await supportApp1.fdc3.addIntentListener(intentName1);

        const context = { ...gtf.fdc3.getContext(), type: contextType1 };
        const resolution = await fdc3.raiseIntent(intentName1, context);

        expect(resolution.source.appId).to.eql(supportAppName1);
        expect(resolution.intent).to.eql(intentName1);
        expect(resolution.getResult).to.not.be.undefined;
    });

    it("Should throw when there's no app registering an intent with such name", done => {
        const intentName = "noAppWithSuchIntent";
        const context = gtf.fdc3.getContext();

        fdc3.raiseIntent(intentName, context)
            .then(() => done("Should have rejected"))
            .catch(() => done());
    });

    it("Should throw when there's an app registering an intent with such name but it's not the same app that is passed as a third argument (string)", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        await supportApp1.fdc3.addIntentListener(intentName1);

        const raiseIntentThrownPromise = gtf.wrapPromise();

        try {
            await fdc3.raiseIntent(intentName1, context, "noSuchApp");
            raiseIntentThrownPromise.reject("Should have thrown");
        } catch (error) {
            raiseIntentThrownPromise.resolve();
        }

        await raiseIntentThrownPromise.promise;
    });

    it("Should throw when there's an app registering an intent with such name but it's not the same app that is passed as a third argument ({ appId: string })", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        await supportApp1.fdc3.addIntentListener(intentName1);

        const raiseIntentThrownPromise = gtf.wrapPromise();

        try {
            await fdc3.raiseIntent(intentName1, context, { appId: "noSuchApp" });
            raiseIntentThrownPromise.reject("Should have thrown");
        } catch (error) {
            raiseIntentThrownPromise.resolve();
        }

        await raiseIntentThrownPromise.promise;
    });

    it("Should throw when there's an app registering an intent with such name but it's not the same instance that is passed as a third argument ({ appId: string, instanceId: string })", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        await supportApp1.fdc3.addIntentListener(intentName1);

        const raiseIntentThrownPromise = gtf.wrapPromise();

        try {
            await fdc3.raiseIntent(intentName1, context, { appId: supportAppName1, instanceId: "random-instance-id" });
            raiseIntentThrownPromise.reject("Should have thrown");
        } catch (error) {
            raiseIntentThrownPromise.resolve();
        }

        await raiseIntentThrownPromise.promise;
    });

    it("Should not be able to retrieve a private channel when there are two consumers of the channel (creator and client)", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        // supportApp1 creates a private channel
        await supportApp1.fdc3.createPrivateChannel();

        // supportApp1 adds a context listener whose callback will return the created private channel => this is the channel's first consumer (the creator)
        await supportApp1.fdc3.addIntentListener(intentName1, { privateChannel: true });

        // current app raises the intent and retrieves the result which is the private channel => this is the channel's second consumer (the client)
        const resolution = await fdc3.raiseIntent(intentName1, context);
        await resolution.getResult();

        const errorThrownPromise = gtf.wrapPromise();

        try {
            // another app instance is started and it tries to raise the same intent which returns the private channel
            await supportApp2.fdc3.raiseIntent(intentName1, context);
            errorThrownPromise.reject("Should have thrown");
        } catch (error) {
            errorThrownPromise.resolve();
        }

        await errorThrownPromise.promise;
    });

    it("Should target the passed application by appId when there are two apps providing the same intent", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        await supportApp1.fdc3.addIntentListener(intentName1);

        await fdc3.raiseIntent(intentName1, context, { appId: supportAppName1 });

        const supportApp1Context = await supportApp1.fdc3.getIntentListenerContext(intentName1);

        expect(supportApp1Context).to.eql(context);
    });

    it("Should target the passed application by appId and instanceId when there are two app instances providing the same intent", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType1 };

        // both instances add intent listener for the intent
        await supportApp1.fdc3.addIntentListener(intentName1);
        await supportApp2.fdc3.addIntentListener(intentName1);

        await fdc3.raiseIntent(intentName1, context, { appId: supportAppName1 });

        const supportApp1Context = await supportApp1.fdc3.getIntentListenerContext(intentName1);

        expect(supportApp1Context).to.eql(context);
    });

    describe("when the same app raises the intent, intentResolution.getResult() method", function () {
        const defaultChannelMethods = ["broadcast", "addContextListener", "getCurrentContext"];
        const defaultPrivateChannelMethods = ["id", "type", "displayMetadata", ...defaultChannelMethods, "onAddContextListener", "onUnsubscribe", "onDisconnect", "disconnect"];

        it("Should be async", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType1 };

            await supportApp1.fdc3.addIntentListener(intentName1);

            const resolution = await fdc3.raiseIntent(intentName1, context);

            const getResultPromise = resolution.getResult();

            expect(getResultPromise.then).to.be.a("function");
            expect(getResultPromise.catch).to.be.a("function");
        });

        it("Should return correct context when intent handler returns a context", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType1 };
            const contextToReturn = gtf.fdc3.getContext();

            await supportApp1.fdc3.addIntentListener(intentName1, { context: contextToReturn });

            const resolution = await fdc3.raiseIntent(intentName1, context);

            const result = await resolution.getResult();

            expect(result).to.eql(contextToReturn);
        });

        it("Should return correct channel when intent handler returns a channel", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType1 };

            await supportApp1.fdc3.createPrivateChannel();

            await supportApp1.fdc3.addIntentListener(intentName1, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName1, context);

            const result = await resolution.getResult();

            expect(result.type).to.eql("private");
            expect(defaultChannelMethods.every(method => Object.keys(result).includes(method))).to.eql(true);
        });

        it("Should be able to retrieve the same correct channel 3 times when getResult() is invoked 3 times", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType1 };

            await supportApp1.fdc3.createPrivateChannel();

            await supportApp1.fdc3.addIntentListener(intentName1, { privateChannel: true });

            const resolution1 = await fdc3.raiseIntent(intentName1, context);
            const channel1 = await resolution1.getResult();

            const resolution2 = await fdc3.raiseIntent(intentName1, context);
            const channel2 = await resolution2.getResult();

            const resolution3 = await fdc3.raiseIntent(intentName1, context);
            const channel3 = await resolution3.getResult();

            const channels = [channel1, channel2, channel3];

            expect(channels.every(channel => channel.type === "private")).to.eql(true);
            // check the shape of each channel
            expect(Object.keys(channel1)).to.have.members(defaultPrivateChannelMethods);
            expect(Object.keys(channel2)).to.have.members(defaultPrivateChannelMethods);
            expect(Object.keys(channel3)).to.have.members(defaultPrivateChannelMethods);
            // check it has always the same id
            expect(channels[0].id).to.eql(channels[1].id);
            expect(channels[0].id).to.eql(channels[2].id);
        });
    });
});
