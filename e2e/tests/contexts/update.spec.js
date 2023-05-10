describe('update() ', () => {
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

  before(async () => {
    await coreReady;

    initialContexts = await Promise.all(
      glue.contexts.all().map((contextName) => {
        const context = glue.contexts.get(contextName);
        return { name: contextName, context };
      })
    );

    return Promise.all(glue.contexts.all().map((context) => glue.contexts.destroy(context)));
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
        glue.contexts.update();
        done('Should throw an error');
      } catch (error) {
        done();
      }
    });

    it('should throw when only one argument is passed', (done) => {
      try {
        glue.contexts.update(gtf.contexts.getContextName());
        done('Should throw an error');
      } catch (error) {
        done();
      }
    });

    it('should not throw when 2 valid arguments are passed', async () => {
      let randomContextName = gtf.contexts.getContextName();
      let complexObject = gtf.contexts.generateComplexObject(10);
      await glue.contexts.update(randomContextName, complexObject);
    });

    it('should not throw when more than 2 valid arguments are passed', async () => {
      let randomContextName = gtf.contexts.getContextName();
      let complexObject = gtf.contexts.generateComplexObject(10);
      await glue.contexts.update(randomContextName, complexObject, 'Tick42');
    });

    [undefined, null, false, true, '', 42, [], { tick: 42 }, ['string']].forEach((invalidName) => {
      it(`should throw when an invalid first argument (${JSON.stringify(invalidName)}) is passed`, (done) => {
        const complexObject = gtf.contexts.generateComplexObject(10);

        try {
          glue.contexts.update(invalidName, complexObject);
          done('Should throw an error');
        } catch (error) {
          done();
        }
      });
    });

    [undefined, false, true, '', 42].forEach((invalidData) => {
      it(`should throw when an invalid second argument (${JSON.stringify(invalidData)}) is passed`, (done) => {
        try {
          glue.contexts.update(gtf.contexts.getContextName(), invalidData);
          done('Should throw an error');
        } catch (error) {
          done();
        }
      });
    });

    it.skip('should throw when invoked with null as a second argument', (done) => {
      try {
        glue.contexts.update(gtf.contexts.getContextName(), null);
        done('Should throw an error');
      } catch (error) {
        done();
      }
    });

    it.skip('should throw when invoked with empty array as a second argument', (done) => {
      try {
        glue.contexts.update(gtf.contexts.getContextName(), []);
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

      const returned = await glue.contexts.update(context.name, context);
      expect(returned).to.eql(undefined);
    });

    it("should create a new context when there isn't one with the given context name", async () => {
      const contextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const contextAlreadyExists = glue.contexts.all().includes(contextName);

      if (!contextAlreadyExists) {
        await glue.contexts.update(contextName, complexObject);
      } else {
        throw new Error('Invalid test - context already exists!');
      }

      const newContext = await glue.contexts.get(contextName);
      expect(newContext).to.eql(complexObject);
    });

    it("should create 3 more elements when there aren't any contexts with passed names", async () => {
      const oldLength = glue.contexts.all().length;
      await glue.contexts.update(gtf.contexts.getContextName(), {});
      await glue.contexts.update(gtf.contexts.getContextName(), {});
      await glue.contexts.update(gtf.contexts.getContextName(), {});
      const newLength = glue.contexts.all().length;

      expect(oldLength + 3).to.eql(newLength);
    });

    it("should add one more element to the array returned from all() when there isn't a context with passed name", async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const oldLength = glue.contexts.all().length;
      await glue.contexts.update(randomContextName, complexObject);
      const newLength = glue.contexts.all().length;

      expect(oldLength + 1).to.eql(newLength);
    });

    it('should not add one more element to the array returned from all() when there is a context with passed name', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.update(randomContextName, complexObject);
      const oldContextsLength = glue.contexts.all().length;

      await glue.contexts.update(randomContextName, { newProp: 'value' });
      const newContextsLength = glue.contexts.all().length;

      expect(oldContextsLength).to.eql(newContextsLength);
    });

    it('should add new context keys to an existing context when invoked with valid name and data', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.update(randomContextName, complexObject);
      const initialKeysLength = Object.keys(await glue.contexts.get(randomContextName)).length;

      const newContext = {
        unique: 'unique',
        title: randomContextName,
      };

      await glue.contexts.update(randomContextName, newContext);

      const newKeysLength = Object.keys(await glue.contexts.get(randomContextName)).length;

      expect(initialKeysLength + 2).to.eql(newKeysLength);
      expect([...Object.keys(complexObject), ...Object.keys(newContext)]).to.eql(Object.keys(await glue.contexts.get(randomContextName)));
    });

    it('should update already existing key values when invoked with valid name and data', async () => {
      const context = {
        id: 'unique identifier',
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(10),
      };
      await glue.contexts.update(context.name, context);
      const newId = { id: 'NEW unique identifier' };
      await glue.contexts.update(context.name, newId);
      const updatedContext = await glue.contexts.get(context.name);

      expect(updatedContext.id).to.eql(newId.id);
    });

    it('should remove context keys when passed data has already existing keys set to null', async () => {
      const context = {
        id: 'unique identifier',
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.update(context.name, context);
      const initialKeys = Object.keys(await glue.contexts.get(context.name));
      const keyToRemove = { id: null };
      await glue.contexts.update(context.name, keyToRemove);
      const newKeys = Object.keys(await glue.contexts.get(context.name));

      expect(newKeys.includes('id')).to.be.false;
      expect(initialKeys.length - 1).to.eql(newKeys.length);
    });

    it('should create a new complex object when invoked with valid name and complex data', async () => {
      const complexContext = {
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await glue.contexts.update(complexContext.name, complexContext);

      const newContext = await glue.contexts.get(complexContext.name);
      expect(newContext).to.eql(complexContext);
    });

    it('should update an existing complex context with another complex object', async () => {
      const contextName = gtf.contexts.getContextName();
      const initComplexContext = {
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await glue.contexts.update(contextName, initComplexContext);

      const newComplexContext = {
        newComplexObj: gtf.contexts.generateComplexObject(200),
      };
      await glue.contexts.update(contextName, newComplexContext);

      const newContext = await glue.contexts.get(contextName);
      expect(newContext).to.eql(Object.assign({}, initComplexContext, newComplexContext));
    });

    it("should invoke the callback registered with subscribe() method when there's a subscription for the context", (done) => {
      const contextName = gtf.contexts.getContextName();

      glue.contexts
        .subscribe(contextName, () => {
          done();
        })
        .then(() => glue.contexts.update(contextName, {}));
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
        .then(() => glue.contexts.update(context.name, context))
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

      await glue.contexts.update(context.name, context);
      await glue.contexts.update(context.name, { date: new Date() });
      await glue.contexts.update(context.name, { prop: 'value' });

      expect(counter).to.eql(3);
    });
  });

  describe('when manipulated by another app ', function () {
    let secondApp;

    beforeEach(async () => {
      secondApp = await gtf.createApp();
    });

    afterEach(() => secondApp.stop());

    it("should add one more element to the array returned from all() when there isn't a context with passed name", async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      const oldLength = glue.contexts.all().length;
      await secondApp.contexts.update(randomContextName, complexObject);
      const newLength = glue.contexts.all().length;

      expect(oldLength + 1).to.eql(newLength);
    });

    it('should not add one more element to the array returned from all() when there is a context with passed name', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.update(randomContextName, complexObject);
      const oldContextsLength = glue.contexts.all().length;

      await secondApp.contexts.update(randomContextName, { newProp: 'value' });
      const newContextsLength = glue.contexts.all().length;

      expect(oldContextsLength).to.eql(newContextsLength);
    });

    it('should add new context keys to an existing context created by another app when invoked with valid name and data', async () => {
      const randomContextName = gtf.contexts.getContextName();
      const complexObject = gtf.contexts.generateComplexObject(10);

      await glue.contexts.update(randomContextName, complexObject);
      const initialKeysLength = Object.keys(await glue.contexts.get(randomContextName)).length;

      const newContext = {
        unique: 'unique',
        title: randomContextName,
      };

      await secondApp.contexts.update(randomContextName, newContext);

      const newKeysLength = Object.keys(await glue.contexts.get(randomContextName)).length;

      expect(initialKeysLength + 2).to.eql(newKeysLength);
      expect([...Object.keys(complexObject), ...Object.keys(newContext)]).to.eql(Object.keys(await glue.contexts.get(randomContextName)));
    });

    it('should update already existing key values of a context created by another app when invoked with valid name and data', async () => {
      const context = {
        id: 'unique identifier',
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(10),
      };
      await glue.contexts.update(context.name, context);
      const newId = { id: 'NEW unique identifier' };
      await secondApp.contexts.update(context.name, newId);
      const updatedContext = await glue.contexts.get(context.name);

      expect(updatedContext.id).to.eql(newId.id);
    });

    it('should remove context keys of a context created by another app when passed data has already existing keys set to null', async () => {
      const context = {
        id: 'unique identifier',
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(10),
      };

      await glue.contexts.update(context.name, context);
      const initialKeys = Object.keys(await glue.contexts.get(context.name));
      const keyToRemove = { id: null };
      await secondApp.contexts.update(context.name, keyToRemove);
      const newKeys = Object.keys(await glue.contexts.get(context.name));

      expect(newKeys.includes('id')).to.be.false;
      expect(initialKeys.length - 1).to.eql(newKeys.length);
    });

    it('should create a new complex object when invoked with valid name and complex data', async () => {
      const complexContext = {
        name: gtf.contexts.getContextName(),
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await secondApp.contexts.update(complexContext.name, complexContext);

      const newContext = await glue.contexts.get(complexContext.name);
      expect(newContext).to.eql(complexContext);
    });

    it('should update an existing complex context with another complex object', async () => {
      const contextName = gtf.contexts.getContextName();
      const initComplexContext = {
        complexObject: gtf.contexts.generateComplexObject(200),
      };
      await secondApp.contexts.update(contextName, initComplexContext);

      const newComplexContext = {
        newComplexObj: gtf.contexts.generateComplexObject(200),
      };
      await secondApp.contexts.update(contextName, newComplexContext);

      const newContext = await glue.contexts.get(contextName);
      expect(newContext).to.eql(Object.assign({}, initComplexContext, newComplexContext));
    });

    it("should invoke the callback registered with subscribe() method when there's a subscription for the context", (done) => {
      const contextName = gtf.contexts.getContextName();

      glue.contexts
        .subscribe(contextName, () => {
          done();
        })
        .then(() => secondApp.contexts.update(contextName, {}));
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
        .then(() => secondApp.contexts.update(context.name, context))
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

      await secondApp.contexts.update(context.name, context);
      await secondApp.contexts.update(context.name, { date: new Date() });
      await secondApp.contexts.update(context.name, { prop: 'value' });

      expect(counter).to.eql(3);
    });

    contextsForTesting.forEach((context) => {
      it(`should update the context between 2 applications with ${context.type}`, async () => {
        const contextName = gtf.contexts.getContextName();
        await glue.contexts.update(contextName, context);

        const contextFromSecondApp = await secondApp.contexts.get(contextName);

        expect(contextFromSecondApp).to.eql(context);
      });
    });

    it('should merge the contexts when top level properties are the same', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        a: 1,
        b: 2,
      };

      const secondContext = {
        b: 0,
        c: 3,
      };

      await glue.contexts.update(contextName, firstContext);
      await glue.contexts.update(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp.a).to.eql(firstContext.a);
      expect(contextFromSecondApp.b).to.eql(secondContext.b);
      expect(contextFromSecondApp.c).to.eql(secondContext.c);
    });

    it.skip('should merge the contexts when inner properties are affected', async () => {
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

      await glue.contexts.update(contextName, firstContext);
      await glue.contexts.update(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp.first.a).to.eql(firstContext.first.a);
      expect(contextFromSecondApp.first.b).to.eql(secondContext.first.b);
      expect(contextFromSecondApp.first.c).to.eql(secondContext.first.c);
    });

    it(`should not replace the old context when the new context is ${context.type} and 2 applications are used`, async () => {
      const contextName = gtf.contexts.getContextName();
      const initialContext = {
        isSaved: true,
      };

      await glue.contexts.update(contextName, initialContext);
      await glue.contexts.update(contextName, { context: 'context' });

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp.isSaved).to.be.true;
    });

    it.skip('should merge the contexts when top level array is affected', async () => {
      const contextName = gtf.contexts.getContextName();
      const firstContext = {
        a: [1],
        b: [2],
      };

      const secondContext = {
        b: [0],
        c: [3],
      };

      await glue.contexts.update(contextName, firstContext);
      await glue.contexts.update(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp.a).to.eql(firstContext.a);
      expect(contextFromSecondApp.b).to.eql([...secondContext.b, ...firstContext.b]);
      expect(contextFromSecondApp.c).to.eql(secondContext.c);
    });

    it.skip('should merge the contexts when an inner array is affected', async () => {
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

      await glue.contexts.update(contextName, firstContext);
      await glue.contexts.update(contextName, secondContext);

      const contextFromSecondApp = await secondApp.contexts.get(contextName);

      expect(contextFromSecondApp.first.a).to.eql(firstContext.first.a);
      expect(contextFromSecondApp.first.b).to.eql([...secondContext.first.b, ...firstContext.first.b]);
      expect(contextFromSecondApp.first.c).to.eql(secondContext.first.c);
    });

    // https://jira.tick42.com/browse/G4E-6022
    it("concurrent updates", async () => {
        const name = gtf.contexts.getContextName();

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
  });
});
