describe("registerProvider ", () => {
    const sampleResult = { type: { name: "asd", displayName: "Asd" }, id: "gosho", displayName: "Gosho", description: "This is Gosho", action: { method: "gosho.invoke", target: "all", params: { test: 42 } } };

    let providersToClear = [];

    before(() => {
        return coreReady;
    });

    afterEach(async () => {
        gtf.clearAllUnsubFuncs();

        await Promise.all(providersToClear.map((provider) => provider.unregister()));

        providersToClear = [];
    });

    it("should resolve when called with valid registration config", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);
    });

    it("should resolve with a valid provider", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        expect(provider.id).to.not.be.undefined;
        expect(provider.name).to.not.be.undefined;
        expect(provider.appName).to.not.be.undefined;
        expect(provider.onQuery).to.not.be.undefined;
        expect(provider.onQueryCancel).to.not.be.undefined;
        expect(provider.unregister).to.not.be.undefined;
    });

    it("the new provider should be present in list", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        const allProviders = await glue.search.listProviders();

        expect(allProviders.some((provider) => provider.name === "test")).to.be.true;
    });

    it("the new provider should be present with correct types in list", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "asd" }] });

        providersToClear.push(provider);

        const allProviders = await glue.search.listProviders();

        const foundProvider = allProviders.find((provider) => provider.name === "test");

        expect(foundProvider).to.not.be.undefined;
        expect(foundProvider.types).to.be.an("array");
        expect(foundProvider.types.some((t) => t.name === "asd")).to.be.true;
    });

    it("the created provider should contain the correct name", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        expect(provider.name).to.not.be.undefined;
        expect(provider.name).to.eql("test");
    });

    it("the created provider should contain the correct search types", async () => {
        const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "asd" }] });

        providersToClear.push(provider);

        expect(provider.types).to.be.an("array");
        expect(provider.types.some((t) => t.name === "asd")).to.be.true;
    });

    it("the created provider should contain no search types by default", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        expect(provider.types).to.be.undefined;
    });

    it("the created provider should contain an id", async () => {
        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        expect(provider.id).to.not.be.undefined;
    });

    it("should reject when a provider with this name already exists", async () => {
        const wrapper = gtf.wrapPromise();

        const provider = await glue.search.registerProvider({ name: "test" });

        providersToClear.push(provider);

        try {
            const provider2 = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider2);

            wrapper.reject("Should not have resolved");
        } catch (error) {
            wrapper.resolve();
        }

        await wrapper.promise;
    });

    [
        undefined,
        null,
        true,
        42,
        { name: "test" },
        ["test"],
        () => "test"
    ].forEach((input) => {
        it("should reject when called with invalid name", async () => {
            const wrapper = gtf.wrapPromise();

            try {
                const provider = await glue.search.registerProvider({ name: input });

                providersToClear.push(provider);

                wrapper.reject(`Should not have resolved - ${JSON.stringify(input)}`);
            } catch (error) {
                wrapper.resolve();
            }

            await wrapper.promise;
        });
    });

    [
        42,
        true,
        "yes",
        { name: "asd" },
        ["asd"],
        [42],
        [true],
        [() => "asd"]
    ].forEach((input) => {
        it("should reject when called with invalid types", async () => {
            const wrapper = gtf.wrapPromise();

            try {
                const provider = await glue.search.registerProvider({ name: "test", types: input });

                providersToClear.push(provider);

                wrapper.reject(`Should not have resolved - ${JSON.stringify(input)}`);
            } catch (error) {
                wrapper.resolve();
            }

            await wrapper.promise;
        });
    });

    describe("unregister", () => {

        it("should resolve", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            await provider.unregister();

        });

        it("should remove the provider from the list of providers", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            await provider.unregister();

            const allProviders = await glue.search.listProviders();

            expect(allProviders.some((provider) => provider.name === "test")).to.be.false;
        });

        it("should not invoke the provider onQuery when a query was created after unregistering", async () => {

            const wrapper = gtf.wrapPromise();

            const provider = await glue.search.registerProvider({ name: "test" });

            gtf.withUnsub(provider.onQuery(() => {
                wrapper.reject("Should not have been called");
            }));

            await provider.unregister();

            const query = await glue.search.query({ search: "asd" });

            query.onCompleted(() => wrapper.resolve());

            await wrapper.promise;
        });
    });

    describe("onQuery", () => {

        it("should not throw", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery(() => {}));
        });

        it("should return a function", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            const unsub = provider.onQuery(() => {});

            expect(unsub).to.be.a("function");
        });

        [
            undefined,
            { callback: () => {} },
            42,
            true,
            "yea",
            [() => {}]
        ].forEach((input) => {

            it("should throw when called with invalid callback", async () => {

                const wrapper = gtf.wrapPromise();

                const provider = await glue.search.registerProvider({ name: "test" });

                providersToClear.push(provider);

                try {
                    await gtf.withUnsub(provider.onQuery(input));
                    wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
                } catch (error) {
                    wrapper.resolve();
                }

                await wrapper.promise;

            });
        });


        it("should be called when a client makes a query", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.done();
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called when a client makes a query, when the provider has no defined type, but the query has a defined type", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.done();
                ready();
            }));

            const query = await glue.search.query({ search: "asd", types: [{ name: "testType" }] });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should contain a valid provider query object", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                try {
                    expect(query.id).to.be.a("string");
                    expect(query.search).to.be.a("string");
                    expect(query.sendResult).to.be.a("function");
                    expect(query.error).to.be.a("function");
                    expect(query.done).to.be.a("function");
                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
                query.done();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should contain a query with identical query data to the one created by the client", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "dsa" }] });

            const queryConfig = {
                search: "asd",
                providers: [{ id: provider.id, name: provider.name, interopId: provider.interopId }],
                types: [{ name: "dsa" }],
                providerLimits: {
                    maxResults: 10,
                    maxResultsPerType: 5
                }
            };

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                try {
                    expect(query.search).to.eql(queryConfig.search)
                    expect(query.providers).to.eql(queryConfig.providers);
                    expect(query.types).to.eql(queryConfig.types);
                    expect(query.providerLimits).to.eql(queryConfig.providerLimits);
                    ready();
                } catch (error) {

                    wrapper.reject(error);
                }
                query.done();
            }));

            const query = await glue.search.query(queryConfig);

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should contain a valid id", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                try {
                    expect(query.id).to.be.a("string");
                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
                query.done();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("sendResult", () => {

        it("should not throw", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.sendResult({ type: { name: "test" } });
                query.done();
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("the client should receive one correct result when sendResult was called once", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            const sentResult = {
                type: { name: "testres", displayName: "TestRes" },
                id: "asdadas",
                displayName: "some display name",
                description: "awesome description",
                iconURL: "http://ico.com",
                action: {
                    method: "some-method-name",
                    target: "all",
                    params: { testing: 42 }
                },
                secondaryActions: [
                    {
                        name: "second",
                        method: "some-method-name2",
                        target: "all",
                        params: { testing: 422 }
                    }
                ],
            };

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.sendResult(sentResult);
                query.done();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((batch) => {
                try {
                    expect(batch.results.length).to.eql(1);
                    const result = batch.results[0];

                    expect(result).to.eql(sentResult);

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("the client should receive one correct result when sendResult was called once with meta data", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            const sentResult = {
                type: { name: "testres", displayName: "TestRes" },
                id: "asdadas",
                displayName: "some display name",
                description: "awesome description",
                iconURL: "http://ico.com",
                metadata: {
                    test: 4242
                },
                action: {
                    method: "some-method-name",
                    target: "all",
                    params: { testing: 42 }
                },
                secondaryActions: [
                    {
                        name: "second",
                        method: "some-method-name2",
                        target: "all",
                        params: { testing: 422 }
                    }
                ],
            };

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.sendResult(sentResult);
                query.done();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((batch) => {
                try {
                    expect(batch.results.length).to.eql(1);
                    const result = batch.results[0];

                    expect(result).to.eql(sentResult);

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("the client should receive two correct results in one batch when sendResult was called twice with no wait", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            const sentResult = {
                type: { name: "testres", displayName: "TestRes" },
                id: "asdadas",
                displayName: "some display name",
                description: "awesome description",
                iconURL: "http://ico.com",
                action: {
                    method: "some-method-name",
                    target: "all",
                    params: { testing: 42 }
                },
                secondaryActions: [
                    {
                        name: "second",
                        method: "some-method-name2",
                        target: "all",
                        params: { testing: 422 }
                    }
                ],
            };

            const secondSentResult = Object.assign({}, sentResult, { id: "asdadas2" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.sendResult(sentResult);
                query.sendResult(secondSentResult);
                query.done();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((batch) => {
                try {
                    expect(batch.results.length).to.eql(2);
                    const resultOne = batch.results[0];
                    const resultTwo = batch.results[1];

                    expect(resultOne).to.eql(sentResult);
                    expect(resultTwo).to.eql(secondSentResult);

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result of an incorrect type", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test", types: [{ name: "test" }] });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    ready();
                }
                query.done();
            }));

            const query = await glue.search.query({ search: "asd", types: [{ name: "test" }] });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after calling done", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.done();
                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after calling error", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.error("ops");
                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after the query was cancelled", async () => {
            const wrapper = gtf.wrapPromise();
            const cancelWrapper = gtf.wrapPromise();

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQueryCancel(() => {
                cancelWrapper.resolve();
            }));

            gtf.withUnsub(provider.onQuery(async (query) => {
                await cancelWrapper.promise;

                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    wrapper.resolve();
                }
            }));

            const query = await glue.search.query({ search: "asd" });

            await query.cancel();

            await wrapper.promise;
        });

        it("should throw when sending a result after reaching the max limit, when no max type limit was set", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {

                Array.from({ length: 5 }).forEach(() => {
                    query.sendResult({ type: { name: "test" } });
                });

                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResults: 5 } });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after reaching the max limit, when max type limit was set but not reached", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {

                Array.from({ length: 5 }).forEach((_, idx) => {
                    query.sendResult({ type: { name: `test.${idx}` } });
                });

                try {
                    query.sendResult({ type: { name: "not-test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResults: 5, maxResultsPerType: 4 } });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after reaching the max type limit, when no max limit was set", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {

                Array.from({ length: 5 }).forEach((_) => {
                    query.sendResult({ type: { name: `test` } });
                });

                try {
                    query.sendResult({ type: { name: "test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    query.done();
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResultsPerType: 5 } });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when sending a result after reaching the max type limit, when the max limit was set but not reached", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {

                Array.from({ length: 5 }).forEach((_) => {
                    query.sendResult({ type: { name: `test` } });
                });

                try {
                    query.sendResult({ type: { name: "test" } });
                    wrapper.reject("Should have thrown");
                } catch (error) {
                    query.done();
                    ready();
                }
            }));

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResults: 10, maxResultsPerType: 5 } });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("done", () => {

        it("should not throw", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.done();
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should invoke the client's onCompleted when this is the only provider", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.done();
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("error", () => {

        it("should not throw", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.error("ops");
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should invoke the client's onCompleted when this is the only provider", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.error("ops");
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should invoke the client's onError with correct error data", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQuery((query) => {
                query.error("ops");
                ready();
            }));

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onError((error) => {
                try {
                    expect(error.error).to.eql("ops");
                    expect(error.provider.name).to.eql(provider.name);
                    expect(error.provider.id).to.eql(provider.id);
                    ready();
                } catch (e) {
                    wrapper.reject(e)
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("onQueryCancel", () => {

        it("should not throw", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQueryCancel(() => {}));
        });

        it("should return a function", async () => {
            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            const unsub = provider.onQueryCancel(() => {});

            expect(unsub).to.be.a("function");
        });

        [
            undefined,
            { callback: () => {} },
            42,
            true,
            "yea",
            [() => {}]
        ].forEach((input) => {

            it("should throw when called with invalid callback", async () => {

                const wrapper = gtf.wrapPromise();

                const provider = await glue.search.registerProvider({ name: "test" });

                providersToClear.push(provider);

                try {
                    await gtf.withUnsub(provider.onQueryCancel(input));
                    wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
                } catch (error) {
                    wrapper.resolve();
                }

                await wrapper.promise;

            });
        });

        it("should be called after a query was cancelled", async () => {
            const wrapper = gtf.wrapPromise();

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQueryCancel((cancelMessage) => {
                wrapper.resolve();
            }));

            const query = await glue.search.query({ search: "asd" });

            await query.cancel();

            await wrapper.promise;
        });

        it("should be called with a valid object", async () => {
            const wrapper = gtf.wrapPromise();

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            gtf.withUnsub(provider.onQueryCancel((cancelMessage) => {
                try {
                    expect(cancelMessage).to.not.be.undefined;
                    expect(cancelMessage.id).to.be.a("string");
                    wrapper.resolve();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            const query = await glue.search.query({ search: "asd" });

            await query.cancel();

            await wrapper.promise;
        });

        it("should return a working unsubscribe function", async () => {
            const wrapper = gtf.wrapPromise();

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            const unsub = provider.onQueryCancel((cancelMessage) => {
                wrapper.reject("should have not been called");
            });

            unsub();

            const query = await glue.search.query({ search: "asd" });

            await query.cancel();

            setTimeout(() => wrapper.resolve(), 3000);

            await wrapper.promise;
        });

    });
});
