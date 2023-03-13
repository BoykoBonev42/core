describe("listTypes ", () => {
    let providersToClear = [];

    before(() => {
        return coreReady;
    });

    afterEach(async () => {
        await Promise.all(providersToClear.map((provider) => provider.unregister()));

        providersToClear = [];
    });

    it("should resolve", async () => {
        await glue.search.listTypes();
    });

    it("should resolve with an array", async () => {
        const types = await glue.search.listTypes();

        expect(types).to.be.an("array");
    });

    it("should resolve with an empty array when no providers were registered", async () => {
        const types = await glue.search.listTypes();

        expect(types.length).to.eql(0);
    });

    it("should resolve with an empty array when one provider with no search types was registered", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(0);
    });

    it("should resolve with an array with one search type when one provider with a search type was registered", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app" }] });

        providersToClear.push(provider);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(1);
    });

    it("should resolve with the correct search type when one search type is available", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app", displayName: "Application" }] });

        providersToClear.push(provider);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(1);
        expect(types[0].name).to.eql("app");
        expect(types[0].displayName).to.eql("Application");
    });

    it("should resolve with two correct search types when two search types are available from the same provider", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app", displayName: "Application" }, { name: "app2", displayName: "Application2" }] });

        providersToClear.push(provider);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(2);

        const firstType = types.find((t) => t.name === "app");

        const secondType = types.find((t) => t.name === "app2");

        expect(firstType.name).to.eql("app");
        expect(firstType.displayName).to.eql("Application");
        expect(secondType.name).to.eql("app2");
        expect(secondType.displayName).to.eql("Application2");
    });

    it("should resolve with two correct search types when two search types are available from two different providers", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app", displayName: "Application" }] });

        providersToClear.push(provider);

        const provider2 = await glue.search.registerProvider({ name: "test2", types: [{ name: "app2", displayName: "Application2" }] });

        providersToClear.push(provider2);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(2);

        const firstType = types.find((t) => t.name === "app");

        const secondType = types.find((t) => t.name === "app2");

        expect(firstType.name).to.eql("app");
        expect(firstType.displayName).to.eql("Application");
        expect(secondType.name).to.eql("app2");
        expect(secondType.displayName).to.eql("Application2");
    });

    it("should resolve with one correct search type when two search types were available from two different providers but one prov was unregistered", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app", displayName: "Application" }] });

        const provider2 = await glue.search.registerProvider({ name: "test2", types: [{ name: "app2", displayName: "Application2" }] });

        await provider.unregister();

        providersToClear.push(provider2);

        const types = await glue.search.listTypes();

        expect(types.length).to.eql(1);
        expect(types[0].name).to.eql("app2");
        expect(types[0].displayName).to.eql("Application2");
    });

});
