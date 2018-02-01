const {
    is,
    netron2: {
        Reflection,
        DContext,
        DPublic,
        DMethod,
        DProperty
    }
} = adone;

describe("Reflection", () => {
    describe("from()", () => {
        @DContext()
        class A {
            @DPublic()
            method() { }
        }

        it("not instance", () => {
            const err = assert.throws(() => Reflection.from("a"));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("class instead instance", () => {
            const err = assert.throws(() => Reflection.from(A));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("class without constructor", () => {
            class SomeClass { }
            const err = assert.throws(() => Reflection.from(new SomeClass()));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("Object instead instance", () => {
            const err = assert.throws(() => Reflection.from(Object));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("empty function instead instance", () => {
            const err = assert.throws(() => Reflection.from(adone.noop));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("instance of unnamed class", () => {
            const a = (new
                class {
                    method() {
                    }
                }()
            );

            const err = assert.throws(() => Reflection.from(a));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("instance with no public methods", () => {
            @DContext()
            class A {
                method() {
                }
            }

            const err = assert.throws(() => Reflection.from(new A()));
            assert.instanceOf(err, adone.exception.NotValid);
        });

        it("valid instance", () => {
            Reflection.from(new A());
        });
    });

    describe("complex contexts", () => {
        @DContext({
            description: "about A class"
        })
        @DProperty("prop5", {
            type: Map,
            readonly: true,
            description: "some property"
        })
        class A {
            @DPublic()
            publicMethod() {
            }
        
            @DPublic()
            publicMethodWithArgs(arg1, arg2) {
            }
        
            @DPublic({
                type: String
            })
            publicMethodReturnsString() {
            }
        
            @DPublic({
                type: Number,
                args: ["args", RegExp, [Date, "dt"]]
            })
            publicMethodWithArgsReturnsNumber() {
            }
        
            privateMethodWithArgsReturnsPromise(arg1, dt) {
            }
        
            @DPublic({
                description: "method1 description",
                args: [[Array, "arg1"], [Symbol, "arg2"]]
            })
            method1(arg1, arg2) {
            }
        
            @DPublic({
                args: [[String, "redefArg1"], [Map, "redefArg2"], [Boolean], Date, ["someArg"]]
            })
            methodWithRedefinedArgs(arg1, arg2, arg3, arg4, arg5, arg6) {
            }
        
            @DPublic({
                args: [[String, "redefArg1"], [Map, "redefArg2"], [String], String, ["someArg"], Map, [Map]]
            })
            methodWithRedefinedArgs1(arg1, arg2) {
            }
        
            @DPublic({
                readonly: true
            })
            prop1 = new RegExp("word");
        
            @DPublic({
                type: String
            })
            prop2 = new RegExp("word");
        
            prop3 = 888;
        
            @DPublic({
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
            @DContext()
            class ContextableClass {
            }
    
            class NonContextableClass {
            }
    
            assert.true(is.netron2Context(ContextableClass));
            assert.false(is.netron2Context(NonContextableClass));
            assert.true(is.netron2Context(new ContextableClass()));
            assert.false(is.netron2Context(new NonContextableClass()));
        });
    
        it("Reflectio#getName()", () => {
            @DContext()
            class ComplexClassName {
                @DPublic()
                method() { }
            }
    
            @DContext()
            class ComplexClassNameChild extends ComplexClassName {
            }
    
            @DContext()
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
});
