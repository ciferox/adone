const is = adone.is;
const format = adone.std.util.format;
const { Public, Private, Readonly, Contextable, Type, Args, Description, Property, Method, Twin } = adone.netron.decorator;
const Investigator = adone.netron.Investigator;

// Not consider order and keys repetition
function shallow_equal(array1, array2) {
    assert.includeMembers(array1, array2);
    assert.includeMembers(array2, array1);
}

function randomString(N) {
    return (Math.random().toString(36) + "00000000000000000").slice(2, N + 2);
}

function* generateArgs(types) {
    for (const [typeName1, type1] of types) {
        for (const [typeName3, type3] of types) {
            for (const [typeName5, type5] of types) {
                const argName2 = randomString(8);
                const argName4 = randomString(8);
                const argName5 = randomString(8);
                yield [
                    [typeName1,   type1,     "a",      type1], // 1 argument
                    ["undefined", undefined, argName2, argName2], // 2 argument
                    [typeName3,   type3,     "c",      [type3]], // 3 argument
                    ["undefined", undefined, argName4, [argName4]], // 4 argument
                    [typeName5,   type5,     argName5, [type5, argName5]] // 5 argument
                ];
            }
        }
    }
}

@Description("about A class")
@Property("prop5", { type: Map, readonly: true, description: "some property" })
@Property("prop6", { private: true, type: Set })
class A {
    constructor() {
        this.prop5 = null;
        this.prop6 = undefined;
    }

    publicMethod() {
    }

    publicMethodWithArgs(arg1, arg2) {
    }

    @Type(String)
    publicMethodReturnsString() {
    }

    @Type(Number)
    @Args("args", RegExp, [Date, "dt"])
    publicMethodWithArgsReturnsNumber() {
    }

    @Type(Promise)
    @Args("arg1", Date)
    @Private
    privateMethodWithArgsReturnsPromise(arg1, dt) {
    }

    @Type(undefined)
    @Args([Array, "arg1"], [Symbol, "arg2"])
    @Description("method1 description")
    method1(arg1, arg2) {
    }

    @Args([String, "redefArg1"], [Map, "redefArg2"], [Boolean], Date, ["someArg"])
    methodWithRedefinedArgs(arg1, arg2, arg3, arg4, arg5, arg6) {
    }

    @Args([String, "redefArg1"], [Map, "redefArg2"], [String], String, ["someArg"], Map, [Map])
    methodWithRedefinedArgs1(arg1, arg2) {
    }

    prop1 = new RegExp("word");

    @Type(String)
    prop2 = new RegExp("word");

    @Private
    @Description("private property")
    prop3 = 888;

    @Type(Error)
    prop4 = undefined;
}

const a = new A();
const ia = new Investigator(a);

describe("Meta", () => {
    describe("Single class", function () {
        it("class name", function () {
            expect(ia.getName()).to.be.equal("A");
        });

        it("class description", function () {
            expect(ia.getDescription()).to.be.equal("about A class");
        });

        it("public/private method", function () {
            expect(ia.getMethodMetadata("methodWithRedefinedArgs").private).to.be.false;
            expect(ia.getMethodMetadata("privateMethodWithArgsReturnsPromise").private).to.be.true;
            expect(ia.getMethodMetadata("publicMethodWithArgs").private).to.be.false;
        });

        it("public/private property", function () {
            expect(ia.getPropertyMetadata("prop3").private).to.be.true;
            expect(ia.getPropertyMetadata("prop4").private).to.be.false;
            expect(ia.getPropertyMetadata("prop1").private).to.be.false;
            expect(ia.getPropertyMetadata("prop5").private).to.be.false;
            expect(ia.getPropertyMetadata("prop6").private).to.be.true;
        });

        it("readonly property", function () {
            expect(ia.getPropertyMetadata("prop2").readonly).to.be.false;
            expect(ia.getPropertyMetadata("prop5").readonly).to.be.true;
            expect(ia.getPropertyMetadata("prop1").readonly).to.be.false;
            expect(ia.getPropertyMetadata("prop6").readonly).to.be.false;
            expect(ia.getPropertyMetadata("prop4").readonly).to.be.false;
        });

        it("public method without args and decorators", function () {
            expect(ia.getMethodSignature("publicMethod")).to.be.equal("<undefined> publicMethod()");
        });

        it("public method with args and without decorators", function () {
            expect(ia.getMethodSignature("publicMethodWithArgs")).to.be.equal("<undefined> publicMethodWithArgs(<undefined> arg1, <undefined> arg2)");
        });

        it("public method without args and with return", function () {
            expect(ia.getMethodSignature("publicMethodReturnsString")).to.be.equal("<String> publicMethodReturnsString()");
        });

        it("public method with args decorator and with return", function () {
            expect(ia.getMethodSignature("publicMethodWithArgsReturnsNumber")).to.be.equal("<Number> publicMethodWithArgsReturnsNumber(<undefined> args, <RegExp> regArg1, <Date> dt)");
        });

        it("private method with args decorator and with return", function () {
            expect(ia.getMethodSignature("privateMethodWithArgsReturnsPromise")).to.be.equal("<Promise> privateMethodWithArgsReturnsPromise(<undefined> arg1, <Date> dt)");
        });

        it("private method with args decorator and with return", function () {
            expect(ia.getMethodSignature("method1")).to.be.equal("<undefined> method1(<Array> arg1, <Symbol> arg2)");
        });

        it("public method with redefined args", function () {
            expect(ia.getMethodSignature("methodWithRedefinedArgs")).to.be.equal("<undefined> methodWithRedefinedArgs(<String> redefArg1, <Map> redefArg2, <Boolean> arg3, <Date> arg4, <undefined> someArg, <undefined> arg6)");
        });

        it("public method with redefined args", function () {
            expect(ia.getMethodSignature("methodWithRedefinedArgs1")).to.be.equal("<undefined> methodWithRedefinedArgs1(<String> redefArg1, <Map> redefArg2, <String> strArg2, <String> strArg3, <undefined> someArg, <Map> mapArg5, <Map> mapArg6)");
        });

        it("public property without decorators", function () {
            expect(ia.getPropertySignature("prop1")).to.be.equal("<RegExp> prop1");
        });

        it("public property with type specified", function () {
            expect(ia.getPropertySignature("prop2")).to.be.equal("<String> prop2");
        });

        it("private property with description", function () {
            expect(ia.getPropertySignature("prop3")).to.be.equal("<Number> prop3");
        });

        it("public property with initial undefined", function () {
            expect(ia.getPropertySignature("prop4")).to.be.equal("<Error> prop4");
        });

        it("public indirect property with description", function () {
            expect(ia.getPropertySignature("prop5")).to.be.equal("<Map> prop5");
        });

        it("private indirect property", function () {
            expect(ia.getPropertySignature("prop6")).to.be.equal("<Set> prop6");
        });

        it("property without descriptor", function () {
            class SomeClass {
                method() {}
                prop = 1;
            }
            SomeClass.prototype.prop2 = 1; // no descriptor
            let isOK = true;
            try {
                const sc = new SomeClass();
                new Investigator(sc);
            } catch (err) {
                isOK = false;
            }
            expect(isOK).to.be.true;
        });
    });

    describe("New tests", function () {
        it("isContextable", function () {

            @Contextable
            class ContextableClass {
            }

            class NonContextableClass {
            }

            assert.equal(Investigator.isContextable(ContextableClass), true);
            assert.equal(Investigator.isContextable(NonContextableClass), false);
            assert.equal(Investigator.isContextable(new ContextableClass()), true);
            assert.equal(Investigator.isContextable(new NonContextableClass()), false);
        });

        it("getName", function () {

            class ComplexClassName {
            }

            class ComplexClassNameChild extends ComplexClassName {
            }

            class ComplexClassNameChild2 extends ComplexClassNameChild {
            }

            const inv1 = new Investigator(new ComplexClassName);
            const inv2 = new Investigator(new ComplexClassNameChild);
            const inv3 = new Investigator(new ComplexClassNameChild2);

            assert.equal(inv1.getName(), "ComplexClassName");
            assert.equal(inv2.getName(), "ComplexClassNameChild");
            assert.equal(inv3.getName(), "ComplexClassNameChild2");
        });

        let ParentForMethod = Object;
        let ParentForProp = Object;
        let LastMethodClass = null;
        let LastPropertyClass = null;
        let ParentDescribedClass = Object;
        let ParentMethodPropertyClass = Object;

        for (let ilevel = 1; ilevel <= 3; ++ilevel) {
            describe("Inheritance level: " + ilevel, function () {
                it("getDescription", function () {

                    const classDesc = "class description";
                    const methodDesc = "method description";
                    const propertyDesc = "property description";

                    @Description(classDesc)
                    class DescribedClass extends ParentDescribedClass {

                        @Description(methodDesc)
                        method() {}

                        @Description(propertyDesc)
                        property = 1;
                    }
                    ParentDescribedClass = DescribedClass;

                    const inv = new Investigator(new DescribedClass);

                    assert.equal(inv.getDescription(), classDesc);
                    assert.equal(inv.getMethodMetadata("method").description, methodDesc);
                    assert.equal(inv.getPropertyMetadata("property").description, propertyDesc);
                });

                it("getMethods/Properties functions", function () {
                    class MethodPropertyClass extends ParentMethodPropertyClass {
                        @Public
                        method1() {}
                        @Private
                        method2() {}

                        @Public
                        property1 = 1;
                        @Private
                        property2 = 2;
                        @Readonly
                        property3 = 3;
                    }
                    ParentMethodPropertyClass = MethodPropertyClass;

                    const inv = new Investigator(new MethodPropertyClass);

                    // Methods
                    const privateMethods = Array.from(inv.getPrivateMethods().keys());
                    const publicMethods  = Array.from(inv.getPublicMethods().keys());
                    const allMethods     = Array.from(inv.getMethods().keys());

                    assert.includeMembers(allMethods, privateMethods);
                    assert.includeMembers(allMethods, publicMethods);
                    shallow_equal(allMethods, publicMethods.concat(privateMethods));
                    assert.equal(inv.hasMethod(allMethods[0]), true);
                    assert.equal(inv.hasMethod(allMethods[0] + "no"), false);

                    // Properties
                    const privateProperties  = Array.from(inv.getPrivateProperties().keys());
                    const publicProperties   = Array.from(inv.getPublicProperties().keys());
                    const readonlyProperties = Array.from(inv.getReadonlyProperties().keys());
                    const allProperties      = Array.from(inv.getProperties().keys());

                    assert.includeMembers(allProperties, privateProperties);
                    assert.includeMembers(allProperties, publicProperties);
                    assert.includeMembers(allProperties, readonlyProperties);
                    shallow_equal(allProperties, publicProperties.concat(privateProperties).concat(readonlyProperties));
                    assert.equal(inv.hasProperty(allProperties[0]), true);
                    assert.equal(inv.hasProperty(allProperties[0] + "no"), false);
                });

                for (const [privacyDeco, privacyName] of [[Public, "public"], [Private, "private"]]) {

                    const types = [
                        ["String", String],
                        ["undefined", null],
                        ["Number", Number],
                        ["Boolean", Boolean],
                        ["undefined", undefined],
                        ["Object", Object],
                        ["Date", Date],
                        ["Array", Array],
                        ["Set", Set],
                        ["Map", Map],
                        ["RegExp", RegExp],
                        ["Promise", Promise]
                    ];

                    for (const [typeName, type] of types) {
                        const randomDescription = randomString(10);
                        let testName;

                        // Methods decorators
                        for (const withArgs of [false, true]) {
                            const returnsDescr = type === null ? "without returns" : "returns " + typeName.toLowerCase();
                            const argsDescr = withArgs === true ? "with args" : "without args";
                            const classes = [];

                            const allArgs = withArgs ? generateArgs(types) : [[[null, null, null, null]]];
                            for (const args of allArgs) {

                                const returnDeco = type === null ? Type() : Type(type);
                                const argsToDeco = args.map((x) => x[3]);

                                const methodDescr = {
                                    type,
                                    private: privacyDeco === Private,
                                    description: randomDescription
                                };

                                const argsToMeta = args.map((x) => {
                                    if (is.array(x[3]) && x[3].length === 2) {
                                        return x[3];
                                    } else {
                                        return [x[1], x[2]];
                                    }
                                });

                                let signature;
                                if (withArgs) {
                                    signature = format("<%s> %%s(", typeName);
                                    const argsStr = [];
                                    for (const arg of args) {
                                        argsStr.push(format("<%s> %s", arg[0], arg[2]));
                                    }
                                    signature += argsStr.join(", ") + ")";
                                    methodDescr["args"] = argsToMeta;
                                } else {
                                    signature = format("<%s> %%s(<undefined> a, <undefined> b, <undefined> c, <undefined> d, <undefined> e)", typeName);
                                }

                                const argsDeco = withArgs ? Args(...argsToDeco) : Args();

                                @Method("method2", methodDescr)
                                class MyClass extends ParentForMethod {
                                    constructor() {
                                        super();
                                        this.method2 = function (a, b, c, d, e) {};
                                    }

                                    @privacyDeco
                                    @returnDeco
                                    @Description(randomDescription)
                                    @argsDeco
                                    method(a, b, c, d, e) {}
                                }
                                LastMethodClass = MyClass;

                                classes.push({
                                    classType: MyClass,
                                    signatureMethod: format(signature, "method"),
                                    signatureMethod2: format(signature, "method2")
                                });
                            }

                            testName = format("%s method %s %s", privacyName, returnsDescr, argsDescr);
                            it(testName, function () {
                                for (const cls of classes) {
                                    const imet = new Investigator(new cls.classType());

                                    assert.equal(imet.getMethodSignature("method"), cls.signatureMethod, "implicit method");
                                    let metadata = imet.getMethodMetadata("method");
                                    assert.equal(metadata.private, privacyDeco === Private);
                                    assert.equal(metadata.description, randomDescription);

                                    assert.equal(imet.getMethodSignature("method2"), cls.signatureMethod2, "explicit method");
                                    metadata = imet.getMethodMetadata("method2");
                                    assert.equal(metadata.private, privacyDeco === Private);
                                    assert.equal(metadata.description, randomDescription);
                                }
                            });
                        }

                        // Property decorators
                        const typeDeco = type === null ? Type() : Type(type);
                        const propertyDescr = {
                            type,
                            private: privacyDeco === Private,
                            description: randomDescription
                        };

                        @Property("property2", propertyDescr)
                        class MyClass2 extends ParentForProp {
                            constructor() {
                                super();
                                this.property2 = undefined;
                            }

                            @privacyDeco
                            @typeDeco
                            @Description(randomDescription)
                            property = undefined;
                        }
                        LastPropertyClass = MyClass2;

                        const iprop = new Investigator(new MyClass2);

                        const typeDescrProperty = type === null ? "without type" : "of " + typeName.toLowerCase() + " type";
                        testName = format("%s property %s", privacyName, typeDescrProperty);

                        it(testName, function () {
                            let signature = format("<%s> %s", typeName, "property");
                            assert.equal(iprop.getPropertySignature("property"), signature, "implicit property");
                            let metadata = iprop.getPropertyMetadata("property");
                            assert.equal(metadata.private, privacyDeco === Private);
                            assert.equal(metadata.description, randomDescription);

                            signature = format("<%s> %s", typeName, "property2");
                            assert.equal(iprop.getPropertySignature("property2"), signature, "explicit property");
                            metadata = iprop.getPropertyMetadata("property2");
                            assert.equal(metadata.private, privacyDeco === Private);
                            assert.equal(metadata.description, randomDescription);
                        });
                    }
                }

                ParentForMethod = LastMethodClass;
                ParentForProp = LastPropertyClass;
            });
        }
    });

    describe("Twin decorator", function () {
        it("class validation", function () {
            const { netron } = adone;
            const { Interface } = netron;

            class A1 { }
            class A2 extends adone.netron.Interface { }
            class A3 extends netron.Interface { }
            class A4 extends Interface { }

            assert.throws(() => Twin(A1), adone.x.NotValid);
            assert.throws(() => Twin("class A1 { }"), adone.x.NotValid);
            assert.throws(() => Twin("class A1 extends Other { }"), adone.x.NotValid);

            assert.doesNotThrow(() => Twin(A2));
            assert.doesNotThrow(() => Twin(A3));
            assert.doesNotThrow(() => Twin(A4));
            assert.doesNotThrow(() => Twin("class A1 extends Interface { }"));
            assert.doesNotThrow(() => Twin("class A1 extends netron.Interface { }"));
            assert.doesNotThrow(() => Twin("class A1 extends adone.netron.Interface { }"));
        });
    });
});
