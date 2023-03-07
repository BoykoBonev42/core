describe("createPrivateChannel()", function () {
    const privateChannelPrefix = `___privateFDC3Channel___`;

    const expectedProps = ["id", "type", "broadcast", "addContextListener", "getCurrentContext", "onAddContextListener", "onUnsubscribe", "onDisconnect", "disconnect"];

    before(async () => {
        await coreReady;
    });

    afterEach(async () => {
        await gtf.fdc3.removeCreatedChannels();
    });

    it("Should return an object", async () => {
        const channel = await fdc3.createPrivateChannel();
        expect(channel).to.be.an("object");
    });

    it("Should return an object with id property of type string", async () => {
        const channel = await fdc3.createPrivateChannel();
        expect(channel.id).to.be.a("string");
    });

    it("Should return an object with correct type", async () => {
        const channel = await fdc3.createPrivateChannel();
        expect(channel.type).to.eql("private");
    });

    expectedProps.forEach(prop => {
        it(`Should return a valid object that has the following prop: ${prop}`, async () => {
            const channel = await fdc3.createPrivateChannel();
            const channelKeys = Object.keys(channel);

            expect(channelKeys.includes(prop)).to.eql(true);
        });
    });

    describe("integration with Glue42 Shared Contexts", function () {
        it("Should add one more element to the array returned from glue.contexts.all()", async () => {
            const initialContextsLength = glue.contexts.all().length;
    
            await fdc3.createPrivateChannel();
    
            const newContextsLength = glue.contexts.all().length;
    
            expect(initialContextsLength + 1).to.eql(newContextsLength);
        });
    
        it("Should create a Shared Context with private channel prefix", async () => {
            const privateChannel = await fdc3.createPrivateChannel();
    
            const contextWithPrefix = glue.contexts.all().find(contextName => contextName.startsWith(privateChannelPrefix));
    
            expect(contextWithPrefix).to.eql(privateChannel.id);
        });
    
        it("Should add creatorId prop to the shared context with the interop instance id", async() => {
            const privateChannel = await fdc3.createPrivateChannel();

            const glueContext = await glue.contexts.get(privateChannel.id);

            expect(glueContext.creatorId).to.eql(glue.interop.instance.instance);
        });
    });
});
