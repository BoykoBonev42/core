describe("open() ", function () {
    this.timeout(90000);

    let definitionsOnStart;

    const responseInteropMethodPrefix = `T42.FDC3.Open.Listener.Response`;

    const lightweightSupportControlMethodName = 'G42Core.E2E.Lightweight.Control';

    const supportAppName = "coreSupport";

    before(async () => {
        await coreReady;

        definitionsOnStart = await glue.appManager.inMemory.export();
    });

    afterEach(async () => {
        gtf.clearWindowActiveHooks();

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));

        await glue.appManager.inMemory.import(definitionsOnStart, "replace");
    });

    it("Should throw when invoked with no arguments", (done) => {
        fdc3.open()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    [undefined, null, false, true, () => { }, [], "", 42].forEach(invalidArg => {
        it(`Should throw when invoked with invalid argument (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.open(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    [undefined, null, false, true, () => { }, [], "", 42].forEach(invalidArg => {
        it(`Should throw when invoked with object but the name prop is invalid type (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.open({ name: invalidArg })
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should throw when invoked with string as an argument but there's no app with such name", (done) => {
        fdc3.open("noAppWithSuchName")
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should not throw when invoked with a valid first argument ({ appId: string })", async () => {
        await fdc3.open({ appId: supportAppName });
    });

    [true, () => { }, [], { test: 42 }, "test", 42].forEach(invalidArg => {
        it(`Should throw when invoked with an existing app as a first arg(string) but invalid context (${JSON.stringify(invalidArg)}) as a second arg`, (done) => {
            fdc3.open(supportAppName, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });

        it(`Should throw when invoked with an existing app as a first arg(object) but invalid context (${JSON.stringify(invalidArg)}) as a second arg`, (done) => {
            fdc3.open({ name: supportAppName }, invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    describe("when invoked with a valid first argument of type string", async () => {

        it("Should not throw", async () => {
            await fdc3.open(supportAppName);
        });

        it("Should be async", async () => {
            const res = fdc3.open(supportAppName);

            expect(res.then).to.be.a("function");
            expect(res.catch).to.be.a("function");

            await res;
        });

        it("Should return an object", async () => {
            const returned = await fdc3.open(supportAppName);

            expect(returned).to.be.an("object");
        });

        it("Should return a valid AppIdentifier", async () => {
            const returned = await fdc3.open(supportAppName);

            expect(returned.appId).to.eql(supportAppName);
            expect(returned.instanceId).to.be.a('string');
        })

        it("Should add one more element to the array returned from glue.appManager.instances()", async () => {
            const initLength = glue.appManager.instances().length;

            await fdc3.open(supportAppName);

            const newLength = glue.appManager.instances().length;

            expect(initLength + 1).to.eql(newLength);
        });

        it("Should open a new instance of the passed application", async () => {
            const instanceOpened = gtf.wrapPromise();

            const un = glue.appManager.onInstanceStarted((inst) => {
                if (inst.application.name === supportAppName) {
                    instanceOpened.resolve();
                }
            });

            gtf.addWindowHook(un);

            await fdc3.open(supportAppName);

            await instanceOpened.promise;
        });

        it("Should add the correct application instance to the array returned from glue.appManager.instances()", async () => {
            await fdc3.open(supportAppName);

            const inst = glue.appManager.instances().find(inst => inst.application.name === supportAppName);

            expect(inst).to.not.be.undefined;
        });

        it("Should add one element to the array returned from application.instances", async () => {
            const app = glue.appManager.application(supportAppName);

            const initLength = app.instances.length;

            await fdc3.open(supportAppName);

            const newLength = app.instances.length;

            expect(initLength + 1).to.eql(newLength);
        });

        it("Should resolve when opening an instance of the app with the passed context and the other app invokes a context listener callback with the passed context", async () => {
            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            const un = glue.appManager.onInstanceStarted(async (inst) => {
                if (inst.application.name === appDef.name) {
                    const controlParams = {
                        operation: "fdc3AddContextListener",
                        params: { contextType: context.type }
                    }

                    await glue.interop.invoke(lightweightSupportControlMethodName, controlParams, { windowId: inst.agm.windowId });
                }
            });

            gtf.addWindowHook(un);

            // open will resolve when the opened app adds a context listener for the same context type
            await fdc3.open(appDef.name, context);
        });

        it("Should reject when the opened instance fails to add a context listener", async () => {
            const openPromise = gtf.wrapPromise();

            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            try {
                await fdc3.open(appDef.name, context);
                openPromise.reject("Should have rejected with AppTimeout");
            } catch (error) {
                openPromise.resolve();
            }
        });
    });

    describe("when invoked with a valid first argument of type { appId: string }", async () => {
        it("Should not throw", async () => {
            await fdc3.open({ appId: supportAppName });
        });

        it("Should be async", async () => {
            const res = fdc3.open({ appId: supportAppName });

            expect(res.then).to.be.a("function");
            expect(res.catch).to.be.a("function");

            await res;
        });

        it("Should return an object", async () => {
            const returned = await fdc3.open({ appId: supportAppName });

            expect(returned).to.be.an("object");
        });

        it("Should return a valid AppIdentifier", async () => {
            const returned = await fdc3.open({ appId: supportAppName });

            expect(returned.appId).to.eql(supportAppName);
            expect(returned.instanceId).to.be.a('string');
        })

        it("Should add one more element to the array returned from glue.appManager.instances()", async () => {
            const initLength = glue.appManager.instances().length;

            await fdc3.open({ appId: supportAppName });

            const newLength = glue.appManager.instances().length;

            expect(initLength + 1).to.eql(newLength);
        });

        it("Should open a new instance of the passed application", async () => {
            const instanceOpened = gtf.wrapPromise();

            const un = glue.appManager.onInstanceStarted((inst) => {
                if (inst.application.name === supportAppName) {
                    instanceOpened.resolve();
                }
            });

            gtf.addWindowHook(un);

            await fdc3.open({ appId: supportAppName });

            await instanceOpened.promise;
        });

        it("Should add the correct application instance to the array returned from glue.appManager.instances()", async () => {
            await fdc3.open({ appId: supportAppName });

            const inst = glue.appManager.instances().find(inst => inst.application.name === supportAppName);

            expect(inst).to.not.be.undefined;
        });

        it("Should add one element to the array returned from application.instances", async () => {
            const app = glue.appManager.application(supportAppName);

            const initLength = app.instances.length;

            await fdc3.open({ appId: supportAppName });

            const newLength = app.instances.length;

            expect(initLength + 1).to.eql(newLength);
        });

        it("Should resolve when opening an instance of the app with the passed context and the other app invokes a context listener callback with the passed context", async () => {
            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            const un = glue.appManager.onInstanceStarted(async (inst) => {
                if (inst.application.name === appDef.name) {
                    const controlParams = {
                        operation: "fdc3AddContextListener",
                        params: { contextType: context.type }
                    }

                    await glue.interop.invoke(lightweightSupportControlMethodName, controlParams, { windowId: inst.agm.windowId });
                }
            });

            gtf.addWindowHook(un);

            // open will resolve when the opened app adds a context listener for the same context type
            await fdc3.open({ appId: appDef.name }, context);
        });

        it("Should reject when the opened instance fails to add a context listener", async () => {
            const openPromise = gtf.wrapPromise();

            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            try {
                await fdc3.open({ appId: appDef.name }, context);
                openPromise.reject("Should have rejected with AppTimeout");
            } catch (error) {
                openPromise.resolve();
            }

            await openPromise.promise;
        });
    });

    describe("integration with Glue42", function() {
        it("Should register and later unregister interop method with prefix when opening an app with context and the app adds a listener`", async() => {
            const methodRegisteredPromise = gtf.wrapPromise();
            const methodUnregisteredPromise = gtf.wrapPromise();

            const unServerMethodAdded = glue.interop.serverMethodAdded(({ server, method }) => {
                if (method.name.startsWith(responseInteropMethodPrefix) && server.instance === glue.interop.instance.instance) {
                    methodRegisteredPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodAdded);

            const unServerMethodRemoved = glue.interop.serverMethodRemoved(({ server, method }) => {
                if (method.name.startsWith(responseInteropMethodPrefix) && server.instance === glue.interop.instance.instance) {
                    methodUnregisteredPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodRemoved);

            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            const un = glue.appManager.onInstanceStarted(async (inst) => {
                if (inst.application.name === appDef.name) {
                    const controlParams = {
                        operation: "fdc3AddContextListener",
                        params: { contextType: context.type }
                    }

                    await glue.interop.invoke(lightweightSupportControlMethodName, controlParams, { windowId: inst.agm.windowId });
                }
            });

            gtf.addWindowHook(un);

            // open will resolve when the opened app adds a context listener for the same context type
            await fdc3.open({ appId: appDef.name }, context);

            await Promise.all([methodRegisteredPromise.promise, methodUnregisteredPromise.promise]);
        });

        it("Should register and later unregister interop method name with prefix when opening an app with context and the app does not add a listener", async() => {
            const methodRegisteredPromise = gtf.wrapPromise();
            const methodUnregisteredPromise = gtf.wrapPromise();

            const unServerMethodAdded = glue.interop.serverMethodAdded(({ server, method }) => {
                if (method.name.startsWith(responseInteropMethodPrefix) && server.instance === glue.interop.instance.instance) {
                    methodRegisteredPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodAdded);

            const unServerMethodRemoved = glue.interop.serverMethodRemoved(({ server, method }) => {
                if (method.name.startsWith(responseInteropMethodPrefix) && server.instance === glue.interop.instance.instance) {
                    methodUnregisteredPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodRemoved);

            const appDef = {
                name: "lightweightSupport",
                type: "window",
                details: {
                    url: "http://localhost:4242/lightweightSupport/index.html"
                }
            };

            // import lightweight support app definition
            await glue.appManager.inMemory.import([appDef], "merge");

            const context = gtf.fdc3.getContext();

            try {
                await fdc3.open({ appId: appDef.name }, context);
            } catch (error) { }

            await Promise.all([methodRegisteredPromise.promise, methodUnregisteredPromise.promise]);
        });
    });
});