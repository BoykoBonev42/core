describe("click ", () => {
    let unsub;
    const testMethodName = "testMethod";

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

        if (glue.interop.methods().some((method) => method.name === testMethodName)) {
            await glue.interop.unregister(testMethodName);
        }
    });

    it("should resolve", async () => {
        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.click(notification.id);
    });

    it("should call the onclick handler of a simple notification", async () => {
        const wrapper = gtf.wrapPromise();

        const notification = await glue.notifications.raise({ title: "asd" });

        notification.onclick = () => wrapper.resolve();

        await glue.notifications.click(notification.id);

        await wrapper.promise;
    });

    it("should call the click interop method of a simple notification", async () => {
        const wrapper = gtf.wrapPromise();

        await glue.interop.register(testMethodName, () => wrapper.resolve());

        const notification = await glue.notifications.raise({ title: "asd", clickInterop: { method: testMethodName } });

        await glue.notifications.click(notification.id);

        await wrapper.promise;
    });

    it("should call the onclick handler of an actions notification", async () => {
        const wrapper = gtf.wrapPromise();

        const notification = await glue.notifications.raise({ title: "asd", actions: [{ action: "one", title: "One" }] });

        notification.onclick = () => wrapper.resolve();

        await glue.notifications.click(notification.id);

        await wrapper.promise;
    });

    it("should call the click interop method of an actions notification", async () => {
        const wrapper = gtf.wrapPromise();

        await glue.interop.register(testMethodName, () => wrapper.resolve());

        const notification = await glue.notifications.raise({ title: "asd", clickInterop: { method: testMethodName }, actions: [{ action: "one", title: "One" }] });

        await glue.notifications.click(notification.id);

        await wrapper.promise;
    });

    it("should call the action interop of an actions notification", async () => {
        const wrapper = gtf.wrapPromise();

        await glue.interop.register(testMethodName, () => wrapper.resolve());

        const notification = await glue.notifications.raise({ title: "asd", actions: [{ action: "one", title: "One", interop: { method: testMethodName } }] });

        await glue.notifications.click(notification.id, "one");

        await wrapper.promise;
    });

    it("should remove a simple notification after click - list check", async () => {
        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.click(notification.id);

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should remove an actions notification after click - list check", async () => {
        const notification = await glue.notifications.raise({ title: "asd", actions: [{ action: "one", title: "One" }] });

        await glue.notifications.click(notification.id);

        const notifications = await glue.notifications.list();

        expect(notifications.length).to.eql(0);
    });

    it("should throw when called with an id of already cleared notification", async () => {
        const wrapper = gtf.wrapPromise();

        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        try {
            await glue.notifications.click(notification.id);

            wrapper.reject("Should not have resolved");
        } catch (error) {
            wrapper.resolve();
        }

        await wrapper.promise;
    });

    it("should throw when called with an id and an action, but the raised notification does not have actions", async () => {
        const wrapper = gtf.wrapPromise();

        const notification = await glue.notifications.raise({ title: "asd" });

        await glue.notifications.clear(notification.id);

        try {
            await glue.notifications.click(notification.id, "one");

            wrapper.reject("Should not have resolved");
        } catch (error) {
            wrapper.resolve();
        }

        await wrapper.promise;
    });

    it("should throw when called with an id and an action, but the raised notification does not have that action", async () => {
        const wrapper = gtf.wrapPromise();

        const notification = await glue.notifications.raise({ title: "asd", actions: [{ action: "one", title: "One" }] });

        await glue.notifications.clear(notification.id);

        try {
            await glue.notifications.click(notification.id, "two");

            wrapper.reject("Should not have resolved");
        } catch (error) {
            wrapper.resolve();
        }

        await wrapper.promise;
    });

    [
        undefined,
        42,
        true,
        { title: "asd" },
        ["asd"]
    ].forEach((id) => {
        it("should throw when called with invalid id", () => {
            glue.notifications.click(id)
                .then(() => done(`Should not have resolved: ${JSON.stringify(id)}`))
                .catch(() => done());
        });
    });

    [
        42,
        true,
        { title: "asd" },
        ["asd"]
    ].forEach((id) => {
        it("should throw when called with invalid action", () => {
            glue.notifications.click(id)
                .then(() => done(`Should not have resolved: ${JSON.stringify(id)}`))
                .catch(() => done());
        });
    });

});
