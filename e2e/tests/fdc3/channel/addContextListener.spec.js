describe("Channel's addContextListener()", function() {
    let systemChannels;

    let currentChannel;

    const supportAppName = 'coreSupport';
    let supportApp;

    before(async() => {
        await coreReady;

        systemChannels = await fdc3.getSystemChannels();
    });

    afterEach(async() => {
        gtf.fdc3.removeActiveListeners();

        await gtf.channels.resetContexts();

        await fdc3.leaveCurrentChannel();

        currentChannel = undefined;

        await supportApp.stop();
    });

    describe("invoked on a system channel", function() {
        beforeEach(async() => {
            currentChannel = systemChannels[0];

            await fdc3.joinUserChannel(currentChannel.id);

            supportApp = await gtf.createApp({ name: supportAppName, exposeFdc3: true });

            await supportApp.fdc3.joinUserChannel(currentChannel.id);
        });

        it("Should throw when no argument is passed", (done) => {
            currentChannel.addContextListener()
                .then((listener) => {
                    gtf.fdc3.addActiveListener(listener);
                    done("Should have thrown");
                })
                .catch(() => done());
        });
    
        describe("using deprecated addContextListener(handler)", function() {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) argument is passed`, (done) => {
                    currentChannel.addContextListener(invalidArg)
                        .then((listener) => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = gtf.fdc3.getContext();
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcast(fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener((ctx) => {
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
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const contextType = "fdc3.context.type";
                const fdc3ContextFirstChannel = { ...gtf.fdc3.getContext(), type: contextType };
                const fdc3ContextSecondChannel = { ...gtf.fdc3.getContext(), type: contextType };
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === contextType) {
                        if (ctx.name === fdc3ContextFirstChannel.name) {
                            currentChannelContextHeard.resolve();
                        }
    
                        if (ctx.name === fdc3ContextSecondChannel.name) {
                            anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                        }
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the current channel with the subscription
                await supportApp.fdc3.broadcast(fdc3ContextFirstChannel);
    
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing", async() => {
                const contextHeard = gtf.wrapPromise();
                const contextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = { ...firstContextToBroadcast, name: "newName" };
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        contextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        contextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContextToBroadcast);
    
                await contextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcast(secondContextToBroadcast);
    
                gtf.wait(3000, contextNotHeard.resolve);
    
                await contextNotHeard.promise;
            });
    
            it("Should invoke the callback for different context types broadcasted on the channel", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();
    
                const firstContext = { type: "fdc3.first.context.type", data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextHeard.resolve();
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcast(secondContext);
    
                await secondContextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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

            it("Should invoke the callback immediately after adding a context listener when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await broadcastedContextHeard.promise;
            });
        });
    
        describe("using addContextListener(null, handler)", function() {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) second argument is passed`, (done) => {
                    currentChannel.addContextListener(null, invalidArg)
                        .then((listener) => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = gtf.fdc3.getContext();
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcast(fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener(null, (ctx) => {
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
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const contextType = "fdc3.context.type";
                const fdc3ContextFirstChannel = { ...gtf.fdc3.getContext(), type: contextType };
                const fdc3ContextSecondChannel = { ...gtf.fdc3.getContext(), type: contextType };
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === contextType) {
                        if (ctx.name === fdc3ContextFirstChannel.name) {
                            currentChannelContextHeard.resolve();
                        }
    
                        if (ctx.name === fdc3ContextSecondChannel.name) {
                            anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                        }
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the current channel with the subscription
                await supportApp.fdc3.broadcast(fdc3ContextFirstChannel);
    
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing from the listener", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
                const broadcastedContextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = { ...firstContextToBroadcast, name: "newName" };
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        broadcastedContextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        broadcastedContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContextToBroadcast);
    
                await broadcastedContextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcast(secondContextToBroadcast);
    
                gtf.wait(3000, broadcastedContextNotHeard.resolve);
    
                await broadcastedContextNotHeard.promise;
            });
    
            it("Should invoke the callback for different context types broadcasted on the channel", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();
    
                const firstContext = { type: "fdc3.first.context.type", data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextHeard.resolve();
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcast(secondContext);
    
                await secondContextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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

            it("Should invoke the callback immediately after adding a context listener when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await broadcastedContextHeard.promise;
            });
        });
    
        describe("using addContextListener(contextType, handler)", function() {
            const CONTEXT_TYPE = "fdc3.context.type";
    
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) second argument is passed`, (done) => {
                    currentChannel.addContextListener(CONTEXT_TYPE, invalidArg)
                        .then((listener) => {
                            gtf.fdc3.addActiveListener(listener);
                            done("Should have thrown");
                        })
                        .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3Context.name) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };
        
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3Context.name) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcast(fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };

                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {

                    if (ctx.name === fdc3Context.name) {
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
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const fdc3ContextFirstChannel = { type: CONTEXT_TYPE, name: "fdc3.context.name.1", ...gtf.contexts.generateComplexObject(10) };
                const fdc3ContextSecondChannel = { type: CONTEXT_TYPE, name: "fdc3.context.name.2", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3ContextFirstChannel.name) {
                        currentChannelContextHeard.resolve();
                    }
    
                    if (ctx.name === fdc3ContextSecondChannel.name) {
                        anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the current channel with the subscription
                await supportApp.fdc3.broadcast(fdc3ContextFirstChannel);
    
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing from the listener", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
                const broadcastedContextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = { type: CONTEXT_TYPE, name: "fdc3.context.name.1", ...gtf.contexts.generateComplexObject(10) };
                const secondContextToBroadcast = { type: CONTEXT_TYPE, name: "fdc3.context.name.2", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        broadcastedContextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        broadcastedContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContextToBroadcast);
    
                await broadcastedContextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcast(secondContextToBroadcast);
    
                gtf.wait(3000, broadcastedContextNotHeard.resolve);
    
                await broadcastedContextNotHeard.promise;
            });
    
            it("Should invoke the callback only for the specific context type", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextNotHeard = gtf.wrapPromise();
    
                const firstContext = { type: CONTEXT_TYPE, data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcast(firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcast(secondContext);
    
                gtf.wait(3000, secondContextNotHeard.resolve);
    
                await secondContextNotHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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

            it("Should invoke the callback immediately after adding a context listener when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name.1", ...gtf.contexts.generateComplexObject(10) };
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await broadcastedContextHeard.promise;
            });
        });
    });

    describe("invoked on an app channel", function() {
        const appChannelName = "AppChannel";

        beforeEach(async() => {
            currentChannel = await fdc3.getOrCreateChannel(appChannelName);

            supportApp = await gtf.createApp({ exposeFdc3: true });
        });

        afterEach(async() => {
            await gtf.fdc3.removeCreatedChannels();
        });

        it("Should throw when no argument is passed", (done) => {
            currentChannel.addContextListener()
                .then((listener) => {
                    gtf.fdc3.addActiveListener(listener);
                    done("Should have thrown");
                })
                .catch(() => done());
        });
    
        describe("using deprecated addContextListener(handler)", function() {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) argument is passed`, (done) => {
                    currentChannel.addContextListener(invalidArg)
                    .then((listener) => {
                        gtf.fdc3.addActiveListener(listener);
                        done("Should have thrown");
                    })
                    .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = gtf.fdc3.getContext();
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(() => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener((ctx) => {
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
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const contextType = "fdc3.context.type";
                const fdc3ContextFirstChannel = { ...gtf.fdc3.getContext(), type: contextType };
                const fdc3ContextSecondChannel = { ...gtf.fdc3.getContext(), type: contextType };
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === contextType) {
                        if (ctx.name === fdc3ContextFirstChannel.name) {
                            currentChannelContextHeard.resolve();
                        }
    
                        if (ctx.name === fdc3ContextSecondChannel.name) {
                            anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                        }
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the app channel
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3ContextFirstChannel);
    
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing from the listener", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
                const broadcastedContextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = { ...firstContextToBroadcast, name: "newName" };
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        broadcastedContextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        broadcastedContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContextToBroadcast);
    
                await broadcastedContextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContextToBroadcast);
    
                gtf.wait(3000, broadcastedContextNotHeard.resolve);
    
                await broadcastedContextNotHeard.promise;
            });
    
            it("Should invoke the callback for different context types broadcasted on the channel", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();
    
                const firstContext = { type: "fdc3.first.context.type", data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextHeard.resolve();
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContext);
    
                await secondContextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener((ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should not invoke the callback when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextNotHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener((ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextNotHeard.reject("Should not have been invoked");
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);

                gtf.wait(3000, broadcastedContextNotHeard.resolve);
        
                await broadcastedContextNotHeard.promise;
            });
        });
    
        describe("using addContextListener(null, handler)", function() {
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) second argument is passed`, (done) => {
                    currentChannel.addContextListener(null, invalidArg)
                    .then((listener) => {
                        gtf.fdc3.addActiveListener(listener);
                        done("Should have thrown");
                    })
                    .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = gtf.fdc3.getContext();
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(null, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                const listener = await currentChannel.addContextListener(null, (ctx) => {
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
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await broadcastedContextHeard.promise;
            });
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const contextType = "fdc3.context.type";
                const fdc3ContextFirstChannel = { ...gtf.fdc3.getContext(), type: contextType };
                const fdc3ContextSecondChannel = { ...gtf.fdc3.getContext(), type: contextType };
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === contextType) {
                        if (ctx.name === fdc3ContextFirstChannel.name) {
                            currentChannelContextHeard.resolve();
                        }
    
                        if (ctx.name === fdc3ContextSecondChannel.name) {
                            anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                        }
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the current channel with the subscription
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3ContextFirstChannel);
                 
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing from the listener", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
                const broadcastedContextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = gtf.fdc3.getContext();
                const secondContextToBroadcast = { ...firstContextToBroadcast, name: "newName" };
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        broadcastedContextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        broadcastedContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContextToBroadcast);

                await broadcastedContextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContextToBroadcast);
    
                gtf.wait(3000, broadcastedContextNotHeard.resolve);
    
                await broadcastedContextNotHeard.promise;
            });
    
            it("Should invoke the callback for different context types broadcasted on the channel", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextHeard = gtf.wrapPromise();
    
                const firstContext = { type: "fdc3.first.context.type", data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextHeard.resolve();
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContext);
    
                await secondContextHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(null, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should not invoke the callback when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextNotHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener(null, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextNotHeard.reject("Should not have been invoked");
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);

                gtf.wait(3000, broadcastedContextNotHeard.resolve);
        
                await broadcastedContextNotHeard.promise;
            });
        });
    
        describe("using addContextListener(contextType, handler)", function() {
            const CONTEXT_TYPE = "fdc3.context.type";
    
            [undefined, null, true, false, "", 42, { test: 42 }, [], [ { test: 42 }]].forEach(invalidArg => {
                it(`Should throw when an invalid (${JSON.stringify(invalidArg)}) second argument is passed`, (done) => {
                    currentChannel.addContextListener(CONTEXT_TYPE, invalidArg)
                    .then((listener) => {
                        gtf.fdc3.addActiveListener(listener);
                        done("Should have thrown");
                    })
                    .catch(() => done());
                });
            });
    
            it("Should not throw when invoked with a function as a first arg", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
            });
            
            it("Should ignore context updates from current instance", async() => {
                const wrapper = gtf.wrapPromise();
    
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3Context.name) {
                        wrapper.reject("Should not have been invoked");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await currentChannel.broadcast(fdc3Context);
    
                gtf.wait(3000, wrapper.resolve);
    
                await wrapper.promise;
            });
    
            it("Should return an object", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener).to.be.an("object");
            });
    
            it("Should return a valid listener (object with unsubscribe function)", async() => {
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, () => {});
    
                gtf.fdc3.addActiveListener(listener);
    
                expect(listener.unsubscribe).to.be.a("function");
            });
    
            it("Should invoke the callback when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };
        
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3Context.name) {
                        broadcastedContextHeard.resolve();
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
        
            it("Should invoke the callback with the correct context when support app broadcast a context", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
        
                const fdc3Context = { type: CONTEXT_TYPE, name: "fdc3.context.name", ...gtf.contexts.generateComplexObject(10) };
        
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3Context.name) {
                        try {
                            expect(ctx).to.eql(fdc3Context);
                            broadcastedContextHeard.resolve();
                        } catch (error) {
                            broadcastedContextHeard.reject(error);
                        }
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);
        
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);
        
                await broadcastedContextHeard.promise;
            });
    
            it("Should invoke the callback in the current channel but not on another system channel", async() => {
                const currentChannelContextHeard = gtf.wrapPromise();
                const anotherChannelContextHeard = gtf.wrapPromise();
    
                const fdc3ContextFirstChannel = { type: CONTEXT_TYPE, name: "fdc3.context.name.1", ...gtf.contexts.generateComplexObject(10) };
                const fdc3ContextSecondChannel = { type: CONTEXT_TYPE, name: "fdc3.context.name.2", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === fdc3ContextFirstChannel.name) {
                        currentChannelContextHeard.resolve();
                    }
    
                    if (ctx.name === fdc3ContextSecondChannel.name) {
                        anotherChannelContextHeard.reject("Should not have invoked the callback in this channel");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                // support app broadcasts a context on the current channel with the subscription
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3ContextFirstChannel);
    
                await currentChannelContextHeard.promise;
    
                const anotherSysChannelToJoin = systemChannels[1];
                // support app joins another system channel
                await supportApp.fdc3.joinUserChannel(anotherSysChannelToJoin.id);
    
                // support app broadcasts context to the other system channel
                await supportApp.fdc3.broadcast(fdc3ContextSecondChannel);
    
                gtf.wait(3000, anotherChannelContextHeard.resolve);
    
                await anotherChannelContextHeard.promise;
            });
    
            it("Should stop invoking the callback after unsubscribing from the listener", async() => {
                const broadcastedContextHeard = gtf.wrapPromise();
                const broadcastedContextNotHeard = gtf.wrapPromise();
    
                const firstContextToBroadcast = { type: CONTEXT_TYPE, name: "fdc3.context.name.1", ...gtf.contexts.generateComplexObject(10) };
                const secondContextToBroadcast = { type: CONTEXT_TYPE, name: "fdc3.context.name.2", ...gtf.contexts.generateComplexObject(10) };
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.name === firstContextToBroadcast.name) {
                        broadcastedContextHeard.resolve();
                    }
    
                    if (ctx.name === secondContextToBroadcast.name) {
                        broadcastedContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContextToBroadcast);
    
                await broadcastedContextHeard.promise;
    
                listener.unsubscribe();
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContextToBroadcast);
    
                gtf.wait(3000, broadcastedContextNotHeard.resolve);
    
                await broadcastedContextNotHeard.promise;
            });
    
            it("Should invoke the callback only for the specific context type", async() => {
                const firstContextHeard = gtf.wrapPromise();
                const secondContextNotHeard = gtf.wrapPromise();
    
                const firstContext = { type: CONTEXT_TYPE, data: { test: 42 }};
                const secondContext = { type: "fdc3.second.context.type", data: { test: 43 }};
    
                const listener = await currentChannel.addContextListener(CONTEXT_TYPE, (ctx) => {
                    if (ctx.type === firstContext.type) {
                        firstContextHeard.resolve();
                    }
    
                    if (ctx.type === secondContext.type) {
                        secondContextNotHeard.reject("Should not have invoked the callback");
                    }
                });
    
                gtf.fdc3.addActiveListener(listener);
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, firstContext);
    
                await firstContextHeard.promise;
    
                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, secondContext);
    
                gtf.wait(3000, secondContextNotHeard.resolve);
    
                await secondContextNotHeard.promise;
            });

            it("Should invoke the callback with metadata as a second argument", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });
            
            it("Should invoke the callback with the correct metadata type (object)", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should invoke the callback with the correct metadata", async() => {
                const metadataHeard = gtf.wrapPromise();

                const fdc3Context = gtf.fdc3.getContext();

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx, metadata) => {
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

                await supportApp.fdc3.broadcastOnAppChannel(appChannelName, fdc3Context);

                await metadataHeard.promise;
            });

            it("Should not invoke the callback when there's an already broadcasted FDC3 compliant data on the channel", async() => {
                const broadcastedContextNotHeard = gtf.wrapPromise();
        
                const fdc3Context = gtf.fdc3.getContext();
        
                await supportApp.fdc3.broadcast(fdc3Context);

                const listener = await currentChannel.addContextListener(fdc3Context.type, (ctx) => {
                    if (ctx.type === fdc3Context.type) {
                        broadcastedContextNotHeard.reject("Should not have been invoked");
                    }
                });
        
                gtf.fdc3.addActiveListener(listener);

                gtf.wait(3000, broadcastedContextNotHeard.resolve);
        
                await broadcastedContextNotHeard.promise;
            });
        });
    });

    describe("invoked on a private channel", function() {
        
    });
});
