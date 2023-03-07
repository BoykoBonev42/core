describe('getCurrentChannel()', function () {
    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        await fdc3.leaveCurrentChannel();

        await gtf.fdc3.removeCreatedChannels();

        await gtf.channels.resetContexts();
    });

    it("Should return null when not joined on a channel", async() => {
        const channel = await fdc3.getCurrentChannel();

        expect(channel).to.eql(null);
    });

    it("Should return the correct channel id when joined on a system channel", async() => {
        const [channel] = await fdc3.getUserChannels();
    
        await fdc3.joinUserChannel(channel.id);

        const currentChannel = await fdc3.getCurrentChannel();

        expect(currentChannel.id).to.eql(channel.id);
    });

    it("Should return the correct user channel object props", async() => {
        const [channel] = await fdc3.getUserChannels();
    
        await fdc3.joinUserChannel(channel.id);

        const fdc3Channel = await fdc3.getCurrentChannel();

        const glueChannel = (await glue.channels.list()).find((ch => ch.meta.fdc3.id === channel.id));

        expect(fdc3Channel).to.be.an("object");
        expect(fdc3Channel.type).to.eql('user');
        expect(fdc3Channel.displayMetadata.name).to.eql(glueChannel.name);
        expect(fdc3Channel.displayMetadata.color).to.eql(glueChannel.meta.color);
    });

    it("Should return the correct channel with expected methods when joined on a system channel", async() => {
        const [channel] = await fdc3.getUserChannels();
    
        await fdc3.joinUserChannel(channel.id);

        const currentChannel = await fdc3.getCurrentChannel();
        const channelKeys = Object.keys(currentChannel);

        expect(channelKeys.includes("broadcast")).to.eql(true);
        expect(channelKeys.includes("getCurrentContext")).to.eql(true);
        expect(channelKeys.includes("addContextListener")).to.eql(true);
    });
});