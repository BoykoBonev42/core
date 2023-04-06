describe("Legacy protocol support ", function () {
    let expectedApplicationsArr = [];
    let expectedLayouts = [];
    let keyword;
    let timeout;
    let support;

    before(() => {
        return coreReady;
    });

    beforeEach(async () => {
        keyword = gtf.getWindowName("GSTest");

        support = await gtf.createApp();

        await support.search.createSimpleProvider();
    });

    afterEach(async () => {

        const methodPresent = glue.agm.instance.getMethods().find((m) => m.name === "T42.Search.Client");

        const afterEachArr = [];

        if (methodPresent) {
            afterEachArr.push(glue.agm.unregister("T42.Search.Client"));
        }

        for (const app of expectedApplicationsArr) {
            afterEachArr.push(glue.appManager.inMemory.remove(app.name));
        }

        for (const layout of expectedLayouts) {
            afterEachArr.push(glue.layouts.remove(layout.type, layout.name));
        }


        afterEachArr.push(support.stop());

        expectedApplicationsArr = [];
        keyword = undefined;

        await Promise.all(afterEachArr);
    });

    describe("positive cases ", function () {

        // the search prop should be required
        it.skip("should return an array with results when called with valid args", (done) => {

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items.length).to.not.eql(0)
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search" })
                })
                .catch((err) => {
                    done(err);
                });
        });

        it("should be able to return a result when searching for an Application via Display Name", (done) => {

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "SearchApp",
                    "details": {
                        "url": "about:blank"
                    }
                }
            );

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(expectedApplicationsArr[0].title)
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword })
                })
                .catch((err) => {
                    done(err)
                })
        });

        it("should be able to return a result when searching for an Application via Description", (done) => {

            expectedApplicationsArr.push(
                {
                    "title": "SearchApp",
                    "type": "window",
                    "name": "SearchApp",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].description).to.eql(expectedApplicationsArr[0].caption)
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword })
                })
                .catch((err) => {
                    done(err)
                });

        });

        it("should be able to return a result when searching for an Application via ID", (done) => {

            expectedApplicationsArr.push({
                "title": "SearchApplication",
                "type": "window",
                "name": keyword,
                "details": {
                    "url": "about:blank"
                }
            });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].id).to.eql(expectedApplicationsArr[0].name)
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword })
                })
                .catch((err) => {
                    done(err)
                });

        });

        it("should be able to return results in order from best matching result", (done) => {

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": keyword + "long",
                    "type": "window",
                    "name": "test2",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": keyword + "longer",
                    "type": "window",
                    "name": "test3",
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(expectedApplicationsArr[0].title)
                    expect(searchResults.items[1].displayName).to.eql(expectedApplicationsArr[1].title)
                    expect(searchResults.items[2].displayName).to.eql(expectedApplicationsArr[2].title)
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword });
                })
                .catch((err) => {
                    done(err)
                });
        });

        it("should be able to return results in priority order, Display Name > Description > ID in random order of importing", (done) => {

            expectedApplicationsArr.push(
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(expectedApplicationsArr[1].title);
                    expect(searchResults.items[1].description).to.eql(expectedApplicationsArr[0].caption);
                    expect(searchResults.items[2].id).to.eql(expectedApplicationsArr[2].name);
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword });
                })
                .catch((err) => {
                    done(err);
                });

        });

        it("should be able to return results in priority order, Display Name > Description > ID in matching order of importing", (done) => {

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(expectedApplicationsArr[0].title);
                    expect(searchResults.items[1].description).to.eql(expectedApplicationsArr[1].caption);
                    expect(searchResults.items[2].id).to.eql(expectedApplicationsArr[2].name);
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword });
                })
                .catch((err) => {
                    done(err);
                });

        });

        it("should be able to return results up to a category limit when such is specified", (done) => {

            expectedApplicationsArr.push({
                "title": keyword,
                "type": "window",
                "name": "test1",
                "details": {
                    "url": "about:blank"
                }
            },
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            const exppectedGlobalLayout = {
                name: keyword,
                type: "Global",
                components: []
            };

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    const isApplication = (item) => item.type === 'application';
                    expect(searchResults.items.every(isApplication)).to.eql(true);
                    expect(searchResults.items.length).to.eql(expectedApplicationsArr.length);
                    done();
                } catch (err) {
                    done(err)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge");
                })
                .then(() => {
                    return glue.layouts.import([exppectedGlobalLayout], "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword, types: ["application"] });
                })
                .catch((err) => {
                    done(err);
                });
        });

        it("should be able to return a result when searching for a Global Layout", (done) => {

            const exppectedGlobalLayout = {
                name: keyword,
                type: "Global",
                components: []
            };

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(exppectedGlobalLayout.name);
                    expect(searchResults.items[0].type).to.eql('layout');
                    done();
                } catch (errExp) {
                    done(errExp)
                }
            })
                .then(() => {
                    return glue.layouts.import([exppectedGlobalLayout], "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword });
                })
                .catch((err) => {
                    done(err)
                });

        });

        it("should be able to return a result when searching for a Workspace layout", (done) => {

            const expectedWorkspaceLayout = {
                "name": keyword,
                "type": "Workspace",
                "components": [
                    {
                        "type": "Workspace",
                        "state": {
                            "children": [
                                {
                                    "config": {
                                        "workspaceId": "3Sn9GCEW1",
                                        "showMaximizeButton": true,
                                        "positionIndex": 0,
                                        "allowDrop": true,
                                        "showEjectButton": true,
                                        "allowExtract": true,
                                        "activeTabIndex": 0,
                                        "frameId": "10080_sf_1",
                                        "showAddWindowButton": true
                                    },
                                    "type": "group",
                                    "children": [
                                        {
                                            "type": "window",
                                            "config": {
                                                "workspaceId": "3Sn9GCEW1",
                                                "isLoaded": true,
                                                "positionIndex": 0,
                                                "allowExtract": true,
                                                "appName": "GTF_Canvas_Isolated",
                                                "frameId": "10080_sf_1",
                                                "context": {},
                                                "title": "Test Setup",
                                                "showCloseButton": true,
                                                "isSticky": true,
                                                "instanceId": "10080_23",
                                                "isMaximized": false,
                                                "isFocused": false
                                            }
                                        }
                                    ]
                                }
                            ],
                            "config": {
                                "allowDropBottom": true,
                                "allowDropRight": true,
                                "showWindowCloseButtons": true,
                                "allowDrop": true,
                                "allowExtract": true,
                                "allowSplitters": true,
                                "showEjectButtons": true,
                                "showSaveButton": true,
                                "showAddWindowButtons": true,
                                "allowDropTop": true,
                                "showCloseButton": true,
                                "allowDropLeft": true
                            }
                        }
                    }
                ],
                "version": 2
            };

            expectedLayouts.push(expectedWorkspaceLayout);

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items[0].displayName).to.eql(expectedWorkspaceLayout.name);
                    expect(searchResults.items[0].type).to.eql(expectedWorkspaceLayout.type.toLowerCase());
                    done();
                } catch (err) {
                    done(err);
                }
            })
                .then(() => {
                    return glue.layouts.import([expectedWorkspaceLayout], "merge");
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword });
                })
                .catch((err) => {
                    done(err);
                });
        });

        it("should be able to return results up to a limit when such is specified", (done) => {

            const limit = 2;

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items.length).to.eql(limit)
                    done();
                } catch (errExp) {
                    done(errExp)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge")
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword, limit: limit })
                })
                .catch((err) => {
                    done(err)
                });
        });

        it("should be able to return results up to a category limit when such is specified", (done) => {

            const limit = 3;
            const categoryLimit = 2;

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            const expectedGlobalLayout = {
                name: keyword,
                type: "Global",
                components: []
            };

            expectedLayouts.push(expectedGlobalLayout);

            const results = {
                total: 0,
                appsType: 0
            };

            glue.agm.register("T42.Search.Client", (searchResults) => {
                results.total += searchResults.items.length;
                results.appsType += searchResults.items.filter(obj => obj.category === "Applications").length;

                if (searchResults.status !== "done") {
                    return;
                }

                try {
                    expect(results.total).to.eql(limit)
                    expect(results.appsType).to.eql(categoryLimit)
                    done();
                } catch (errExp) {
                    done(errExp)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge")
                })
                .then(() => {
                    return glue.layouts.import([expectedGlobalLayout], "merge")
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword, limit: limit, categoryLimit: categoryLimit })
                })
                .catch((err) => {
                    done(err)
                });
        });

    });

    describe("negative/corner cases ", function () {

        afterEach(() => {
            if (timeout) {
                clearTimeout(timeout)
                timeout = undefined;
            }
        });

        const invalidArgsForString =
            [
                42,
                {},
                true,
                null,
                undefined,
                [],
                [undefined],
                [null],
                [""],
                [42]
            ];

        const invalidArgsForNumber =
            [
                "42",
                {},
                true,
                null,
                undefined,
                [],
                [32],
                "",
                { number: 32 }
            ];

        it("limit should take priority over categoryLimit when displaying results", (done) => {

            const limit = 2;

            const categoryLimit = 3;


            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test2",
                    "type": "window",
                    "name": "testName2",
                    "caption": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                },
                {
                    "title": "test3",
                    "type": "window",
                    "name": keyword,
                    "details": {
                        "url": "about:blank"
                    }
                });

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items.length).to.eql(limit)
                    done();
                } catch (errExp) {
                    done(errExp)
                }
            })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge")
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword, limit: limit, categoryLimit: categoryLimit })
                })
                .catch((err) => {
                    done(err)
                });

        });

        // the API should reject when an input argument is not valid, not filter out the invalid elements and continue with the valid only
        it.skip("Should return a result for valid types even if incorrect types are present in types array", (done) => {

            //The purpose of this test is to assess the validation of the 'types' array arg, to ensure that GD can filter out only the valid types from the array and display results for them

            const correctAndIncorrectTypesArr = [
                42,
                [],
                "layout",
                "notvalid",
                "workspace"
            ]

            expectedApplicationsArr.push(
                {
                    "title": keyword,
                    "type": "window",
                    "name": "test1",
                    "details": {
                        "url": "about:blank"
                    }
                });

            const layoutsArr = [
                {
                    "name": keyword,
                    "type": "Workspace",
                    "components": [
                        {
                            "type": "Workspace",
                            "state": {
                                "children": [
                                    {
                                        "config": {
                                            "workspaceId": "3Sn9GCEW1",
                                            "showMaximizeButton": true,
                                            "positionIndex": 0,
                                            "allowDrop": true,
                                            "showEjectButton": true,
                                            "allowExtract": true,
                                            "activeTabIndex": 0,
                                            "frameId": "10080_sf_1",
                                            "showAddWindowButton": true
                                        },
                                        "type": "group",
                                        "children": [
                                            {
                                                "type": "window",
                                                "config": {
                                                    "workspaceId": "3Sn9GCEW1",
                                                    "isLoaded": true,
                                                    "positionIndex": 0,
                                                    "allowExtract": true,
                                                    "appName": "GTF_Canvas_Isolated",
                                                    "frameId": "10080_sf_1",
                                                    "context": {},
                                                    "title": "Test Setup",
                                                    "showCloseButton": true,
                                                    "isSticky": true,
                                                    "instanceId": "10080_23",
                                                    "isMaximized": false,
                                                    "isFocused": false
                                                }
                                            }
                                        ]
                                    }
                                ],
                                "config": {
                                    "allowDropBottom": true,
                                    "allowDropRight": true,
                                    "showWindowCloseButtons": true,
                                    "allowDrop": true,
                                    "allowExtract": true,
                                    "allowSplitters": true,
                                    "showEjectButtons": true,
                                    "showSaveButton": true,
                                    "showAddWindowButtons": true,
                                    "allowDropTop": true,
                                    "showCloseButton": true,
                                    "allowDropLeft": true
                                }
                            }
                        }
                    ],
                    "version": 2
                },
                {
                    name: keyword,
                    type: "Global",
                    components: []
                }
            ];

            glue.agm.register("T42.Search.Client", (searchResults) => {
                try {
                    expect(searchResults.items.length).to.eql(layoutsArr.length)
                    done();
                } catch (errExp) {
                    done(errExp)
                }
            })
                .then(() => {
                    return glue.layouts.import(layoutsArr, "merge")
                })
                .then(() => {
                    return glue.appManager.inMemory.import(expectedApplicationsArr, "merge")
                })
                .then(() => {
                    return glue.agm.invoke("T42.Search.Provider", { operation: "search", search: keyword, types: correctAndIncorrectTypesArr })
                })
                .catch((err) => {
                    done(err)
                });

        });

    });

});