describe("resume() Should", () => {
    const basicConfig = {
        children: [{
            type: "column",
            children: [{
                type: "row",
                children: [
                    {
                        type: "group",
                        children: [
                            {
                                type: "window",
                                appName: "noGlueApp"
                            }
                        ]
                    },
                    {
                        type: "group",
                        children: [
                            {
                                type: "window",
                                appName: "noGlueApp"
                            }
                        ]
                    },
                ],
            },
            {
                type: "group",
                children: [
                    {
                        type: "window",
                        appName: "noGlueApp"
                    }
                ]
            }]
        }]
    };

    let workspace = undefined;

    before(() => coreReady);

    beforeEach(async () => {
        gtf.clearWindowActiveHooks();
        workspace = await glue.workspaces.createWorkspace(basicConfig);
    })

    afterEach(async () => {
        const wsps = await glue.workspaces.getAllWorkspaces();
        await Promise.all(wsps.map((wsp) => wsp.close()));
    });

    it("resolve the promise when the workspace is hibernated", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.hibernate();
        await workspace.resume();
    });


    it("have the same amount of workspace windows as before being resumed", async () => {
        await Promise.all(workspace.getAllWindows().map((w) => w.forceLoad()));

        const workspaceWindowsCount = workspace.getAllWindows().length;
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await Promise.all(secondWorkspace.getAllWindows().map((w) => w.forceLoad()));
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        const workspaceWindowsCountAfterHibernate = workspace.getAllWindows().length;

        expect(workspaceWindowsCount).to.eql(workspaceWindowsCountAfterHibernate);
    });

    it("have the same amount of columns as before being resumed", async () => {
        const columnsCount = workspace.getAllColumns().length;
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        const columnsCountAfterHibernate = workspace.getAllColumns().length;

        expect(columnsCount).to.eql(columnsCountAfterHibernate);
    });

    it("have the same amount of rows as before being resumed", async () => {
        const rowsCount = workspace.getAllRows().length;
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        const rowsCountAfterHibernate = workspace.getAllRows().length;

        expect(rowsCount).to.eql(rowsCountAfterHibernate);
    });

    it("have the same amount of groups as before being resumed", async () => {
        const groupsCount = workspace.getAllGroups().length;
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        const groupsCountAfterHibernate = workspace.getAllGroups().length;

        expect(groupsCount).to.eql(groupsCountAfterHibernate);
    });

    it("be able to load all windows after being resumed", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        await Promise.all(workspace.getAllWindows().map(w => w.forceLoad()));
    });

    it("resume the workpace with all of its contraints when the workspace was locked before", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.lock();
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        expect(workspace.allowDrop).to.be.true;
        expect(workspace.allowExtract).to.be.false;
        expect(workspace.allowWindowReorder).to.be.false;
        expect(workspace.allowWorkspaceTabReorder).to.be.false;
        expect(workspace.allowDropLeft).to.be.false;
        expect(workspace.allowDropTop).to.be.false;
        expect(workspace.allowDropRight).to.be.false;
        expect(workspace.allowDropBottom).to.be.false;
        expect(workspace.allowSplitters).to.be.false;
        expect(workspace.showCloseButton).to.be.false;
        expect(workspace.showSaveButton).to.be.false;
    });

    it("resume the workpace preserving the group constraints when the workspace was locked before", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.lock();
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        workspace.getAllGroups().forEach((group) => {
            expect(group.allowDrop).to.be.true;
            expect(group.allowExtract).to.be.false;
            expect(group.allowReorder).to.be.false;
        });
    });

    it("resume the workpace preserving the row constraints when the workspace was locked before", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.lock();
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        workspace.getAllRows().forEach((row) => {
            expect(row.allowDrop).to.be.true;
        });
    });

    it("resume the workpace preserving the column constraints when the workspace was locked before", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.lock();
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        workspace.getAllColumns().forEach((column) => {
            expect(column.allowDrop).to.be.true;
        });
    });

    it("resume the workpace preserving the window constraints when the workspace was locked before", async () => {
        const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

        await workspace.lock();
        await workspace.hibernate();
        await workspace.resume();
        await workspace.refreshReference();

        workspace.getAllWindows().forEach((window) => {
            expect(window.allowExtract).to.be.false;
            expect(window.allowReorder).to.be.false;
        });
    });


    it("not trigger onWindowAdded after being resumed", (done) => {
        workspace.frame.createWorkspace(basicConfig).then(() => {
            return gtf.wait(3000, () => {});
        }).then(() => {
            return workspace.onWindowAdded(() => {
                done("Should not resolve");
            })
        }).then((unsub) => {
            gtf.addWindowHook(unsub);
            return workspace.hibernate();
        }).then(() => {
            gtf.wait(3000, () => {
                done();
            })
            return workspace.resume();
        }).catch(done);

    });

    it("throw an error when the workspace is not hibernated", (done) => {
        workspace.resume().then(() => {
            done("Should not resolve");
        }).catch(() => {
            done();
        });
    });

    it("throw an error when the workspace is resumed twice (sequential)", (done) => {
        workspace.frame.createWorkspace(basicConfig).then(() => {
            return workspace.hibernate();
        }).then(() => {
            return workspace.resume();
        }).then(() => {
            return workspace.resume();
        }).then(() => {
            done("Should not resolve");
        }).catch(() => {
            done()
        });

    });

    it("throw an errorwhen the workspace is not selected is resumed twice (parallel)", (done) => {
        workspace.frame.createWorkspace(basicConfig).then(() => {
            return workspace.resume();
        }).then(() => {
            return Promise.all([workspace.resume(), workspace.resume()]);
        }).then(() => {
            done("Should not resolve");
        }).catch(() => {
            done()
        });
    });

    describe("contexts", () => {

        it("should restore a previously set workspace context", async () => {

            const context = { test: 42 };

            await workspace.setContext(context);

            const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const wspContext = await workspace.getContext();

            expect(wspContext).to.eql(context);
        });

        it("should restore a previously set window context in one of the workspace windows", async () => {
            const context = { test: 42 };

            await Promise.all(workspace.getAllWindows().map((w) => w.forceLoad()));

            const firstWindow = workspace.getWindow(() => true);

            const webWindow = glue.windows.findById(firstWindow.id);

            await webWindow.setContext(context);

            const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const webWindowAfter = glue.windows.findById(firstWindow.id);

            const webWindowCtxAfter = await webWindowAfter.getContext();

            expect(webWindowCtxAfter).to.eql(context);
        });

        it("should restore a previously set window context in all of the workspace windows", async () => {
            const windowIds = [];

            await Promise.all(workspace.getAllWindows().map((w) => w.forceLoad()));

            const allWindows = workspace.getAllWindows(() => true);

            for (const workspaceWindow of allWindows) {
                const webWindow = glue.windows.findById(workspaceWindow.id);

                const ctx = { test: workspaceWindow.id };

                windowIds.push(workspaceWindow.id)

                await webWindow.setContext(ctx);
            }

            const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            for (const id of windowIds) {
                const webWindowAfter = glue.windows.findById(id);

                const webWindowCtxAfter = await webWindowAfter.getContext();

                expect(webWindowCtxAfter).to.eql({ test: id });
            }

        });

        it("should restore a previously set window context in one of the workspace windows during two hibernations", async () => {
            const context = { test: 42 };

            await Promise.all(workspace.getAllWindows().map((w) => w.forceLoad()));

            const firstWindow = workspace.getWindow(() => true);

            const webWindow = glue.windows.findById(firstWindow.id);

            await webWindow.setContext(context);

            const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const webWindowAfter = glue.windows.findById(firstWindow.id);

            const webWindowCtxAfter = await webWindowAfter.getContext();

            expect(webWindowCtxAfter).to.eql(context);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const webWindowAfter2 = glue.windows.findById(firstWindow.id);

            const webWindowCtxAfter2 = await webWindowAfter2.getContext();

            expect(webWindowCtxAfter2).to.eql(context);
        });

        it("should restore a previously set window context in one of the workspace windows during two hibernations when the context was changed inbetween hibernations", async () => {
            const context = { test: 42 };

            await Promise.all(workspace.getAllWindows().map((w) => w.forceLoad()));

            const firstWindow = workspace.getWindow(() => true);

            const webWindow = glue.windows.findById(firstWindow.id);

            await webWindow.setContext(context);

            const secondWorkspace = await workspace.frame.createWorkspace(basicConfig);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const webWindowAfter = glue.windows.findById(firstWindow.id);

            const webWindowCtxAfter = await webWindowAfter.getContext();

            expect(webWindowCtxAfter).to.eql(context);

            const contextChanged = { test: 66 };
            await webWindowAfter.setContext(contextChanged);

            await workspace.hibernate();
            await workspace.resume();
            await workspace.refreshReference();

            const webWindowAfter2 = glue.windows.findById(firstWindow.id);

            const webWindowCtxAfter2 = await webWindowAfter2.getContext();

            expect(webWindowCtxAfter2).to.eql(contextChanged);
        });
    });
});
