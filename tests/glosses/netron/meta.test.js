const {
    is,
    netron: {
        meta: {
            Reflection,
            Context,
            Public
        }
    }
} = adone;

describe("meta", () => {
    describe("from()", () => {
        @Context()
        class A {
            @Public()
            method() { }
        }

        it("not instance", () => {
            const err = assert.throws(() => Reflection.from("a"));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("class instead instance", () => {
            const err = assert.throws(() => Reflection.from(A));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("class without constructor", () => {
            class SomeClass { }
            const err = assert.throws(() => Reflection.from(new SomeClass()));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("Object instead instance", () => {
            const err = assert.throws(() => Reflection.from(Object));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("empty function instead instance", () => {
            const err = assert.throws(() => Reflection.from(adone.noop));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("instance of unnamed class", () => {
            const a = (new
                class {
                    method() {
                    }
                }()
            );

            const err = assert.throws(() => Reflection.from(a));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("instance with no public methods", () => {
            @Context()
            class A {
                method() {
                }
            }

            const err = assert.throws(() => Reflection.from(new A()));
            assert.instanceOf(err, adone.error.NotValid);
        });

        it("valid instance", () => {
            Reflection.from(new A());
        });

        describe.only("define publics from context decorator", () => {
            it("by default all public methods", () => {
                class TheBase {
                    @Public({
                        description: "some base method"
                    })
                    baseMethod() {

                    }
                }

                @Context({
                    public: true
                })
                class A extends TheBase {
                    prop1 = "prop1";

                    method1() {

                    }

                    method2(arg1) {

                    }

                    _method3() {

                    }
                }

                const r = Reflection.from(new A());
                assert.sameMembers([...r.getMethods().keys()], ["baseMethod", "method1", "method2"]);

                const meta = r.getMethodMeta("baseMethod");
                assert.strictEqual(meta.description, "some base method");
            });

            it("by list of names", () => {
                class TheBase {
                    baseMethod() {

                    }
                }

                @Context({
                    public: [
                        "_method3",
                        "baseMethod"
                    ]
                })
                class A extends TheBase {
                    prop1 = "prop1";

                    method1() {

                    }

                    method2(arg1) {

                    }

                    _method3() {

                    }
                }

                const r = Reflection.from(new A());
                assert.sameMembers([...r.getMethods().keys()], ["baseMethod", "_method3"]);
            });

            it("by keys", () => {
                class TheBase {
                    baseMethod() {

                    }
                }

                @Context({
                    public: {
                        method2: {
                            description: "method2 info"
                        },
                        baseMethod: {
                            type: String
                        }
                    }
                })
                class A extends TheBase {
                    prop1 = "prop1";

                    method1() {

                    }

                    method2(arg1) {

                    }

                    _method3() {

                    }
                }

                const r = Reflection.from(new A());
                assert.sameMembers([...r.getMethods().keys()], ["baseMethod", "method2"]);

                assert.strictEqual(r.getMethodMeta("method2").description, "method2 info");

                const baseMethodMeta = r.getMethodMeta("baseMethod");
                assert.true(is.undefined(baseMethodMeta.description));
                assert.strictEqual(baseMethodMeta.type, String);
            });

            it("all methods except private list", () => {
                class TheBase {
                    @Public({
                        description: "some base method"
                    })
                    baseMethod() {

                    }
                }

                @Context({
                    public: true,
                    private: "method2"
                })
                class A extends TheBase {
                    prop1 = "prop1";

                    method1() {

                    }

                    method2(arg1) {

                    }

                    _method3() {

                    }
                }

                const r = Reflection.from(new A());
                assert.sameMembers([...r.getMethods().keys()], ["baseMethod", "method1"]);

                const meta = r.getMethodMeta("baseMethod");
                assert.strictEqual(meta.description, "some base method");
            });
        });
    });

    describe("complex contexts", () => {
        @Context({
            public: {
                prop5: {
                    type: Map,
                    readonly: true,
                    description: "some property"
                }
            },
            description: "about A class"
        })
        class A {
            @Public()
            publicMethod() {
            }

            @Public()
            publicMethodWithArgs(arg1, arg2) {
            }

            @Public({
                type: String
            })
            publicMethodReturnsString() {
            }

            @Public({
                type: Number,
                args: ["args", RegExp, [Date, "dt"]]
            })
            publicMethodWithArgsReturnsNumber() {
            }

            privateMethodWithArgsReturnsPromise(arg1, dt) {
            }

            @Public({
                description: "method1 description",
                args: [[Array, "arg1"], [Symbol, "arg2"]]
            })
            method1(arg1, arg2) {
            }

            @Public({
                args: [[String, "redefArg1"], [Map, "redefArg2"], [Boolean], Date, ["someArg"]]
            })
            methodWithRedefinedArgs(arg1, arg2, arg3, arg4, arg5, arg6) {
            }

            @Public({
                args: [[String, "redefArg1"], [Map, "redefArg2"], [String], String, ["someArg"], Map, [Map]]
            })
            methodWithRedefinedArgs1(arg1, arg2) {
            }

            @Public({
                readonly: true
            })
            prop1 = new RegExp("word");

            @Public({
                type: String
            })
            prop2 = new RegExp("word");

            prop3 = 888;

            @Public({
                type: Error
            })
            prop4 = undefined;

            prop5 = null;

            prop6 = undefined;
        }

        const a = new A();
        const aReflect = Reflection.from(a);

        it("class name", () => {
            expect(aReflect.getName()).to.be.equal("A");
        });

        it("class description", () => {
            expect(aReflect.getDescription()).to.be.equal("about A class");
        });

        it("public methods should be processed", () => {
            expect(aReflect.hasMethod("publicMethod")).to.be.true();
            expect(aReflect.hasMethod("publicMethodWithArgs")).to.be.true();
            expect(aReflect.hasMethod("publicMethodReturnsString")).to.be.true();
            expect(aReflect.hasMethod("publicMethodWithArgsReturnsNumber")).to.be.true();
            expect(aReflect.hasMethod("method1")).to.be.true();
            expect(aReflect.hasMethod("methodWithRedefinedArgs")).to.be.true();
            expect(aReflect.hasMethod("methodWithRedefinedArgs1")).to.be.true();
        });

        it("private methods should not be processed", () => {
            expect(aReflect.hasMethod("privateMethodWithArgsReturnsPromise")).to.be.false();
        });

        it("public properties should be processed", () => {
            expect(aReflect.hasProperty("prop1")).to.be.true();
            expect(aReflect.hasProperty("prop2")).to.be.true();
            expect(aReflect.hasProperty("prop4")).to.be.true();
            expect(aReflect.hasProperty("prop5")).to.be.true();
        });

        it("private properties should not be processed", () => {
            expect(aReflect.hasProperty("prop3")).to.be.false();
            expect(aReflect.hasProperty("prop6")).to.be.false();
        });

        it("readonly property", () => {
            expect(aReflect.getPropertyMeta("prop1").readonly).to.be.true();
            expect(aReflect.getPropertyMeta("prop2").readonly).to.be.false();
            expect(aReflect.getPropertyMeta("prop4").readonly).to.be.false();
            expect(aReflect.getPropertyMeta("prop5").readonly).to.be.true();
        });

        it("method without args", () => {
            expect(aReflect.getMethodSignature("publicMethod")).to.be.equal("<undefined> publicMethod()");
        });

        it("method with args", () => {
            expect(aReflect.getMethodSignature("publicMethodWithArgs")).to.be.equal("<undefined> publicMethodWithArgs(<undefined> arg1, <undefined> arg2)");
        });

        it("method without args and with return type", () => {
            expect(aReflect.getMethodSignature("method1")).to.be.equal("<undefined> method1(<Array> arg1, <Symbol> arg2)");
            expect(aReflect.getMethodSignature("publicMethodReturnsString")).to.be.equal("<String> publicMethodReturnsString()");
            expect(aReflect.getMethodSignature("publicMethodWithArgsReturnsNumber")).to.be.equal("<Number> publicMethodWithArgsReturnsNumber(<undefined> args, <RegExp> regArg1, <Date> dt)");
        });

        it("method with redefined args", () => {
            expect(aReflect.getMethodSignature("methodWithRedefinedArgs")).to.be.equal("<undefined> methodWithRedefinedArgs(<String> redefArg1, <Map> redefArg2, <Boolean> arg3, <Date> arg4, <undefined> someArg, <undefined> arg6)");
        });

        it("method with redefined args", () => {
            expect(aReflect.getMethodSignature("methodWithRedefinedArgs1")).to.be.equal("<undefined> methodWithRedefinedArgs1(<String> redefArg1, <Map> redefArg2, <String> strArg2, <String> strArg3, <undefined> someArg, <Map> mapArg5, <Map> mapArg6)");
        });

        it("property without type specified", () => {
            expect(aReflect.getPropertySignature("prop1")).to.be.equal("<RegExp> prop1");
        });

        it("property with type specified", () => {
            expect(aReflect.getPropertySignature("prop2")).to.be.equal("<String> prop2");
        });

        it("property with initial undefined", () => {
            expect(aReflect.getPropertySignature("prop4")).to.be.equal("<Error> prop4");
        });

        it("property decorated at class level", () => {
            expect(aReflect.getPropertySignature("prop5")).to.be.equal("<Map> prop5");
        });

        it("is.netronContex", () => {
            @Context()
            class ContextableClass {
            }

            class NonContextableClass {
            }

            assert.true(is.netronContext(ContextableClass));
            assert.false(is.netronContext(NonContextableClass));
            assert.true(is.netronContext(new ContextableClass()));
            assert.false(is.netronContext(new NonContextableClass()));
        });

        it("Reflectio#getName()", () => {
            @Context()
            class ComplexClassName {
                @Public()
                method() { }
            }

            @Context()
            class ComplexClassNameChild extends ComplexClassName {
            }

            @Context()
            class ComplexClassNameChild2 extends ComplexClassNameChild {
            }

            const r1 = Reflection.from(new ComplexClassName());
            const r2 = Reflection.from(new ComplexClassNameChild());
            const r3 = Reflection.from(new ComplexClassNameChild2());

            assert.equal(r1.getName(), "ComplexClassName");
            assert.equal(r2.getName(), "ComplexClassNameChild");
            assert.equal(r3.getName(), "ComplexClassNameChild2");
        });
    });

    describe.only("contextify()", () => {
        class SubSimple {
            subMethod() {

            }
        }

        class Simple extends SubSimple {
            method1() {
                return 888;
            }

            _privMethod1() {
                return 999;
            }
        }

        it("contextify class is not allowed", () => {
            assert.throws(() => adone.netron.contextify(Simple), adone.error.NotValid);
        });

        it("contextify already contextified class", () => {
            @Context()
            class MyContext {
                method2() {
                    return true;
                }
            }

            assert.throws(() => adone.netron.contextify(new MyContext()), adone.error.NotValid);
        });

        it("contextify instance of regular class", async () => {
            const instance = new Simple();

            const r = Reflection.from(adone.netron.contextify(instance));

            assert.sameMembers([...r.getMethods().keys()], ["method1", "subMethod"]);
        });
    });
});
