describe("query ", () => {

    const sampleResult = { type: { name: "asd", displayName: "Asd" }, id: "gosho", displayName: "Gosho", description: "This is Gosho", action: { method: "gosho.invoke", target: "all", params: { test: 42 } } };

    let providersToClear = [];

    const startProvider = async (provConfig, data = [], error, resultPause = 0) => {
        const provider = await glue.search.registerProvider(provConfig);

        providersToClear.push(provider);

        provider.onQuery(async (query) => {
            try {
                for (const d of data) {
                    query.sendResult(d);
                    await gtf.simpleWait(resultPause);
                }
            } catch (error) {
                //
            }
            if (error) {
                query.error(error);
                return;
            }
            query.done();
        });

        return provider;
    };

    const startSmartProvider = async (provConfig, providerQueryWrapper) => {
        const provider = await glue.search.registerProvider(provConfig);

        providersToClear.push(provider);

        let currentQuery;

        provider.onQuery((query) => {
            currentQuery = query;
            providerQueryWrapper.resolve();
        });

        const sendResult = (result) => currentQuery.sendResult(result);

        const sendError = (error) => currentQuery.error(error);

        const sendDone = () => currentQuery.done();

        return {
            provider,
            sendResult,
            sendError,
            sendDone
        };
    };

    before(() => {
        return coreReady;
    });

    afterEach(async () => {
        gtf.clearAllUnsubFuncs();
        glue.search.setDebounceMS(0);

        await Promise.all(providersToClear.map((provider) => provider.unregister()));

        providersToClear = [];
    });

    it("should resolve when called with valid query config", async () => {
        const wrapper = gtf.wrapPromise();

        await startProvider({ name: "test" });

        const query = await glue.search.query({ search: "asd" });

        await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

        await wrapper.promise;

    });

    it("should resolve with a valid query when called with valid query config", async () => {
        const query = await glue.search.query({ search: "asd" });

        expect(query.cancel).to.be.a("function");
        expect(query.onResults).to.be.a("function");
        expect(query.onCompleted).to.be.a("function");
        expect(query.onError).to.be.a("function");
    });

    [
        undefined,
        null,
        true,
        42,
        "yes",
        [{ search: "asd" }]
    ].forEach((input) => {

        it("Should reject when called with invalid query config", (done) => {

            glue.search.query(input)
                .then(() => done(`Should not have resolved -> ${JSON.stringify(input)}`))
                .catch(() => done());

        });

    });

    it("should reject when called with query config without search", (done) => {
        glue.search.query({})
            .then(() => done("Should not have resolved"))
            .catch(() => done());
    });

    [
        { search: "asd", providers: true },
        { search: "asd", providers: 42 },
        { search: "asd", providers: "yes" },
        { search: "asd", providers: { name: "asd" } },
        { search: "asd", providers: [{ yes: true }] }
    ].forEach((input) => {
        it("should reject when called with query config with invalid providers", async () => {

            glue.search.query(input)
                .then(() => done(`Should not have resolved -> ${JSON.stringify(input)}`))
                .catch(() => done());

        });

    });

    [
        { search: "asd", types: true },
        { search: "asd", types: 42 },
        { search: "asd", types: "yes" },
        { search: "asd", types: { name: "asd" } },
        { search: "asd", types: [{ yes: true }] }
    ].forEach((input) => {
        it("should reject when called with query config with invalid types", async () => {

            glue.search.query(input)
                .then(() => done(`Should not have resolved -> ${JSON.stringify(input)}`))
                .catch(() => done());

        });

    });

    [
        { search: "asd", providerLimits: true },
        { search: "asd", providerLimits: 42 },
        { search: "asd", providerLimits: "yes" },
        { search: "asd", providerLimits: { maxResults: "asd" } },
        { search: "asd", providerLimits: [{ yes: true }] }
    ].forEach((input) => {
        it("should reject when called with query config with invalid provider limits", async () => {

            glue.search.query(input)
                .then(() => done(`Should not have resolved -> ${JSON.stringify(input)}`))
                .catch(() => done());

        });

    });

    describe("onResults ", () => {

        it("should not throw ", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults(() => {}));

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;
        });

        it("should return a function", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onResults(() => {});

            expect(unsub).to.be.a("function");

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;
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

                await startProvider({ name: "test" });

                const query = await glue.search.query({ search: "asd" });

                try {
                    await gtf.withUnsub(query.onResults(input));
                    wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
                } catch (error) {
                    // noop
                }

                await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

                await wrapper.promise;

            });
        });

        it("should be called with a valid query results batch", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            await startProvider({ name: "test" }, [sampleResult]);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {
                    expect(resultBatch.results).to.be.an("array");
                    expect(resultBatch.provider).to.be.an("object");
                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with a query results batch with correct provider info", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            await startProvider({ name: "test" }, [sampleResult]);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {
                    expect(resultBatch.provider).to.be.an("object");
                    expect(resultBatch.provider.name).to.eql("test");
                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with a query results batch with one correct result when one provider sent one result", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            await startProvider({ name: "test" }, [sampleResult]);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {
                    expect(resultBatch.results).to.be.an("array");
                    expect(resultBatch.results.length).to.eql(1);

                    const expected = sampleResult;
                    const actual = resultBatch.results[0];

                    gtf.compareSearchResult(expected, actual, expect);

                    ready();
                } catch (error) {
                    console.log(JSON.stringify(error));
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with a query results batch with two correct results when one provider sent two results", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const secondResult = Object.assign({}, sampleResult, { id: "gosho2", displayName: "Gosho2" });

            const data = [sampleResult, secondResult];

            await startProvider({ name: "test" }, data);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {
                    expect(resultBatch.results).to.be.an("array");
                    expect(resultBatch.results.length).to.eql(2);

                    resultBatch.results.forEach((result, idx) => {
                        gtf.compareSearchResult(result, data[idx], expect);
                    });

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with query results batches with two correct results when two providers sent one result each", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const secondResult = Object.assign({}, sampleResult, { id: "gosho2", displayName: "Gosho2" });

            const data = [sampleResult, secondResult];

            await startProvider({ name: "test" }, [data[0]]);
            await startProvider({ name: "test2" }, [data[1]]);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {

                    if (resultBatch.provider.name === "test") {
                        gtf.compareSearchResult(resultBatch.results[0], data[0], expect);
                    }

                    if (resultBatch.provider.name === "test2") {
                        gtf.compareSearchResult(resultBatch.results[0], data[1], expect);
                    }

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should return a working unsubscribe function", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            setTimeout(() => ready(), 3000);

            await startProvider({ name: "test" }, [sampleResult]);

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onResults(() => {
                wrapper.reject("should not have been called")
            });

            unsub();

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should not be called after onCompleted was invoked", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            provider.onQuery(async (query) => {
                query.sendResult(sampleResult);
                query.done();

                setTimeout(() => {
                    try {
                        query.sendResult(sampleResult);
                    } catch (error) {
                        //
                    }
                }, 1000);
            });

            setTimeout(() => ready(), 3000);

            let resultDelivered = false;

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults(() => {
                if (!resultDelivered) {
                    resultDelivered = true;
                    ready();
                    return;
                }
                wrapper.reject("should not have been called a second time")
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should not be called with more than 10 results from one provider when provider max limit is set to 10, even when the provider tries to push 20 results", async () => {
            const wrapper = gtf.wrapPromise();

            const lotsOfData = Array.from({ length: 20 }).map((_, idx) => {
                return Object.assign({}, sampleResult, { id: `${sampleResult.id}${idx}`, displayName: `${sampleResult.displayName}${idx}` });
            });

            await startProvider({ name: "test" }, lotsOfData);

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResults: 10 } });

            let receivedResultsCount = 0;

            await gtf.withUnsub(query.onResults((resultBatch) => {
                receivedResultsCount += resultBatch.results.length;
            }));

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;

            expect(receivedResultsCount).to.eql(10);
        });

        it("should not be called with more than 5 results per type from one provider when provider max type limit is set to 5", async () => {
            const wrapper = gtf.wrapPromise();

            const lotsOfData = Array.from({ length: 20 }).map((_, idx) => {
                return Object.assign({}, sampleResult, { id: `${sampleResult.id}${idx}`, displayName: `${sampleResult.displayName}${idx}` });
            });

            await startProvider({ name: "test" }, lotsOfData);

            const query = await glue.search.query({ search: "asd", providerLimits: { maxResultsPerType: 5, maxResults: 20 } });

            let receivedResultsCount = 0;

            await gtf.withUnsub(query.onResults((resultBatch) => {
                receivedResultsCount += resultBatch.results.length;
            }));

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;

            expect(receivedResultsCount).to.eql(5);
        });

        it("should not be called with any result when the query config has a defined provider, but that provider does not have results and another one has", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            setTimeout(() => ready(), 3000);

            await startProvider({ name: "test" });
            await startProvider({ name: "test2" }, [sampleResult]);

            const provider = (await glue.search.listProviders()).find((pr) => pr.name === "test");

            const query = await glue.search.query({ search: "asd", providers: [provider] });

            await gtf.withUnsub(query.onResults(() => {
                wrapper.reject("should not have been called");
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called only with the results from the specified provider when two providers are present and both have results", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const secondResult = Object.assign({}, sampleResult, { id: "gosho2", displayName: "Gosho2" });

            await startProvider({ name: "test" }, [sampleResult]);
            await startProvider({ name: "test2" }, [secondResult]);

            const provider = (await glue.search.listProviders()).find((pr) => pr.name === "test");

            const query = await glue.search.query({ search: "asd", providers: [provider] });

            await gtf.withUnsub(query.onResults((resultsBatch) => {
                try {
                    if (resultsBatch.provider.name !== "test") {
                        wrapper.reject("Should not receive results from anyone other than test");
                        return;
                    }

                    expect(resultsBatch.results).to.be.an("array");
                    expect(resultsBatch.results.length).to.eql(1);

                    const expected = sampleResult;
                    const actual = resultsBatch.results[0];

                    gtf.compareSearchResult(expected, actual, expect);

                    ready()
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should throw when calling with an empty array of providers", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            try {
                const query = await glue.search.query({ search: "asd", providers: [] });

                await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

                wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
            } catch (error) {
                wrapper.resolve();
            }

            await wrapper.promise;
        });

        it("should throw when calling with an empty array of types", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            try {
                const query = await glue.search.query({ search: "asd", types: [] });

                await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

                wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
            } catch (error) {
                wrapper.resolve();
            }

            await wrapper.promise;
        });

        it("should be called only with the specified type when a provider tries to send two different result types", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const secondResult = Object.assign({}, sampleResult, { id: "gosho2", displayName: "Gosho2", type: { name: "asd2" } });

            const data = [sampleResult, secondResult];

            await startProvider({ name: "test", types: [{ name: "asd" }, { name: "asd2" }] }, data);

            const query = await glue.search.query({ search: "asd", types: [{ name: "asd" }] });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                try {
                    expect(resultBatch.results).to.be.an("array");
                    expect(resultBatch.results.length).to.eql(1);

                    gtf.compareSearchResult(resultBatch.results[0], sampleResult, expect);

                    ready();
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => {
                ready();
            }));

            await wrapper.promise;
        });

        it("should not be called when there are no providers", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            setTimeout(() => ready(), 3000);

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onResults(() => {
                wrapper.reject("should not have been called")
            });

            unsub();

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("onCompleted", () => {
        it("should not throw ", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;
        });

        it("should return a function", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onCompleted(() => wrapper.resolve());

            expect(unsub).to.be.a("function");

            await wrapper.promise;
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

                await startProvider({ name: "test" });

                const query = await glue.search.query({ search: "asd" });

                try {
                    await gtf.withUnsub(query.onCompleted(input));
                    wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
                } catch (error) {
                    // noop
                }

                await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

                await wrapper.promise;

            });
        });

        it("should not invoke any more onResult after calling onCompleted", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const provider = await glue.search.registerProvider({ name: "test" });

            providersToClear.push(provider);

            provider.onQuery(async (query) => {
                query.sendResult(sampleResult);
                query.done();

                setTimeout(() => {
                    try {
                        query.sendResult(sampleResult);
                    } catch (error) {
                        //
                    }
                }, 1000);
            });

            setTimeout(() => ready(), 3000);

            let resultDelivered = false;

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults(() => {
                if (!resultDelivered) {
                    resultDelivered = true;
                    ready();
                    return;
                }
                wrapper.reject("should not have been called a second time")
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called when there are no providers called", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            setTimeout(() => ready(), 3000);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });
    });

    describe("onError", () => {

        it("should not throw", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onError(() => {}));

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;
        });

        it("should return a function", async () => {
            const wrapper = gtf.wrapPromise();

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onError(() => {});

            expect(unsub).to.be.a("function");

            await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

            await wrapper.promise;
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

                await startProvider({ name: "test" });

                const query = await glue.search.query({ search: "asd" });

                try {
                    await gtf.withUnsub(query.onError(input));
                    wrapper.reject(`Should have thrown: ${JSON.stringify(input)}`);
                } catch (error) {
                    // noop
                }

                await gtf.withUnsub(query.onCompleted(() => wrapper.resolve()));

                await wrapper.promise;

            });
        });

        it("should return a working unsubscribe function", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const errorMessage = "Ops something went wrong!";

            await startProvider({ name: "test" }, [], errorMessage);

            setTimeout(() => ready(), 3000);

            const query = await glue.search.query({ search: "asd" });

            const unsub = query.onError(() => {
                wrapper.reject("Should not have been called.");
            });

            unsub();

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with a valid query error object", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const errorMessage = "Ops something went wrong!";

            await startProvider({ name: "test" }, [], errorMessage);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onError((queryError) => {
                try {
                    expect(queryError).to.not.be.undefined;
                    expect(queryError.provider).to.be.an("object");
                    expect(queryError.provider.name).to.eql("test");
                    ready()
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should be called with correct error as sent by the provider", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const errorMessage = "Ops something went wrong!";

            await startProvider({ name: "test" }, [], errorMessage);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onError((queryError) => {
                try {
                    expect(queryError.error).to.eql(errorMessage);
                    ready()
                } catch (error) {
                    wrapper.reject(error);
                }
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should receive onCompleted after receiving onError from the only provider", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(2, () => wrapper.resolve());

            const errorMessage = "Ops something went wrong!";

            await startProvider({ name: "test" }, [], errorMessage);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onError(() => {
                ready();
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

        it("should receive onResult and onCompleted even when one of the two providers errored with no results sent and the other sent one result", async () => {
            const wrapper = gtf.wrapPromise();

            const ready = gtf.waitFor(3, () => wrapper.resolve());

            const errorMessage = "Ops something went wrong!";

            await startProvider({ name: "test" }, [], errorMessage);
            await startProvider({ name: "test2" }, [sampleResult]);

            const query = await glue.search.query({ search: "asd" });

            let errorCalled = false;
            let resultsCalled = false;

            await gtf.withUnsub(query.onError(() => {
                if (errorCalled) {
                    wrapper.reject("error was already heard");
                    return;
                }

                errorCalled = true;
                ready();
            }));

            await gtf.withUnsub(query.onResults(() => {
                if (resultsCalled) {
                    wrapper.reject("results was already heard");
                    return;
                }

                resultsCalled = true;
                ready();
            }));

            await gtf.withUnsub(query.onCompleted(() => ready()));

            await wrapper.promise;
        });

    });

    describe("cancel", () => {

        it("should resolve", async () => {

            await startProvider({ name: "test" });

            const query = await glue.search.query({ search: "asd" });

            await query.cancel();
        });

        it("should not receive any more onResult when called", async () => {
            const secondResult = Object.assign({}, sampleResult, { id: "gosho2", displayName: "Gosho2", type: { name: "asd2" } });

            const masterWrapper = gtf.wrapPromise();
            const resultsWrapper = gtf.wrapPromise();
            const providerQueryWrapper = gtf.wrapPromise();

            const smartProvider = await startSmartProvider({ name: "test" }, providerQueryWrapper);

            const query = await glue.search.query({ search: "asd" });

            await gtf.withUnsub(query.onResults((resultBatch) => {
                if (resultBatch.results[0].id === sampleResult.id) {
                    resultsWrapper.resolve();
                }

                if (resultBatch.results[0].id === secondResult.id) {
                    masterWrapper.reject("should not have heard this result");
                }
            }));

            await providerQueryWrapper.promise;

            smartProvider.sendResult(sampleResult);

            await resultsWrapper.promise;

            await query.cancel();

            setTimeout(() => masterWrapper.resolve(), 3000);

            try {
                smartProvider.sendResult(secondResult);
            } catch (error) {
                // expected to throw
            }

            await masterWrapper.promise;
        });

        it("should not receive onCompleted when called", async () => {
            const masterWrapper = gtf.wrapPromise();
            const providerQueryWrapper = gtf.wrapPromise();

            const smartProvider = await startSmartProvider({ name: "test" }, providerQueryWrapper);

            const query = await glue.search.query({ search: "asd" });

            await providerQueryWrapper.promise;

            await gtf.withUnsub(query.onCompleted(() => masterWrapper.reject("should not have been called")));
            
            smartProvider.sendResult(sampleResult);

            await query.cancel();

            setTimeout(() => masterWrapper.resolve(), 3000);

            await masterWrapper.promise;
        });

        it("should not receive onError when called", async () => {
            const masterWrapper = gtf.wrapPromise();
            const providerQueryWrapper = gtf.wrapPromise();

            const smartProvider = await startSmartProvider({ name: "test" }, providerQueryWrapper);

            const query = await glue.search.query({ search: "asd" });

            await providerQueryWrapper.promise;

            await gtf.withUnsub(query.onError(() => masterWrapper.reject("should not have been called")));
            
            smartProvider.sendResult(sampleResult);

            await query.cancel();

            setTimeout(() => masterWrapper.resolve(), 3000);

            await masterWrapper.promise;
        });

    });

});
