describe('workspace.onResumed() Should ', () => {
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

    it('be invoked when the workspace is resumed through the API', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onResumed(() => {
            wrapper.resolve();
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();
        await workspace.resume();

        return wrapper.promise;
    });

    it('be invoked when the workspace is resumed through selecting', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onResumed(() => {
            wrapper.resolve();
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();
        await workspace.focus();

        return wrapper.promise;
    });

    it('not be hibernated when the workspace is resumed through the API', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onResumed(() => {
            if (!workspace.isHibernated) {
                wrapper.resolve();
            }
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();
        await workspace.resume();

        return wrapper.promise;
    });

    it('not be hibernated when the workspace is resumed through selecting', async () => {
        const wrapper = gtf.wrapPromise();

        const unsub = await workspace.onResumed(() => {
            if (!workspace.isHibernated) {
                wrapper.resolve();
            }
        });

        gtf.addUnsubFunc(unsub);

        await workspace.hibernate();
        await workspace.focus();

        return wrapper.promise;
    });

    it('not be invoked when when another workspace is resumed through the API', async () => {
        const wrapper = gtf.wrapPromise();

        await glue.workspaces.createWorkspace(basicConfig);

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await workspace.onResumed(() => {
            wrapper.reject("Should not resolve");
        });

        gtf.addUnsubFunc(unsub);

        await secondWorkspace.hibernate();
        await secondWorkspace.resume();

        return wrapper.promise;
    });

    
    it('not be invoked when another workspace is resumed through selecting', async () => {
        const wrapper = gtf.wrapPromise();

        await glue.workspaces.createWorkspace(basicConfig);

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await workspace.onResumed(() => {
            wrapper.reject("Should not resolve");
        });

        gtf.addUnsubFunc(unsub);

        await secondWorkspace.hibernate();
        await secondWorkspace.focus();

        return wrapper.promise;
    });

    it('not be invoked when a workspace is selected without being hibernated', async () => {
        const wrapper = gtf.wrapPromise();

        await glue.workspaces.createWorkspace(basicConfig);

        gtf.wait(3000, () => {
            wrapper.resolve();
        });

        const unsub = await workspace.onResumed(() => {
            wrapper.reject("Should not resolve");
        });

        gtf.addUnsubFunc(unsub);

        await workspace.focus();

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
            workspace.onResumed(input)
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