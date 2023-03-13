describe("getDebounceMS ", () => {
    before(() => {
        return coreReady;
    });

    it("should not throw", () => {
        glue.search.getDebounceMS();
    });

    it("should return a number", () => {
        const debounceMS = glue.search.getDebounceMS();

        expect(debounceMS).to.be.a("number");
    });

    it("should return 0 when no debounce was set", async () => {
        const debounceMS = glue.search.getDebounceMS();

        expect(debounceMS).to.eql(0);
    });

    it("should return 10 when debounce was set to 10", async () => {
        glue.search.setDebounceMS(10);

        const debounceMS = glue.search.getDebounceMS();

        expect(debounceMS).to.eql(10);

        glue.search.setDebounceMS(0);
    });

});
