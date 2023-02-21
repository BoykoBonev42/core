describe("list ", () => {
    let unsub;

    before(() => coreReady);

    beforeEach(() => window.notificationsFakePermission = "granted");

    afterEach(async () => {
        if (unsub) {
            unsub();
            unsub = undefined;
        }

        await glue.notifications.clearAll();

        window.sinonSandbox.reset();

        window.notificationsFakeTriggerClick = false;

    });

    it("should resolve", async () => {
        await glue.notifications.list();
    });

    it("should resolve with an array", async () => {
        const notifications = await glue.notifications.list();

        expect(Array.isArray(notifications)).to.be.true;
    });

    it("should resolve with empty array when no notifications were raised", async () => {
        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should resolve with one valid notification when one notification was raised", async () => {
        await glue.notifications.raise({ title: "asd" });

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(1);
        expect(notifications[0].title).to.eql("asd");
    });

    it("should resolve with two valid notifications when two notifications were raised", async () => {
        await glue.notifications.raise({ title: "asd" });
        await glue.notifications.raise({ title: "asd2" });

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(2);
        expect(notifications[0].title).to.eql("asd");
        expect(notifications[1].title).to.eql("asd2");
    });

    it("should resolve with an empty array when a notification was raised, but then it was cleared", async () => {
        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should resolve with an empty array when a notification was raised, but then it was cleared with clearAll", async () => {
        await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clearAll();

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should resolve with an array with one notification when onRaised was fired", async () => {

        const wrapper = gtf.wrapPromise();

        unsub = glue.notifications.onRaised(async (notification) => {
            try {
                const notifications = await glue.notifications.list();

                expect(notifications.length).to.eql(1);
                expect(notifications[0]).to.eql(notification);
                
                wrapper.resolve();
            } catch (error) {
                wrapper.reject(error);
            }
        });

        await glue.notifications.raise({ title: "asd" });

        await wrapper.promise;
    });

});
