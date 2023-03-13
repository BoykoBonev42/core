describe("setDebounceMS ", () => {
    let providersToClear = [];

    before(() => {
        return coreReady;
    });

    afterEach(async () => {
        glue.search.setDebounceMS(0);

        await Promise.all(providersToClear.map((provider) => provider.unregister()));

        providersToClear = [];
    });

    it("should not throw", () => {
        glue.search.setDebounceMS(10);
    });

    [
        undefined,
        "44",
        { debounce: 44 },
        [44],
        true,
        () => {}
    ].forEach((input) => {
        it(`should throw when called with invalid number: ${JSON.stringify(input)}`, async () => {
            try {
                glue.search.setDebounceMS(input);
                return Promise.reject("should have thrown")
            } catch (error) {
                return;
            }
        });
    });

    it("should set the debounce to the correct number - get check", async () => {
        glue.search.setDebounceMS(10);

        const debounceMS = glue.search.getDebounceMS();

        expect(debounceMS).to.eql(10);
    });

    describe("when set to 100", () => {

        it("calling query once should result in one onQuery to the only provider", async () => {
            glue.search.setDebounceMS(100);

            const wrapper = gtf.wrapPromise();
            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const providerCalled = false;

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            setTimeout(() => ready(), 3000);

            provider.onQuery((query) => {

                if (providerCalled) {
                    return wrapper.reject("The provider was called multiple times");
                }

                ready();
                query.done();
            });

            const clientQuery = await glue.search.query({ search: "asd" });

            clientQuery.onCompleted(() => ready());

            await wrapper.promise;
        });

        it("calling query twice with no wait should result in one onQuery to the only provider", async () => {
            glue.search.setDebounceMS(100);

            const wrapper = gtf.wrapPromise();
            const ready = gtf.waitFor(4, () => wrapper.resolve());

            const providerCalled = false;

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            setTimeout(() => ready(), 3000);

            provider.onQuery((query) => {

                if (providerCalled) {
                    return wrapper.reject("The provider was called multiple times");
                }

                ready();
                query.done();
            });

            const clientQueries = await Promise.all([
                glue.search.query({ search: "as" }),
                glue.search.query({ search: "asd" })
            ]);

            clientQueries.forEach((clientQuery) => clientQuery.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("calling query five times with no wait should result in one onQuery to the only provider", async () => {
            glue.search.setDebounceMS(100);

            const wrapper = gtf.wrapPromise();
            const ready = gtf.waitFor(7, () => wrapper.resolve());

            const providerCalled = false;

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            setTimeout(() => ready(), 3000);

            provider.onQuery((query) => {

                if (providerCalled) {
                    return wrapper.reject("The provider was called multiple times");
                }

                ready();
                query.done();
            });

            const clientQueries = await Promise.all([
                glue.search.query({ search: "a" }),
                glue.search.query({ search: "as" }),
                glue.search.query({ search: "asd" }),
                glue.search.query({ search: "asdf" }),
                glue.search.query({ search: "asdfg" })
            ]);

            clientQueries.forEach((clientQuery) => clientQuery.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("calling query twice with no wait should result in the same identical Query object in the promise resolution", async () => {
            glue.search.setDebounceMS(100);

            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            provider.onQuery((query) => {

                ready();
                query.done();
            });

            const clientQueries = await Promise.all([
                glue.search.query({ search: "as" }),
                glue.search.query({ search: "asd" })
            ]);

            clientQueries.forEach((clientQuery) => clientQuery.onCompleted(() => ready()));
            
            await wrapper.promise;
            
            expect(clientQueries[0] === clientQueries[1]).to.be.true;
        });

    });
});
