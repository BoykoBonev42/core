describe('onWorkspaceHibernated() Should ', () => {
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

        const unsub = await glue.workspaces.onWorkspaceHibernated((workspace) => {
            wrapper.resolve();
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();

        return wrapper.promise;
    });

    it('be invoked with the correct workspace when the workspace is hibernated', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await glue.workspaces.onWorkspaceHibernated((hibernatedWorkspace) => {
            if (workspace.id === hibernatedWorkspace.id) {
                wrapper.resolve();
            }
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();

        return wrapper.promise;
    });

    it('be invoked with a hibernated workspace when the workspace is hibernated', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await glue.workspaces.onWorkspaceHibernated((hibernatedWorkspace) => {
            if (hibernatedWorkspace.isHibernated) {
                wrapper.resolve();
            }
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();

        return wrapper.promise;
    });

    it('be invoked when a workspace in a second frame is hibernated', async () => {
        const wrapper = gtf.wrapPromise();

        const thirdWorkspace = await glue.workspaces.createWorkspace(Object.assign({}, basicConfig, { frame: { newFrame: true } }));
        const fourthWorkspace = await glue.workspaces.createWorkspace(Object.assign({}, basicConfig, { frame: { reuseFrameId: thirdWorkspace.frame.id } }));

        const unsub = await glue.workspaces.onWorkspaceHibernated((hibernatedWorkspace) => {
            wrapper.resolve();
        });

        gtf.addUnsubFunc(unsub);

        await thirdWorkspace.hibernate();

        return wrapper.promise;
    });

    it("not be invoked when the workspace can't be hibernated because its active", async () => {
        const wrapper = gtf.wrapPromise();

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await glue.workspaces.onWorkspaceHibernated((hibernatedWorkspace) => {
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
            glue.workspaces.onWorkspaceHibernated(input)
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