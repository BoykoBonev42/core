describe("onWindowSelected() Should", () => {
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

    const configWithTwoGroups = {
        children: [
            {
                type: "column",
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
                    }, {
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
            }
        ]
    }

    it("notify that a window has been selected when a workspace with two apps is created", async () => {
        const wrapper = gtf.wrapPromise();
        const unsub = await glue.workspaces.onWindowSelected((w) => {
            wrapper.resolve();
        });

        unSubFuncs.push(unsub);

        await glue.workspaces.createWorkspace(basicConfigTwoWindows)

        return wrapper.promise;
    });

    it("notify that a window has been selected with the selected window when a new workspace is created", async () => {
        const wrapper = gtf.wrapPromise();
        const unsub = await glue.workspaces.onWindowSelected((w) => {
            if (w.positionIndex === 0) {
                wrapper.resolve();
            }
        });

        unSubFuncs.push(unsub);
        await glue.workspaces.createWorkspace(basicConfigTwoWindows);

        return wrapper.promise;
    });

    it("notify that a window has been selected when the first window is selected through the API", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();

        const unsub = await glue.workspaces.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await firstWindow.focus();

        return wrapper.promise;
    });

    it("notify that a window has been selected when the selected window is closed", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await glue.workspaces.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await secondWindow.close();
        return wrapper.promise;
    });

    it("notify that a window has been selected when the selected window is ejected", async () => {
        const wrapper = gtf.wrapPromise();
        const workspace = await glue.workspaces.createWorkspace(basicConfigTwoWindows);
        const windows = workspace.getAllWindows();
        const firstWindow = windows.find((w) => w.positionIndex === 0);
        const secondWindow = windows.find((w) => w.positionIndex === 1);

        await secondWindow.focus();
        const unsub = await glue.workspaces.onWindowSelected((w) => {
            if (w.id === firstWindow.id) {
                wrapper.resolve();
            }
        });
        unSubFuncs.push(unsub);

        await secondWindow.forceLoad();
        await secondWindow.eject();

        return wrapper.promise;
    });

    it("notify that a window has been selected when a workspace with two apps is restored", async () => {
        const wrapper = gtf.wrapPromise();
        const workspaceToBeSaved = await glue.workspaces.createWorkspace(basicConfigTwoWindows);

        await workspaceToBeSaved.saveLayout(layoutName);
        await workspaceToBeSaved.close();

        const unsub = await glue.workspaces.onWindowSelected((w) => {
            wrapper.resolve();
        });

        unSubFuncs.push(unsub);

        await glue.workspaces.restoreWorkspace(layoutName);

        return wrapper.promise;
    });

    it("notify that a window is selected when the window is not in a group", async () => {
        const wrapper = gtf.wrapPromise();
        const selectedWindowIds = {};

        const unsub = await glue.workspaces.onWindowSelected((w) => {
            selectedWindowIds[w.id] = true;

            if (Object.keys(selectedWindowIds).length === 2) {
                wrapper.resolve();
            }
        });

        unSubFuncs.push(unsub);

        await glue.workspaces.createWorkspace(configWithFlatWindow);

        return wrapper.promise;
    });

    it("notify that a window is selected for each window in a different group", async () => {
        const wrapper = gtf.wrapPromise();
        const selectedWindowIds = {};
        const unsub = await glue.workspaces.onWindowSelected((w) => {
            selectedWindowIds[w.id] = true;

            if (Object.keys(selectedWindowIds).length === 2) {
                wrapper.resolve();
            }
        });

        unSubFuncs.push(unsub);
        await glue.workspaces.createWorkspace(configWithTwoGroups);
        return wrapper.promise;
    });

    it("notify that a window is selected when workspaces in two different frames are opened", async () => {
        const wrapper = gtf.wrapPromise();
        const selectedWindowIds = {};

        const unsub = await glue.workspaces.onWindowSelected((w) => {
            selectedWindowIds[w.id] = true;

            if (Object.keys(selectedWindowIds).length === 2) {
                wrapper.resolve();
            }
        });

        unSubFuncs.push(unsub);

        const newFrameConfig = Object.assign({}, basicConfigTwoWindows, { frame: { newFrame: true } });
        await Promise.all([glue.workspaces.createWorkspace(basicConfigTwoWindows), glue.workspaces.createWorkspace(newFrameConfig)]);
        return wrapper.promise;
    });

    it("not notify when the unsubscribe function has been invoked", async () => {
        const wrapper = gtf.wrapPromise();
        const interval = setTimeout(() => {
            wrapper.resolve();
        }, 3000);

        unSubFuncs.push(() => clearInterval(interval));

        const unsub = await glue.workspaces.onWindowSelected((w) => {
            wrapper.reject("Should not be invoked");
        });

        unsub();

        await glue.workspaces.createWorkspace(basicConfigTwoWindows);

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

            try {
                const unsub = await glue.workspaces.onWindowSelected(input);
                unSubFuncs.push(unsub);
                wrapper.reject("Should not resolve");
            } catch (error) {
                wrapper.resolve();
            }
            return wrapper.promise;
        });
    });
});