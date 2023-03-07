describe("Channels getCurrentContext()", function() {
    let systemChannels;

    let currentChannel;

    before(async() => {
        await coreReady;

        systemChannels = await fdc3.getSystemChannels();
    });

    afterEach(async() => {
        await gtf.channels.resetContexts();

        await fdc3.leaveCurrentChannel();
        
        currentChannel = undefined;
    });

    describe("invoked on a system channel", function() {
        beforeEach(async() => {
            currentChannel = systemChannels[0];

            await fdc3.joinUserChannel(currentChannel.id);
        });

        it("Should not throw when invoked with no arguments", async() => {
            await currentChannel.getCurrentContext();
        });

        it("Should return null when there's no broadcasted context", async() => {
            const result = await currentChannel.getCurrentContext();

            expect(result).to.eql(null);
        });

        it("Should return null when there's no broadcasted context of this type", async() => {
            const result = await currentChannel.getCurrentContext("fdc3.context.type");

            expect(result).to.eql(null);
        });

        [true, () => {}, 42, { test: 42 }, []].forEach(invalidArg => {
            it(`Should throw when the invoke with invalid (${JSON.stringify(invalidArg)}) argument`, (done) => {
                currentChannel.getCurrentContext(invalidArg)
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });
        });

        it("Should return the latest broadcasted context when invoked with no arguments", async() => {
            const fdc3Context = gtf.fdc3.getContext();

            await currentChannel.broadcast(fdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext();

            expect(contextFromGetCurrentContext).to.eql(fdc3Context);
        });

        it("Should return the latest broadcasted context when invoked with no arguments and new context has been published 3 times", async() => {
            const firstFdc3Context = gtf.fdc3.getContext();
            const secondFdc3Context = { ...firstFdc3Context, newProp: { test: 42 }};
            const thirdFdc3Context = { ...firstFdc3Context, anotherNewProp: { test: 43 }};

            await currentChannel.broadcast(firstFdc3Context);
            await currentChannel.broadcast(secondFdc3Context);
            await currentChannel.broadcast(thirdFdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext();

            expect(contextFromGetCurrentContext).to.eql(thirdFdc3Context);
        });

        it("Should return the latest broadcasted context of the passed type when invoked with context type", async() => {
            const fdc3Context = gtf.fdc3.getContext();

            await currentChannel.broadcast(fdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext(fdc3Context.type);

            expect(contextFromGetCurrentContext).to.eql(fdc3Context);
        });

        it("Should return the latest broadcasted context when invoked with context type and new context has been published 3 times", async() => {
            const firstFdc3Context = gtf.fdc3.getContext();
            const secondFdc3Context = { ...firstFdc3Context, newProp: { test: 42 }};
            const thirdFdc3Context = { ...firstFdc3Context, anotherNewProp: { test: 43 }};

            await currentChannel.broadcast(firstFdc3Context);
            await currentChannel.broadcast(secondFdc3Context);
            await currentChannel.broadcast(thirdFdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext(firstFdc3Context.type);

            expect(contextFromGetCurrentContext).to.eql(thirdFdc3Context);
        });

        it("Should return correct context when invoked with no arguments and then invoked with context type when two different contexts have been published", async() => {
            const firstContext = gtf.fdc3.getContext();
            const secondContext = gtf.fdc3.getContext();

            await currentChannel.broadcast(firstContext);
            await currentChannel.broadcast(secondContext);

            const latestBroadcastedContext = await currentChannel.getCurrentContext();

            expect(latestBroadcastedContext).to.eql(secondContext);

            const latestBroadcastedContextFromType = await currentChannel.getCurrentContext(firstContext.type);

            expect(latestBroadcastedContextFromType).to.eql(firstContext);
        });
    });

    describe("invoked on an app channel", function() {
        const appChannelName = "AppChannel";

        beforeEach(async() => {
            currentChannel = await fdc3.getOrCreateChannel(appChannelName);
        });

        afterEach(async() => {
            await gtf.fdc3.removeCreatedChannels();
        });

        it("Should not throw when invoked with no arguments", async() => {
            await currentChannel.getCurrentContext();
        });

        it("Should return null when there's no broadcasted context", async() => {
            const result = await currentChannel.getCurrentContext();

            expect(result).to.eql(null);
        });

        it("Should return null when there's no broadcasted context of this type", async() => {
            const result = await currentChannel.getCurrentContext("fdc3.context.type");

            expect(result).to.eql(null);
        });

        [true, () => {}, 42, { test: 42 }, []].forEach(invalidArg => {
            it(`Should throw when the invoke with invalid (${JSON.stringify(invalidArg)}) argument`, (done) => {
                currentChannel.getCurrentContext(invalidArg)
                    .then(() => done("Should have thrown"))
                    .catch(() => done());
            });
        });

        it("Should return the latest broadcasted context when invoked with no arguments", async() => {
            const fdc3Context = gtf.fdc3.getContext();

            await currentChannel.broadcast(fdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext();

            expect(contextFromGetCurrentContext).to.eql(fdc3Context);
        });

        it("Should return the latest broadcasted context when invoked with no arguments and new context has been published 3 times", async() => {
            const firstFdc3Context = gtf.fdc3.getContext();
            const secondFdc3Context = { ...firstFdc3Context, newProp: { test: 42 }};
            const thirdFdc3Context = { ...firstFdc3Context, anotherNewProp: { test: 43 }};

            await currentChannel.broadcast(firstFdc3Context);
            await currentChannel.broadcast(secondFdc3Context);
            await currentChannel.broadcast(thirdFdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext();

            expect(contextFromGetCurrentContext).to.eql(thirdFdc3Context);
        });

        it("Should return the latest broadcasted context of the passed type when invoked with context type", async() => {
            const fdc3Context = gtf.fdc3.getContext();

            await currentChannel.broadcast(fdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext(fdc3Context.type);

            expect(contextFromGetCurrentContext).to.eql(fdc3Context);
        });

        it("Should return the latest broadcasted context when invoked with context type and new context has been published 3 times", async() => {
            const firstFdc3Context = gtf.fdc3.getContext();
            const secondFdc3Context = { ...firstFdc3Context, newProp: { test: 42 }};
            const thirdFdc3Context = { ...firstFdc3Context, anotherNewProp: { test: 43 }};

            await currentChannel.broadcast(firstFdc3Context);
            await currentChannel.broadcast(secondFdc3Context);
            await currentChannel.broadcast(thirdFdc3Context);

            const contextFromGetCurrentContext = await currentChannel.getCurrentContext(firstFdc3Context.type);

            expect(contextFromGetCurrentContext).to.eql(thirdFdc3Context);
        });

        it("Should return correct context when invoked with no arguments and then invoked with context type when two different contexts have been published", async() => {
            const firstContext = gtf.fdc3.getContext();
            const secondContext = gtf.fdc3.getContext();

            await currentChannel.broadcast(firstContext);
            await currentChannel.broadcast(secondContext);

            const latestBroadcastedContext = await currentChannel.getCurrentContext();

            expect(latestBroadcastedContext).to.eql(secondContext);

            const latestBroadcastedContextFromType = await currentChannel.getCurrentContext(firstContext.type);

            expect(latestBroadcastedContextFromType).to.eql(firstContext);
        });
    });
});