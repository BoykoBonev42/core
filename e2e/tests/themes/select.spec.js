describe("select ", () => {
    before(() => {
        return coreReady;
    });

    it("Method should exist", () => {
        const method = glue.themes.select;

        expect(method).to.not.be.undefined;
    });

    it("Method should throw when invoked", (done) => {

        glue.themes.select("dark")
            .then(() => done("should have thrown"))
            .catch(() => done());

    });

    [
        undefined,
        42,
        {name: "dark"},
        ["dark"],
        true
    ].forEach((input) => {
        it("Method should throw when invoked with invalid argument", () => {
            glue.themes.select(input)
            .then(() => done("should have thrown"))
            .catch(() => done());
        });
    });

});
