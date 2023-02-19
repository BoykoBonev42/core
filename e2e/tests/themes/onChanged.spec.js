describe("onChanged ", () => {
    before(() => {
        return coreReady;
    });

    it("Method should exist", () => {
        const method = glue.themes.onChanged;

        expect(method).to.not.be.undefined;
    });

    it("Method should throw when invoked", (done) => {

        glue.themes.onChanged(() => {})
            .then(() => done("should have thrown"))
            .catch(() => done());

    });

    [
        undefined,
        42,
        {name: "dark"},
        ["dark"],
        true,
        "dark"
    ].forEach((input) => {
        it("Method should throw when invoked with invalid argument", () => {
            glue.themes.onChanged(input)
            .then(() => done("should have thrown"))
            .catch(() => done());
        });
    });
});
