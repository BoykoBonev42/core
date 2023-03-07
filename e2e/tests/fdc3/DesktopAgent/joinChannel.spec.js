describe("joinChannel() ", function () {
    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        await fdc3.leaveCurrentChannel();
        
        await gtf.channels.resetContexts();

        await gtf.fdc3.removeCreatedChannels();
    });

    [undefined, null, false, true, () => {}, [], "", 42].forEach(invalidArg => {
        it(`Should throw when invoked with invalid argument (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.joinChannel(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());         
        });
    });

    it("Should throw when invoked with no arguments", (done) => {
        fdc3.joinChannel()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should throw when there's no channel with passed name", (done) => {
        fdc3.joinChannel("noSuchChannel")
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    it("Should join the passed system channel", async() => {
        const [ channel ] = await fdc3.getSystemChannels();
        const channelName = channel.id;

        await fdc3.joinChannel(channelName);

        const current = await fdc3.getCurrentChannel();

        expect(current).to.eql(channel);
    });

    it("Should not join a channel when there's no channel with passed name", (done) => {
        fdc3.joinChannel("noSuchChannel")
            .then(() => done("Should have thrown"))
            .catch(() => fdc3.getCurrentChannel())
            .then(current => {
                expect(current).to.eql(null);
                done();
            })
            .catch(done);
    });

    it("Should throw when passing an app channel", async() => {
        const errorThrownPromise = gtf.wrapPromise();

        const appChannelId = `app.channel.${Date.now()}`;
        await fdc3.getOrCreateChannel(appChannelId);

        try {
            await fdc3.joinChannel(appChannelId);
            errorThrownPromise.reject("Should have thrown");
        } catch (error) {
            errorThrownPromise.resolve();
        }

        await errorThrownPromise.promise;
    });


    describe("integration with glue channels", function() {
        it("Should join the passed glue channel", async() => {
            const [channel] = await fdc3.getSystemChannels();
            const fdc3ChannelName = channel.id;

            const glueChannels = await glue.channels.list();
            const glueChannelWithFdc3Id = glueChannels.find(channel => channel.meta.fdc3 && channel.meta.fdc3.id === fdc3ChannelName);

            await fdc3.joinChannel(fdc3ChannelName);
    
            const current = glue.channels.my();
    
            expect(current).to.eql(glueChannelWithFdc3Id.name);
        });

        it("Should not join a glue channel when there's no channel with passed name", (done) => {
            fdc3.joinChannel("noSuchChannel")
                .then(() => done("Should have thrown"))
                .catch(() => glue.channels.current())
                .then(current => {
                    expect(current).to.be.undefined;
                    done();
                })
                .catch(done);
        });
    });
});