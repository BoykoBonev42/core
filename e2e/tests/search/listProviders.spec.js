describe("listProviders ", () => {

    let providersToClear = [];

    before(() => {
        return coreReady;
    });

    afterEach(async () => {
        await Promise.all(providersToClear.map((provider) => provider.unregister()));

        providersToClear = [];
    });

    it("should resolve", async () => {
        await glue.search.listProviders();
    });

    it("should resolve with an array", async () => {
        const providers = await glue.search.listProviders();

        expect(providers).to.be.an("array");
    });

    it("should resolve with an empty array when no providers were registered", async () => {
        const providers = await glue.search.listProviders();

        expect(providers.length).to.eql(0);
    });

    it("should resolve with an array with one ProviderData when one Provider was registered", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        const providers = await glue.search.listProviders();

        expect(providers.length).to.eql(1);
    });

    it("should resolve with an array with a provider containing the correct name", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        const providers = await glue.search.listProviders();

        const foundProvider = providers.find((prov) => prov.name === "test");

        expect(foundProvider.name).to.eql("test");
        expect(foundProvider.name).to.eql(provider.name);
    });

    it("should resolve with an array with a provider containing the correct search types", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "app" }] });

        providersToClear.push(provider);

        const providers = await glue.search.listProviders();

        const foundProvider = providers.find((prov) => prov.name === "test");

        expect(foundProvider.types.length).to.eql(1);
        expect(foundProvider.types).to.eql([{ name: "app" }]);
        expect(foundProvider.types).to.eql(provider.types);
    });

    it("should resolve with an array of two providers with correct names when two providers were registered", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        const provider2 = await glue.search.registerProvider({ name: "test2" });

        providersToClear.push(provider2);

        const providers = await glue.search.listProviders();

        expect(providers.length).to.eql(2);

        const foundProvider1 = providers.find((prov) => prov.name === "test");

        expect(foundProvider1.name).to.eql("test");
        expect(foundProvider1.name).to.eql(provider.name);

        const foundProvider2 = providers.find((prov) => prov.name === "test2");

        expect(foundProvider2.name).to.eql("test2");
        expect(foundProvider2.name).to.eql(provider2.name);
    });

    it("should resolve with one provider when two providers were registered but one was unregistered", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        const provider2 = await glue.search.registerProvider({ name: "test2" });

        providersToClear.push(provider2);

        await provider.unregister();

        const providers = await glue.search.listProviders();

        expect(providers.length).to.eql(1);

        const foundProvider2 = providers[0];

        expect(foundProvider2.name).to.eql("test2");
        expect(foundProvider2.name).to.eql(provider2.name);
    });

});
