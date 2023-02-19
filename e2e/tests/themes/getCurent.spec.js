describe("getCurrent ", () => {
    before(() => {
        return coreReady;
    });

    it("Method should exist", () => {
        const method = glue.themes.getCurrent;

        expect(method).to.not.be.undefined;
    });

    it("Method should throw when invoked", (done) => {

        glue.themes.getCurrent()
            .then(() => done("should have thrown"))
            .catch(() => done());

    });

});
