describe("list ", () => {
    before(() => {
        return coreReady;
    });

    it("Method should exist", () => {
        const method = glue.themes.list;

        expect(method).to.not.be.undefined;
    });

    it("Method should throw when invoked", (done) => {

        glue.themes.list()
            .then(() => done("should have thrown"))
            .catch(() => done());

    });

});
