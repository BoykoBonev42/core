describe("raiseIntentForContext()", function () {
    let definitionsOnStart;

    let supportAppName = "fdc3Support";
    let intentName;
    let contextType;
    let supportApp;

    before(async () => {
        await coreReady;
    });

    beforeEach(async () => {
        definitionsOnStart = await glue.appManager.inMemory.export();

        intentName = `fdc3.intent.${Date.now()}`;
        contextType = `fdc3.context.${Date.now()}`;
        const appDef = {
            name: supportAppName,
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [contextType]
                }
            ]
        }

        await glue.appManager.inMemory.import([appDef], "merge");

        supportApp = await gtf.createApp({ name: supportAppName, exposeFdc3: true });

        await supportApp.fdc3.addIntentListener({ intent: intentName });
    });

    afterEach(async () => {
        gtf.clearWindowActiveHooks();

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));

        await glue.appManager.inMemory.import(definitionsOnStart, "replace");
    });

    it("Should throw when invoked without arguments", (done) => {
        fdc3.raiseIntentForContext()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    [undefined, null, "", true, false, { test: 42 }, [], () => { }, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid context - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntentForContext(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [undefined, null, "", true, false, { test: 42 }, [], () => { }, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked invalid context type - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntentForContext({ type: invalidArg })
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [null, "", true, false, { test: 42 }, [], () => { }, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid target - (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.raiseIntentForContext(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should return an object", async () => {
        const resolution = await fdc3.raiseIntentForContext({ type: contextType });

        expect(resolution).to.be.an("object");
    });

    it("Should return a valid IntentResolution object", async () => {
        const resolution = await fdc3.raiseIntentForContext({ type: contextType });

        expect(resolution.source).to.be.an("object");
    });

    it("Should return correct IntentResolution object", async () => {
        const resolution = await fdc3.raiseIntentForContext({ type: contextType });

        expect(resolution.source.appId).to.eql(supportAppName);
        expect(resolution.source.instanceId).to.eql(supportApp.agm.instance.instance);
        expect(resolution.intent).to.eql(intentName);
    });

    it("Should throw when there's no app registering an intent with such context", (done) => {
        fdc3.raiseIntentForContext({ type: "noAppWithSuchIntentContext" })
            .then(() => done("Should have rejected"))
            .catch(() => done());
    });

    it("Should throw when there's an app registering an intent with such name but it's not the same app that is passed as a second argument", (done) => {
        fdc3.raiseIntentForContext({ type: contextType }, { appId: "nonExistingAppName" })
            .then(() => done("Should have rejected"))
            .catch(() => done());
    });

    it("Should invoke addIntentListener's callback with the passed context", async () => {
        const intentName = `fdc3.intent.2.${Date.now()}`;
        const contextType = `fdc3.context.type.2.${Date.now()}`;
        const contextToReturn = { ...gtf.fdc3.getContext(), type: contextType };

        const anotherAppDef = {
            name: 'fdc3Support2',
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [contextType]
                }
            ]
        };

        await glue.appManager.inMemory.import([anotherAppDef], "merge");

        const anotherSupportApp = await gtf.createApp({ name: anotherAppDef.name, exposeFdc3: true });

        await anotherSupportApp.fdc3.addIntentListener({ intent: intentName, returnValue: { context: contextToReturn } });

        await fdc3.raiseIntentForContext(contextToReturn);

        const returnedContext = await anotherSupportApp.fdc3.getIntentListenerContext(intentName);

        expect(returnedContext).to.eql(contextToReturn);
    });

    it("Should target the passed application by appId when there are two apps providing the same intent", async () => {
        const context = { ...gtf.fdc3.getContext() };

        const anotherAppDef = {
            name: 'fdc3Support2',
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [context.type]
                }
            ]
        };

        await glue.appManager.inMemory.import([anotherAppDef], "merge");

        const anotherSupportApp = await gtf.createApp({ name: anotherAppDef.name, exposeFdc3: true });

        await anotherSupportApp.fdc3.addIntentListener({ intent: intentName });

        await fdc3.raiseIntentForContext(context, { appId: anotherAppDef.name });

        const anotherSupportAppContext = await anotherSupportApp.fdc3.getIntentListenerContext(intentName);

        expect(anotherSupportAppContext).to.eql(context);
    });

    it("Should target the passed application by appId when there are two apps providing the same intent", async () => {
        const context = { ...gtf.fdc3.getContext(), type: contextType };

        // starting another instance of the support app
        const anotherSupportApp = await gtf.createApp({ name: supportAppName, exposeFdc3: true });

        await anotherSupportApp.fdc3.addIntentListener({ intent: intentName });

        await fdc3.raiseIntentForContext(context, { appId: supportAppName, instanceId: anotherSupportApp.agm.instance.instance });

        const anotherSupportAppContext = await anotherSupportApp.fdc3.getIntentListenerContext(intentName);

        expect(anotherSupportAppContext).to.eql(context);
    });

    describe("integration with Glue42", function() {
        const coreSupportContextType = "test-context";
        let intentsWithContextType;
        
        before(async() => {
            intentsWithContextType = await glue.intents.find({ contextType: coreSupportContextType });
        });

        it("Should open an instance of the app that registers an intent with such name", async() => {
            const instanceStarted = gtf.wrapPromise();

            const un = glue.appManager.onInstanceStarted((inst) => {
                const isInstanceOfIntentHandler = intentsWithContextType.find(intent => intent.handlers.some(handler => handler.applicationName === inst.application.name));

                if (isInstanceOfIntentHandler) {
                    instanceStarted.resolve();
                }
            });

            gtf.addWindowHook(un);

            await fdc3.raiseIntentForContext({ type: coreSupportContextType });

            await instanceStarted.promise;
        });

        it("Should add one more element to the app instances when raising an existing intent", async() => {
            const openedInstancesCount = glue.appManager.instances().length;

            await fdc3.raiseIntentForContext({ type: coreSupportContextType });

            const newOpenedInstancesCount = glue.appManager.instances().length;

            expect(openedInstancesCount + 1).to.eql(newOpenedInstancesCount);
        });

        it("Should not add one more element to the array returned from glue.appManager.instances() when there's no app registering an intent with that name", async() => {
            const initInstancesCount = glue.appManager.instances().length;

            try {
                await fdc3.raiseIntentForContext({ type: "noAppWithSuchIntentContext" });
            } catch (error) { }

            const newInstancesCount = glue.appManager.instances().length;

            expect(initInstancesCount).to.eql(newInstancesCount);
        });
    });
});
