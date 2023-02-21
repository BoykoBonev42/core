describe("clearAll ", () => {
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
        await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clearAll();
    });

    it("should remove all notifications when one notification was present - list check", async () => {
        await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clearAll();

        const allNotifications = await glue.notifications.list();

        expect(allNotifications.length).to.eql(0);
    });

    it("should remove all notifications when two notifications was present - list check", async () => {
        await glue.notifications.raise({ title: "asd" });

        await glue.notifications.raise({ title: "asd2" });

        const allNotificationsStart = await glue.notifications.list();

        expect(allNotificationsStart.length).to.eql(2);

        await glue.notifications.clearAll();

        const allNotificationsFinal = await glue.notifications.list();

        expect(allNotificationsFinal.length).to.eql(0);
    });

    it("should fire onClosed for every notification cleared - two notifications", async () => {
        const wrapper = gtf.wrapPromise();

        const ready = gtf.waitFor(2, () => wrapper.resolve());

        unsub = glue.notifications.onClosed(() => {
            ready();
        });

        await glue.notifications.raise({ title: "asd" });
        await glue.notifications.raise({ title: "asd2" });

        await glue.notifications.clearAll();

        await wrapper.promise;
    });

    it("should resolve even if no notifications were present", async () => {
        await glue.notifications.clearAll();
    });

});

