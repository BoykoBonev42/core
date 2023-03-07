describe("leaveCurrentChannel() ", function() {
    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        await gtf.channels.resetContexts();

        await fdc3.leaveCurrentChannel();

        await gtf.fdc3.removeCreatedChannels();
    })

    it("Should not return anything", async() => {
        const [channel] = await fdc3.getUserChannels();
        
        await fdc3.joinUserChannel(channel.id);

        const returned = await fdc3.leaveCurrentChannel();

        expect(returned).to.be.undefined;
    });

    it("Should not throw when invoked with arguments", async() => {
        const [channel] = await fdc3.getUserChannels();
        
        await fdc3.joinUserChannel(channel.id);

        await fdc3.leaveCurrentChannel({ test: 42 });
    });

    it("Should leave the current channel when it's a system channel", async() => {
        const [channel] = await fdc3.getUserChannels();
        
        await fdc3.joinUserChannel(channel.id);

        await fdc3.leaveCurrentChannel();

        const currentChannel = await fdc3.getCurrentChannel();

        expect(currentChannel).to.eql(null);
    });

    describe("integration with glue channels", function() {
        it("should leave glue channel", async() => {
            const [channel] = await fdc3.getUserChannels();
        
            await fdc3.joinUserChannel(channel.id);
    
            await fdc3.leaveCurrentChannel();
    
            const currentGlueChannel = glue.channels.my();

            expect(currentGlueChannel).to.be.undefined;
        });
    });
});