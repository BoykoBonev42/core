describe('raise()', () => {
    // An unsub function returned by `addIntentListener()`.
    let unsubObj;
    let glueApplication;
    let definitionsOnStart;

    const lightweightSupportMethodName = "G42Core.E2E.Lightweight.Control";

    before(async () => {
        await coreReady;

        definitionsOnStart = await glue.appManager.inMemory.export();
    });

    afterEach(async () => {
        gtf.clearWindowActiveHooks();

        if (typeof unsubObj !== "undefined") {
            const intentListenerRemovedPromise = gtf.intents.waitForIntentListenerRemoved(unsubObj.intent);
            unsubObj.unsubscribe();
            await intentListenerRemovedPromise;
            unsubObj = undefined;
        }

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));

        await glue.appManager.inMemory.import(definitionsOnStart, "replace");
    });

    it('Should throw an error when intentRequest isn\'t of type string or type object.', (done) => {
        glue.intents.raise(42)
            .then(() => done('raise() should have thrown an error because intentRequest wasn\'t of type string or object!'))
            .catch((error) => {
                try {
                    expect(error.message).to.equal('expected a value matching one of the decoders, got the errors ["at error: expected a string, got a number", "at error: expected an object, got a number"]');

                    done();
                } catch (error) {
                    done(error);
                }
            });
    });

    it('Should throw an error when intentRequest.name isn\'t of type string.', (done) => {
        glue.intents.raise({ intent: 42 })
            .then(() => done('raise() should have thrown an error because intentRequest.name wasn\'t of type string!'))
            .catch((error) => {
                try {
                    expect(error.message).to.equal('expected a value matching one of the decoders, got the errors ["at error: expected a string, got an object", "at error.intent: expected a string, got a number"]');

                    done();
                } catch (error) {
                    done(error);
                }
            });
    });

    it("Should throw an error when there's no intent with passed name (string)", done => {
        glue.intents.raise("nonExistingIntentName")
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should throw an error when there's no intent with passed name ({ intent: string })", done => {
        glue.intents.raise({ intent: "nonExistingIntentName" })
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it('Should raise the intent with the provided context to target app.', async () => {
        const appName = 'coreSupport';
        const intentName = 'core-intent';
        const intentRequest = {
            intent: intentName,
            target: 'startNew',
            context: {
                type: 'test-context',
                data: {
                    a: 42
                }
            }
        };

        const allIntents = await glue.intents.all();
        const intent = allIntents.find((intent) => intent.name === intentName);
        const intentHandler = intent.handlers.find((handler) => handler.applicationName === appName && handler.type === 'app');

        const intentResult = await glue.intents.raise(intentRequest);
        const expectedHandler = {
            ...intentHandler,
            instanceId: intentResult.handler.instanceId,
            type: "instance"
        };

        const appInstances = glue.appManager.application(appName).instances;
        expect(appInstances).to.be.of.length(1);
        glueApplication = appInstances[0];

        expect(intentResult.request).to.eql(intentRequest);
        expect(intentResult.handler).to.eql(expectedHandler);
        // The coreSupport app's core-intent is setup to return the context it is raised with.
        expect(intentResult.result).to.eql(intentRequest.context);
    });

    it('Should raise the intent with the provided context to target instance.', async () => {
        const appTitle = 'Core Support';
        const intentName = 'core-intent';
        const intentListenerAddedPromise = gtf.intents.waitForIntentListenerAdded(intentName)

        glueApplication = await gtf.createApp();

        await intentListenerAddedPromise;

        const intentRequest = {
            intent: intentName,
            target: 'reuse',
            context: {
                type: 'test-context',
                data: {
                    a: 42
                }
            }
        };

        const allIntents = await glue.intents.all();
        const intent = allIntents.find((intent) => intent.name === intentName);
        const intentHandler = intent.handlers.find((handler) => handler.applicationName === 'coreSupport' && handler.type === 'app');

        const intentResult = await glue.intents.raise(intentRequest);
        const expectedHandler = {
            ...intentHandler,
            instanceId: intentResult.handler.instanceId,
            type: 'instance',
            instanceTitle: appTitle
        };

        expect(intentResult.request).to.eql(intentRequest);
        expect(intentResult.handler).to.eql(expectedHandler);
        // The coreSupport app's core-intent is setup to return the context it is raised with.
        expect(intentResult.result).to.eql(intentRequest.context);
    });

    it('Should raise the intent with the provided context to an application.', async () => {
        const appName = 'coreSupport';
        const intentName = 'core-intent';
        const intentRequest = {
            intent: intentName,
            target: {
                app: appName
            },
            context: {
                type: 'test-context',
                data: {
                    a: 42
                }
            }
        };

        const allIntents = await glue.intents.all();
        const intent = allIntents.find((intent) => intent.name === intentName);
        const intentHandler = intent.handlers.find((handler) => handler.applicationName === appName && handler.type === 'app');

        const intentResult = await glue.intents.raise(intentRequest);
        const expectedHandler = {
            ...intentHandler,
            instanceId: intentResult.handler.instanceId,
            type: "instance"
        };

        const appInstances = glue.appManager.application(appName).instances;
        expect(appInstances).to.be.of.length(1);
        glueApplication = appInstances[0];

        expect(intentResult.request).to.eql(intentRequest);
        expect(intentResult.handler).to.eql(expectedHandler);
        // The coreSupport app's core-intent is setup to return the context it is raised with.
        expect(intentResult.result).to.eql(intentRequest.context);
    });

    it('Should raise the intent with the provided context to an instance.', async () => {
        const appTitle = 'Core Support';
        const intentName = 'core-intent';
        const intentListenerAddedPromise = gtf.intents.waitForIntentListenerAdded(intentName)

        glueApplication = await gtf.createApp();

        await intentListenerAddedPromise;

        const intentRequest = {
            intent: intentName,
            target: {
                instance: glueApplication.agm.instance.windowId
            },
            context: {
                type: 'test-context',
                data: {
                    a: 42
                }
            }
        };

        const allIntents = await glue.intents.all();
        const intent = allIntents.find((intent) => intent.name === intentName);
        const intentHandler = intent.handlers.find((handler) => handler.applicationName === 'coreSupport' && handler.type === 'app');

        const intentResult = await glue.intents.raise(intentRequest);
        const expectedHandler = {
            ...intentHandler,
            instanceId: intentResult.handler.instanceId,
            type: 'instance',
            instanceTitle: appTitle
        };

        expect(intentResult.request).to.eql(intentRequest);
        expect(intentResult.handler).to.eql(expectedHandler);
        // The coreSupport app's core-intent is setup to return the context it is raised with.
        expect(intentResult.result).to.eql(intentRequest.context);
    });

    describe('when invoked with handlers in the intentRequest', function () {
        let intentName;
        let firstAppDef;
        let secondAppDef;

        beforeEach(async () => {
            intentName = `test.intent.${Date.now()}`;

            const firstAppDefName = `first.app.${Date.now()}`;

            firstAppDef = {
                name: firstAppDefName,
                title: firstAppDefName.toUpperCase(),
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                },
                intents: [{ name: intentName }]
            };

            const secondAppDefName = `second.app.${Date.now()}`;

            secondAppDef = {
                name: secondAppDefName,
                title: secondAppDefName.toUpperCase(),
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                },
                intents: [{ name: intentName }]
            };

            await glue.appManager.inMemory.import([firstAppDef, secondAppDef], "merge");
        });

        const passInstructionsToSupportApp = async (operation, params, windowId) => {
            return glue.interop.invoke(lightweightSupportMethodName, { operation, params }, { windowId });
        }

        ['test', 42, { test: 42 }].forEach(invalidInput => {
            it(`Should throw when handlers is an invalid type (${typeof invalidInput})`, done => {
                glue.intents.raise({ intent: 'core-intent', handlers: invalidInput })
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });

            it(`Should throw when handlers is an array with invalid objects (${JSON.stringify(invalidInput)})`, done => {
                glue.intents.raise({ intent: 'core-intent', handlers: [invalidInput] })
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });
        });

        describe("and target is undefined", function () {
            it("Should target the first found handler of type instance when there is one", async () => {
                const supportApp = await gtf.createApp();

                const appName = supportApp.agm.instance.application;
                const appTitle = supportApp.agm.instance.application.toUpperCase();
                const appInstanceId = supportApp.agm.instance.instance;

                await supportApp.intents.addIntentListener(intentName);

                const intentRequest = {
                    intent: intentName,
                    handlers: [
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            type: "app"
                        },
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app"
                        },
                        {
                            applicationName: appName,
                            applicationTitle: appTitle,
                            instanceId: appInstanceId,
                            type: "instance"
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                expect(handler.applicationName).to.eql(appName);
                expect(handler.applicationTitle).to.eql(appTitle);
                expect(handler.instanceId).to.eql(appInstanceId);
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });

            it("Should target the first app when there is no handler of type instance", async () => {
                const intentRegisteredPromise = gtf.wrapPromise();

                const intentRequest = {
                    intent: intentName,
                    handlers: [
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            type: "app"
                        },
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app"
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                let instanceId;

                const un = glue.appManager.onInstanceStarted(async (inst) => {
                    if (inst.application.name === intentRequest.handlers[0].applicationName) {
                        instanceId = inst.id;

                        try {
                            await passInstructionsToSupportApp("registerIntent", { intent: intentName }, inst.id);
                            intentRegisteredPromise.resolve();
                        } catch (error) {
                            intentRegisteredPromise.reject(error);
                        }
                    }
                });

                gtf.addWindowHook(un);

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                await intentRegisteredPromise.promise;

                expect(handler.applicationName).to.eql(intentRequest.handlers[0].applicationName);
                expect(handler.applicationTitle).to.eql(intentRequest.handlers[0].applicationTitle);
                expect(handler.instanceId).to.eql(instanceId);
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });
        });

        describe("and target is defined", function () {
            it("Should target an instance when passing target:reuse and there is a handler of type instance", async () => {
                const inst = await glue.appManager.application(firstAppDef.name).start();

                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, inst.id);

                const intentRequest = {
                    intent: intentName,
                    target: "reuse",
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app"
                        },
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            instanceId: inst.id,
                            type: "instance"
                        }],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                expect(handler.applicationName).to.eql(firstAppDef.name);
                expect(handler.applicationTitle).to.eql(firstAppDef.name.toUpperCase());
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });

            it("Should target the first found instance when passing target:reuse and there are multiple handlers of type instance", async () => {
                const firstInst = await glue.appManager.application(firstAppDef.name).start();
                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, firstInst.id);

                const secondInst = await glue.appManager.application(secondAppDef.name).start();
                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, secondInst.id);

                const intentRequest = {
                    intent: intentName,
                    target: "reuse",
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.name.toUpperCase(),
                            type: "instance",
                            instanceId: secondInst.id
                        },
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.name.toUpperCase(),
                            instanceId: firstInst.id,
                            type: "instance"
                        }],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                expect(handler.applicationName).to.eql(intentRequest.handlers[0].applicationName);
                expect(handler.applicationTitle).to.eql(intentRequest.handlers[0].applicationTitle);
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });

            it("Should start a new instance of the passed app and ignore handlers list when target:{ app } is passed", async () => {
                const secondAppInst = await glue.appManager.application(secondAppDef.name).start();

                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, secondAppInst.id);

                const intentRegisteredPromise = gtf.wrapPromise();

                const intentRequest = {
                    intent: intentName,
                    target: { app: firstAppDef.name },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "instance",
                            instanceId: secondAppInst.id
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                let instanceId;

                const un = glue.appManager.onInstanceStarted(async (inst) => {
                    if (inst.application.name === intentRequest.target.app) {
                        instanceId = inst.id;

                        try {
                            await passInstructionsToSupportApp("registerIntent", { intent: intentName }, inst.id);
                            intentRegisteredPromise.resolve();
                        } catch (error) {
                            intentRegisteredPromise.reject(error);
                        }
                    }
                });

                gtf.addWindowHook(un);

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                await intentRegisteredPromise.promise;

                expect(handler.applicationName).to.eql(intentRequest.target.app);
                expect(handler.instanceId).to.eql(instanceId);
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });

            it("Should start a new instance of the passed app and ignore handlers list when target:{ app } is passed and there is a running instance of the same app", async () => {
                const firstAppInst = await glue.appManager.application(firstAppDef.name).start();

                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, firstAppInst.id);

                const intentRegisteredPromise = gtf.wrapPromise();

                const intentRequest = {
                    intent: intentName,
                    target: { app: firstAppDef.name },
                    handlers: [
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            type: "instance",
                            instanceId: firstAppInst.id
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                let newlyOpenedInstanceId;

                const un = glue.appManager.onInstanceStarted(async (inst) => {
                    if (inst.application.name === intentRequest.target.app && inst.id !== firstAppInst.id) {
                        newlyOpenedInstanceId = inst.id;

                        try {
                            await passInstructionsToSupportApp("registerIntent", { intent: intentName }, inst.id);
                            intentRegisteredPromise.resolve();
                        } catch (error) {
                            intentRegisteredPromise.reject(error);
                        }
                    }
                });

                gtf.addWindowHook(un);

                const { handler, result, request } = await glue.intents.raise(intentRequest);

                await intentRegisteredPromise.promise;

                expect(handler.applicationName).to.eql(intentRequest.target.app);
                expect(handler.instanceId).to.eql(newlyOpenedInstanceId);
                expect(result).to.eql(intentRequest.context);
                expect(request).to.eql(intentRequest);
            });

            it("Should target the passed instance when target:{ app, instance } is passed", async () => {
                const appInstToTarget = await glue.appManager.application(firstAppDef.name).start();
                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, appInstToTarget.id);

                const anotherAppInst = await glue.appManager.application(firstAppDef.name).start();
                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, anotherAppInst.id);

                const intentRequest = {
                    intent: intentName,
                    target: { app: firstAppDef.name, instance: appInstToTarget.id },
                    handlers: [
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            type: "instance",
                            instanceId: appInstToTarget.id
                        },
                        {
                            applicationName: firstAppDef.name,
                            applicationTitle: firstAppDef.title,
                            type: "instance",
                            instanceId: anotherAppInst.id
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                const { handler, request, result } = await glue.intents.raise(intentRequest);

                expect(handler.applicationName).to.eql(intentRequest.target.app);
                expect(handler.instanceId).to.eql(intentRequest.target.instance);
                expect(request).to.eql(intentRequest);
                expect(result).to.eql(intentRequest.context);
            });

            it("Should target the passed instance when target:{ instance } is passed", async () => {
                const firstAppInst = await glue.appManager.application(firstAppDef.name).start();

                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, firstAppInst.id);

                const intentRequest = {
                    intent: intentName,
                    target: { instance: firstAppInst.id },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app",
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                const { handler, request, result } = await glue.intents.raise(intentRequest);

                expect(handler.applicationName).to.eql(firstAppInst.application.name);
                expect(handler.instanceId).to.eql(firstAppInst.id);
                expect(request).to.eql(intentRequest);
                expect(result).to.eql(intentRequest.context);
            });

            it("Should throw when there's no app with passed target: { instance }", async () => {
                const errorThrownPromise = gtf.wrapPromise();

                const firstAppInst = await glue.appManager.application(firstAppDef.name).start();

                await passInstructionsToSupportApp("registerIntent", { intent: intentName }, firstAppInst.id);

                const intentRequest = {
                    intent: intentName,
                    target: { instance: firstAppInst.id },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app",
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                await firstAppInst.stop();

                try {
                    await glue.intents.raise(intentRequest);
                    errorThrownPromise.reject("Should have thrown");
                } catch (error) {
                    errorThrownPromise.resolve();
                }

                await errorThrownPromise.promise;
            });

            it("Should throw when there's no app with passed target: { app, instance }", async () => {
                const errorThrownPromise = gtf.wrapPromise();

                const firstAppInst = await glue.appManager.application(firstAppDef.name).start();

                const intentRequest = {
                    intent: intentName,
                    target: { instance: firstAppInst.id, app: "anotherAppName" },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app",
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                try {
                    await glue.intents.raise(intentRequest);
                    errorThrownPromise.reject("Should have thrown");
                } catch (error) {
                    errorThrownPromise.resolve();
                }

                await errorThrownPromise.promise;
            });

            it("Should throw when there is an app with passed target:{ app } but it is not an intent handler", async () => {
                const errorThrownPromise = gtf.wrapPromise();

                const intentRequest = {
                    intent: intentName,
                    target: { app: "coreSupport" },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app",
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                try {
                    await glue.intents.raise(intentRequest);
                    errorThrownPromise.reject("Should have thrown");
                } catch (error) {
                    errorThrownPromise.resolve();
                }

                await errorThrownPromise.promise;
            });

            it("Should throw when there is an opened inst with passed target:{ app, instance } but it is not an intent handler", async () => {
                const supportAppName = "coreSupport"

                const errorThrownPromise = gtf.wrapPromise();

                const supportAppInst = await glue.appManager.application(supportAppName).start();

                const intentRequest = {
                    intent: intentName,
                    target: { app: supportAppName, instance: supportAppInst.id },
                    handlers: [
                        {
                            applicationName: secondAppDef.name,
                            applicationTitle: secondAppDef.title,
                            type: "app",
                        }
                    ],
                    context: {
                        type: "test.intent",
                        data: { test: 42 }
                    }
                };

                try {
                    await glue.intents.raise(intentRequest);
                    errorThrownPromise.reject("Should have thrown");
                } catch (error) {
                    errorThrownPromise.resolve();
                }

                await errorThrownPromise.promise;
            });
        });
    });
});
