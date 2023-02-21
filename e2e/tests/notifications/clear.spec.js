describe("clear ", () => {
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
        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);
    });

    it("should remove the notification with the provided id - list check", async () => {
        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should fire onClosed with the correct id", async () => {
        const wrapper = gtf.wrapPromise();

        let notification;

        unsub = glue.notifications.onClosed(({ id }) => {
            try {
                expect(id).to.eql(notification.id);
                wrapper.resolve();
            } catch (error) {
                wrapper.reject(error);
            }
        });

        notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        await wrapper.promise;
    });

    it("should resolve even if there is no such id", async () => {
        await glue.notifications.clear("definitely-not-there");
    });

    [
        undefined,
        42,
        true,
        { id: "yes" },
        ["yes"]
    ].forEach((id) => {
        it("should throw when called with invalid id", (done) => {
    
            glue.notifications.clear(id)
                .then(() => done(`Should not have resolved: ${JSON.stringify(id)}`))
                .catch(() => done());

        });
    });

});
