describe("onClosed ", () => {
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

    it("should not throw", async () => {
        unsub = glue.notifications.onClosed(() => {});
    });

    it("should return a function", async () => {
        unsub = glue.notifications.onClosed(() => {});

        expect(unsub).to.be.a("function");
    });

    it("should be called once with correct id when a notification is cleared", async () => {
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

    it("should be called once with correct id when a notification is cleared and the notification should not be present in list", async () => {
        const wrapper = gtf.wrapPromise();

        let notification;

        unsub = glue.notifications.onClosed(async ({ id }) => {
            try {
                const notifications = await glue.notifications.list();

                expect(id).to.eql(notification.id);
                expect(notifications.every((not) => not.id !== not.id));

                wrapper.resolve();
            } catch (error) {
                wrapper.reject(error);
            }
        });

        notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        await wrapper.promise;
    });

    it("should be called once with correct id when a notification is cleared with clearAll", async () => {
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

        await glue.notifications.clearAll();

        await wrapper.promise;
    });

    it("should be called twice when two notifications are cleared with clearAll", async () => {
        const wrapper = gtf.wrapPromise();
        const ready = gtf.waitFor(2, () => wrapper.resolve());

        unsub = glue.notifications.onClosed(({ id }) => {
            ready();
        });

        await glue.notifications.raise({ title: "asd" });
        await glue.notifications.raise({ title: "asd2" });

        await glue.notifications.clearAll();

        await wrapper.promise;
    });

    it("should be called twice when two notifications are cleared with clearAll and the notifications should not be present in list", async () => {
        const wrapper = gtf.wrapPromise();

        const ready = gtf.waitFor(2, async () => {
            const notifications = await glue.notifications.list();
            try {
                expect(notifications.length).to.eql(0);
                wrapper.resolve();
            } catch (error) {
                wrapper.reject();
            }
        });

        unsub = glue.notifications.onClosed(({ id }) => {
            ready();
        });

        await glue.notifications.raise({ title: "asd" });
        await glue.notifications.raise({ title: "asd2" });

        await glue.notifications.clearAll();

        await wrapper.promise;
    });

    it("should be called once with correct id when a notification is raised and clicked", async () => {
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

        await glue.notifications.click(notification.id);

        await wrapper.promise;
    });

    it("should not fire when unsubscribed before clearing a notification", async () => {
        const wrapper = gtf.wrapPromise();

        gtf.wait(3000, () => wrapper.resolve());

        unsub = glue.notifications.onClosed(() => {
            wrapper.reject("Should not have been raised");
        });

        const notification = await glue.notifications.raise({ title: "asd" });

        unsub();

        await glue.notifications.clear(notification.id);

        await wrapper.promise;
    });

    [
        undefined,
        true,
        42,
        "yes",
        { title: "asd" },
        [() => {}]
    ].forEach((input) => {
        
        it("should throw when invalid callback is provided", (done) => {
            try {
                unsub = glue.notifications.onClosed(input);
                done("Should have thrown");
            } catch (error) {
                done();
            }
        });
    });

});
