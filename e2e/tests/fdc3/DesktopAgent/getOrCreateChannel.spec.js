describe("getOrCreateChannel()", function() {
    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        await fdc3.leaveCurrentChannel();
        
        await gtf.channels.resetContexts();

        await gtf.fdc3.removeCreatedChannels();
    });

    it("Should throw when invoked with no arguments", (done) => {
        fdc3.getOrCreateChannel()
            .then(() => done("Should have throws"))
            .catch(() => done());
    });

    it("Should throw when invoked with id of a system channel", async() => {
        const errorThrownPromise = gtf.wrapPromise();

        const [channel] = await fdc3.getUserChannels();
       
        try {
            await fdc3.getOrCreateChannel(channel.id);
            errorThrownPromise.reject("Should have thrown");
        } catch (error) {
            errorThrownPromise.resolve();
        }
        
        await errorThrownPromise.promise;
    });

    it("Should return a valid fdc3 app channel when invoked with already existing app channel id", async() => {
        const newChannelName = "TestChannel";

        const channel = await fdc3.getOrCreateChannel(newChannelName);

        expect(channel.id).to.eql(newChannelName);
        expect(channel.type).to.eql("app");
        expect(channel.displayMetadata).to.be.undefined;

    });

    it("Should return throw when invoked with already existing private channel id", (done) => {
        fdc3.createPrivateChannel()
            .then(channel => fdc3.getOrCreateChannel(channel.id))
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should return a valid fdc3 app channel object with addContextListener, broadcast an getCurrentContext methods", async() => {
        const newChannelName = "TestChannel";

        const channel = await fdc3.getOrCreateChannel(newChannelName);
        
        expect(channel.addContextListener).to.be.a("function");
        expect(channel.broadcast).to.be.a("function");
        expect(channel.getCurrentContext).to.be.a("function");
    });

    describe("integration with glue contexts", function() {
        it("Should create a new empty Shared Context with such name when there's no private channel with such name", async() => {
            const newChannelName = "TestChannel";

            await fdc3.getOrCreateChannel(newChannelName);

            const glueContextExists = glue.contexts.all().includes(newChannelName);
            const glueContext = await glue.contexts.get(newChannelName);

            expect(glueContextExists).to.eql(true);
            expect(glueContext).to.eql({});
        });

        it("Should add a new glue context with the passed name when there isn't a glue channel with such name but no private channel with such name", async() => {
            const initialGlueContexts = glue.contexts.all();

            const newChannelName = "TestChannel";

            await fdc3.getOrCreateChannel(newChannelName);
    
            const newGlueContexts = glue.contexts.all();

            expect(initialGlueContexts.length + 1).to.eql(newGlueContexts.length);
        });

        it("Should not add a new glue context when there's an already created app channel with such name", async() => {
            const newChannelName = "TestChannel";
            
            await fdc3.getOrCreateChannel(newChannelName);
            
            const initialGlueContexts = glue.contexts.all();

            await fdc3.getOrCreateChannel(newChannelName);

            const glueContexts = glue.contexts.all();

            expect(initialGlueContexts.length).to.eql(glueContexts.length);
        });

        it("Should not add a new glue context when there is a private channel with such name", async() => {
            const errorThrown = gtf.wrapPromise();

            const channel = await fdc3.createPrivateChannel();

            const initialGlueContexts = glue.contexts.all();

            try {
                await fdc3.getOrCreateChannel(channel.id);
                errorThrown.reject("Should have thrown");
            } catch (error) {
                errorThrown.resolve();
            }
    
            await errorThrown.promise;

            const newGlueContexts = glue.contexts.all();

            expect(initialGlueContexts.length).to.eql(newGlueContexts.length);
        });
    });
});
