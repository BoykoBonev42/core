describe("findIntentsByContext()", function() {
    const intentName = `fdc3.intent.${Date.now()}`;
    const intentDisplayName = `FDC3.Intent.Display.Name`;
    const contextType1 = "fdc3.test.context.type.1";
    const sharedContextType = "fdc3.shared.context.type";
    const resultType = "fdc3.instrument";

    const supportAppDefWithContextType = {
        name: "supportAppDef2",
        type: "window",
        details: {
            url: "https://github.com"
        },
        intents: [
            {
                name: intentName,
                displayName: intentDisplayName,
                contexts: [
                    sharedContextType
                ]
            }
        ]
    };

    const supportAppDefWithMultipleContextType = {
        name: "supportAppDef3",
        type: "window",
        details: {
            url: "https://github.com"
        },
        intents: [
            {
                name: intentName,
                contexts: [
                    contextType1,
                    sharedContextType
                ],
                resultType
            }
        ]
    };

    const supportAppDefWithContextAndResultType = {
        name: "supportAppDef4",
        type: "window",
        details: {
            url: "https://github.com"
        },
        intents: [
            {
                name: intentName,
                contexts: [
                    sharedContextType
                ],
                resultType
            }
        ]
    };

    let definitionsOnStart;

    before(async() => {
        await coreReady;

        definitionsOnStart = await glue.appManager.inMemory.export();
    });

    afterEach(async() => {
        await glue.appManager.inMemory.import(definitionsOnStart, "replace");
    });

    it("Should throw when invoked with no argument", (done) => {
        fdc3.findIntentsByContext()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });
    
    [undefined, null, "", true, false, { test: 42 }, [], () => {}, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid context (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.findIntentsByContext(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [true, { test: 42 }, [], () => {}, 42].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid resultType (${JSON.stringify(invalidArg)}) as a second argument`, (done) => {
            fdc3.findIntentsByContext({ type: "test-context" }, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should return an array", async() => {
        await glue.appManager.inMemory.import([supportAppDefWithContextType], "merge");

        const appIntents = await fdc3.findIntentsByContext({ type: sharedContextType });

        expect(appIntents).to.be.an("array");
    });

    it("Should return an array with the correct AppIntent", async() => {
        await glue.appManager.inMemory.import([supportAppDefWithContextType, supportAppDefWithMultipleContextType], "merge");

        const [ appIntent ] = await fdc3.findIntentsByContext({ type: sharedContextType });

        expect(appIntent.apps).to.be.an("array");
        expect(appIntent.intent).to.be.an("object");
    });

    it("Should return an array with the correct Apps", async() => {
        await glue.appManager.inMemory.import([supportAppDefWithContextType, supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType], "merge");

        const [ appIntent ] = await fdc3.findIntentsByContext({ type: sharedContextType });
        const { apps } = appIntent;

        expect(apps.length).to.eql(3);
        expect(apps.some(appDef => appDef.appId === supportAppDefWithContextType.name)).to.eql(true);
        expect(apps.some(appDef => appDef.appId === supportAppDefWithMultipleContextType.name)).to.eql(true);
        expect(apps.some(appDef => appDef.appId === supportAppDefWithContextAndResultType.name)).to.eql(true);
    });

    it("Should return an array with the correct IntentMetadata", async() => {
        await glue.appManager.inMemory.import([supportAppDefWithContextType], "merge");

        const [ appIntent ] = await fdc3.findIntentsByContext({ type: sharedContextType });
        const { intent } = appIntent;

        expect(intent.name).to.eql(intentName);
        expect(intent.displayName).to.eql(intentDisplayName);
    });

    it("Should return the correct array when resultType is passed as a second argument", async() => {
        await glue.appManager.inMemory.import([supportAppDefWithContextType, supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType], "merge");

        const [ appIntent ] = await fdc3.findIntentsByContext({ type: sharedContextType }, resultType);
        const { apps } = appIntent;

        expect(apps.length).to.eql(2);
        expect(apps.some(appDef => appDef.appId === supportAppDefWithMultipleContextType.name)).to.eql(true);
        expect(apps.some(appDef => appDef.appId === supportAppDefWithContextAndResultType.name)).to.eql(true);
    });

    it("Should throw when there're no apps with such context", async() => {
        const methodThrown = gtf.wrapPromise();

        try {
            await fdc3.findIntentsByContext({ type: "nonExistingContext" });
            methodThrown.reject("Should have thrown");
        } catch (error) {
            methodThrown.resolve();
        }
    });

    it("Should throw when there're no apps with such context and result type", async() => {
        const methodThrown = gtf.wrapPromise();

        try {
            await fdc3.findIntentsByContext({ type: "nonExistingContext" }, "nonExistingResultType");
            methodThrown.reject("Should have thrown");
        } catch (error) {
            methodThrown.resolve();
        }
    });
});
