describe("addIntentListener()", function () {
    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        gtf.fdc3.removeActiveListeners();

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));
    });

    it("Should throw when no argument is passed", (done) => {
        fdc3.addIntentListener()
            .then((listener) => {
                gtf.fdc3.addActiveListener(listener);
                done("Should have thrown");
            })
            .catch(() => done());
    });

    it("Should throw when there's an already registered intent with passed name", async() => {
        const intentName = Date.now().toString();

        const listener = await fdc3.addIntentListener(intentName, () => {});

        gtf.fdc3.addActiveListener(listener);

        const errorThrown = gtf.wrapPromise();

        try {
            const listener = await fdc3.addIntentListener(intentName, () => {});
            gtf.fdc3.addActiveListener(listener);
            errorThrown.reject("Should have thrown - there's an already registered intent with such name");
        } catch (error) {
            errorThrown.resolve();
        }

        await errorThrown.promise;
    });

    [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }], () => {}].forEach(invalidArg => {
        it(`Should throw when an invalid first argument (${JSON.stringify(invalidArg)}) is passed`, (done) => {
            fdc3.addIntentListener(invalidArg, () => {})
                .then((listener) => {
                    gtf.fdc3.addActiveListener(listener);
                    done("Should have thrown");
                })
                .catch(() => done());
        });
    });

    [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
        it(`Should throw when an invalid second argument (${JSON.stringify(invalidArg)}) is passed`, async() => {
            const allIntents = await glue.intents.all()
            const intentName = allIntents[0].name;

            const errorThrown = gtf.wrapPromise();

            try {
                const listener = await fdc3.addIntentListener(intentName, invalidArg);
                gtf.fdc3.addActiveListener(listener);
                errorThrown.reject("Should have thrown");                
            } catch (error) {
                errorThrown.resolve();
            }

            await errorThrown.promise;
        });
    });

    it("Should not throw when invoked with valid arguments", async() => {
        const allIntents = await glue.intents.all();
        const intentName = allIntents[0].name;

        const listener = await fdc3.addIntentListener(intentName, () => {});

        gtf.fdc3.addActiveListener(listener);
    });

    it("Should return an object with unsubscribe function", async() => {
        const allIntents = await glue.intents.all();
        const intentName = allIntents[0].name;

        const listener = await fdc3.addIntentListener(intentName, () => {});

        gtf.fdc3.addActiveListener(listener);

        expect(listener).to.be.an("object");
        expect(typeof listener.unsubscribe).to.eql("function");
    });

    it("Should not invoke the callback when the setup is there but no intent is raised", async() => {
        const wrapper = gtf.wrapPromise();

        const intentName = Date.now().toString();

        const listener = await fdc3.addIntentListener(intentName, () => {
            wrapper.reject("Should not have been invoked");
        });

        gtf.fdc3.addActiveListener(listener);

        gtf.wait(3000, wrapper.resolve);

        await wrapper.promise;
    });

    it("Should invoke the callback when an intent is raised", async() => {
        const intentName = `fdc3.intent.${Date.now()}`;
        const context = { ...gtf.fdc3.getContext(), type: `fdc3.context.${Date.now()}` };

        const appDef = {
            name: "fdc3SupportApp",
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [ context.type ]
                }
            ]
        };

        await glue.appManager.inMemory.import([appDef], "merge");

        const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

        await supportApp.fdc3.addIntentListener(intentName, context);

        await fdc3.raiseIntent(intentName, context);

        const supportAppContext = await supportApp.fdc3.getIntentListenerContext(intentName);

        expect(supportAppContext).to.not.be.undefined;
    });

    it("Should invoke the callback with the correct context when an intent is raised", async() => {
        const intentName = `fdc3.intent.${Date.now()}`;
        const context = { ...gtf.fdc3.getContext(), type: `fdc3.context.${Date.now()}` };

        const appDef = {
            name: "fdc3SupportApp",
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [ context.type ]
                }
            ]
        };

        await glue.appManager.inMemory.import([appDef], "merge");

        const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

        await supportApp.fdc3.addIntentListener(intentName, context);

        await fdc3.raiseIntent(intentName, context);

        const supportAppContext = await supportApp.fdc3.getIntentListenerContext(intentName);

        expect(supportAppContext).to.eql(context);
    });

    describe("integration with Glue42 Intents", function() {
        const glueIntentsPrefix = "Tick42.FDC3.Intents.";

        let definitionsOnStart;

        let intentName = `fdc3.intent.${Date.now()}`;
        let contextType = `fdc3.context.${Date.now()}`;

        const appDef = {
            name: "fdc3SupportApp",
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

        before(async() => {
            definitionsOnStart = await glue.appManager.inMemory.export();
        });

        beforeEach(async() => {
            await glue.appManager.inMemory.import([appDef], "merge");
        })

        afterEach(async() => {
            gtf.clearWindowActiveHooks();

            await glue.appManager.inMemory.import(definitionsOnStart, "replace");
        });

        it("Should add new interop method with the passed name", async() => {
            const methodAddedPromise = gtf.wrapPromise();

            const un = glue.interop.serverMethodAdded(({ server, method}) => {
                if (method.name === `${glueIntentsPrefix}${intentName}` && server.applicationName === appDef.name) {
                    methodAddedPromise.resolve();
                }
            });

            gtf.addWindowHook(un);

            const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

            await supportApp.fdc3.addIntentListener(intentName);

            await methodAddedPromise.promise;
        });

        it("Should invoke the callback when glue.intents.raise() is invoked", async() => {
            const contextToReturn = { ...gtf.fdc3.getContext(), type: contextType };
            
            const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

            await supportApp.fdc3.addIntentListener(intentName, { context: contextToReturn });

            const { result } = await glue.intents.raise({ intent: intentName, target: { instance: supportApp.agm.instance.instance }});

            expect(result).to.eql(contextToReturn);
        });
    });
});