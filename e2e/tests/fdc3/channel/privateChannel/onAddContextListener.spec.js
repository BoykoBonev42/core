describe("onAddContextListener()", function() {
    let currentChannel;

    before(async() => {
        await coreReady;
    });

    beforeEach(async() => {
        currentChannel = await fdc3.createPrivateChannel();
    });

    afterEach(async() => {
        currentChannel = undefined;

        gtf.fdc3.removeActiveListeners();

        await gtf.fdc3.removeCreatedChannels();

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));
    });

    [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
        it(`Should throw when an invalid argument is passed (${JSON.stringify(invalidArg)})`, (done) => {
            try {
                const listener = currentChannel.onAddContextListener(invalidArg);
                gtf.fdc3.addActiveListener(listener);
                done("Should have thrown");
            } catch (error) {
                done();
            }
        });
    });

    it("Should not invoke the handler when onAddContextListener is added and then a context listener by the creator of the private channel", async() => {
        const handlerInvokedPromise = gtf.wrapPromise();
    
        const onAddContextListener = await currentChannel.onAddContextListener(() => {
            handlerInvokedPromise.reject("Should not have fired the event");
        });

        gtf.fdc3.addActiveListener(onAddContextListener);

        const listener = await currentChannel.addContextListener(null, () => {});

        gtf.fdc3.addActiveListener(listener);

        gtf.wait(3000, handlerInvokedPromise.resolve);

        await handlerInvokedPromise.promise;
    });

    it("Should not invoke the handler when a context listener is added and then onAddContextListener handler is registered by the creator of the private channel", async() => {
        const handlerInvokedPromise = gtf.wrapPromise();
    
        const listener = await currentChannel.addContextListener(null, () => {});

        gtf.fdc3.addActiveListener(listener);

        const onAddContextListener = await currentChannel.onAddContextListener(() => {
            handlerInvokedPromise.reject("Should not have fired the event");
        });

        gtf.fdc3.addActiveListener(onAddContextListener);

        gtf.wait(3000, handlerInvokedPromise.resolve);

        await handlerInvokedPromise.promise;
    });

    describe("when another app adds a listener on the channel", function() {
        it("Should invoke the handler when listener is added after subscribing for onAddContextListener", async() => {
            const handlerInvokedPromise = gtf.wrapPromise();

            const intentName = Date.now().toString();
            const context = gtf.fdc3.getContext();

            const appDef = {
                name: "fdc3SupportApp",
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

            await glue.appManager.inMemory.import([appDef], "merge");

            const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

            await supportApp.fdc3.createPrivateChannel();

            await supportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const intentRes = await fdc3.raiseIntent(intentName, context);

            const privateChannel = await intentRes.getResult();

            const onAddContextListener = await privateChannel.onAddContextListener((contextType) => {
                if (contextType === context.type) {
                    handlerInvokedPromise.resolve();
                }
            });

            gtf.fdc3.addActiveListener(onAddContextListener);

            await supportApp.fdc3.addContextListenerOnPrivateChannel(context.type);

            await handlerInvokedPromise.promise;
        });

        it("Should invoke the handler 3 times with the correct context types when there are 3 active context listeners on a private channel", async() => {
            const handlerInvokedPromise1 = gtf.wrapPromise();
            const handlerInvokedPromise2 = gtf.wrapPromise();
            const handlerInvokedPromise3 = gtf.wrapPromise();
    
            const fdc3Context1 = gtf.fdc3.getContext();
            const fdc3Context2 = gtf.fdc3.getContext();
            const fdc3Context3 = gtf.fdc3.getContext();

            const intentName = Date.now().toString();
            const context = gtf.fdc3.getContext();

            const appDef = {
                name: "fdc3SupportApp",
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

            await glue.appManager.inMemory.import([appDef], "merge");

            const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

            await supportApp.fdc3.createPrivateChannel();

            await supportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const intentRes = await fdc3.raiseIntent(intentName, context);

            const privateChannel = await intentRes.getResult();
    
            const onAddContextListener = await privateChannel.onAddContextListener((contextType) => {
                if (contextType === fdc3Context1.type) {
                    handlerInvokedPromise1.resolve();
                }
    
                if (contextType === fdc3Context2.type) {
                    handlerInvokedPromise2.resolve();
                }
    
                if (contextType === fdc3Context3.type) {
                    handlerInvokedPromise3.resolve();
                }
            });
    
            gtf.fdc3.addActiveListener(onAddContextListener);
    
            await supportApp.fdc3.addContextListenerOnPrivateChannel(fdc3Context1.type);

            await supportApp.fdc3.addContextListenerOnPrivateChannel(fdc3Context2.type);

            await supportApp.fdc3.addContextListenerOnPrivateChannel(fdc3Context3.type);

            await Promise.all([handlerInvokedPromise1.promise, handlerInvokedPromise2.promise, handlerInvokedPromise3.promise]);
        });

        it("Should invoke the handler with previously added context types passed to privateChannel.addContextListener(contextType, handler)", async() => {
            const handlerInvokedWithFirstContextType = gtf.wrapPromise();
            const handlerInvokedWithSecondContextType = gtf.wrapPromise();
            
            const intentName = Date.now().toString();
            const firstContext = gtf.fdc3.getContext();
            const secondContext = gtf.fdc3.getContext();

            const appDef = {
                name: "fdc3SupportApp",
                type: "window",
                details: {
                    url: "http://localhost:4242/coreSupport/index.html"
                },
                intents: [
                    {
                        name: intentName,
                        contexts: [firstContext.type]
                    }
                ]
            };

            await glue.appManager.inMemory.import([appDef], "merge");

            const supportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });

            await supportApp.fdc3.createPrivateChannel();

            await supportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const intentRes = await fdc3.raiseIntent(intentName, firstContext);

            const privateChannel = await intentRes.getResult();

            await supportApp.fdc3.addContextListenerOnPrivateChannel(firstContext.type);

            await supportApp.fdc3.addContextListenerOnPrivateChannel(secondContext.type);

            const onAddContextListener = await privateChannel.onAddContextListener((contextType) => {
                if (contextType === firstContext.type) {
                    handlerInvokedWithFirstContextType.resolve();
                }

                if (contextType === secondContext.type) {
                    handlerInvokedWithSecondContextType.resolve();
                }
            });

            gtf.fdc3.addActiveListener(onAddContextListener);

            await Promise.all([handlerInvokedWithFirstContextType.promise, handlerInvokedWithSecondContextType.promise]);
        });
    });
});
