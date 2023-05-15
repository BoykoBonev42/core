describe("addContextListener() ", function () {
    before(async () => {
        await coreReady;
    });

    afterEach(async () => {
        await fdc3.leaveCurrentChannel();

        gtf.fdc3.removeActiveListeners();

        await gtf.fdc3.removeCreatedChannels();

        await gtf.channels.resetContexts();
    });

    describe("when subscribing while not on a channel", () => {
        let userChannelIdToJoin;
        let anotherUserChannelIdToJoin;
        let supportApp;

        const supportAppName = "coreSupport";

        beforeEach(async () => {
            const [userChannel, anotherUserChannel] = await fdc3.getUserChannels();

            userChannelIdToJoin = userChannel.id;
            anotherUserChannelIdToJoin = anotherUserChannel.id;

            supportApp = await gtf.createApp({ name: supportAppName, exposeFdc3: true });

            await supportApp.fdc3.joinUserChannel(userChannelIdToJoin);
        });

        afterEach(async () => {
            await supportApp.stop();
        });

        describe("using deprecated addContextListener(handler)", () => {
            it("Should not throw when subscribing while not joined on a channel", async () => {
                const listener = await fdc3.addContextListener(() => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should invoke the callback with the correct context immediately after joining a user channel when there's an already broadcasted data", async () => {
                const listenerInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        listenerInvoked.resolve();
                    } catch (error) {
                        listenerInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await listenerInvoked.promise;
            });

            it("Should invoke the callback when a context is broadcasted on the same channel", async () => {
                const listenerInvoked = gtf.wrapPromise();

                const listener = await fdc3.addContextListener(() => {
                    listenerInvoked.resolve();
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(gtf.fdc3.getContext());

                await listenerInvoked.promise;
            });

            it("Should invoke the callback with the correct context when a context is broadcasted on the same channel", async () => {
                const correctContextInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        correctContextInvoked.resolve();
                    } catch (error) {
                        correctContextInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await correctContextInvoked.promise;
            });

            it("Should invoke the callback with the correct context on two different channels when a context is broadcasted on the channel", async () => {
                const contextReceivedOnFirstChannel = gtf.wrapPromise();
                const contextReceivedOnSecondChannel = gtf.wrapPromise();

                const firstChannelContext = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.type === firstChannelContext.type) {
                        contextReceivedOnFirstChannel.resolve();
                    }

                    if (ctx.type === secondChannelContext.type) {
                        contextReceivedOnSecondChannel.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                await contextReceivedOnFirstChannel.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                await contextReceivedOnSecondChannel.promise;
            });

            it("Should invoke the callback with different context types", async () => {
                const listenerInvoked1 = gtf.wrapPromise();
                const listenerInvoked2 = gtf.wrapPromise();

                const context1 = gtf.fdc3.getContext();
                const context2 = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === context1.type) {
                        listenerInvoked1.resolve();
                    }

                    if (ctx.type === context2.type) {
                        listenerInvoked2.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context1);

                await supportApp.fdc3.broadcast(context2);

                await Promise.all([listenerInvoked1.promise, listenerInvoked2.promise]);
            });

            it("Should not invoke the callback in each channels when adding a listener and unsubscribing, then joining a channel", async () => {
                const callbackNotInvokedInFirstChannelPromise = gtf.wrapPromise();
                const callbackNotInvokedInSecondChannelPromise = gtf.wrapPromise();

                const firstChannelContext = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === firstChannelContext.name) {
                        callbackNotInvokedInFirstChannelPromise.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext.name) {
                        callbackNotInvokedInSecondChannelPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                listener.unsubscribe();

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                gtf.wait(3000, callbackNotInvokedInFirstChannelPromise.resolve);

                await callbackNotInvokedInFirstChannelPromise.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                gtf.wait(3000, callbackNotInvokedInSecondChannelPromise.resolve);

                await callbackNotInvokedInSecondChannelPromise.promise;
            });

            it("Should fire the callback only once when a listener is added, another app broadcasts a context and then current app invoke listener.unsubscribe", async () => {
                const firstInvocationPromise = gtf.wrapPromise();
                const secondInvocationPromise = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === firstContext.name) {
                        firstInvocationPromise.resolve();
                    }

                    if (ctx.name === secondContext.name) {
                        secondInvocationPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstContext);

                await firstInvocationPromise.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, secondInvocationPromise.resolve);

                await secondInvocationPromise.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const firstChannelContext1 = gtf.fdc3.getContext();
                const firstChannelContext2 = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should invoke the callback when there's an already broadcasted fdc3 compliant data on the channel", async() => {
                const callbackInvokedPromise = gtf.wrapPromise();

                const context = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener((ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        callbackInvokedPromise.resolve();
                    } catch (error) {
                        callbackInvokedPromise.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedPromise.promise;
            });

            it("Should invoke the callback with the latest broadcasted data when there are multiple fdc3 contexts were broadcasted on the channel before adding the listener", async() => {
                const callbackInvokedWithLatestData = gtf.wrapPromise();
                const callbackNotInvokedWithOldData = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(firstContext);

                await supportApp.fdc3.broadcast(secondContext);

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.type === firstContext.type) {
                        callbackNotInvokedWithOldData.reject("Should not have invoked with the old context");
                    }

                    if (ctx.type === secondContext.type) {
                        callbackInvokedWithLatestData.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedWithLatestData.promise;

                gtf.wait(3000, callbackNotInvokedWithOldData.resolve);

                await callbackNotInvokedWithOldData.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener((ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when another app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener(() => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };
                    const listener = await fdc3.addContextListener((ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });

        describe("using addContextListener(null, handler)", () => {
            it("Should not throw when subscribing while not joined on a channel", async () => {
                const listener = await fdc3.addContextListener(null, () => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should invoke the callback with the correct context immediately after joining a user channel when there's an already broadcasted data", async () => {
                const listenerInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        listenerInvoked.resolve();
                    } catch (error) {
                        listenerInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(context);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await listenerInvoked.promise;
            });

            it("Should invoke the callback when a context is broadcasted on the same channel", async () => {
                const listenerInvoked = gtf.wrapPromise();

                const listener = await fdc3.addContextListener(null, () => {
                    listenerInvoked.resolve();
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(gtf.fdc3.getContext());

                await listenerInvoked.promise;
            });

            it("Should invoke the callback with the correct context when a context is broadcasted on the same channel", async () => {
                const correctContextInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        correctContextInvoked.resolve();
                    } catch (error) {
                        correctContextInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await correctContextInvoked.promise;
            });

            it("Should invoke the callback with the correct context on two different channels when a context is broadcasted on the channel", async () => {
                const contextReceivedOnFirstChannel = gtf.wrapPromise();
                const contextReceivedOnSecondChannel = gtf.wrapPromise();

                const firstChannelContext = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === firstChannelContext.type) {
                        contextReceivedOnFirstChannel.resolve();
                    }

                    if (ctx.type === secondChannelContext.type) {
                        contextReceivedOnSecondChannel.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                await contextReceivedOnFirstChannel.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                await contextReceivedOnSecondChannel.promise;
            });

            it("Should invoke the callback with different context types", async () => {
                const listenerInvoked1 = gtf.wrapPromise();
                const listenerInvoked2 = gtf.wrapPromise();

                const context1 = gtf.fdc3.getContext();
                const context2 = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === context1.type) {
                        listenerInvoked1.resolve();
                    }

                    if (ctx.type === context2.type) {
                        listenerInvoked2.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context1);

                await supportApp.fdc3.broadcast(context2);

                await Promise.all([listenerInvoked1.promise, listenerInvoked2.promise]);
            });

            it("Should not invoke the callback in each channels when adding a listener and unsubscribing, then joining a channel", async () => {
                const callbackNotInvokedInFirstChannelPromise = gtf.wrapPromise();
                const callbackNotInvokedInSecondChannelPromise = gtf.wrapPromise();

                const firstChannelContext = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.name === firstChannelContext.name) {
                        callbackNotInvokedInFirstChannelPromise.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext.name) {
                        callbackNotInvokedInSecondChannelPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                listener.unsubscribe();

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                gtf.wait(3000, callbackNotInvokedInFirstChannelPromise.resolve);

                await callbackNotInvokedInFirstChannelPromise.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                gtf.wait(3000, callbackNotInvokedInSecondChannelPromise.resolve);

                await callbackNotInvokedInSecondChannelPromise.promise;
            });

            it("Should fire the callback only once when a listener is added, another app broadcasts a context and then current app invoke listener.unsubscribe", async () => {
                const firstInvocationPromise = gtf.wrapPromise();
                const secondInvocationPromise = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.name === firstContext.name) {
                        firstInvocationPromise.resolve();
                    }

                    if (ctx.name === secondContext.name) {
                        secondInvocationPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstContext);

                await firstInvocationPromise.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, secondInvocationPromise.resolve);

                await secondInvocationPromise.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe() is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const firstChannelContext1 = gtf.fdc3.getContext();
                const firstChannelContext2 = gtf.fdc3.getContext();
                const secondChannelContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should invoke the callback when there's an already broadcasted fdc3 compliant data on the channel", async() => {
                const callbackInvokedPromise = gtf.wrapPromise();

                const context = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        callbackInvokedPromise.resolve();
                    } catch (error) {
                        callbackInvokedPromise.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedPromise.promise;
            });

            it("Should invoke the callback with the latest broadcasted data when there are multiple fdc3 contexts were broadcasted on the channel before adding the listener", async() => {
                const callbackInvokedWithLatestData = gtf.wrapPromise();
                const callbackNotInvokedWithOldData = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(firstContext);

                await supportApp.fdc3.broadcast(secondContext);

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === firstContext.type) {
                        callbackNotInvokedWithOldData.reject("Should not have invoked with the old context");
                    }

                    if (ctx.type === secondContext.type) {
                        callbackInvokedWithLatestData.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedWithLatestData.promise;

                gtf.wait(3000, callbackNotInvokedWithOldData.resolve);

                await callbackNotInvokedWithOldData.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });


            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener(null, (ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when non fdc3 app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener(null, () => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };
                    const listener = await fdc3.addContextListener(null, (ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });

        describe("using addContextListener(string, handler)", () => {
            it("Should not throw when subscribing while not joined on a channel", async () => {
                const listener = await fdc3.addContextListener(null, () => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should invoke the callback with the correct context immediately after joining a user channel when there's an already broadcasted data", async () => {
                const listenerInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(context.type, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        listenerInvoked.resolve();
                    } catch (error) {
                        listenerInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(context);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await listenerInvoked.promise;
            });

            it("Should invoke the callback when a context is broadcasted on the same channel", async () => {
                const listenerInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(context.type, () => {
                    listenerInvoked.resolve();
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await listenerInvoked.promise;
            });

            it("Should invoke the callback with the correct context when a context is broadcasted on the same channel", async () => {
                const correctContextInvoked = gtf.wrapPromise();
                const context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(context.type, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        correctContextInvoked.resolve();
                    } catch (error) {
                        correctContextInvoked.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await correctContextInvoked.promise;
            });

            it("Should invoke the callback with the correct context on two different channels when a context is broadcasted on the channel", async () => {
                const contextReceivedOnFirstChannel = gtf.wrapPromise();
                const contextReceivedOnSecondChannel = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstChannelContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondChannelContext = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstChannelContext.name) {
                        contextReceivedOnFirstChannel.resolve();
                    }

                    if (ctx.name === secondChannelContext.name) {
                        contextReceivedOnSecondChannel.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                await contextReceivedOnFirstChannel.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                await contextReceivedOnSecondChannel.promise;
            });

            it("Should not invoked the callback with different context types", async () => {
                const listenerInvoked = gtf.wrapPromise();
                const listenerNotInvoked = gtf.wrapPromise();

                const context1 = gtf.fdc3.getContext();
                const context2 = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(context1.type, (ctx) => {
                    if (ctx.type === context1.type) {
                        listenerInvoked.resolve();
                    }

                    if (ctx.type === context2.type) {
                        listenerNotInvoked.reject("Should not have been invoked");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context1);

                await listenerInvoked.promise;

                await supportApp.fdc3.broadcast(context2);

                gtf.wait(3000, listenerNotInvoked.resolve);

                await listenerNotInvoked.promise;
            });

            it("Should not invoke the callback in each channels when adding a listener and unsubscribing, then joining a channel", async () => {
                const callbackNotInvokedInFirstChannelPromise = gtf.wrapPromise();
                const callbackNotInvokedInSecondChannelPromise = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstChannelContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondChannelContext = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstChannelContext.name) {
                        callbackNotInvokedInFirstChannelPromise.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext.name) {
                        callbackNotInvokedInSecondChannelPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                listener.unsubscribe();

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext);

                gtf.wait(3000, callbackNotInvokedInFirstChannelPromise.resolve);

                await callbackNotInvokedInFirstChannelPromise.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext);

                gtf.wait(3000, callbackNotInvokedInSecondChannelPromise.resolve);

                await callbackNotInvokedInSecondChannelPromise.promise;
            });

            it("Should fire the callback only once when a listener is added, another app broadcasts a context and then current app invoke listener.unsubscribe", async () => {
                const firstInvocationPromise = gtf.wrapPromise();
                const secondInvocationPromise = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondContext = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstContext.name) {
                        firstInvocationPromise.resolve();
                    }

                    if (ctx.name === secondContext.name) {
                        secondInvocationPromise.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstContext);

                await firstInvocationPromise.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, secondInvocationPromise.resolve);

                await secondInvocationPromise.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe() is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstChannelContext1 = { ...gtf.fdc3.getContext(), type: contextType };
                const firstChannelContext2 = { ...gtf.fdc3.getContext(), type: contextType };
                const secondChannelContext1 = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext1.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext1);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should invoke the callback when there's an already broadcasted fdc3 compliant data on the channel", async() => {
                const callbackInvokedPromise = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const context = { ...gtf.fdc3.getContext(), type: contextType };

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    try {
                        expect(ctx).to.eql(context);
                        callbackInvokedPromise.resolve();
                    } catch (error) {
                        callbackInvokedPromise.reject(error);
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedPromise.promise;
            });

            it("Should invoke the callback with the latest broadcasted data when there are multiple fdc3 contexts were broadcasted on the channel before adding the listener", async() => {
                const callbackInvokedWithLatestData = gtf.wrapPromise();
                const callbackNotInvokedWithOldData = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondContext = { ...gtf.fdc3.getContext(), type: contextType };

                await supportApp.fdc3.broadcast(firstContext);

                await supportApp.fdc3.broadcast(secondContext);

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstContext.name) {
                        callbackNotInvokedWithOldData.reject("Should not have invoked with the old context");
                    }

                    if (ctx.name === secondContext.name) {
                        callbackInvokedWithLatestData.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await callbackInvokedWithLatestData.promise;

                gtf.wait(3000, callbackNotInvokedWithOldData.resolve);

                await callbackNotInvokedWithOldData.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const context = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx, metadata) => {
                    if (ctx.type === context.type) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const context = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx, metadata) => {
                    if (ctx.type === context.type) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const context = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx, metadata) => {
                    if (ctx.type === context.type) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.joinUserChannel(userChannelIdToJoin);

                await supportApp.fdc3.broadcast(context);

                await metadataHeard.promise;
            });

            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener(fdc3ContextType, (ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when non fdc3 app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener("contextType", () => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };

                    const listener = await fdc3.addContextListener(fdc3ContextType, (ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    await fdc3.joinUserChannel(userChannelIdToJoin);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });
    });

    describe("when subscribing while on a system channel", () => {
        let userChannelIdToJoin;
        let anotherUserChannelIdToJoin;
        let supportApp;

        const supportAppName = "coreSupport";

        beforeEach(async () => {
            const [userChannel, anotherUserChannel] = await fdc3.getUserChannels();

            userChannelIdToJoin = userChannel.id;
            anotherUserChannelIdToJoin = anotherUserChannel.id;

            await fdc3.joinUserChannel(userChannelIdToJoin);

            supportApp = await gtf.createApp({ name: supportAppName, exposeFdc3: true });

            await supportApp.fdc3.joinUserChannel(userChannelIdToJoin);
        });

        afterEach(async () => {
            await supportApp.stop();
        });

        it("Should throw when no argument is passed", (done) => {
            fdc3.addContextListener()
                .then(listener => {
                    gtf.fdc3.addActiveListener(listener);
                    done("Should have thrown");
                })
                .catch(() => done());
        });

        it("Should invoke the callback when support app broadcasts a context", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await fdc3.addContextListener(null, ctx => {
                if (ctx.type === fdc3Context.type) {
                    broadcastedContextHeard.resolve();
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        it("Should invoke the callback with the correct context when support app broadcasts a context", async () => {
            const broadcastedContextHeard = gtf.wrapPromise();

            const fdc3Context = gtf.fdc3.getContext();

            const listener = await fdc3.addContextListener(null, ctx => {
                if (ctx.type === fdc3Context.type) {
                    try {
                        expect(ctx).to.eql(fdc3Context);
                        broadcastedContextHeard.resolve();
                    } catch (error) {
                        broadcastedContextHeard.reject(error);
                    }
                }
            });

            gtf.fdc3.addActiveListener(listener);

            await supportApp.fdc3.broadcast(fdc3Context);

            await broadcastedContextHeard.promise;
        });

        describe("using deprecated addContextListener(handler)", () => {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [{ test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) argument is passed`, (done) => {
                    fdc3.addContextListener(invalidArg)
                        .then(listener => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });

            it("Should not throw when invoked with a function as a first arg", async () => {
                const listener = await fdc3.addContextListener(() => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should ignore context updates from current instance", async () => {
                const wrapper = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.broadcast(fdc3Context);

                gtf.wait(3000, wrapper.resolve);

                await wrapper.promise;
            });

            it("Should return an object", async () => {
                const listener = await fdc3.addContextListener(() => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener).to.be.an("object");
            });

            it("Should return a valid listener (object with unsubscribe function)", async () => {
                const listener = await fdc3.addContextListener(() => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener.unsubscribe).to.be.a("function");
            });

            it("Should invoke the callback for different context types", async () => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();

                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        firstContextHeard.resolve();
                    }

                    if (ctx.name === secondContextToBroadcast.name) {
                        secondContextHeard.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstContextToBroadcast);

                await firstContextHeard.promise;

                await supportApp.fdc3.broadcast(secondContextToBroadcast);

                await secondContextHeard.promise;
            });

            it("Should invoke the callback in another system channel", async () => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();

                const currentChannelContextToBroadcast = gtf.fdc3.getContext();
                const anotherChannelContextToBroadcast = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === currentChannelContextToBroadcast.name) {
                        currentChannelContextHeard.resolve();
                    }

                    if (ctx.name === anotherChannelContextToBroadcast.name) {
                        anotherChannelContextHeard.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                // support app broadcasts a context on the current channel
                await supportApp.fdc3.broadcast(currentChannelContextToBroadcast);

                await currentChannelContextHeard.promise;

                // current app joins another system channel
                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app broadcasts context on the other system channel
                await supportApp.fdc3.broadcast(anotherChannelContextToBroadcast);

                await anotherChannelContextHeard.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe() is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const firstChannelContext1 = gtf.fdc3.getContext();
                const firstChannelContext2 = gtf.fdc3.getContext();
                const secondChannelContext1 = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext1.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext1);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should stop invoking the callback after invoking listener.unsubscribe()", async () => {
                const contextHeard = gtf.wrapPromise();
                const contextNotHeard = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(async (ctx) => {
                    if (ctx.type === firstContext.type) {
                        contextHeard.resolve();
                    }

                    if (ctx.type === secondContext.type) {
                        contextNotHeard.reject("Should not have fires");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstContext);

                await contextHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, contextNotHeard.resolve);

                await contextNotHeard.promise;
            });

            it("Should invoke the callback with the correct context if the function is called after the app has already joined a channel and the channel already contains context", async () => {
                const contextHeard = gtf.wrapPromise();

                const context = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener((ctx) => {
                    if (ctx.type === context.type) {
                        try {
                            expect(ctx).to.eql(context);
                            contextHeard.resolve();
                        } catch (error) {
                            contextHeard.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await contextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener((ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener((ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when non fdc3 app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener(() => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };
                    const listener = await fdc3.addContextListener((ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });

        describe("using addContextListener(null, handler)", () => {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [{ test: 42 }]].forEach(invalidArg => {
                it(`Should throw when first passed arg is valid (null) but the second arg (${JSON.stringify(invalidArg)}) is not of type function`, (done) => {
                    fdc3.addContextListener(null, invalidArg)
                        .then(listener => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });

            it("Should not throw when invoked with null and a function as arguments", async () => {
                const listener = await fdc3.addContextListener(null, () => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should ignore context updates from current instance", async () => {
                const wrapper = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.broadcast(fdc3Context);

                gtf.wait(3000, wrapper.resolve);

                await wrapper.promise;
            });

            it("Should return an object", async () => {
                const listener = await fdc3.addContextListener(null, () => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener).to.be.an("object");
            });

            it("Should return a valid listener (object with unsubscribe function)", async () => {
                const listener = await fdc3.addContextListener(null, () => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener.unsubscribe).to.be.a("function");
            });

            it("Should invoke the callback for different context types", async () => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();

                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === firstContextToBroadcast.type) {
                        firstContextHeard.resolve();
                    }

                    if (ctx.type === secondContextToBroadcast.type) {
                        secondContextHeard.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstContextToBroadcast);

                await firstContextHeard.promise;

                await supportApp.fdc3.broadcast(secondContextToBroadcast);

                await secondContextHeard.promise;
            });

            it("Should invoke the callback in another system channel", async () => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();

                const currentChannelContextToBroadcast = gtf.fdc3.getContext();
                const anotherChannelContextToBroadcast = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.name === currentChannelContextToBroadcast.name) {
                        currentChannelContextHeard.resolve();
                    }

                    if (ctx.name === anotherChannelContextToBroadcast.name) {
                        anotherChannelContextHeard.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                // support app broadcasts a context on the current channel
                await supportApp.fdc3.broadcast(currentChannelContextToBroadcast);

                await currentChannelContextHeard.promise;

                // current app joins another system channel
                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app broadcasts context on the other system channel
                await supportApp.fdc3.broadcast(anotherChannelContextToBroadcast);

                await anotherChannelContextHeard.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe() is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const firstChannelContext1 = gtf.fdc3.getContext();
                const firstChannelContext2 = gtf.fdc3.getContext();
                const secondChannelContext1 = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext1.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext1);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should stop invoking the callback after invoking listener.unsubscribe()", async () => {
                const contextHeard = gtf.wrapPromise();
                const contextNotHeard = gtf.wrapPromise();

                const firstContext = gtf.fdc3.getContext();
                const secondContext = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, async (ctx) => {
                    if (ctx.type === firstContext.type) {
                        contextHeard.resolve();
                    }

                    if (ctx.type === secondContext.type) {
                        contextNotHeard.reject("Should not have fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, contextNotHeard.resolve);

                await contextNotHeard.promise;
            });

            it("Should invoke the callback with the correct context if the function is called after the app has already joined a channel and the channel already contains context", async () => {
                const contextHeard = gtf.wrapPromise();

                const context = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener(null, (ctx) => {
                    if (ctx.type === context.type) {
                        try {
                            expect(ctx).to.eql(context);
                            contextHeard.resolve();
                        } catch (error) {
                            contextHeard.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await contextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(null, (ctx, metadata) => {
                    if (ctx.type === fdc3Context.type) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener(null, (ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when non fdc3 app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener(null, () => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };
                    const listener = await fdc3.addContextListener(null, (ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });

        describe("using addContextListener(string, handler)", () => {
            [undefined, null, true, "", 42, { test: 42 }, [], [{ test: 42 }]].forEach(invalidArg => {
                it(`Should throw when first passed arg is valid (string) but the second arg (${JSON.stringify(invalidArg)}) is not of type function`, (done) => {
                    fdc3.addContextListener("fdc3.test", invalidArg)
                        .then(listener => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });

            it("Should not throw when invoked with a string and a function as arguments", async () => {
                const listener = await fdc3.addContextListener("fdc3.test", () => { });

                gtf.fdc3.addActiveListener(listener);
            });

            it("Should ignore context updates from current instance", async () => {
                const wrapper = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener("fdc3.test", (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await fdc3.broadcast(fdc3Context);

                gtf.wait(3000, wrapper.resolve);

                await wrapper.promise;
            });

            it("Should return an object", async () => {
                const listener = await fdc3.addContextListener("fdc3.test", () => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener).to.be.an("object");
            });

            it("Should return a valid listener (object with unsubscribe function)", async () => {
                const listener = await fdc3.addContextListener("fdc3.test", () => { });

                gtf.fdc3.addActiveListener(listener);

                expect(listener.unsubscribe).to.be.a("function");
            });

            it("Should invoke the callback only when broadcasting a context of the specified type", async () => {
                const contextHeard = gtf.wrapPromise();
                const contextNotHeard = gtf.wrapPromise();

                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(firstContextToBroadcast.type, (ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        contextHeard.resolve();
                        return;
                    }

                    contextNotHeard.reject("Should not have been invoked");
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstContextToBroadcast);

                await contextHeard.promise;

                await supportApp.fdc3.broadcast(secondContextToBroadcast);

                gtf.wait(3000, contextNotHeard.resolve);

                await contextNotHeard.promise;
            });

            it("Should invoke the callback in another system channel", async () => {
                const firstChannelContextHeard = gtf.wrapPromise();
                const secondChannelContextHeard = gtf.wrapPromise();

                const contextType = "fdc3.context.type";

                const firstContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondContext = { ...gtf.fdc3.getContext(), type: contextType };;

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstContext.name) {
                        firstChannelContextHeard.resolve();
                    }

                    if (ctx.name === secondContext.name) {
                        secondChannelContextHeard.resolve();
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                // support app broadcasts a context on the current channel
                await supportApp.fdc3.broadcast(firstContext);

                await firstChannelContextHeard.promise;

                // current app joins another user channel
                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app joins another user channel
                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                // support app broadcasts context on the other user channel
                await supportApp.fdc3.broadcast(secondContext);

                await secondChannelContextHeard.promise;
            });

            it("Should stop firing the callback on other channels when listener.unsubscribe() is invoked on the current channel", async () => {
                const firstChannelInvocationHeard = gtf.wrapPromise();
                const firstChannelInvocationNotHeard = gtf.wrapPromise();

                const secondChannelInvocationPromiseNotHeard = gtf.wrapPromise();

                const contextType = `fdc3.context.type.${Date.now()}`;
                const firstChannelContext1 = { ...gtf.fdc3.getContext(), type: contextType };
                const firstChannelContext2 = { ...gtf.fdc3.getContext(), type: contextType };
                const secondChannelContext1 = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(contextType, (ctx) => {
                    if (ctx.name === firstChannelContext1.name) {
                        firstChannelInvocationHeard.resolve();
                    }

                    if (ctx.name === firstChannelContext2.name) {
                        firstChannelInvocationNotHeard.reject("Should not have been fired");
                    }

                    if (ctx.name === secondChannelContext1.name) {
                        secondChannelInvocationPromiseNotHeard.reject("Should not have been fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstChannelContext1);

                await firstChannelInvocationHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(firstChannelContext2);

                gtf.wait(3000, firstChannelInvocationNotHeard.resolve);

                await firstChannelInvocationNotHeard.promise;

                await fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.joinUserChannel(anotherUserChannelIdToJoin);

                await supportApp.fdc3.broadcast(secondChannelContext1);

                gtf.wait(3000, secondChannelInvocationPromiseNotHeard.resolve);

                await secondChannelInvocationPromiseNotHeard.promise;
            });

            it("Should stop invoking the callback after invoking listener.unsubscribe()", async () => {
                const contextHeard = gtf.wrapPromise();
                const contextNotHeard = gtf.wrapPromise();

                const contextType = "fdc3.context.type";
                const firstContext = { ...gtf.fdc3.getContext(), type: contextType };
                const secondContext = { ...gtf.fdc3.getContext(), type: contextType };

                const listener = await fdc3.addContextListener(firstContext.type, async (ctx) => {
                    if (ctx.name === firstContext.name) {
                        contextHeard.resolve();
                    }

                    if (ctx.name === secondContext.name) {
                        contextNotHeard.reject("Should not have fired");
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(firstContext);

                await contextHeard.promise;

                listener.unsubscribe();

                await supportApp.fdc3.broadcast(secondContext);

                gtf.wait(3000, contextNotHeard.resolve);

                await contextNotHeard.promise;
            });

            it("Should invoke the callback with the correct context if the function is called after the app has already joined a channel and the channel already contains context", async () => {
                const contextHeard = gtf.wrapPromise();

                const context = gtf.fdc3.getContext();

                await supportApp.fdc3.broadcast(context);

                const listener = await fdc3.addContextListener(context.type, (ctx) => {
                    if (ctx.name === context.name) {
                        try {
                            expect(ctx).to.eql(context);
                            contextHeard.resolve();
                        } catch (error) {
                            contextHeard.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await contextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(fdc3Context.type, (ctx, metadata) => {
                    if (ctx.name === fdc3Context.name) {
                        try {
                            expect(metadata).to.not.be.undefined;
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject("Metadata is not defined");
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata type (object)", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(fdc3Context.type, (ctx, metadata) => {
                    if (ctx.name === fdc3Context.name) {
                        try {
                            expect(metadata).to.be.an("object");
                            expect(metadata.source).to.be.an("object");
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async () => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await fdc3.addContextListener(fdc3Context.type, (ctx, metadata) => {
                    if (ctx.name === fdc3Context.name) {
                        try {
                            const { appId } = metadata.source;
                            expect(appId).to.eql(supportAppName);
                            metadataHeard.resolve();
                        } catch (error) {
                            metadata.reject(error);
                        }
                    }
                });

                gtf.fdc3.addActiveListener(listener);

                await supportApp.fdc3.broadcast(fdc3Context);

                await metadataHeard.promise;
            });

            describe("integration with Glue42 Channels API", function () {
                const channelsFdc3DataKeyPrefix = 'fdc3_';
                const channelsFdc3Delimiter = "&";

                it("Should invoke the callback with correct data when non fdc3 app broadcasts FDC3 compliant data on the channel", async () => {
                    const correctDataPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const listener = await fdc3.addContextListener(fdc3ContextType, (ctx) => {
                        try {
                            expect(ctx).to.eql(expectedContext);
                            correctDataPromise.resolve();
                        } catch (error) {
                            correctDataPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await correctDataPromise.promise;
                });

                it("Should not invoke the callback when non fdc3 app broadcasts FDC3 incompliant data on the channel", async () => {
                    const callbackNotHeardPromise = gtf.wrapPromise();

                    const dataToBroadcast = {
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const listener = await fdc3.addContextListener("contextType", () => {
                        callbackNotHeardPromise.reject("Should not have fired");
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(dataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, callbackNotHeardPromise.resolve);

                    await callbackNotHeardPromise.promise;
                });

                it("Should invoke the callback only when fdc3 compliant data is published", async () => {
                    const compliantDataHeardPromise = gtf.wrapPromise();
                    const incompliantDataHeardPromise = gtf.wrapPromise();

                    const fdc3ContextType = `fdc3.client.${Date.now()}`;
                    const expectedContext = {
                        type: fdc3ContextType,
                        name: "John Doe",
                        address: {
                            street: "Some Street Name",
                            no: 42
                        }
                    };

                    const parsedGlueFdc3ContextType = `${fdc3ContextType.split(".").join(channelsFdc3Delimiter)}`;
                    const { type, ...rest } = expectedContext;
                    const glueContextToPublish = { [`${channelsFdc3DataKeyPrefix}${parsedGlueFdc3ContextType}`]: rest };

                    const fdc3IncompliantDataToBroadcast = {
                        fdc3IncompliantData: true,
                        type: fdc3ContextType,
                        data: { test: 42 },
                    };
                    const listener = await fdc3.addContextListener(fdc3ContextType, (ctx) => {
                        if (ctx.fdc3IncompliantData) {
                            incompliantDataHeardPromise.reject("Should not have fired");
                            return;
                        }

                        try {
                            expect(ctx).to.eql(expectedContext);
                            compliantDataHeardPromise.resolve();
                        } catch (error) {
                            compliantDataHeardPromise.reject(error);
                        }
                    });

                    gtf.fdc3.addActiveListener(listener);

                    const glueChannelToPublishOn = (await glue.channels.list()).find(channel => channel.meta.fdc3.id === userChannelIdToJoin);

                    const nonFdc3SupportApp = await gtf.createApp();

                    await nonFdc3SupportApp.channels.publish(glueContextToPublish, glueChannelToPublishOn.name);

                    await compliantDataHeardPromise.promise;

                    await nonFdc3SupportApp.channels.publish(fdc3IncompliantDataToBroadcast, glueChannelToPublishOn.name);

                    gtf.wait(3000, incompliantDataHeardPromise.resolve);

                    await incompliantDataHeardPromise.promise;
                });
            });
        });
    });

    describe("when invoked in an iframe within a non-glue window", () => {
        const supportControlMethodName = 'G42Core.E2E.Lightweight.Control';
        
        /* 
        NB!!! 
        Always send instructions to iframe app to close window since there's no way to do it
        with glue methods (parent app is not a Glue window)
        */
        it("Should add context listener while not on a channel and not throw", async () => {
            const serverMethodAddedPromise = gtf.wrapPromise();
            const serverMethodRemovedPromise = gtf.wrapPromise();

            let instance;

            const unServerMethodAdded = glue.interop.serverMethodAdded(({ server, method }) => {           
                if (method.name === supportControlMethodName && server.applicationName.includes("Glue IFrame App")) {
                    instance = server.instance;
                    serverMethodAddedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodAdded);

            const unServerMethodRemoved = glue.interop.serverMethodRemoved(({ server, method }) => {
                if (method.name === supportControlMethodName && server.applicationName.includes("Glue IFrame App")) {
                    serverMethodRemovedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodRemoved);
            
            // open window which has an iframe with Glue in it
            await glue.windows.open(`iframe-${Date.now()}`, "http://localhost:4242/iframe/index.html");;

            await serverMethodAddedPromise.promise;

            const addContextListenerControlParams = {
                operation: "fdc3AddContextListener",
                params: { contextType: "test" }
            };

            // send instructions to iframe to add a context listener
            await glue.interop.invoke(supportControlMethodName, addContextListenerControlParams, { instance });

            const closeWindowControlParams = {
                operation: "closeWindow",
                params: {}
            };

            // send instructions to iframe window to close
            await glue.interop.invoke(supportControlMethodName, closeWindowControlParams, { instance });

            // await iframe app to close
            await serverMethodRemovedPromise.promise;
        });

        it("Should add a context listener while on a system channel and not throw", async () => {
            const serverMethodAddedPromise = gtf.wrapPromise();
            const serverMethodRemovedPromise = gtf.wrapPromise();

            let instance;

            const unServerMethodAdded = glue.interop.serverMethodAdded(({ server, method }) => {           
                if (method.name === supportControlMethodName) {
                    instance = server.instance;
                    serverMethodAddedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodAdded);

            const unServerMethodRemoved = glue.interop.serverMethodAdded(({ server, method }) => {           
                if (method.name === supportControlMethodName) {
                    serverMethodRemovedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodRemoved);
            
            // open window which has an iframe with Glue in it
            await glue.windows.open(`iframe-${Date.now()}`, "http://localhost:4242/iframe/index.html");

            await serverMethodAddedPromise.promise;

            const allChannels = await fdc3.getUserChannels();

            const channelIdToJoin = allChannels[0].id;

            // send instructions to iframe to join a channel
            const joinUserChannelControlParams = {
                operation: "fdc3JoinUserChannel",
                params: { channelId: channelIdToJoin }
            };

            await glue.interop.invoke(supportControlMethodName, joinUserChannelControlParams, { instance });

            // send instructions to iframe to add a context listener while on a channel
            const addContextListenerControlParams = {
                operation: "fdc3AddContextListener",
                params: { contextType: "test" }
            };

            await glue.interop.invoke(supportControlMethodName, addContextListenerControlParams, { instance });

            const closeWindowControlParams = {
                operation: "closeWindow",
                params: {}
            };

            // tell iframe to close
            await glue.interop.invoke(supportControlMethodName, closeWindowControlParams, { instance });

            await serverMethodRemovedPromise.promise;
        });

        it("Should add a context listener on an app channel and not throw", async() => {
            const serverMethodAddedPromise = gtf.wrapPromise();
            const serverMethodRemovedPromise = gtf.wrapPromise();

            let instance;

            const unServerMethodAdded = glue.interop.serverMethodAdded(({ server, method }) => {           
                if (method.name === supportControlMethodName) {
                    instance = server.instance;
                    serverMethodAddedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodAdded);

            const unServerMethodRemoved = glue.interop.serverMethodAdded(({ server, method }) => {           
                if (method.name === supportControlMethodName) {
                    serverMethodRemovedPromise.resolve();
                }
            });

            gtf.addWindowHook(unServerMethodRemoved);
            
            // open window which has an iframe with Glue in it
            await glue.windows.open(`iframe-${Date.now()}`, "http://localhost:4242/iframe/index.html");

            await serverMethodAddedPromise.promise;

            const appChannel = await fdc3.getOrCreateChannel("iframe-app-channel");

            const addContextListenerOnAppChannelControlParams = {
                operation: "fdc3AddContextListenerOnAppChannel",
                params: { channelId: appChannel.id, contextType: "test" }
            };

            // send instructions to iframe to add a context listener on an app channel
            await glue.interop.invoke(supportControlMethodName, addContextListenerOnAppChannelControlParams, { instance });

            const closeWindowControlParams = {
                operation: "closeWindow",
                params: {}
            };

            // send instructions to iframe to close the window
            await glue.interop.invoke(supportControlMethodName, closeWindowControlParams, { instance });

            await serverMethodRemovedPromise.promise;
        });
    });
});