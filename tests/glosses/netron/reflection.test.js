const {
    is,
    netron: {
        Reflection,
        Context,
        Public,
        Method,
        Property
    },
    std: { util: { format } }
} = adone;

const randomString = (N) => (`${Math.random().toString(36)}00000000000000000`).slice(2, N + 2);

const generateArgs = function* (types) {
    for (const [typeName1, type1] of types) {
        for (const [typeName3, type3] of types) {
            for (const [typeName5, type5] of types) {
                const argName2 = randomString(8);
                const argName4 = randomString(8);
                const argName5 = randomString(8);
                yield [
                    [typeName1, type1, "a", type1], // 1 argument
                    ["undefined", undefined, argName2, argName2], // 2 argument
                    [typeName3, type3, "c", [type3]], // 3 argument
                    ["undefined", undefined, argName4, [argName4]], // 4 argument
                    [typeName5, type5, argName5, [type5, argName5]] // 5 argument
                ];
            }
        }
    }
};

@Context({
    description: "about A class"
})
@Property("prop5", {
    type: Map,
    readonly: true,
    description: "some property"
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

describe("netron", "Reflection", () => {
    it("class name", () => {
        expect(aReflect.getName()).to.be.equal("A");
    });

    it("class description", () => {
        expect(aReflect.getDescription()).to.be.equal("about A class");
    });

    it("public methods should be processed", () => {
        expect(aReflect.hasMethod("publicMethod")).to.be.true;
        expect(aReflect.hasMethod("publicMethodWithArgs")).to.be.true;
        expect(aReflect.hasMethod("publicMethodReturnsString")).to.be.true;
        expect(aReflect.hasMethod("publicMethodWithArgsReturnsNumber")).to.be.true;
        expect(aReflect.hasMethod("method1")).to.be.true;
        expect(aReflect.hasMethod("methodWithRedefinedArgs")).to.be.true;
        expect(aReflect.hasMethod("methodWithRedefinedArgs1")).to.be.true;
    });

    it("private methods should not be processed", () => {
        expect(aReflect.hasMethod("privateMethodWithArgsReturnsPromise")).to.be.false;
    });

    it("public properties should be processed", () => {
        expect(aReflect.hasProperty("prop1")).to.be.true;
        expect(aReflect.hasProperty("prop2")).to.be.true;
        expect(aReflect.hasProperty("prop4")).to.be.true;
        expect(aReflect.hasProperty("prop5")).to.be.true;
    });

    it("private properties should not be processed", () => {
        expect(aReflect.hasProperty("prop3")).to.be.false;
        expect(aReflect.hasProperty("prop6")).to.be.false;
    });

    it("readonly property", () => {
        expect(aReflect.getPropertyMeta("prop1").readonly).to.be.true;
        expect(aReflect.getPropertyMeta("prop2").readonly).to.be.false;
        expect(aReflect.getPropertyMeta("prop4").readonly).to.be.false;
        expect(aReflect.getPropertyMeta("prop5").readonly).to.be.true;
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

        assert.isTrue(is.netronContext(ContextableClass));
        assert.isFalse(is.netronContext(NonContextableClass));
        assert.isTrue(is.netronContext(new ContextableClass()));
        assert.isFalse(is.netronContext(new NonContextableClass()));
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

    // let ParentForMethod = Object;
    // let ParentForProp = Object;
    // let LastMethodClass = null;
    // let LastPropertyClass = null;
    // let ParentDescribedClass = Object;
    // let ParentMethodPropertyClass = Object;

    // for (let ilevel = 1; ilevel <= 3; ++ilevel) {
    //     // eslint-disable-next-line
    //     describe(`Inheritance level: ${ilevel}`, () => {
    //         it("getDescription", () => {
    //             const classDesc = "class description";
    //             const methodDesc = "method description";
    //             const propertyDesc = "property description";

    //             @Context({
    //                 description: classDesc
    //             })
    //             class DescribedClass extends ParentDescribedClass {

    //                 @Public({
    //                     description: methodDesc
    //                 })
    //                 method() { }

    //                 @Public({
    //                     description: propertyDesc
    //                 })
    //                 property = 1;
    //             }
    //             ParentDescribedClass = DescribedClass;

    //             const r = Reflection.from(new DescribedClass());

    //             assert.equal(r.getDescription(), classDesc);
    //             assert.equal(r.getMethodMeta("method").description, methodDesc);
    //             assert.equal(r.getPropertyMeta("property").description, propertyDesc);
    //         });

    //         it("getMethods/Properties functions", () => {
    //             @Context()
    //             class MethodPropertyClass extends ParentMethodPropertyClass {
    //                 @Public()
    //                 method1() { }

    //                 method2() { }

    //                 @Public()
    //                 property1 = 1;

    //                 property2 = 2;

    //                 @Public({
    //                     readonly: true
    //                 })
    //                 property3 = 3;
    //             }
    //             ParentMethodPropertyClass = MethodPropertyClass;

    //             const r = Reflection.from(new MethodPropertyClass());

    //             const methods = Array.from(r.getMethods().keys());

    //             assert.sameMembers(methods, ["method1"]);

    //             const properties = Array.from(r.getProperties().keys());
    //             const readonlyProperties = Array.from(r.getReadonlyProperties().keys());

    //             assert.sameMembers(properties, ["property1", "property3"]);
    //             assert.sameMembers(readonlyProperties, ["property3"]);
    //         });

    //         const types = [
    //             ["String", String],
    //             ["undefined", null],
    //             ["Number", Number],
    //             ["Boolean", Boolean],
    //             ["undefined", undefined],
    //             ["Object", Object],
    //             ["Date", Date],
    //             ["Array", Array],
    //             ["Set", Set],
    //             ["Map", Map],
    //             ["RegExp", RegExp],
    //             ["Promise", Promise]
    //         ];

    //         for (const [typeName, type] of types) {
    //             const randomDescription = randomString(10);
    //             let testName;

    //             // Methods decorators
    //             for (const withArgs of [false, true]) {
    //                 const returnsDescr = is.null(type) ? "without returns" : `returns ${typeName.toLowerCase()}`;
    //                 const argsDescr = withArgs ? "with args" : "without args";
    //                 const classes = [];

    //                 const allArgs = withArgs ? generateArgs(types) : [[[null, null, null, null]]];
    //                 for (const args of allArgs) {
    //                     const argsToDeco = args.map((x) => x[3]);

    //                     const methodDescr = {
    //                         type,
    //                         description: randomDescription
    //                     };

    //                     const argsToMeta = args.map((x) => {
    //                         if (is.array(x[3]) && x[3].length === 2) {
    //                             return x[3];
    //                         }
    //                         return [x[1], x[2]];

    //                     });

    //                     let signature;
    //                     if (withArgs) {
    //                         signature = format("<%s> %%s(", typeName);
    //                         const argsStr = [];
    //                         for (const arg of args) {
    //                             argsStr.push(format("<%s> %s", arg[0], arg[2]));
    //                         }
    //                         signature += `${argsStr.join(", ")})`;
    //                         methodDescr.args = argsToDeco;
    //                     } else {
    //                         signature = format("<%s> %%s(<undefined> a, <undefined> b, <undefined> c, <undefined> d, <undefined> e)", typeName);
    //                     }

    //                     // adone.log(methodDescr);

    //                     @Context()
    //                     @Method("method2", methodDescr)
    //                     class MyClass extends ParentForMethod {
    //                         constructor() {
    //                             super();
    //                             this.method2 = function (a, b, c, d, e) { };
    //                         }

    //                         @Public({
    //                             description: randomDescription,
    //                             type,
    //                             args: withArgs ? argsToDeco : []
    //                         })
    //                         method(a, b, c, d, e) { }
    //                     }
    //                     LastMethodClass = MyClass;

    //                     classes.push({
    //                         classType: MyClass,
    //                         signatureMethod: format(signature, "method"),
    //                         signatureMethod2: format(signature, "method2")
    //                     });
    //                 }

    //                 testName = format("Method %s %s", returnsDescr, argsDescr);
    //                 // eslint-disable-next-line
    //                 it(testName, () => {
    //                     for (const cls of classes) {
    //                         const r = Reflection.from(new cls.classType());

    //                         assert.equal(r.getMethodSignature("method"), cls.signatureMethod, "implicit method");
    //                         let metadata = r.getMethodMeta("method");
    //                         assert.equal(metadata.description, randomDescription);

    //                         assert.equal(r.getMethodSignature("method2"), cls.signatureMethod2, "explicit method");
    //                         metadata = r.getMethodMeta("method2");
    //                         assert.equal(metadata.description, randomDescription);
    //                     }
    //                 });
    //             }

    //             // // Property decorators
    //             // const typeDeco = is.null(type) ? Type() : Type(type);
    //             // const propertyDescr = {
    //             //     type,
    //             //     description: randomDescription
    //             // };

    //             // @Property("property2", propertyDescr)
    //             // class MyClass2 extends ParentForProp {
    //             //     constructor() {
    //             //         super();
    //             //         this.property2 = undefined;
    //             //     }

    //             //     @privacyDeco
    //             //     @typeDeco
    //             //     @Description(randomDescription)
    //             //     property = undefined;
    //             // }
    //             // LastPropertyClass = MyClass2;

    //             // const iprop = new Investigator(new MyClass2());

    //             // const typeDescrProperty = is.null(type) ? "without type" : `of ${typeName.toLowerCase()} type`;
    //             // testName = format("%s property %s", privacyName, typeDescrProperty);

    //             // it(testName, () => {
    //             //     let signature = format("<%s> %s", typeName, "property");
    //             //     assert.equal(iprop.getPropertySignature("property"), signature, "implicit property");
    //             //     let metadata = iprop.getPropertyMeta("property");
    //             //     assert.equal(metadata.description, randomDescription);

    //             //     signature = format("<%s> %s", typeName, "property2");
    //             //     assert.equal(iprop.getPropertySignature("property2"), signature, "explicit property");
    //             //     metadata = iprop.getPropertyMeta("property2");
    //             //     assert.equal(metadata.description, randomDescription);
    //             // });
    //         }

    //         ParentForMethod = LastMethodClass;
    //         ParentForProp = LastPropertyClass;
    //     });
    // }

    // describe("Twin decorator", () => {
    //     it("class validation", () => {
    //         const { netron } = adone;
    //         const { Interface } = netron;

    //         class A1 { }
    //         class A2 extends adone.netron.Interface { }
    //         class A3 extends netron.Interface { }
    //         class A4 extends Interface { }

    //         assert.throws(() => Twin(A1), adone.x.NotValid);
    //         assert.throws(() => Twin("class A1 { }"), adone.x.NotValid);
    //         assert.throws(() => Twin("class A1 extends Other { }"), adone.x.NotValid);

    //         assert.doesNotThrow(() => Twin(A2));
    //         assert.doesNotThrow(() => Twin(A3));
    //         assert.doesNotThrow(() => Twin(A4));
    //         assert.doesNotThrow(() => Twin("class A1 extends Interface { }"));
    //         assert.doesNotThrow(() => Twin("class A1 extends netron.Interface { }"));
    //         assert.doesNotThrow(() => Twin("class A1 extends adone.netron.Interface { }"));
    //     });
});
