import { expect } from "chai";
import { createGlue, doneAllGlues } from "../initializer";
import { Glue42Core } from "../../glue";
import { generate } from "shortid";
import { PromiseWrapper } from "../../src/utils/pw";
// tslint:disable:no-unused-expression

describe.only("contexts.complex-update", () => {

    let glue!: Glue42Core.GlueCore;

    beforeEach(async () => {
        glue = await createGlue();
    });

    afterEach(async () => {
        await doneAllGlues();
    });

    // https://jira.tick42.com/browse/G4E-6142
    it.only("writing to same object (update)", () => {

      return new Promise(async (rs, rj) => {

        const name = generate();
        const expectedSubscribeCallbackCalls = 4;
        let subscribeCallbackCalls = 0;

        await (glue.contexts.subscribe(name, (data) => {
            subscribeCallbackCalls += 1;

            if (subscribeCallbackCalls > expectedSubscribeCallbackCalls) {
                throw new Error("Unexpected subscribe callback call");
            }
        }));

        let currentContext = {
            test0: "1",
            test1: { value: "A" },
        };

        await glue.contexts.update(name, currentContext);

        // prove that what you're passing in isn't saved by reference

        currentContext.test1.value = "X";
        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "A" },
            });
        } catch(e) {
            rj(e);
            return;
        }

        // prove that what you're passing in isn't saved by reference
        // (again, because it might be different when first creating the context)

        currentContext.test1.value = "B";
        await glue.contexts.update(name, currentContext);

        currentContext.test1.value = "X";
        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "B" },
            });
        } catch (e) {
            rj(e);
            return;
        }

        // count callback calls

        currentContext.test1.value = "C";
        await glue.contexts.update(name, currentContext);

        currentContext.test1.value = "D";
        await glue.contexts.update(name, currentContext);

        // prove that what you're getting out isn't saved by reference

        currentContext = await glue.contexts.get(name);

        currentContext.test1.value = "X";

        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "D" },
            });
        } catch (e) {
            rj(e);
            return;
        }

        if (subscribeCallbackCalls === expectedSubscribeCallbackCalls) {
            rs(undefined);
        } else {
            rj(new Error(`${subscribeCallbackCalls} subscribe calls, expected ${expectedSubscribeCallbackCalls}`));
        }
      });
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
    it.only("writing to same object (set)", () => {

      return new Promise(async (rs, rj) => {

        const name = generate();
        const expectedSubscribeCallbackCalls = 4;
        let subscribeCallbackCalls = 0;

        await (glue.contexts.subscribe(name, (data) => {
            subscribeCallbackCalls += 1;

            if (subscribeCallbackCalls > expectedSubscribeCallbackCalls) {
                throw new Error("Unexpected subscribe callback call");
            }
        }));

        let currentContext = {
            test0: "1",
            test1: { value: "A" },
        };

        await glue.contexts.set(name, currentContext);

        // prove that what you're passing in isn't saved by reference

        currentContext.test1.value = "X";
        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "A" },
            });
        } catch(e) {
            rj(e);
            return;
        }

        // prove that what you're passing in isn't saved by reference
        // (again, because it might be different when first creating the context)

        currentContext.test1.value = "B";
        await glue.contexts.set(name, currentContext);

        currentContext.test1.value = "X";
        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "B" },
            });
        } catch (e) {
            rj(e);
            return;
        }

        // count callback calls

        currentContext.test1.value = "C";
        await glue.contexts.set(name, currentContext);

        currentContext.test1.value = "D";
        await glue.contexts.set(name, currentContext);

        // prove that what you're getting out isn't saved by reference

        currentContext = await glue.contexts.get(name);

        currentContext.test1.value = "X";

        currentContext = await glue.contexts.get(name);

        try {
            expect(currentContext).to.deep.equal({
                test0 : "1",
                test1 : { value: "D" },
            });
        } catch (e) {
            rj(e);
            return;
        }

        if (subscribeCallbackCalls === expectedSubscribeCallbackCalls) {
            rs(undefined);
        } else {
            rj(new Error(`${subscribeCallbackCalls} subscribe calls, expected ${expectedSubscribeCallbackCalls}`));
        }
      });
    });
});