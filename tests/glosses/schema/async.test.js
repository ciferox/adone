describe("schema", "compileAsync method", () => {
    const { schema: { Validator } } = adone;

    let instance;
    let loadCallCount;

    const SCHEMAS = {
        "http://example.com/object.json": {
            id: "http://example.com/object.json",
            properties: {
                a: { type: "string" },
                b: { $ref: "int2plus.json" }
            }
        },
        "http://example.com/int2plus.json": {
            id: "http://example.com/int2plus.json",
            type: "integer",
            minimum: 2
        },
        "http://example.com/tree.json": {
            id: "http://example.com/tree.json",
            type: "array",
            items: { $ref: "leaf.json" }
        },
        "http://example.com/leaf.json": {
            id: "http://example.com/leaf.json",
            properties: {
                name: { type: "string" },
                subtree: { $ref: "tree.json" }
            }
        },
        "http://example.com/recursive.json": {
            id: "http://example.com/recursive.json",
            properties: {
                b: { $ref: "parent.json" }
            },
            required: ["b"]
        },
        "http://example.com/invalid.json": {
            id: "http://example.com/recursive.json",
            properties: {
                invalid: { type: "number" }
            },
            required: "invalid"
        },
        "http://example.com/foobar.json": {
            id: "http://example.com/foobar.json",
            $schema: "http://example.com/foobar_meta.json",
            myFooBar: "foo"
        },
        "http://example.com/foobar_meta.json": {
            id: "http://example.com/foobar_meta.json",
            type: "object",
            properties: {
                myFooBar: {
                    enum: ["foo", "bar"]
                }
            }
        }
    };

    beforeEach(() => {
        loadCallCount = 0;
        instance = new Validator({ loadSchema });
    });

    it("should compile schemas loading missing schemas with options.loadSchema function", () => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: { $ref: "object.json" }
            }
        };
        return instance.compileAsync(schema).then((validate) => {
            expect(loadCallCount).to.be.equal(2);
            expect(validate).to.be.a("function");
            expect(validate({ a: { b: 2 } })).to.be.equal(true);
            expect(validate({ a: { b: 1 } })).to.be.equal(false);
        });
    });

    it("should compile schemas loading missing schemas and return function via callback", (done) => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: { $ref: "object.json" }
            }
        };
        instance.compileAsync(schema, (err, validate) => {
            expect(err).not.to.be.ok();
            expect(loadCallCount).to.be.equal(2);
            expect(validate).to.be.a("function");
            expect(validate({ a: { b: 2 } })).to.be.equal(true);
            expect(validate({ a: { b: 1 } })).to.be.equal(false);

            done();
        });
    });

    it("should correctly load schemas when missing reference has JSON path", () => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: { $ref: "object.json#/properties/b" }
            }
        };
        return instance.compileAsync(schema).then((validate) => {
            expect(loadCallCount).to.be.equal(2);
            expect(validate).to.be.a("function");
            expect(validate({ a: 2 })).to.be.equal(true);
            expect(validate({ a: 1 })).to.be.equal(false);
        });
    });

    it("should correctly compile with remote schemas that have mutual references", () => {
        const schema = {
            id: "http://example.com/root.json",
            properties: {
                tree: { $ref: "tree.json" }
            }
        };
        return instance.compileAsync(schema).then((validate) => {
            expect(validate).to.be.a("function");
            const validData = { tree: [{ name: "a", subtree: [{ name: "a.a" }] }, { name: "b" }] };
            const invalidData = { tree: [{ name: "a", subtree: [{ name: 1 }] }] };
            expect(validate(validData)).to.be.equal(true);
            expect(validate(invalidData)).to.be.equal(false);
        });
    });

    it("should correctly compile with remote schemas that reference the compiled schema", () => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: { $ref: "recursive.json" }
            }
        };
        return instance.compileAsync(schema).then((validate) => {
            expect(loadCallCount).to.be.equal(1);
            expect(validate).to.be.a("function");
            const validData = { a: { b: { a: { b: {} } } } };
            const invalidData = { a: { b: { a: {} } } };
            expect(validate(validData)).to.be.equal(true);
            expect(validate(invalidData)).to.be.equal(false);
        });
    });

    it('should resolve reference containing "properties" segment with the same property (issue #220)', () => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: {
                    $ref: "object.json#/properties/a"
                }
            }
        };
        return instance.compileAsync(schema).then((validate) => {
            expect(loadCallCount).to.be.equal(2);
            expect(validate).to.be.a("function");
            expect(validate({ a: "foo" })).to.be.equal(true);
            expect(validate({ a: 42 })).to.be.equal(false);
        });
    });

    describe("loading metaschemas (#334)", () => {
        it("should load metaschema if not available", () => {
            return test(SCHEMAS["http://example.com/foobar.json"], 1);
        });

        it("should load metaschema of referenced schema if not available", () => {
            return test({ $ref: "http://example.com/foobar.json" }, 2);
        });

        function test(schema, expectedLoadCallCount) {
            instance.addKeyword("myFooBar", {
                type: "string",
                validate(sch, data) {
                    return sch == data;
                }
            });

            return instance.compileAsync(schema).then((validate) => {
                expect(loadCallCount).to.be.equal(expectedLoadCallCount);
                expect(validate).to.be.a("function");
                expect(validate("foo")).to.be.equal(true);
                expect(validate("bar")).to.be.equal(false);
            });
        }
    });

    it("should return compiled schema on the next tick if there are no references (#51)", () => {
        const schema = {
            id: "http://example.com/int2plus.json",
            type: "integer",
            minimum: 2
        };
        let beforeCallback1;
        const p1 = instance.compileAsync(schema).then((validate) => {
            expect(beforeCallback1).to.be.equal(true);

            spec(validate);
            let beforeCallback2;
            const p2 = instance.compileAsync(schema).then((_validate) => {
                expect(beforeCallback2).to.be.equal(true);

                spec(_validate);
            });
            beforeCallback2 = true;
            return p2;
        });
        beforeCallback1 = true;
        return p1;

        function spec(validate) {
            expect(loadCallCount).to.be.equal(0);
            expect(validate).to.be.a("function");
            const validData = 2;
            const invalidData = 1;
            expect(validate(validData)).to.be.equal(true);
            expect(validate(invalidData)).to.be.equal(false);
        }
    });

    it("should queue calls so only one compileAsync executes at a time (#52)", () => {
        const schema = {
            id: "http://example.com/parent.json",
            properties: {
                a: { $ref: "object.json" }
            }
        };

        return Promise.all([instance.compileAsync(schema).then(spec), instance.compileAsync(schema).then(spec), instance.compileAsync(schema).then(spec)]);

        function spec(validate) {
            expect(loadCallCount).to.be.equal(2);
            expect(validate).to.be.a("function");
            expect(validate({ a: { b: 2 } })).to.be.equal(true);
            expect(validate({ a: { b: 1 } })).to.be.equal(false);
        }
    });

    it("should throw exception if loadSchema is not passed", (done) => {
        const schema = {
            id: "http://example.com/int2plus.json",
            type: "integer",
            minimum: 2
        };
        instance = new Validator();
        expect(() => {
            instance.compileAsync(schema, () => {
                done(new Error("it should have thrown exception"));
            });
        }).to.throw();
        setTimeout(() => {
            // function is needed for the test to pass in Firefox 4
            done();
        });
    });

    describe("should return error via callback", () => {
        it("if passed schema is invalid", (done) => {
            const invalidSchema = {
                id: "http://example.com/int2plus.json",
                type: "integer",
                minimum: "invalid"
            };
            instance.compileAsync(invalidSchema, shouldFail(done));
        });

        it("if loaded schema is invalid", (done) => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "invalid.json" }
                }
            };
            instance.compileAsync(schema, shouldFail(done));
        });

        it("if required schema is loaded but the reference cannot be resolved", (done) => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "object.json#/definitions/not_found" }
                }
            };
            instance.compileAsync(schema, shouldFail(done));
        });

        it("if loadSchema returned error", (done) => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "object.json" }
                }
            };
            instance = new Validator({ loadSchema: badLoadSchema });
            instance.compileAsync(schema, shouldFail(done));

            function badLoadSchema() {
                return Promise.reject(new Error("cant load"));
            }
        });

        it("if schema compilation throws some other exception", (done) => {
            instance.addKeyword("badkeyword", { compile: badCompile });
            const schema = { badkeyword: true };
            instance.compileAsync(schema, shouldFail(done));

            function badCompile() /* schema */ {
                throw new Error("cant compile keyword schema");
            }
        });

        function shouldFail(done) {
            return function (err, validate) {
                expect(err).to.be.ok();
                expect(validate).not.to.be.ok();
                done();
            };
        }
    });

    describe("should return error via promise", () => {
        it("if passed schema is invalid", () => {
            const invalidSchema = {
                id: "http://example.com/int2plus.json",
                type: "integer",
                minimum: "invalid"
            };
            return shouldReject(instance.compileAsync(invalidSchema));
        });

        it("if loaded schema is invalid", () => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "invalid.json" }
                }
            };
            return shouldReject(instance.compileAsync(schema));
        });

        it("if required schema is loaded but the reference cannot be resolved", () => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "object.json#/definitions/not_found" }
                }
            };
            return shouldReject(instance.compileAsync(schema));
        });

        it("if loadSchema returned error", () => {
            const schema = {
                id: "http://example.com/parent.json",
                properties: {
                    a: { $ref: "object.json" }
                }
            };
            instance = new Validator({ loadSchema: badLoadSchema });
            return shouldReject(instance.compileAsync(schema));

            function badLoadSchema() {
                return Promise.reject(new Error("cant load"));
            }
        });

        it("if schema compilation throws some other exception", () => {
            instance.addKeyword("badkeyword", { compile: badCompile });
            const schema = { badkeyword: true };
            return shouldReject(instance.compileAsync(schema));

            function badCompile() /* schema */ {
                throw new Error("cant compile keyword schema");
            }
        });

        function shouldReject(p) {
            return p.then((validate) => {
                expect(validate).not.to.be.ok();
                throw new Error("Promise has resolved; it should have rejected");
            }, (err) => {
                expect(err).to.be.ok();
            });
        }
    });

    function loadSchema(uri) {
        loadCallCount++;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (SCHEMAS[uri]) {
                    resolve(SCHEMAS[uri]);
                } else {
                    reject(new Error("404"));
                }
            }, 10);
        });
    }
});
