describe("Channel's broadcast()", function () {
    let systemChannels;

    let currentChannel;

    let supportApp;

    before(async () => {
        await coreReady;

        systemChannels = await fdc3.getUserChannels();
    });

    afterEach(async () => {
        await fdc3.leaveCurrentChannel();

        gtf.fdc3.removeActiveListeners();

        await gtf.channels.resetContexts();

        currentChannel = undefined;

        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));
    });

    describe("invoked on a system channel", function () {
        beforeEach(async () => {
            currentChannel = systemChannels[0];

            await fdc3.joinUserChannel(currentChannel.id);

            supportApp = await gtf.createApp({ exposeFdc3: true });

            await supportApp.fdc3.joinUserChannel(currentChannel.id);
        });

        it("Should throw when no argument is passed", done => {
            currentChannel.broadcast()
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });

        [undefined, null, true, false, () => { }, 42, "", "test", { test: 42 }].forEach(invalidArg => {
            it(`Should throw when the passed context (${JSON.stringify(invalidArg)}) is not a valid context`, (done) => {
                currentChannel.broadcast(invalidArg)
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });
        });

        it("Should broadcast the passed context on the current channel", async () => {
            const context = gtf.fdc3.getContext();

            await currentChannel.broadcast(context);

            const contextOnCurrentChannel = await currentChannel.getCurrentContext();

            expect(contextOnCurrentChannel).to.eql(context);
        });

        it("Should broadcast the passed context ONLY on the current channel", async () => {
            const context = gtf.fdc3.getContext();

            await currentChannel.broadcast(context);

            const allChannels = await fdc3.getUserChannels();

            const allChannelsContexts = await Promise.all(allChannels.map(ch => ch.getCurrentContext()));

            // other channel contexts should be null
            expect(allChannelsContexts.filter(ctx => ctx).length).to.eql(1);
        });

        it("Should invoke the callback passed to fdc3.addContextListener(callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await fdc3.addContextListener((ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to fdc3.addContextListener(null, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await fdc3.addContextListener(null, (ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to fdc3.addContextListener(contextType, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = { type: "fdc3.context.type", name: "fdc3.name", data: { test: 42 } };

            const listener = await fdc3.addContextListener(fdc3Context.type, (ctx) => {
                if (ctx.name === fdc3Context.name) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await currentChannel.addContextListener((ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(null, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await currentChannel.addContextListener(null, (ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(contextType, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = { type: "fdc3.context.type", name: "fdc3.name", data: { test: 42 } };

            const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx) => {
                if (ctx.name === fdc3Context.name) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.joinUserChannel(currentChannel.id);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        describe("integration with glue channels", function () {
            const channelPrefix = `___channel___`;
            const fdc3Delimiter = "&";
            const fdc3Prefix = "fdc3_";

            it("Should broadcast the passed context as a fdc3 context on the current Glue channel", async () => {
                const fdc3Context = gtf.fdc3.getContext();

                await currentChannel.broadcast(fdc3Context);

                const glueChannel = (await glue.channels.list()).find(glueChannel => glueChannel.meta.fdc3.id === currentChannel.id);

                const { data } = await glue.channels.get(glueChannel.name);

                const fdc3Type = Object.keys(data).map(key => key.split(fdc3Prefix).slice(1).join("_").split(fdc3Delimiter).join("."))[0];

                const parsedChannelsDataToFdc3Ctx = { type: fdc3Type, ...data[Object.keys(data)[0]] };

                expect(fdc3Context).to.eql(parsedChannelsDataToFdc3Ctx);
            });

            it("Should add the new broadcasted context to the current Glue channel data when there's another fdc3 context already published to that channel", async () => {
                const firstFdc3Context = gtf.fdc3.getContext();
                const secondFdc3Context = gtf.fdc3.getContext();

                await currentChannel.broadcast(firstFdc3Context);

                await currentChannel.broadcast(secondFdc3Context);

                const glueChannel = (await glue.channels.list()).find(glueChannel => glueChannel.meta.fdc3.id === currentChannel.id);

                const glueChannelWithPrefix = `${channelPrefix}${glueChannel.name}`;

                const { data, latest_fdc3_type } = await glue.contexts.get(glueChannelWithPrefix);

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const latestPublishedData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                const initialFDC3DataArr = Object.entries(data).map(([fdc3Type, dataValue]) => {
                    const type = fdc3Type.split("_").slice(1).join("");
                    return { type, ...dataValue };
                });

                const channelsData = Object.assign({}, ...initialFDC3DataArr, latestPublishedData);

                expect(channelsData).to.eql({ ...firstFdc3Context, ...secondFdc3Context });
            });

            it("Should update an already existing broadcasted FDC3 context to the current Glue channel when the new broadcasted context is of the same type", async () => {
                const firstFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "John Doe",
                        email: 'john.doe@gmail.com'
                    }
                };

                const secondFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "Jane Doe",
                        email: 'jane.doe@gmail.com'
                    }
                };

                await currentChannel.broadcast(firstFdc3Context);

                await currentChannel.broadcast(secondFdc3Context);

                const glueChannel = (await glue.channels.list()).find(glueChannel => glueChannel.meta.fdc3.id === currentChannel.id);

                const glueChannelWithPrefix = `${channelPrefix}${glueChannel.name}`;

                const { data, latest_fdc3_type } = await glue.contexts.get(glueChannelWithPrefix);

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const channelsData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                expect(channelsData).to.eql(secondFdc3Context);
            });
        });
    });

    describe("invoked on an app channel", function () {
        const appChannelName = "AppChannel";

        beforeEach(async () => {
            currentChannel = await fdc3.getOrCreateChannel(appChannelName);

            supportApp = await gtf.createApp({ exposeFdc3: true });
        });

        afterEach(async () => {
            await gtf.fdc3.removeCreatedChannels();
        });

        it("Should throw when no argument is passed", done => {
            currentChannel.broadcast()
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });

        [undefined, null, true, false, () => { }, 42, "", "test", { test: 42 }].forEach(invalidArg => {
            it(`Should throw when the passed context (${JSON.stringify(invalidArg)}) is not a valid context`, (done) => {
                currentChannel.broadcast(invalidArg)
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });
        });

        it("Should broadcast the passed context on the current channel", async () => {
            const context = gtf.fdc3.getContext();

            await currentChannel.broadcast(context);

            const contextOnCurrentChannel = await currentChannel.getCurrentContext();

            expect(contextOnCurrentChannel).to.eql(context);
        });

        it("Should broadcast the passed context ONLY on the current channel", async () => {
            const context = gtf.fdc3.getContext();

            await currentChannel.broadcast(context);

            const allChannels = await fdc3.getUserChannels();

            const allChannelsContexts = await Promise.all(allChannels.map(ch => ch.getCurrentContext()));

            // other channel contexts should be null
            expect(allChannelsContexts.filter(ctx => ctx).length).to.eql(0);
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await currentChannel.addContextListener((ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.broadcastOnAppChannel(currentChannel.id, fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(null, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await currentChannel.addContextListener(null, (ctx) => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.broadcastOnAppChannel(currentChannel.id, fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(contextType, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = { type: "fdc3.context.type", name: "fdc3.name", data: { test: 42 } };

            const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx) => {
                if (ctx.name === fdc3Context.name) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.broadcastOnAppChannel(currentChannel.id, fdc3Context);

            await broadcastedContextHeard.promise;
        });

        describe("integration with glue contexts", function () {
            const fdc3Delimiter = "&";
            const fdc3Prefix = "fdc3_";

            it("Should update glue Shared Context with correct data and latest_fdc3_type types when broadcasting on an app channel", async () => {
                const context = gtf.fdc3.getContext();

                await currentChannel.broadcast(context);

                const glueContext = await glue.contexts.get(currentChannel.id);

                expect(glueContext.data).to.be.an("object");
                expect(glueContext.latest_fdc3_type).to.be.a("string");
            });

            it("Should add the broadcasted FDC3 context to a global Shared Context when broadcasting on an appChannel", async () => {
                const context = gtf.fdc3.getContext();

                await currentChannel.broadcast(context);

                const glueContext = await glue.contexts.get(currentChannel.id);

                const { data, latest_fdc3_type } = glueContext;

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const glueContextData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                expect(glueContextData).to.eql(context);
            });

            it(`Should create latest_fdc3_type prop with delimiter "&" replacing all "." in the type of the context when broadcasting on an appChannel`, async () => {
                const context = { type: "fdc3.test.context.type", name: "fdc3ContextName" };

                await currentChannel.broadcast(context);

                const glueContext = await glue.contexts.get(currentChannel.id);

                const parsedType = context.type.split(".").join(fdc3Delimiter);

                expect(glueContext.latest_fdc3_type).to.eql(parsedType);
            });

            it("Should update an already existing latest_fdc3_type property on a global Shared Context when broadcasting on an appChannel context of the same type", async () => {
                const firstFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "John Doe",
                        email: 'john.doe@gmail.com'
                    }
                };

                const secondFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "Jane Doe",
                        email: 'jane.doe@gmail.com'
                    }
                };

                await currentChannel.broadcast(firstFdc3Context);
                await currentChannel.broadcast(secondFdc3Context);

                const { latest_fdc3_type } = await glue.contexts.get(currentChannel.id);

                const parsedType = latest_fdc3_type.split("&").join(".");

                expect(parsedType).to.eql(secondFdc3Context.type);
            });

            it("Should update an already existing FDC3 context data on a global Shared Context when broadcasting on an appChannel context of the same type", async () => {
                const firstFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "John Doe",
                        email: 'john.doe@gmail.com'
                    }
                };

                const secondFdc3Context = {
                    type: "fdc3.client",
                    date: Date.now().toLocaleString(),
                    id: {
                        name: "Jane Doe",
                        email: 'jane.doe@gmail.com'
                    }
                };

                await currentChannel.broadcast(firstFdc3Context);
                await currentChannel.broadcast(secondFdc3Context);

                const glueContext = await glue.contexts.get(currentChannel.id);

                const { data, latest_fdc3_type } = glueContext;

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const glueContextData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                expect(glueContextData).to.eql(secondFdc3Context);
            });
        });
    });

    describe("invoked on a private channel", function() {
        let definitionsOnStart;

        let intentName;
        let contextType;

        let fdc3SupportApp;

        before(async() => {
            definitionsOnStart = await glue.appManager.inMemory.export();
        });
        
        beforeEach(async() => {
            intentName = `fdc3.intent.${Date.now()}`;
            contextType = `fdc3.context.type.${Date.now()}`;

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

            const res = await glue.appManager.inMemory.import([appDef], "merge");

            if (res.errors.length) {
                throw new Error(JSON.stringify(res.errors));
            }

            const app = glue.appManager.application(appDef.name);

            if (!app) {
                throw new Error("App does not exist");
            }

            fdc3SupportApp = await gtf.createApp({ name: appDef.name, exposeFdc3: true });
        });

        afterEach(async() => {
            await glue.appManager.inMemory.import(definitionsOnStart, "replace");
        });

        it("Should throw when no argument is passed", async() => {
            const errorThrownPromise = gtf.wrapPromise();

            const context = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, context);

            const privateChannel = await resolution.getResult();

            try {
                await privateChannel.broadcast();
                errorThrownPromise.reject("Should have rejected");
            } catch (error) {
                errorThrownPromise.resolve();
            }
        });

        [undefined, null, true, false, () => { }, 42, "", "test", { test: 42 }].forEach(invalidArg => {
            it(`Should throw when the passed context (${JSON.stringify(invalidArg)}) is not a valid context`, async() => {
                const errorThrownPromise = gtf.wrapPromise();

                const context = { ...gtf.fdc3.getContext(), type: contextType };
    
                await fdc3SupportApp.fdc3.createPrivateChannel();
    
                await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });
    
                const resolution = await fdc3.raiseIntent(intentName, context);
    
                const privateChannel = await resolution.getResult();
    
                try {
                    await privateChannel.broadcast(invalidArg);
                    errorThrownPromise.reject("Should have rejected");
                } catch (error) {
                    errorThrownPromise.resolve();
                }
            });
        });

        it("Should broadcast the passed context on the channel", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, context);

            const privateChannel = await resolution.getResult();

            const contextToBroadcast = gtf.fdc3.getContext();

            await fdc3SupportApp.fdc3.broadcastOnPrivateChannel(contextToBroadcast);

            const privateChannelContext = await privateChannel.getCurrentContext();

            expect(privateChannelContext).to.eql(contextToBroadcast);
        });

        it("Should broadcast the passed context ONLY on the current channel", async () => {
            const context = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, context);

            const privateChannel = await resolution.getResult();

            const contextToBroadcast = gtf.fdc3.getContext();

            await privateChannel.broadcast(contextToBroadcast);

            const allChannels = await fdc3.getUserChannels();

            const allChannelsContexts = await Promise.all(allChannels.map(ch => ch.getCurrentContext()));

            // other channel contexts should be null
            expect(allChannelsContexts.filter(ctx => ctx).length).to.eql(0);
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const intentContext = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, intentContext);

            const privateChannel = await resolution.getResult();

            const contextToBroadcast = gtf.fdc3.getContext();

            const listener = await privateChannel.addContextListener((ctx) => {
                try {
                    expect(ctx).to.eql(contextToBroadcast);
                    broadcastedContextHeard.resolve();
                } catch (error) {
                    broadcastedContextHeard.reject(error);
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await fdc3SupportApp.fdc3.broadcastOnPrivateChannel(contextToBroadcast);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(null, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const intentContext = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, intentContext);

            const privateChannel = await resolution.getResult();

            const contextToBroadcast = gtf.fdc3.getContext();

            const listener = await privateChannel.addContextListener(null, (ctx) => {
                try {
                    expect(ctx).to.eql(contextToBroadcast);
                    broadcastedContextHeard.resolve();
                } catch (error) {
                    broadcastedContextHeard.reject(error);
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await fdc3SupportApp.fdc3.broadcastOnPrivateChannel(contextToBroadcast);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback passed to currentChannel.addContextListener(contextType, callback)", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const intentContext = { ...gtf.fdc3.getContext(), type: contextType };

            await fdc3SupportApp.fdc3.createPrivateChannel();

            await fdc3SupportApp.fdc3.addIntentListener(intentName, { privateChannel: true });

            const resolution = await fdc3.raiseIntent(intentName, intentContext);

            const privateChannel = await resolution.getResult();

            const contextToBroadcast = gtf.fdc3.getContext();

            const listener = await privateChannel.addContextListener(contextToBroadcast.type, (ctx) => {
                try {
                    expect(ctx).to.eql(contextToBroadcast);
                    broadcastedContextHeard.resolve();
                } catch (error) {
                    broadcastedContextHeard.reject(error);
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await fdc3SupportApp.fdc3.broadcastOnPrivateChannel(contextToBroadcast);

            await broadcastedContextHeard.promise;
        });

        describe("integration with glue contexts", function () {
            const fdc3Delimiter = "&";
            const fdc3Prefix = "fdc3_";

            it("Should update glue Shared Context with correct data and latest_fdc3_type type", async () => {
                const privateChannel = await fdc3.createPrivateChannel();

                const contextToBroadcast = gtf.fdc3.getContext();

                await privateChannel.broadcast(contextToBroadcast);

                const glueContext = await glue.contexts.get(privateChannel.id);

                expect(glueContext.data).to.be.an("object");
                expect(glueContext.latest_fdc3_type).to.be.a("string");
            });

            it("Should add the broadcasted FDC3 context to a global Shared Context", async () => {
                const privateChannel = await fdc3.createPrivateChannel();

                const contextToBroadcast = gtf.fdc3.getContext();

                await privateChannel.broadcast(contextToBroadcast);

                const glueContext = await glue.contexts.get(privateChannel.id);

                const { data, latest_fdc3_type } = glueContext;

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const glueContextData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                expect(glueContextData).to.eql(contextToBroadcast);
            });

            it(`Should create latest_fdc3_type prop with delimiter "&" replacing all "." in the type of the context`, async () => {
                const privateChannel = await fdc3.createPrivateChannel();

                const context = { type: "fdc3.test.context.type", name: "fdc3ContextName" };

                await privateChannel.broadcast(context);

                const glueContext = await glue.contexts.get(privateChannel.id);

                const parsedType = context.type.split(".").join(fdc3Delimiter);

                expect(glueContext.latest_fdc3_type).to.eql(parsedType);
            });

            it("Should update an already existing latest_fdc3_type property on a global Shared Context when broadcasting a context of the same type", async () => {
                const privateChannel = await fdc3.createPrivateChannel();

                const firstFdc3Context = gtf.fdc3.getContext();
                const secondFdc3Context = gtf.fdc3.getContext();

                await privateChannel.broadcast(firstFdc3Context);
                await privateChannel.broadcast(secondFdc3Context);

                const { latest_fdc3_type } = await glue.contexts.get(privateChannel.id);

                const parsedType = latest_fdc3_type.split("&").join(".");

                expect(parsedType).to.eql(secondFdc3Context.type);
            });

            it("Should update an already existing FDC3 context data on a global Shared Context when broadcasting a context of the same type", async () => {
                const privateChannel = await fdc3.createPrivateChannel();
                
                const firstFdc3Context = gtf.fdc3.getContext();
                
                const secondFdc3Context = gtf.fdc3.getContext();

                await privateChannel.broadcast(firstFdc3Context);
                await privateChannel.broadcast(secondFdc3Context);

                const glueContext = await glue.contexts.get(privateChannel.id);

                const { data, latest_fdc3_type } = glueContext;

                const parsedType = latest_fdc3_type.split(fdc3Delimiter).join(".");

                const glueContextData = { type: parsedType, ...data[`${fdc3Prefix}${latest_fdc3_type}`] };

                expect(glueContextData).to.eql(secondFdc3Context);
            });
        });
    });
});