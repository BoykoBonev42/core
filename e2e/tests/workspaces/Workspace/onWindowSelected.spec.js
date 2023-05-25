describe("workspace.onWindowSelected() Should", () => {
    let unSubFuncs = [];
    const layoutName = "gtf.layout.1";

    before(() => coreReady);

    afterEach(async () => {
        const frames = await glue.workspaces.getAllFrames();
        await Promise.all(frames.map((frame) => frame.close()));

        unSubFuncs.forEach((unSub) => {
            if (typeof unSub === "function") {
                unSub();
            }
        });
        unSubFuncs = [];
    });

    after(async () => {
        const layoutSummaries = await glue.workspaces.layouts.getSummaries();

        if (layoutSummaries.some((ls) => ls.name === layoutName)) {
            await glue.workspaces.layouts.delete(layoutName);
        }
    });

    const basicConfigTwoWindows = {
        children: [
            {
                type: "group",
                children: [{
                    type: "window",
                    appName: "dummyApp"
                },
                {
                    type: "window",
                    appName: "dummyApp"
                }]
            }
        ]
    };

    const configWithFlatWindow = {
        children: [{
            type: "row",
            children: [
                {
                    type: "column",
                    children: [
                        {
                            type: "window",
                            appName: "dummyApp"
                        }
                    ]
                },
                {
                    type: "column",
                    children: [
                        {
                            type: "group",
                            children: [
                                {
                                    type: "window",
                                    appName: "dummyApp"
                                }
                            ]
                        }
                    ]
                }
            ]
        }]
    };

    it("notify that a window has been selected when the first window is selected through the API", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await workspace.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await firstWindow.focus();

        return wrapper.promise;
    });

    it("notify that a window has been selected when the selected window in the group is closed", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await workspace.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await secondWindow.close();

        return wrapper.promise;
    });

    it("notify that a window has been selected when the selected window in the group is ejected", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await workspace.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await secondWindow.forceLoad();
        await secondWindow.eject();

        return wrapper.promise;
    });

    it("not notify when the unsubscribe function has been invoked", async () => {
        const wrapper = gtf.wrapPromise();
        const interval = setTimeout(() => {
            wrapper.resolve();
        }, 3000);

        unSubFuncs.push(() => clearInterval(interval));

        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await workspace.onWindowSelected((w) => {
            wrapper.reject("Should not be invoked");
        });
        unsub();
        await firstWindow.focus();

        return wrapper.promise;
    });

    [
        undefined,
        null,
        42,
        true,
        {},
        { test: () => { } },
        "function",
        [() => { }]
    ].forEach((input) => {
        it(`should reject if the provided parameter is not a function: ${JSON.stringify(input)}`, async () => {
            const wrapper = gtf.wrapPromise();
            const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
            try {
                const unsub = await workspace.onWindowSelected(input)
                unSubFuncs.push(unsub);
                wrapper.reject(`Should have rejected, because the provided parameter is not valid: ${JSON.stringify(input)}`);
            } catch (error) {
                wrapper.resolve();
            }

            return wrapper.promise;
        });
    });
});