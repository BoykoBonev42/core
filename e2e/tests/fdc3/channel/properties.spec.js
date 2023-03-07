describe("Channel's properties", function() {
    let currentChannel;

    let userChannels;

    before(async() => {
        await coreReady;

        userChannels = await fdc3.getUserChannels();
    });

    afterEach(() => {
        currentChannel = undefined;
    })

    describe("invoked on a system channel", function() {
        beforeEach(async() => {
            currentChannel = userChannels[0];

            await fdc3.joinUserChannel(currentChannel.id);
        });

        describe("id", () => {
            it("Should return a string", () => {
                expect(currentChannel.id).to.be.a("string");
            });
    
            it("Should return the correct id", async() => {
                const currentChannelId = (await fdc3.getCurrentChannel()).id;
    
                expect(currentChannelId).to.eql(currentChannel.id);
            });
    
            it("Should return the correct id (Glue Channel name)", async() => {
                const glueChannelWithSameFdc3Name = (await glue.channels.list()).find(glueChannel => glueChannel.meta.fdc3.id === currentChannel.id);
    
                expect(glueChannelWithSameFdc3Name).to.not.be.undefined;
            });
        });
    
        describe("type", () => {
            it("Should return a string", () => {
                expect(currentChannel.type).to.be.a("string");
            });
    
            it("Should return the correct string", () => {
                expect(currentChannel.type).to.eql("user");
            });
        });
    
        describe("displayMetadata", () => {
            it("Should return an object", () => {
                expect(currentChannel.displayMetadata).to.be.an("object");
            });
    
            it("Should return an object with correct name and color properties", async() => {
                const glueChannelName = glue.channels.my();
                const glueChannel = await glue.channels.get(glueChannelName);
    
                expect(currentChannel.displayMetadata.name).to.eql(glueChannel.name);
                expect(currentChannel.displayMetadata.color).to.eql(glueChannel.meta.color);
            });
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

        describe("id", () => {
            it("Should return a string", () => {
                expect(currentChannel.id).to.be.a("string");
            });
    
            it("Should return the correct id", async() => {    
                expect(currentChannel.id).to.eql(appChannelName);
            });
        });
    
        describe("type", () => {
            it("Should return a string", () => {
                expect(currentChannel.type).to.be.a("string");
            });
    
            it("Should return the correct string", () => {
                expect(currentChannel.type).to.eql("app");
            });
        });
    
        describe("displayMetadata", () => {
            it("Should be undefined", () => {
                expect(currentChannel.displayMetadata).to.eql(undefined);
            });
        });
    });

    describe("invoked on a private channel", function() {
        beforeEach(async() => {
            currentChannel = await fdc3.createPrivateChannel();
        });

        afterEach(async() => {
            await gtf.fdc3.removeCreatedChannels();
        });

        describe("id", () => {
            it("Should return a string", () => {
                expect(currentChannel.id).to.be.a("string");
            });
        });
    
        describe("type", () => {
            it("Should return a string", () => {
                expect(currentChannel.type).to.be.a("string");
            });
    
            it("Should return the correct string", () => {
                expect(currentChannel.type).to.eql("private");
            });
        });
    });
});