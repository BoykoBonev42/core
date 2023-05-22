describe('set() ', function () {
  const contextsForTesting = [
    { type: 'simple' },
    {
      type: 'simpleWithArray',
      arr: [1, 2, 3],
    },
    {
      type: 'arrayWithDifferentTypes',
      arr: [1, '2', {}],
    },
    {
      type: 'nestedObjects',
      first: {
        second: {
          third: {},
        },
      },
    },
    {
      type: 'cubeRepresentation',
      cube: [[[1]], [[2]], [[3]]],
    },
  ];

  let initialContexts;

  before(async () => {
    await coreReady;

    initialContexts = await Promise.all(
      glue.contexts.all().map((contextName) => {
        const context = glue.contexts.get(contextName);
        return { name: contextName, context };
      })
    );

    return Promise.all(glue.contexts.all().map((contextName) => glue.contexts.destroy(contextName)));
  });

  afterEach(() => {
    gtf.clearWindowActiveHooks();

    return Promise.all(glue.contexts.all().map((context) => glue.contexts.destroy(context)));
  });

  after(() => {
    return Promise.all(
      initialContexts.map(({ name, context }) => {
        glue.contexts.update(name, context);
      })
    );
  });

  describe('when manipulated by current app ', function () {
    it('should throw when no arguments are passed', (done) => {
      try {
        glue.contexts.set();
        done('Should throw an error!');
      } catch (error) {
        done();
      }
    });

    it('should throw when only one argument is passed', (done) => {
      try {
        glue.contexts.set(gtf.contexts.getContextName());
        done('Should throw an error!');
      } catch (error) {
        done();
      }
    });

    it('should not throw when 2 valid arguments are passed', async () => {
      let randomContextName = gtf.contexts.getContextName();
      let complexObject = gtf.contexts.generateComplexObject(10);
      await glue.contexts.set(randomContextName, complexObject);
    });

    it('should not throw when more than 2 valid arguments are passed', async () => {
      let randomContextName = gtf.contexts.getContextName();
      let complexObject = gtf.contexts.generateComplexObject(10);
      await glue.contexts.set(randomContextName, complexObject, 'third argument');
    });

    [undefined, null, false, true, '', 42, [], { tick: 42 }].forEach((invalidName) => {
      it(`should throw when an invalid first argument (${JSON.stringify(invalidName)}) is passed`, (done) => {
        const complexObject = gtf.contexts.generateComplexObject(10);

        try {
          glue.contexts.set(invalidName, complexObject);
          done('Should throw an error');
        } catch (error) {
          done();
        }
      });
    });

    [undefined, false, true, '', 42].forEach((invalidData) => {
      it(`should throw when an invalid second argument (${JSON.stringify(invalidData)}) is passed`, (done) => {
        try {
          glue.contexts.set(gtf.contexts.getContextName(), invalidData);
          done('Should throw an error');
        } catch (error) {
          done();
        }
      });
    });

    it.skip('should throw when invoked with null as a second argument', (done) => {
      try {
        glue.contexts.set(gtf.contexts.getContextName(), null);
        done('Should throw an error');
      } catch (error) {
        done();
      }
    });

    it.skip('should throw when invoked with empty array as a second argument', (done) => {
      try {
        glue.contexts.set(gtf.contexts.getContextName(), []);
        done('Should throw an error');
      } catch (error) {
        done();
      }
    });

    it.skip('should return undefined', async () => {
      const context = {
        name: gtf.contexts.getContextName(),
        complexObj: gtf.contexts.generateComplexObject(10),
      };

      const returned = await glue.contexts.set(context.name, context);
      expect(returned).to.eql(undefined);
    });

    it("should create a new context if there isn't one with the given name", async () => {
      const contextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const contextAlreadyExists = glue.contexts.all().includes(contextName);

      if (!contextAlreadyExists) {
        await glue.contexts.set(contextName, complexObject);
      } else {
        throw new Error('Invalid test - context already exists!');
      }

      const newContext = await glue.contexts.get(contextName);
      expect(newContext).to.eql(complexObject);
    });

    it("should create 3 more elements when there aren't any contexts with passed names", async () => {
      const oldLength = glue.contexts.all().length;
      await glue.contexts.set(gtf.contexts.getContextName(), {});
      await glue.contexts.set(gtf.contexts.getContextName(), {});
      await glue.contexts.set(gtf.contexts.getContextName(), {});
      const newLength = glue.contexts.all().length;

      expect(oldLength + 3).to.eql(newLength);
    });

    it("should add one more element to the array returned from all() when there isn't a context with passed name", async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const oldLength = glue.contexts.all().length;
      await glue.contexts.set(randomContextName, complexObject);
      const newLength = glue.contexts.all().length;

      expect(oldLength + 1).to.eql(newLength);
    });

    it('should not add one more element to the array returned from all() when there is a context with passed name', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.set(randomContextName, complexObject);
      const oldContextsLength = glue.contexts.all().length;

      await glue.contexts.set(randomContextName, { newProp: 'value' });
      const newContextsLength = glue.contexts.all().length;

      expect(oldContextsLength).to.eql(newContextsLength);
    });

    it('should remove all previous context properties', async () => {
      const contextName = gtf.contexts.getContextName();
      const initContext = {
        id: gtf.contexts.getContextName(),
        name: 'initial Context',
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.set(contextName, initContext);
      const initialKeys = Object.keys(await glue.contexts.get(contextName));

      const newContext = {
        product: 'GTF',
        company: 'Tick42',
      };

      await glue.contexts.set(contextName, newContext);
      const newKeys = Object.keys(await glue.contexts.get(contextName));

      const repetitiveKeys = initialKeys.filter((key) => newKeys.includes(key));

      expect(repetitiveKeys).to.eql([]);
    });

    it('should replace the context with the passed object when invoked with valid name and data', async () => {
      const contextName = gtf.contexts.getContextName();
      const initContext = {
        id: 'unique identifier',
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.set(contextName, initContext);

      const newContext = {
        name: 'new context',
        title: 'test',
      };

      await glue.contexts.set(contextName, newContext);

      const currentContext = await glue.contexts.get(contextName);
      expect(currentContext).to.eql(newContext);
    });

    it('should create a new complex object when invoked with valid name and complex data', async () => {
      const complexContext = {
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(200),
      };

      await glue.contexts.set(complexContext.name, complexContext);

      const currentContext = await glue.contexts.get(complexContext.name);
      expect(currentContext).to.eql(complexContext);
    });

    it('should replace an existing complex context with another complex object', async () => {
      const contextName = gtf.contexts.getContextName();
      const initComplexContext = {
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await glue.contexts.set(contextName, initComplexContext);

      const newComplexContext = {
        newComplexObj: gtf.contexts.generateComplexObject(200),
      };
      await glue.contexts.set(contextName, newComplexContext);

      const currentContext = await glue.contexts.get(contextName);
      expect(currentContext).to.eql(newComplexContext);
    });

    it("should invoke the callback registered with subscribe() method when there's a subscription for the context", (done) => {
      const contextName = gtf.contexts.getContextName();

      glue.contexts
        .subscribe(contextName, () => {
          done();
        })
        .then(() => glue.contexts.set(contextName, {}));
    });

    it("should invoke the callback registered with subscribe() method with the correct data as first argument when there's a subscription for the context", (done) => {
      const context = {
        name: gtf.contexts.getContextName(),
        complexObj: gtf.contexts.generateComplexObject(10),
      };

      glue.contexts
        .subscribe(context.name, (updatedObject) => {
          try {
            expect(updatedObject).to.eql(context);
            done();
          } catch (error) {
            done(error)
          }

        })
        .then(() => glue.contexts.set(context.name, context))
        .catch((err) => done(err));
    });

    it('should invoke the callback registered with subscribe() method 3 times when a context is changed 3 times', async () => {
      let counter = 0;

      const context = {
        name: gtf.contexts.getContextName(),
        complexObj: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.subscribe(context.name, () => {
        counter++;
      });

      await glue.contexts.set(context.name, context);
      await glue.contexts.set(context.name, { date: new Date() });
      await glue.contexts.set(context.name, { prop: 'value' });

      expect(counter).to.eql(3);
    });

    // https://jira.tick42.com/browse/G4E-6142, G4E-6023
    it("writing to same object (set)", () => {

      return new Promise(async (rs, rj) => {

        const name = gtf.contexts.getContextName();
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

  describe('when manipulated by another app ', function () {
    let secondApp;

    beforeEach(async () => {
      secondApp = await gtf.createApp();
    });

    afterEach(() => secondApp.stop());

    it("should create a new context if there isn't one with the given name", async () => {
      const contextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const contextAlreadyExists = glue.contexts.all().includes(contextName);

      if (!contextAlreadyExists) {
        await secondApp.contexts.set(contextName, complexObject);
      } else {
        throw new Error('Invalid test - context already exists!');
      }

      const newContext = await glue.contexts.get(contextName);
      expect(newContext).to.eql(complexObject);
    });

    it("should create 3 more elements when there aren't any contexts with passed names", async () => {
      const oldLength = glue.contexts.all().length;
      await secondApp.contexts.set(gtf.contexts.getContextName(), {});
      await secondApp.contexts.set(gtf.contexts.getContextName(), {});
      await secondApp.contexts.set(gtf.contexts.getContextName(), {});
      const newLength = glue.contexts.all().length;

      expect(oldLength + 3).to.eql(newLength);
    });

    it("should add one more element to the array returned from all() when there isn't a context with passed name", async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const oldLength = glue.contexts.all().length;
      await secondApp.contexts.set(randomContextName, complexObject);
      const newLength = glue.contexts.all().length;

      expect(oldLength + 1).to.eql(newLength);
    });

    it('should not add one more element to the array returned from all() when there is a context with passed name', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.set(randomContextName, complexObject);
      const oldContextsLength = glue.contexts.all().length;

      await secondApp.contexts.set(randomContextName, { newProp: 'value' });
      const newContextsLength = glue.contexts.all().length;

      expect(oldContextsLength).to.eql(newContextsLength);
    });

    it('should remove all previous context properties', async () => {
      const contextName = gtf.contexts.getContextName();
      const initContext = {
        id: gtf.contexts.getContextName(),
        name: 'initial Context',
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await secondApp.contexts.set(contextName, initContext);
      const initialKeys = Object.keys(await glue.contexts.get(contextName));

      const newContext = {
        product: 'GTF',
        company: 'Tick42',
      };

      await secondApp.contexts.set(contextName, newContext);
      const newKeys = Object.keys(await glue.contexts.get(contextName));

      const repetitiveKeys = initialKeys.filter((key) => newKeys.includes(key));

      expect(repetitiveKeys).to.eql([]);
    });

    it('should replace the context with the passed object when invoked with valid name and data', async () => {
      const contextName = gtf.contexts.getContextName();
      const initContext = {
        id: 'unique identifier',
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await secondApp.contexts.set(contextName, initContext);

      const newContext = {
        name: 'new context',
        title: 'test',
      };

      await secondApp.contexts.set(contextName, newContext);

      const currentContext = await glue.contexts.get(contextName);
      expect(currentContext).to.eql(newContext);
    });

    it('should create a new complex object when invoked with valid name and complex data', async () => {
      const complexContext = {
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(200),
      };

      await secondApp.contexts.set(complexContext.name, complexContext);

      const newContext = await glue.contexts.get(complexContext.name);
      expect(newContext).to.eql(complexContext);
    });

    it('should replace an existing complex context with another complex object', async () => {
      const contextName = gtf.contexts.getContextName();
      const initComplexContext = {
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await secondApp.contexts.set(contextName, initComplexContext);

      const newComplexContext = {
        newComplexObj: gtf.contexts.generateComplexObject(200),
      };
      await secondApp.contexts.set(contextName, newComplexContext);

      const currentContext = await glue.contexts.get(contextName);
      expect(currentContext).to.eql(newComplexContext);
    });

    it("should invoke the callback registered with subscribe() method when there's a subscription for the context", (done) => {
      const contextName = gtf.contexts.getContextName();

      glue.contexts
        .subscribe(contextName, () => {
          done();
        })
        .then(() => secondApp.contexts.set(contextName, {}));
    });

    it("should invoke the callback registered with subscribe() method with the correct data as first argument when there's a subscription for the context", (done) => {
      const context = {
        name: gtf.contexts.getContextName(),
        complexObj: gtf.contexts.generateComplexObject(10),
      };

      glue.contexts
        .subscribe(context.name, (updatedObject) => {
          try {
            expect(updatedObject).to.eql(context);
            done();
          } catch (error) {
            done(error);
          }
        })
        .then(() => secondApp.contexts.set(context.name, context))
        .catch((err) => done(err));
    });

    it('should invoke the callback registered with subscribe() method 3 times when a context is changed 3 times', async () => {
      let counter = 0;

      const context = {
        name: gtf.contexts.getContextName(),
        complexObj: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.subscribe(context.name, () => {
        counter++;
      });

      await glue.contexts.set(context.name, context);
      await glue.contexts.set(context.name, { date: new Date() });
      await glue.contexts.set(context.name, { prop: 'value' });

      expect(counter).to.eql(3);
    });

    contextsForTesting.forEach((context) => {
      it(`should set the context between 2 applications with ${context.type}`, async () => {
        const contextName = gtf.contexts.getContextName();
        await glue.contexts.set(contextName, context);

        const contextFromSecondApp = await secondApp.contexts.get(contextName);

        expect(contextFromSecondApp).to.eql(context);
      });

      it(`should replace the old context when the new context is ${context.type} and 2 applications are used`, async () => {
        const contextName = gtf.contexts.getContextName();
        const initialContext = {
          isSaved: true,
        };

        await glue.contexts.set(contextName, initialContext);
        await glue.contexts.set(contextName, context);

        const contextFromSecondApp = await secondApp.contexts.get(contextName);

        expect(contextFromSecondApp.isSaved).to.be.undefined;
      });
    });

    it('should replace the context when top level properties are the same', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        a: 1,
        b: 2,
      };

      const secondContext = {
        b: 0,
        c: 3,
      };

      await glue.contexts.set(contextName, firstContext);
      await glue.contexts.set(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp).to.eql(secondContext);
    });

    it('should replace the context when inner properties are affected', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        first: {
          a: 1,
          b: 2,
        },
      };

      const secondContext = {
        first: {
          b: 0,
          c: 3,
        },
      };
      await glue.contexts.set(contextName, firstContext);
      await glue.contexts.set(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp).to.eql(secondContext);
    });

    it('should replace the context when top level array is affected', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        a: [1],
        b: [2],
      };

      const secondContext = {
        b: [0],
        c: [3],
      };
      await glue.contexts.set(contextName, firstContext);
      await glue.contexts.set(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp).to.eql(secondContext);
    });

    it('should replace the context when an inner array is affected', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        first: {
          a: [1],
          b: [2],
        },
      };

      const secondContext = {
        first: {
          b: [0],
          c: [3],
        },
      };
      await glue.contexts.set(contextName, firstContext);
      await glue.contexts.set(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp).to.eql(secondContext);
    });
  });
});
