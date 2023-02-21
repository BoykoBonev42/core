describe("onRaised ", () => {
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
        unsub = glue.notifications.onRaised(() => {});
    });

    it("should return a function", async () => {
        unsub = glue.notifications.onRaised(() => {});

        expect(unsub).to.be.a("function");
    });

    it("should fire when a notification was raised", async () => {

        const wrapper = gtf.wrapPromise();

        unsub = glue.notifications.onRaised(() => {
            wrapper.resolve();
        });

        await glue.notifications.raise({ title: "asd" });

        await wrapper.promise;
    });

    it("should fire with correct notification was notification was raised", async () => {
        const wrapper = gtf.wrapPromise();

        unsub = glue.notifications.onRaised((notification) => {
            try {
                expect(notification.title).to.eql("asd");
                wrapper.resolve();
            } catch (error) {
                wrapper.reject(error);
            }
        });

        await glue.notifications.raise({ title: "asd" });

        await wrapper.promise;
    });

    it("should fire twice when two notifications were raised", async () => {
        const wrapper = gtf.wrapPromise();

        const ready = gtf.waitFor(2, () => wrapper.resolve());

        unsub = glue.notifications.onRaised(() => {
            ready();
        });

        await glue.notifications.raise({ title: "asd" });
        await glue.notifications.raise({ title: "asd2" });

        await wrapper.promise;
    });

    it("should fire with identical notification to the one found in list", async () => {
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

    it("should not fire when unsubscribed before raising a notification", async () => {
        const wrapper = gtf.wrapPromise();

        gtf.wait(3000, () => wrapper.resolve());

        unsub = glue.notifications.onRaised(() => {
            wrapper.reject("Should not have been raised");
        });

        unsub();

        await glue.notifications.raise({ title: "asd" });

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
                unsub = glue.notifications.onRaised(input);
                done("Should have thrown");
            } catch (error) {
                done();
            }
        });
    });

});
