describe("findIntent() ", function () {
    let definitionsOnStart;

    let supportAppName = "fdc3SupportApp";
    let intentName;
    let contextType;
    let resultType;

    before(async () => {
        await coreReady;

        definitionsOnStart = await glue.appManager.inMemory.export();
    });

    beforeEach(async () => {
        intentName = `fdc3.intent.${Date.now()}`;
        contextType = `fdc3.context.${Date.now()}`;
        resultType = `fdc3.result.type.${Date.now()}`;

        const appDef = {
            name: supportAppName,
            type: "window",
            details: {
                url: "http://localhost:4242/coreSupport/index.html"
            },
            intents: [
                {
                    name: intentName,
                    displayName: `Fdc3 Intent`,
                    contexts: [contextType],
                    resultType
                }
            ]
        };

        await glue.appManager.inMemory.import([appDef], "merge");
    });

    afterEach(async () => {
        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));

        await glue.appManager.inMemory.import(definitionsOnStart, "replace");
    });

    [undefined, null, "", true, false, { test: 42 }, [], () => { }, 42].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid first argument: (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.findIntent(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [true, false, { test: 42 }, [], () => { }, 42, "test"].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid context (${JSON.stringify(invalidArg)}) as a second argument`, (done) => {
            fdc3.findIntent(intentName, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [true, { test: 42 }, [], () => { }, 42].forEach((invalidArg) => {
        it(`Should throw when invoked with invalid resultType (${JSON.stringify(invalidArg)}) as a third argument`, (done) => {
            fdc3.findIntent(intentName, { type: "test-context" }, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should throw an error when there's no intent with such name", (done) => {
        fdc3.findIntent("nonExistingIntentName")
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should return a valid AppIntent object", async () => {
        const appIntent = await fdc3.findIntent(intentName);

        expect(appIntent.intent).to.be.an("object");
        expect(appIntent.apps).to.be.an("array");
    });

    it("Should return a valid AppMetadata intent object", async () => {
        const { intent } = await fdc3.findIntent(intentName);

        expect(intent.name).to.be.a("string");
        expect(intent.displayName).to.be.a("string");
    });

    it("Should return a valid AppMetadata apps array", async () => {
        const { apps } = await fdc3.findIntent(intentName);

        expect(apps.length).to.eql(1);
        expect(apps[0].appId).to.eql(supportAppName);
    });

    it("Should return correct intents when invoked with resultType as a third argument", async () => {
        const context = { type: contextType };

        const { apps } = await fdc3.findIntent(intentName, context, resultType);

        expect(apps.length).to.eql(1);
        expect(apps[0].appId).to.eql(supportAppName);
    });

    it("Should throw when there's an intent with passed name, but context type is different", (done) => {
        fdc3.findIntent(intentName, { type: "anotherContextType" })
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should throw when there's an intent with passed name and context type, but result type is different", (done) => {
        fdc3.findIntent(intentName, { type: contextType }, "nonExistingResultType")
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });


    describe("when multiple apps register intents with the same name but different context and result types in their app definitions", function () {
        const intentName = `fdc3.intent.name.${Date.now()}`;
        
        const contextType1 = "fdc3.test.context.type.1";
        const contextType2 = "fdc3.test.context.type.2";
        const sharedContextType = "fdc3.shared.context.type";
        const resultType = "fdc3.instrument";
        const uniqueResultType = `another.resultType.${Date.now()}`;

        const secondSupportAppDef = {
            name: "supportAppDef1",
            type: "window",
            details: {
                url: "https://github.com"
            },
            intents: [
                {
                    name: intentName
                }
            ]
        };

        const supportAppDefWithContextType = {
            name: "supportAppDef2",
            type: "window",
            details: {
                url: "https://github.com"
            },
            intents: [
                {
                    name: intentName,
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

        const supportAppWithUniqueContextAndResultType = {
            name: "supportAppDef5",
            type: "window",
            details: {
                url: "https://github.com"
            },
            intents: [
                {
                    name: intentName,
                    contexts: [
                        contextType2
                    ],
                    resultType: uniqueResultType
                }
            ]
        }

        it("Should return a valid AppMetadata apps array with correct apps", async () => {
            await glue.appManager.inMemory.import([secondSupportAppDef, supportAppDefWithContextType], "merge");

            const { apps } = await fdc3.findIntent(intentName);

            expect(apps.length).to.eql(2);
            expect(apps.some(appDef => appDef.appId === secondSupportAppDef.name)).to.eql(true);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithContextType.name)).to.eql(true);
        });

        it("Should return multiple apps which implement the passed context type in their app definition", async () => {
            await glue.appManager.inMemory.import([secondSupportAppDef, supportAppDefWithContextType, supportAppDefWithMultipleContextType], "merge");

            const { apps } = await fdc3.findIntent(intentName, { type: sharedContextType });

            expect(apps.length).to.eql(2);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithContextType.name)).to.eql(true);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithMultipleContextType.name)).to.eql(true);
        });

        it("Should return only one app when there are many apps implementing the same intent but only one has the passed context type", async () => {
            await glue.appManager.inMemory.import([secondSupportAppDef, supportAppDefWithContextType, supportAppDefWithMultipleContextType], "merge");

            const { apps } = await fdc3.findIntent(intentName, { type: contextType1 });

            expect(apps.length).to.eql(1);
            expect(apps[0].appId).to.eql(supportAppDefWithMultipleContextType.name);
        });

        it("Should return multiple apps which implement the passed resultType in their app definition and context is not passed", async () => {
            await glue.appManager.inMemory.import([supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType, supportAppWithUniqueContextAndResultType], "merge");

            const { apps } = await fdc3.findIntent(intentName, undefined, resultType);

            expect(apps.length).to.eql(2);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithMultipleContextType.name)).to.eql(true);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithContextAndResultType.name)).to.eql(true);
        });

        it("Should return only one app which implements the passed resultType in its app definition and and context is not passed", async () => {
            await glue.appManager.inMemory.import([supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType, supportAppWithUniqueContextAndResultType], "merge");

            const { apps } = await fdc3.findIntent(intentName, undefined, uniqueResultType);

            expect(apps.length).to.eql(1);
            expect(apps[0].appId).to.eql(supportAppWithUniqueContextAndResultType.name);
        });

        it("Should return correct apps when context and resultType are passed", async () => {
            await glue.appManager.inMemory.import([secondSupportAppDef, supportAppDefWithContextType, supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType, supportAppWithUniqueContextAndResultType], "merge");

            const { apps } = await fdc3.findIntent(intentName, { type: sharedContextType }, resultType);

            expect(apps.length).to.eql(2);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithMultipleContextType.name)).to.eql(true);
            expect(apps.some(appDef => appDef.appId === supportAppDefWithContextAndResultType.name)).to.eql(true)
        });

        it("Should return correct apps when 2 apps are registered as handlers returning a channel and one of them returns a channel with a specific type in the response", async() => {
            const contextType = Date.now().toString();

            const appDefOne = {
                name: "supportAppDef1",
                type: "window",
                details: {
                    url: "https://github.com"
                },
                intents: [
                    {
                        name: intentName,
                        contexts: [contextType],
                        resultType: "channel"
                    }
                ]
            };

            const appDefTwo = {
                name: "supportAppDef2",
                type: "window",
                details: {
                    url: "https://github.com"
                },
                intents: [
                    {
                        name: intentName,
                        contexts: [contextType],
                        resultType: "channel<test>"
                    }
                ]
            };

            await glue.appManager.inMemory.import([appDefOne, appDefTwo], "merge");

            const { apps } = await fdc3.findIntent(intentName, { type: contextType }, "channel");

            expect(apps.length).to.eql(2);
            expect(apps.some(appDef => appDef.appId === appDefOne.name)).to.eql(true);
            expect(apps.some(appDef => appDef.appId === appDefTwo.name)).to.eql(true);
        });

        it("Should return only one app when context type is implemented in other app definitions but result type is unique", async () => {
            await glue.appManager.inMemory.import([secondSupportAppDef, supportAppDefWithContextType, supportAppDefWithMultipleContextType, supportAppDefWithContextAndResultType, supportAppWithUniqueContextAndResultType], "merge");

            const { apps } = await fdc3.findIntent(intentName, { type: sharedContextType }, uniqueResultType);

            expect(apps.length).to.eql(1);
            expect(apps.some(appDef => appDef.appId === supportAppWithUniqueContextAndResultType.name)).to.eql(true);
        });
    });
});