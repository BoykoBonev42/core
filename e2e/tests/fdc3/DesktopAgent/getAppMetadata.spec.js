describe("getAppMetadata()", function() {
    const supportAppName = "coreSupport";

    before(async() => {
        await coreReady;
    });

    afterEach(async() => {
        await Promise.all(glue.appManager.instances().map(inst => inst.stop()));
    });

    it("Should throw when invoked with no arguments", (done) => {
        fdc3.getAppMetadata()
            .then(() => done("Should have thrown"))
            .catch(() => done());
    });

    [undefined, null, false, true, () => {}, [], "", 42, { test: 42 }, "test"].forEach(invalidArg => {
        it(`Should throw when invoked with invalid argument (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.getAppMetadata(invalidArg)
                .then(() => done("Should have thrown"))
                .catch(() => done());         
        });
    });

    [undefined, null, false, true, () => {}, [], "", 42, { test: 42 }].forEach(invalidArg => {
        it(`Should throw when invoked with object but the appId prop is invalid type (${JSON.stringify(invalidArg)})`, (done) => {
            fdc3.getAppMetadata({ appId: invalidArg })
                .then(() => done("Should have thrown"))
                .catch(() => done());
        });
    });

    it("Should be async", async() => {
        const returned = fdc3.getAppMetadata({ appId: supportAppName });

        await returned;

        expect(returned.then).to.be.a("function");
        expect(returned.catch).to.be.a("function");
    });

    it("Should return an object", async() => {
        const returned = await fdc3.getAppMetadata({ appId: supportAppName });

        expect(returned).to.be.an("object");
    });

    it("Should return a correct AppMetadata object when invoked with { appId }", async() => {
        const supportApp = glue.appManager.application(supportAppName);

        const appMetadata = await fdc3.getAppMetadata({ appId: supportAppName }); 

        expect(appMetadata.appId).to.eql(supportAppName);
        expect(appMetadata.name).to.eql(supportAppName);
        expect(appMetadata.version).to.eql(supportApp.version);
        expect(appMetadata.title).to.eql(supportApp.title);
        expect(appMetadata.icons).to.be.an('array');
    });

    it("Should return a correct AppMetadata object when invoked with { appId, instanceId }", async() => {
        const supportApp = glue.appManager.application(supportAppName);

        const startContext = { test: 42 };

        const inst = await supportApp.start(startContext);

        const appMetadata = await fdc3.getAppMetadata({ appId: supportAppName, instanceId: inst.id });

        expect(appMetadata.appId).to.eql(supportAppName);
        expect(appMetadata.name).to.eql(supportAppName);
        expect(appMetadata.version).to.eql(supportApp.version);
        expect(appMetadata.title).to.eql(supportApp.title);
        expect(appMetadata.icons[0]).to.eql(supportApp.icon);
        expect(appMetadata.instanceId).to.eql(inst.id);
    });

    it("Should return correct AppMetadata with description, icons and screenshots properties", async() => {
        const appDef = {
            name: `test-app-${Date.now()}`,
            type: "window",
            details: {
                url: "test"
            },
            icon: "ICON",
            customProperties: {
                screenshots: [`screenshot-1`, `screenshot-2`],
                description: "Some Description"
            }
        };

        await glue.appManager.inMemory.import([appDef], "merge");

        const appMetadata = await fdc3.getAppMetadata({ appId: appDef.name });

        expect(appMetadata.appId).to.eql(appDef.name);
        expect(appMetadata.icons[0].src).to.eql(appDef.icon);
        expect(appMetadata.description).to.eql(appDef.customProperties.description);
    })
});