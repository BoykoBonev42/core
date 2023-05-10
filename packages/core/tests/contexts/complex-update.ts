import { expect } from "chai";
import { createGlue, doneAllGlues } from "../initializer";
import { Glue42Core } from "../../glue";
import { generate } from "shortid";
import { PromiseWrapper } from "../../src/utils/pw";
// tslint:disable:no-unused-expression

describe("contexts.complex-update", () => {

    let glue!: Glue42Core.GlueCore;

    beforeEach(async () => {
        glue = await createGlue();
    });

    afterEach(async () => {
        await doneAllGlues();
    });

    // https://jira.tick42.com/browse/G4E-6022
    it("concurrent updates", async () => {
        const name = generate();

        console.log(name)
        console.log(name)
        const promises = [
            glue.contexts.update(name, { my: "a" }),
            glue.contexts.update(name, { your: "b" })
        ];

        await Promise.allSettled(promises);
        const result = await glue.contexts.get(name);
        expect(result).to.deep.equal({
            my : "a",
            your : "b"
        });
    });

    // https://jira.tick42.com/browse/G4E-6023
    it("writing to same object", async () => {
        const pw1 = new PromiseWrapper();
        const pw2 = new PromiseWrapper();
        const name = generate();

        await glue.contexts.subscribe(name, (data) => {
            if (pw2.resolved) {
                throw new Error("Unexpected subscribe call");
            } else if (pw1.resolved) {
                pw2.resolve();
            } else {
                pw1.resolve();
            }
        });

        let currentContext = {
            test0: "1",
            test1: "A",
        };

        await glue.contexts.set(name, currentContext);

        currentContext.test1 = "B";
        await glue.contexts.set(name, currentContext);

        currentContext = await glue.contexts.get(name);

        // prove that what you're passing in isn't saved by reference
        expect(currentContext).to.deep.equal({
            test0 : "1",
            test1 : "B",
        });

        currentContext.test1 = "C";
        await glue.contexts.set(name, currentContext);
        
        // prove that what you're passing in isn't saved by reference
        // (again, because it might be different when first creating the context)
        expect(currentContext).to.deep.equal({
            test0 : "1",
            test1 : "C",
        });

        const result = await glue.contexts.get(name);
        currentContext.test1 = "D";

        // prove that what you're getting out isn't saved by reference
        expect(result).to.deep.equal({
            test0 : "1",
            test1 : "C",
        });

        await pw1.promise;
        await pw2.promise;
    });
});