describe('workspace.onHibernated() Should ', () => {
    const basicConfig = {
        children: [
            {
                type: "row",
                children: [
                    {
                        type: "window",
                        appName: "dummyApp"
                    }
                ]
            }
        ]
    };

    let workspace;
    let secondWorkspace;

    before(() => coreReady);

    beforeEach(async () => {
        workspace = await glue.workspaces.createWorkspace(basicConfig);
        secondWorkspace = await glue.workspaces.createWorkspace(basicConfig);
    });

    afterEach(async () => {
        const frames = await glue.workspaces.getAllFrames();
        await Promise.all(frames.map((frame) => frame.close()));

        gtf.clearAllUnsubFuncs();
    });

    it('be invoked when the workspace is hibernated', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onHibernated(() => {
            wrapper.resolve();
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();

        return wrapper.promise;
    });

    it('be hibernated when the event is raised', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onHibernated(() => {
            if (workspace.isHibernated) {
                wrapper.resolve();
            }
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();

        return wrapper.promise;
    });

    it("not be invoked when the workspace can't be hibernated because its active", async () => {
        const wrapper = gtf.wrapPromise();

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await secondWorkspace.onHibernated((hibernatedWorkspace) => {
            wrapper.reject("Should not be invoked");
        });

        gtf.addUnsubFunc(unsub);

        try {
            await secondWorkspace.hibernate();
        } catch (error) {
            // do nothing
        }

        return wrapper.promise;
    });

    it("not be invoked when another workspace is hibernated", async () => {
        const wrapper = gtf.wrapPromise();

        await glue.workspaces.createWorkspace(basicConfig);

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await workspace.onHibernated((hibernatedWorkspace) => {
            wrapper.reject("Should not be invoked");
        });

        gtf.addUnsubFunc(unsub);

        await secondWorkspace.hibernate();

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
        it(`reject if the provided parameter is not a function: ${JSON.stringify(input)}`, (done) => {
            workspace.onHibernated(input)
                .then((unSub) => {
                    unSubFuncs.push(unSub);
                    done(`Should not have resolved, because the provided parameter is not valid: ${JSON.stringify(input)}`);
                })
                .catch(() => {
                    done();
                });
        });
    });

});