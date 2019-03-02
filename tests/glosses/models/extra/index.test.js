const {
    is,
    model: { extra: { BasicModel } }
} = adone;

describe("interface", () => {
    describe("basic models", () => {
        const {
            model: { extra: { BasicModel } }
        } = adone;

        it("constructor && proto are correctly defined", () => {
            assert.ok(BasicModel instanceof Function, "BasicModel is defined");

            const NumberModel = BasicModel(Number);

            assert.ok(is.function(NumberModel.extend), "test model method extend");
            assert.ok(is.function(NumberModel.assert), "test model method assert");
            assert.ok(is.function(NumberModel.test), "test model method test");
            assert.ok(is.function(NumberModel.validate), "test model method validate");
            assert.ok(NumberModel.definition === Number, "test model prop definition");
            assert.ok(typeof NumberModel.assertions === "object", "test model prop assertions");

            const NumberModelThroughConstructor = new BasicModel(Number);

            assert.ok(is.function(NumberModelThroughConstructor.extend), "test new model method extend");
            assert.ok(is.function(NumberModelThroughConstructor.assert), "test new model method assert");
            assert.ok(is.function(NumberModelThroughConstructor.test), "test new model method test");
            assert.ok(is.function(NumberModelThroughConstructor.validate), "test new model method validate");
            assert.ok(NumberModelThroughConstructor.definition === Number, "test new model prop definition");
            assert.ok(typeof NumberModelThroughConstructor.assertions === "object", "test new model prop assertions");
        });

        it("undefined definition", () => {
            const UndefinedModel = BasicModel(undefined);
            assert.ok(UndefinedModel instanceof BasicModel, "Model can receive undefined as argument");
        });

        it("basic type behaviour", () => {

            const NumberModel = BasicModel(Number);
            NumberModel(0); // should not throw
            assert.ok(is.number(NumberModel(42)), "should return the original type");
            assert.ok(NumberModel(17) === 17, "should return the original value");
            assert.throws(() => {
                NumberModel("12");
            }, TypeError);
            assert.throws(() => {
                NumberModel(NaN);
            }, TypeError);
        });

        it("Optional type", () => {

            const NumberModel = BasicModel(Number);
            const OptionalNumberModel = BasicModel([Number]);

            assert.throws(() => {
                NumberModel();
            }, TypeError);

            OptionalNumberModel(); // should not throw

            const OptionalExtendedNumberModel = NumberModel.extend(undefined);

            OptionalExtendedNumberModel(); // should not throw

            assert.throws(() => {
                NumberModel();
            }, TypeError);

        });

        it("Union type", () => {

            const myModel = BasicModel([String, Boolean, Date]);
            myModel("test"); // should not throw
            myModel(true); // should not throw
            myModel(new Date()); // should not throw
            assert.throws(() => {
                myModel();
            }, TypeError);
            assert.throws(() => {
                myModel(0);
            }, TypeError);
            assert.throws(() => {
                myModel(new Date("x"));
            }, TypeError);

            assert.ok(myModel.test("666") === true, "model.test 1/2");
            assert.ok(myModel.test(666) === false, "model.test 2/2");

            myModel.validate("666"); // should not throw
            assert.throws(() => {
                myModel.validate(666);
            }, TypeError);

        });

        it("default values", () => {
            const myModel = BasicModel([String, Boolean, Date]);
            myModel.defaultTo("blob");
            assert.strictEqual(myModel.default, "blob", "basic model defaultTo store the value as default property");
            assert.strictEqual(myModel(), "blob", "basic model default property is applied when undefined is passed");
            myModel.default = 42;
            assert.throws(() => {
                myModel();
            }, /.*got Number 42/);

        });

        it("Assertions", () => {
            const isOdd = (n) => n % 2 === 1;

            const OddNumber = BasicModel(Number).assert(isOdd);
            assert.strictEqual(OddNumber(17), 17, "passing assertion on basic model 1/2");
            assert.throws(() => {
                OddNumber(18);
            }, /[\s\S]*isOdd/);

            const RealNumber = BasicModel(Number).assert(isFinite);

            assert.equal(RealNumber(Math.sqrt(1)), 1, "passing assertion on basic model 2/2");
            assert.throws(() => {
                RealNumber(Math.sqrt(-1));
            }, /[\s\S]*isFinite/);

            const isPrime = function (n) {
                for (let i = 2, m = Math.sqrt(n); i <= m; i++) {
                    if (n % i === 0) {
                        return false;
                    }
                }
                return true;
            };

            const PrimeNumber = RealNumber
                .extend() // to not add next assertions to RealNumber model
                .assert(is.integer)
                .assert(isPrime);

            PrimeNumber(83);
            assert.throws(() => {
                PrimeNumber(87);
            }, /[\s\S]*isPrime/);
            assert.throws(() => {
                PrimeNumber(7.77);
            }, /[\s\S]*isInteger/);

            const AssertBasic = BasicModel(Number).assert((v) => {
                return Number(v.toString()) === v;
            }, "may throw exception");

            new AssertBasic(0);

            assert.throws(() => {
                new AssertBasic();
            },
                /assertion "may throw exception" returned TypeError.*for value undefined/);
        });

        it("Custom error collectors", () => {
            const defaultErrorCollector = BasicModel.prototype.errorCollector;
            assert.equal(typeof defaultErrorCollector, "function", "BasicModel has default errorCollector");

            BasicModel.prototype.errorCollector = function (errors) {
                assert.ok(errors.length === 1, "check errors.length global collector");
                const err = errors[0];
                assert.equal(err.expected, Number, "check error.expected global collector");
                assert.equal(err.received, "nope", "check error.received global collector");
                assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message global collector");
            };

            BasicModel(Number)("nope");

            BasicModel.prototype.errorCollector = function (errors) {
                assert.ok(errors.length === 1, "global custom collector assertion error catch 1/2");
                assert.equal(errors[0].message,
                    'assertion "shouldnt be nope" returned false for value "nope"',
                    "global custom collector assertion error catch 2/2");
            };

            BasicModel(String).assert((s) => {
                return s !== "nope";
            }, "shouldnt be nope")("nope");

            BasicModel(Number).validate("nope", (errors) => {
                assert.ok(errors.length === 1, "check errors.length custom collector");
                const err = errors[0];
                assert.equal(err.expected, Number, "check error.expected custom collector");
                assert.equal(err.received, "nope", "check error.received custom collector");
                assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message custom collector");
            });

            BasicModel(String).assert((s) => {
                return s !== "nope";
            }, "shouldnt be nope")
                .validate("nope", (errors) => {
                    assert.ok(errors.length === 1, "local custom collector assertion error catch 1/2");
                    assert.equal(errors[0].message,
                        'assertion "shouldnt be nope" returned false for value "nope"',
                        "local custom collector assertion error catch 2/2");
                });

            BasicModel.prototype.errorCollector = defaultErrorCollector;

        });

        it("Extensions", () => {

            const PositiveInteger = BasicModel(Number)
                .assert(is.integer)
                .assert((n) => n >= 0, "should be greater or equal to zero");

            const isPrime = (n) => {
                for (let i = 2, m = Math.sqrt(n); i <= m; i++) {
                    if (n % i === 0) {
                        return false;
                    }
                }
                return n > 1;
            };

            const PrimeNumber = PositiveInteger.extend().assert(isPrime);

            assert.equal(PrimeNumber.definition, Number, "Extension retrieve original definition");
            assert.equal(PrimeNumber.assertions.length, 3, "Extension can add assertions");
            assert.equal(PositiveInteger.assertions.length, 2, "Extension assertions are not added to original model");

        });
    });

    describe("generic models", () => {
        const {
            model: { extra: { Model, ObjectModel } }
        } = adone;

        it("Generic models constructor && proto", () => {
            assert.ok(Model instanceof Function, "Model is defined");

            assert.ok(Model(Number) instanceof BasicModel, "test model constructor 1/4");
            assert.ok(Model({}) instanceof ObjectModel, "test model constructor 2/4");
            assert.ok(Model([]) instanceof BasicModel, "test model constructor 3/4");
            assert.ok(Model() instanceof BasicModel, "test model constructor 4/4");
        });

        it("Model names", () => {
            const NamedModel = Model({}).as("Test");
            assert.equal(NamedModel.name, "Test", "test model name 1/2");
            const namedInstance = NamedModel({});
            assert.equal(Object.getPrototypeOf(namedInstance).constructor.name, "Test", "test model name 2/2");
        });
    });

    describe("object models", () => {
        const {
            model: { extra: { Model, ObjectModel, ArrayModel } }
        } = adone;

        const consoleMock = (function (console) {
            const methods = ["debug", "log", "warn", "error"];
            const originals = {};
            const mocks = {};
            const lastArgs = {};

            methods.forEach((method) => {
                originals[method] = console[method];
                mocks[method] = function () {
                    lastArgs[method] = arguments;
                };
            });

            return {
                apply() {
                    methods.forEach((method) => {
                        lastArgs[method] = [];
                        console[method] = mocks[method];
                    });
                },
                revert() {
                    methods.forEach((method) => {
                        lastArgs[method] = [];
                        console[method] = originals[method];
                    });
                },
                lastArgs
            };
        })(console);

        it("constructor && proto", () => {

            assert.ok(ObjectModel instanceof Function, "ObjectModel instanceof Function");

            const EmptyObjectModel = ObjectModel({});

            assert.ok(is.function(EmptyObjectModel.extend), "test object model method extend");
            assert.ok(is.function(EmptyObjectModel.assert), "test object model method assert");
            assert.ok(is.function(EmptyObjectModel.test), "test object model method test");
            assert.ok(is.function(EmptyObjectModel.validate), "test object model method validate");
            assert.ok(typeof EmptyObjectModel.definition === "object", "test object model prop definition");
            assert.ok(typeof EmptyObjectModel.assertions === "object", "test object model prop assertions");

            const EmptyObjectModelThroughConstructor = new ObjectModel({});

            assert.ok(is.function(EmptyObjectModelThroughConstructor.extend), "test new model method extend");
            assert.ok(is.function(EmptyObjectModelThroughConstructor.assert), "test new model method assert");
            assert.ok(is.function(EmptyObjectModelThroughConstructor.test), "test new model method test");
            assert.ok(is.function(EmptyObjectModelThroughConstructor.validate), "test new model method validate");
            assert.ok(typeof EmptyObjectModelThroughConstructor.definition === "object", "test new model prop definition");
            assert.ok(typeof EmptyObjectModelThroughConstructor.assertions === "object", "test new model prop assertions");
        });

        it("behaviour for properties", () => {
            const Person = ObjectModel({
                name: String,
                age: Number,
                birth: Date,
                female: [Boolean],
                address: {
                    work: {
                        city: [String]
                    }
                }
            });

            let joe = Person({
                name: "Joe",
                age: 42,
                birth: new Date(1990, 3, 25),
                female: false,
                address: {
                    work: {
                        city: "Lille"
                    }
                }
            });

            assert.strictEqual(joe.name, "Joe", "String property retrieved");
            assert.strictEqual(joe.age, 42, "Number property retrieved");
            assert.strictEqual(joe.female, false, "Boolean property retrieved");
            assert.equal(Number(joe.birth), Number(new Date(1990, 3, 25)), "Date property retrieved");
            assert.strictEqual(joe.address.work.city, "Lille", "nested property retrieved");
            assert.ok(joe instanceof Person && joe instanceof Object, "instance is instanceof model and Object");
            assert.ok(Person instanceof ObjectModel, "model is instanceof ObjectModel");

            joe.name = "Big Joe";
            joe.age++;
            joe.birth = new Date(1990, 3, 26);
            delete joe.female;

            assert.throws(() => {
                joe.name = 42;
            }, /.*got Number 42/, "invalid Number set");
            assert.throws(() => {
                joe.age = true;
            }, /.*got Boolean true/, "invalid Boolean set");
            assert.throws(() => {
                joe.birth = function () {
                };
            }, /.*got Function/, "invalid Function set");
            assert.throws(() => {
                joe.female = "nope";
            }, /.*got String "nope"/, "invalid String set");
            assert.throws(() => {
                joe.address.work.city = [];
            }, /.*got Array/, "invalid Array set");
            assert.throws(() => {
                joe.address.work = { city: 42 };
            }, /.*got Number 42/, "invalid Object set");
            assert.throws(() => {
                Person({
                    name: "Joe",
                    age: 42,
                    birth: new Date(1990, 3, 25),
                    female: "false"
                });
            }, /.*expecting female to be Boolean.*got String "false"/, "invalid prop at object model instanciation");

            joe = Person({
                name: "Joe",
                age: 42,
                birth: new Date(1990, 3, 25),
                female: false,
                address: {
                    work: {
                        city: "Lille"
                    }
                },
                job: "Taxi"
            });

            assert.strictEqual(joe.job, "Taxi", "Properties out of model definition are kept but are not validated");

            const err = assert.throws(() => {
                Person({
                    name: false,
                    age: [42],
                    birth: "nope",
                    female: null,
                    address: {
                        work: {
                            city: true
                        }
                    }
                });
            });

            assert.isTrue(/TypeError/.test(err.toString())
                && /name/.test(err.toString())
                && /age/.test(err.toString())
                && /birth/.test(err.toString())
                && /city/.test(err.toString()));
        });

        it("edge cases of constructors", () => {
            assert.ok(ObjectModel({}) instanceof ObjectModel, "ObjectModel can receive empty object as argument");

            /* //TODO: use FunctionModel for ObjectModel API ?
             assert.throws(function () {
             ObjectModel(undefined)
             }, /expecting arguments\[0] to be Object, got undefined/,
             "ObjectModel with definition undefined throws")
        
             assert.throws(function () {
             ObjectModel(42)
             }, /expecting arguments\[0] to be Object, got Number 42/,
             "ObjectModel with definition primitive throws")
             */
        });

        it("optional and multiple parameters", () => {
            const Person = ObjectModel({
                name: [String],
                age: [Number, Date, String, Boolean, undefined],
                female: [Boolean, Number, String, null],
                haircolor: ["blond", "brown", "black", undefined],
                address: {
                    work: {
                        city: [String]
                    }
                }
            });

            const joe = Person({ female: false });
            assert.ok(joe instanceof Person, "instanceof model test");
            joe.name = "joe";
            joe.name = undefined;
            joe.name = null;
            joe.age = new Date(1995, 1, 23);
            joe.age = undefined;
            assert.throws(() => {
                joe.age = null;
            }, /.*got null/, "invalid set null");
            joe.female = "ann";
            joe.female = 2;
            joe.female = false;
            assert.throws(() => {
                joe.female = undefined;
            }, /.*got undefined/, "invalid set undefined");
            joe.address.work.city = "Lille";
            joe.address.work.city = undefined;
            joe.haircolor = "blond";
            joe.haircolor = undefined;
            assert.throws(() => {
                joe.name = false;
            }, /.*expecting name to be String.*got Boolean false/, "invalid type for optional prop");
            assert.throws(() => {
                joe.age = null;
            }, /.*expecting age to be Number or Date or String or Boolean or undefined/, "invalid set null for optional union type prop");
            assert.throws(() => {
                joe.age = [];
            }, /.*got Array/, "invalid set array for optional union type prop");
            assert.throws(() => {
                joe.address.work.city = 0;
            }, /.*expecting address.work.city to be String.*got Number 0/, "invalid type for nested optional prop");
            assert.throws(() => {
                joe.haircolor = "";
            }, /.*expecting haircolor to be "blond" or "brown" or "black" or undefined, got String ""/, "invalid type for value enum prop");

        });

        it("fixed values", () => {
            const myModel = ObjectModel({
                a: [1, 2, 3],
                b: 42,
                c: ["", false, null, 0],
                haircolor: ["blond", "brown", "black"],
                foo: "bar",
                x: [Number, true]
            });

            const model = myModel({
                a: 1,
                b: 42,
                c: 0,
                haircolor: "blond",
                foo: "bar",
                x: true
            });

            model.x = 666;
            model.haircolor = "brown";

            assert.throws(() => {
                model.a = 4;
            }, /.*expecting a to be 1 or 2 or 3.*got Number 4/, "invalid set on values enum 1/2");
            assert.throws(() => {
                model.b = 43;
            }, /.*expecting b to be 42.*got Number 43/, "invalid set on fixed value 1/2");
            assert.throws(() => {
                model.c = undefined;
            }, /.*expecting c to be "" or false or null or 0.*got undefined/, "invalid set undefined on mixed typed values enum");
            assert.throws(() => {
                model.haircolor = "roux";
            }, /.*expecting haircolor to be "blond" or "brown" or "black".*got String "roux"/, "invalid set on values enum 2/2");
            assert.throws(() => {
                model.foo = "baz";
            }, /.*expecting foo to be "bar".*got String "baz"/, "invalid set on fixed value 2/2");
            assert.throws(() => {
                model.x = false;
            }, /.*expecting x to be Number or true.*got Boolean false/, "invalid set on mixed type/values enum");

        });

        it("default values", () => {

            const myModel = new ObjectModel({
                name: String,
                foo: {
                    bar: {
                        buz: Number
                    }
                }
            }).defaults({
                name: "joe",
                foo: {
                    bar: {
                        buz: 0
                    }
                }
            });

            const model = myModel();
            assert.strictEqual(model.name, "joe", "defaults values correctly applied");
            assert.strictEqual(model.foo.bar.buz, 0, "defaults nested props values correctly applied");
            assert.ok(myModel.test({}), "defaults should be applied when testing duck typed objects");

            const model2 = myModel({ name: "jim", foo: { bar: { buz: 1 } } });
            assert.strictEqual(model2.name, "jim", "defaults values not applied if provided");
            assert.strictEqual(model2.foo.bar.buz, 1, "defaults nested props values not applied if provided");

        });

        it("defaultTo with defaults", () => {

            const myModel = new ObjectModel({ x: Number, y: String })
                .defaultTo({ x: 42 })
                .defaults({ y: "hello" });

            assert.strictEqual(myModel.default.x, 42, "object model defaultTo store the value as default property");
            assert.strictEqual(myModel.prototype.y, "hello", "object model defaults store values to proto");
            assert.strictEqual(myModel().x, 42, "object model default property is applied when undefined is passed");
            assert.strictEqual(myModel().y, "hello", "defaulted object model still inherit from model proto");
            assert.strictEqual(myModel.default.y, undefined, "object model default value itself does not inherit from from model proto");

            myModel.default.x = "nope";

            assert.throws(() => {
                myModel();
            }, /.*got String "nope"/, "invalid default property still throws TypeError for object models");

        });

        it("RegExp values", () => {

            const myModel = ObjectModel({
                phonenumber: /^[0-9]{10}$/,
                voyels: [/^[aeiouy]+$/]
            });

            const m = myModel({
                phonenumber: "0612345678"
            });

            m.voyels = "ouioui";

            assert.throws(() => {
                m.voyels = "nonnon";
            }, TypeError);
            assert.throws(() => {
                m.phonenumber = "123456789";
            }, TypeError);

        });

        it("Private and constant properties", () => {

            const myModel = ObjectModel({
                CONST: Number,
                _private: Number,
                normal: Number
            });

            let m = myModel({
                CONST: 42,
                _private: 43,
                normal: 44
            });

            m.normal++;

            assert.throws(() => {
                m._private++;
            }, /[\s\S]*private/, "try to modify private");

            assert.throws(() => {
                m.CONST++;
            }, /[\s\S]*constant/, "try to modify constant");
            assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
            assert.equal(Object.keys(m).includes("_private"), false, "non enumerable key not found in Object.keys");
            assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames");
            assert.equal(Object.getOwnPropertyNames(m).includes("_private"), false, "non enumerable key not found in Object.getOwnPropertyNames");
            assert.equal("normal" in m, true, "enumerable key found with operator in");
            assert.equal("_private" in m, false, "non enumerable key not found with operator in");
            assert.equal(Object.getOwnPropertyDescriptor(m, "normal").value, 45, "getOwnProperyDescriptor trap for normal prop");
            assert.equal(Object.getOwnPropertyDescriptor(m, "_private"), undefined, "getOwnProperyDescriptor for private prop");

            const M = ObjectModel({ _p: Number });
            m = M({ _p: 42 });

            assert.throws(() => {
                Object.prototype.toString.call(m._p);
            }, /[\s\S]*cannot access to private/, "try to access private from outside");

            M.prototype.incrementPrivate = function () {
                this._p++;
            };
            M.prototype.getPrivate = function () {
                return this._p;
            };
            m.incrementPrivate();
            assert.equal(m.getPrivate(), 43, "can access and mutate private props through methods");

        });

        it("Non-enumerable and non-writable properties with overridden convention", () => {

            const myModel = ObjectModel({
                private_prop: Number,
                constant_prop: Number,
                normal_prop: Number
            });

            myModel.conventionForConstant = (s) => s.indexOf("constant_") === 0;
            myModel.conventionForPrivate = (s) => s.indexOf("private_") === 0;

            const m = myModel({
                private_prop: 42,
                constant_prop: 43,
                normal_prop: 44
            });

            assert.throws(() => {
                m.constant_prop++;
            }, /[\s\S]*constant/, "try to redefine constant with overridden convention");
            assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys with overridden convention");
            assert.equal(Object.keys(m).includes("private_prop"), false, "non enumerable key not found in Object.keys with overridden convention");
            assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames with overridden convention");
            assert.equal(Object.getOwnPropertyNames(m).includes("private_prop"), false, "non enumerable key not found in Object.getOwnPropertyNames with overridden convention");
            assert.equal("normal_prop" in m, true, "enumerable key found with operator in with overridden convention");
            assert.equal("private_prop" in m, false, "non enumerable key not found with operator in with overridden convention");

        });

        it("Extensions", () => {

            const Person = ObjectModel({
                name: String,
                age: Number,
                birth: Date,
                female: [Boolean],
                address: {
                    work: {
                        city: [String]
                    }
                }
            });

            const joe = Person({
                name: "Joe",
                age: 42,
                birth: new Date(1990, 3, 25),
                female: false,
                address: {
                    work: {
                        city: "Lille"
                    }
                }
            });

            const Woman = Person.extend({ female: true });

            assert.ok(Person(joe), "Person valid model for joe");

            assert.throws(() => {
                Woman(joe);
            }, /[\s\S]*female/, "Woman invalid model for joe");

            assert.throws(() => {
                Woman({
                    name: "Joe",
                    age: 42,
                    birth: new Date(1990, 3, 25),
                    female: false,
                    address: {
                        work: {
                            city: "Lille"
                        }
                    }
                });
            }, /[\s\S]*female/, "cant be woman from joe parameters");

            assert.throws(() => {
                Woman(joe);
            }, /[\s\S]*female/, "cant be woman from Person joe");

            const ann = Woman({
                name: "Joe's wife",
                age: 42,
                birth: new Date(1990, 3, 25),
                female: true,
                address: {
                    work: {
                        city: "Lille"
                    }
                }
            });

            const UnemployedWoman = Woman.extend({
                address: {
                    work: {
                        city: undefined
                    }
                }
            });

            assert.ok(Woman(ann), "Woman valid model for ann");

            assert.ok(Woman.prototype.constructor === Woman, "extended model has a new constructor");
            assert.ok(ann.constructor === Woman, "extended model instance has the right constructor");

            assert.throws(() => {
                UnemployedWoman(ann);
            }, /[\s\S]*city/, "ann cant be UnemployedWoman;  model extension nested undefined property");


            const jane = UnemployedWoman({
                name: "Jane",
                age: 52,
                birth: new Date(1990, 3, 25),
                female: true
            });

            assert.ok(ann instanceof Person, "ann instanceof Person");
            assert.ok(ann instanceof Woman, "ann instanceof Woman");
            assert.ok(jane instanceof Person, "jane instanceof Person");
            assert.ok(jane instanceof Woman, "jane instanceof Woman");
            assert.ok(jane instanceof UnemployedWoman, "jane instanceof UnemployedWoman");
            assert.equal(joe instanceof Woman, false, "joe not instanceof Woman");
            assert.equal(joe instanceof UnemployedWoman, false, "joe not instanceof UnemployedWoman");
            assert.equal(ann instanceof UnemployedWoman, false, "ann not instanceof UnemployedWoman");

            let Vehicle = { speed: Number };
            let Car = Object.create(Vehicle);
            let Ferrari = ObjectModel({ expensive: true }).extend(Car);
            assert.ok("speed" in Ferrari.definition, "should retrieve definitions from parent prototypes when extending with objects");

            Vehicle = function () { };
            Vehicle.prototype.speed = 99;
            Car = function () { };
            Car.prototype = new Vehicle();
            Ferrari = ObjectModel({ price: [Number] }).extend(Car);

            const ferrari = new Ferrari({ price: 999999 });
            assert.equal(ferrari.speed, 99, "should retrieve properties from parent prototypes when extending with constructors");
            assert.equal("price" in ferrari, true, "should trap in operator and return true for properties in definition");
            assert.equal("speed" in ferrari, false, "should trap in operator and return false for properties out of definition");

        });

        it("Multiple inheritance", () => {

            const A = new ObjectModel({
                a: Boolean,
                b: Boolean
            });

            const B = ObjectModel({
                b: Number,
                c: Number
            });

            const C = ObjectModel({
                c: String,
                d: {
                    d1: Boolean,
                    d2: Boolean
                }
            });

            const D = ObjectModel({
                a: String,
                d: {
                    d2: Number,
                    d3: Number
                }
            });

            let M1 = A.extend(B, C, D);
            let M2 = D.extend(C, B, A);

            assert.equal(Object.keys(M1.definition).sort().join(","), "a,b,c,d", "definition merge for multiple inheritance 1/4");
            assert.equal(Object.keys(M2.definition).sort().join(","), "a,b,c,d", "definition merge for multiple inheritance 2/4");
            assert.equal(Object.keys(M1.definition.d).sort().join(","), "d1,d2,d3", "definition merge for multiple inheritance 3/4");
            assert.equal(Object.keys(M2.definition.d).sort().join(","), "d1,d2,d3", "definition merge for multiple inheritance 4/4");

            let m1 = M1({
                a: "",
                b: 42,
                c: "test",
                d: {
                    d1: true,
                    d2: 2,
                    d3: 3
                }
            });

            let m2 = M2({
                a: false,
                b: false,
                c: 666,
                d: {
                    d1: false,
                    d2: false,
                    d3: 0
                }
            });

            assert.throws(() => {
                m1.a = true;
            }, /[\s\S]*a/, "type checking multiple inheritance 1/8");
            assert.throws(() => {
                m2.a = "nope";
            }, /[\s\S]*a/, "type checking multiple inheritance 2/8");
            assert.throws(() => {
                m1.b = !m1.b;
            }, /[\s\S]*b/, "type checking multiple inheritance 3/8");
            assert.throws(() => {
                m2.b += 7;
            }, /[\s\S]*b/, "type checking multiple inheritance 4/8");
            assert.throws(() => {
                m1.c = undefined;
            }, /[\s\S]*c/, "type checking multiple inheritance 5/8");
            assert.throws(() => {
                m2.c = null;
            }, /[\s\S]*c/, "type checking multiple inheritance 6/8");
            assert.throws(() => {
                m1.d.d2 = true;
            }, /[\s\S]*d2/, "type checking multiple inheritance 7/8");
            assert.throws(() => {
                m2.d.d2 = 1;
            }, /[\s\S]*d2/, "type checking multiple inheritance 8/8");

            A.defaults({
                a: false,
                b: false
            });

            B.defaults({
                b: 0,
                c: 0
            });

            C.defaults({
                c: "",
                d: {
                    d1: false,
                    d2: false
                }
            });

            D.defaults({
                a: "",
                d: {
                    d2: 0,
                    d3: 0
                }
            });

            M1 = A.extend(B, C, D);
            M2 = D.extend(C, B, A);
            m1 = M1();
            m2 = M2();

            assert.ok(m1.a === "" && m1.b === 0 && m1.c === "" && m1.d.d1 === false && m1.d.d2 === 0 && m1.d.d3 === 0, "defaults checking multiple inheritance 1/2");
            assert.ok(m2.a === false && m2.b === false && m2.c === 0 && m2.d.d1 === false && m2.d.d2 === false && m2.d.d3 === 0, "defaults checking multiple inheritance 2/2");

            function dummyAssert() {
                return true;
            }

            A.assert(dummyAssert);
            B.assert(dummyAssert);
            C.assert(dummyAssert);
            D.assert(dummyAssert);

            M1 = A.extend(B, C, D);
            M2 = D.extend(C, B, A);
            m1 = M1();
            m2 = M2();

            assert.ok(M1.assertions.length === 4, "assertions checking multiple inheritance 1/2");
            assert.ok(M2.assertions.length === 4, "assertions checking multiple inheritance 2/2");

        });

        it("Composition", () => {

            const Person = ObjectModel({
                name: String,
                age: [Number, Date],
                female: [Boolean],
                address: {
                    work: {
                        city: [String]
                    }
                }
            });

            const Family = ObjectModel({
                father: Person,
                mother: Person.extend({ female: true }),
                children: ArrayModel(Person),
                grandparents: [ArrayModel(Person).assert((persons) => {
                    return persons && persons.length <= 4;
                })]
            });

            const joe = Person({
                name: "Joe",
                age: 42,
                female: false
            });


            const ann = new Person({
                female: true,
                age: joe.age - 5,
                name: `${joe.name}'s wife`
            });

            let joefamily = new Family({
                father: joe,
                mother: ann,
                children: [],
                grandparents: []
            });

            assert.ok(joefamily instanceof Family, "joefamily instance of Family");
            assert.ok(joefamily.father instanceof Person, "father instanceof Person");
            assert.ok(joefamily.mother instanceof Person, "mother instanceof Person");

            const duckmother = {
                female: true,
                age: joe.age - 5,
                name: `${joe.name}'s wife`
            };

            joefamily = new Family({
                father: joe,
                mother: duckmother,
                children: []
            });

            assert.ok(Person.test(duckmother), "Duck typing for object properties 1/2");
            assert.notOk(duckmother instanceof Person, "Duck typing for object properties 2/2");

            joefamily.mother.name = "Daisy";
            assert.equal(joefamily.mother.name, "Daisy", "Duck typing submodel property can be modified");
            assert.throws(() => {
                joefamily.mother.female = "Quack !";
            }, /[\s\S]*female/, "validation of submodel duck typed at modification");

            assert.throws(() => {
                new Family({
                    father: joe,
                    mother: {
                        female: false,
                        age: joe.age - 5,
                        name: `${joe.name}'s wife`
                    },
                    children: []
                });
            }, /[\s\S]*female/, "validation of submodel duck typed at instanciation");

        });

        it("Assertions", () => {

            const NestedModel = ObjectModel({ foo: { bar: { baz: Boolean } } })
                .assert((o) => o.foo.bar.baz === true);

            const nestedModel = NestedModel({ foo: { bar: { baz: true } } });

            assert.throws(() => {
                nestedModel.foo.bar.baz = false;
            }, TypeError);

            function assertFail() {
                return false;
            }

            function assertFailWithData() {
                return -1;
            }

            Model.prototype.assert(assertFail, "expected message without data");
            ObjectModel.prototype.assert(assertFailWithData, (data) => {
                return `expected message with data ${data}`;
            });

            assert.equal(Model.prototype.assertions.length, 1, "check number of assertions on BasicModel.prototype");
            assert.equal(ObjectModel.prototype.assertions.length, 2, "check number of assertions on ObjectModel.prototype");

            const M = ObjectModel({ a: String });

            assert.throws(() => {
                M({ a: "test" });
            }, TypeError);

            assert.throws(() => {
                M({ a: "test" });
            }, TypeError);

            // clean up global assertions
            Model.prototype.assertions = [];
            delete ObjectModel.prototype.assertions;

            const AssertObject = ObjectModel({ name: [String] })
                .assert(((o) => o.name.toLowerCase().length === o.name.length), "may throw exception");

            new AssertObject({ name: "joe" });

            assert.throws(() => {
                new AssertObject({ name: undefined });
            },
                /assertion "may throw exception" returned TypeError.*for value {\s+name: undefined\s+}/,
                "assertions catch exceptions on Object models");

        });

        it("validate method", () => {

            const assertFunction = ((c) => c === "GB");

            assertFunction.toString = function () {
                return "expected assertFunction toString";
            };

            const Address = new ObjectModel({
                city: String,
                country: BasicModel(String).assert(assertFunction, "Country must be GB")
            });

            const gbAddress = { city: "London", country: "GB" };
            const frAddress = { city: "Paris", country: "FR" };

            const Order = new ObjectModel({
                sku: String,
                address: Address
            });

            const gbOrder = { sku: "ABC123", address: gbAddress };
            const frOrder = { sku: "ABC123", address: frAddress };

            Order.validate(gbOrder); // no errors
            assert.throws(() => {
                Order.validate(frOrder);
            });

            const errors = [];
            Order.validate(frOrder, (err) => {
                errors.push(...err);
            });

            assert.equal(errors.length, 1, "should throw exactly one error here");
            assert.equal(errors[0].expected, "expected assertFunction toString", "check assertion error expected parameter");
            assert.equal(errors[0].received, "FR", "check assertion error received parameter");
            assert.equal(errors[0].path, "address.country", "check assertion error path parameter");
            assert.equal(errors[0].message, 'assertion "Country must be GB" returned false for address.country = "FR"', "check assertion error message parameter");

        });

        it("Cyclic detection", () => {

            let A, B, a, b;

            A = ObjectModel({ b: [] });
            B = ObjectModel({ a: A });
            A.definition.b = [B];

            a = A();
            b = B({ a });

            assert.ok(a.b = b, "valid cyclic value assignment");
            assert.throws(() => {
                a.b = a;
            }, TypeError);

            A = ObjectModel({ b: [] });
            B = ObjectModel({ a: A });

            A.definition.b = {
                c: {
                    d: [B]
                }
            };

            a = A();
            b = B({ a });

            assert.ok((a.b = { c: { d: b } }), "valid deep cyclic value assignment");
            assert.throws(() => {
                a.b = { c: { d: a } };
            }, TypeError);

            const Honey = ObjectModel({
                sweetie: [] // Sweetie is not yet defined
            });

            const Sweetie = ObjectModel({
                honey: Honey
            });

            Honey.definition.sweetie = [Sweetie];

            const joe = Honey({ sweetie: undefined }); // ann is not yet defined
            const ann = Sweetie({ honey: joe });
            assert.ok(joe.sweetie = ann, "website example valid assignment");
            assert.throws(() => {
                joe.sweetie = "dog";
            }, TypeError);
            assert.throws(() => {
                joe.sweetie = joe;
            }, TypeError);

        });

        it("Custom error collectors", () => {
            let M = ObjectModel({
                a: {
                    b: {
                        c: true
                    }
                }
            });

            M.errorCollector = function (errors) {
                assert.ok(errors.length === 1, "check errors.length model collector");
                const err = errors[0];
                assert.equal(err.expected, true, "check error.expected model collector");
                assert.equal(err.received, false, "check error.received model collector");
                assert.equal(err.path, "a.b.c", "check error.path model collector");
                assert.equal(err.message, "expecting a.b.c to be true, got Boolean false", "check error message model collector");
            };

            M({
                a: {
                    b: {
                        c: false
                    }
                }
            });

            ObjectModel({
                d: {
                    e: {
                        f: null
                    }
                }
            }).validate({
                d: {
                    e: {
                        f: undefined
                    }
                }
            }, (errors) => {
                assert.ok(errors.length === 1, "check nested errors.length custom collector");
                const err = errors[0];
                assert.deepEqual(err.expected, null, "check nested error.expected custom collector");
                assert.deepEqual(err.received, undefined, "check nested error.received custom collector");
                assert.equal(err.path, "d.e.f", "check nested error.path custom collector");
                assert.equal(err.message, "expecting d.e.f to be null, got undefined", "check nested error.message custom collector");
            });

            M = ObjectModel({ x: Number });
            M.errorCollector = function noop() { };

            assert.equal(M.test({ x: "nope" }), false, "model.test should work even when errorCollector does not throw exceptions");

        });

        it("Automatic model casting", () => {

            let User = new ObjectModel({ username: String, email: String })
                .defaults({ username: "foo", email: "foo@foo" });

            let Article = new ObjectModel({ title: String, user: User })
                .defaults({ title: "bar", user: new User() });

            let a = new Article();
            a.user = { username: "joe", email: "foo" };

            assert.ok(a.user instanceof User, "automatic model casting when assigning a duck typed object");
            assert.ok(a.user.username === "joe", "preserved props after automatic model casting of duck typed object");

            User = new ObjectModel({ username: String, email: String })
                .defaults({ username: "foo", email: "foo@foo" });

            Article = new ObjectModel({ title: String, user: [User] })
                .defaults({ title: "bar", user: new User() });

            a = new Article();
            a.user = { username: "joe", email: "foo" };

            assert.ok(a.user instanceof User, "automatic optional model casting when assigning a duck typed object");
            assert.ok(a.user.username === "joe", "preserved props after automatic optional model casting of duck typed object");


            const Type1 = ObjectModel({ name: String, other1: [Boolean] });
            const Type2 = ObjectModel({ name: String, other2: [Number] });
            const Container = ObjectModel({ foo: { bar: [Type1, Type2] } });

            consoleMock.apply();
            let c = new Container({ foo: { bar: { name: "dunno" } } });

            assert.ok(/Ambiguous model for[\s\S]*?name: "dunno"[\s\S]*?other1: \[Boolean][\s\S]*?other2: \[Number]/
                .test(consoleMock.lastArgs.warn[0]), "should warn about ambiguous model for object sub prop"
            );
            assert.ok(c.foo.bar.name === "dunno", "should preserve values even when ambiguous model cast");
            assert.ok(!(c.foo.bar instanceof Type1 || c.foo.bar instanceof Type2), "should not cast when ambiguous model");
            consoleMock.revert();

            consoleMock.apply();
            c = new Container({ foo: { bar: Type2({ name: "dunno" }) } });
            assert.ok(consoleMock.lastArgs.warn.length === 0, "should not warn when explicit model cast in ambiguous context");
            assert.ok(c.foo.bar.name === "dunno", "should preserve values when explicit model cast in ambiguous context");
            assert.ok(c.foo.bar instanceof Type2, "should preserve model when explicit cast in ambiguous context");
            consoleMock.revert();

        });

        it("delete trap", () => {

            const M = ObjectModel({ _p: Boolean, C: Number, u: undefined, n: null, x: [Boolean] });
            const m = M({ _p: true, C: 42, u: undefined, n: null, x: false });

            assert.throws(() => {
                delete m._p;
            }, /.*private/, "cannot delete private prop");
            assert.throws(() => {
                delete m.C;
            }, /.*constant/, "cannot delete constant prop");
            delete m.u; // can delete undefined properties
            assert.throws(() => {
                delete m.n;
            }, /.*expecting n to be null, got undefined/, "delete should differenciate null and undefined");
            delete m.x; // can delete optional properties
            M.sealed = true;
            assert.throws(() => {
                delete m.unknown;
            }, /.*property unknown is not declared in the sealed model definition/, "cannot delete property out of model definition");

        });

        it("defineProperty trap", () => {

            const M = ObjectModel({ _p: Boolean, C: Number, u: undefined, n: null, x: [Boolean] });
            const m = M({ _p: true, C: 42, u: undefined, n: null, x: false });

            assert.throws(() => {
                Object.defineProperty(m, "_p", { value: true });
            }, /.*private/, "cannot define private prop");
            assert.throws(() => {
                Object.defineProperty(m, "C", { value: 43 });
            }, /.*constant/, "cannot define constant prop");
            assert.throws(() => {
                Object.defineProperty(m, "u", { value: "test" });
            }, /.*expecting u to be undefined/, "check type after defineProperty");
            assert.throws(() => {
                Object.defineProperty(m, "n", { value: undefined });
            }, /.*expecting n to be null, got undefined/, "defineProperty should differenciate null and undefined");
            Object.defineProperty(m, "x", { value: undefined }); // can define optional properties
            ObjectModel.prototype.sealed = true;
            assert.throws(() => {
                Object.defineProperty(m, "unknown", { value: "test" });
            }, /.*property unknown is not declared in the sealed model definition/, "cannot define property out of model definition");
            ObjectModel.prototype.sealed = false;

        });

        it("ownKeys/has trap", () => {

            const A = ObjectModel({ _pa: Boolean, a: Boolean, oa: [Boolean] });
            const B = A.extend({ _pb: Boolean, b: Boolean, ob: [Boolean] });
            const m = B({ _pa: true, _pb: true, a: true, b: true, oa: undefined, undefined: true });
            B.prototype.B = true;
            B.prototype._PB = true;
            A.prototype.A = true;
            A.prototype._PA = true;

            assert.equal("a" in m, true, "inherited prop in");
            assert.equal("b" in m, true, "own prop in");
            assert.equal("toString" in m, true, "Object.prototype prop in");

            assert.equal("A" in m, false, "custom prop inherited prototype in");
            assert.equal("B" in m, false, "custom prop own prototype in");
            assert.equal("_pa" in m, false, "private inherited prop in");
            assert.equal("_pb" in m, false, "private own prop in");
            assert.equal("_PA" in m, false, "inherited prototype custom private prop in");
            assert.equal("_PB" in m, false, "own prototype custom private prop in");
            assert.equal("oa" in m, true, "optional assigned prop in");
            assert.equal("ob" in m, false, "optional unassigned prop in");
            assert.equal("unknown" in m, false, "unassigned undefined prop in");
            assert.equal("undefined" in m, false, "assigned undefined prop in");

            const oKeys = Object.keys(m);

            const ownKeys = Object.getOwnPropertyNames(m);

            assert.equal(oKeys.sort().join(","), "a,b,oa", "Object.keys");
            assert.equal(ownKeys.sort().join(","), "a,b,oa", "Object.getOwnPropertyNames");
        });

        it("class constructors", () => {

            const PersonModel = ObjectModel({ firstName: String, lastName: String, fullName: String });
            class Person extends PersonModel {
                constructor({ firstName, lastName }) {
                    const fullName = `${firstName} ${lastName}`;
                    super({ firstName, lastName, fullName });
                }
            }

            const person = new Person({ firstName: "John", lastName: "Smith" });
            assert.ok(person instanceof Person, "person instanceof Person");
            assert.ok(person instanceof PersonModel, "person instanceof PersonModel");
            assert.equal(person.fullName, "John Smith", "check es6 class constructor");

            const UserModel = Person.extend({ role: String });
            class User extends UserModel {
                constructor({ firstName, lastName, role }) {
                    super({ firstName, lastName, role });
                    if (role === "admin") {
                        this.fullName += " [ADMIN]";
                    }
                }
            }

            const user = new User({ firstName: "John", lastName: "Smith", role: "admin" });

            assert.ok(user instanceof User, "user instanceof User");
            assert.ok(user instanceof UserModel, "user instanceof UserModel");
            assert.ok(user instanceof Person, "user instanceof Person");
            assert.ok(user instanceof PersonModel, "user instanceof PersonModel");
            assert.equal(user.fullName, "John Smith [ADMIN]", "check es6 class constructor with extended class");
            assert.equal(Object.keys(User.definition).sort().join(","), "firstName,fullName,lastName,role");
            assert.equal(Object.keys(user).sort().join(","), "firstName,fullName,lastName,role");
            assert.throws(() => {
                user.role = null;
            }, TypeError);

        });

        it("Sealed models", () => {
            const Dependency = ObjectModel({
                name: String,
                subobj: { subname: String }
            }, { sealed: true });

            const Package = ObjectModel({
                name: String,
                data: {
                    description: String,
                    hard_dependencies: {
                        one: Dependency,
                        two: Dependency
                    }
                }
            });

            assert.throws(() => {
                new Package({
                    name: "Test item",
                    data: {
                        description: "A test item",
                        hard_dependencies: {
                            one: {
                                name: "module 1",
                                subobj: { subname: "submodule 1" },
                                bad_attr: false
                            },
                            two: {
                                name: "module 2",
                                subobj: { subname: "submodule 2" }
                            }
                        }
                    }
                });
            }, /.*bad_attr/, "prevent undeclared props on initial assignment of sealed object model");

            assert.throws(() => {
                new Package({
                    name: "Test item",
                    data: {
                        description: "A test item",
                        hard_dependencies: {
                            one: {
                                name: "module 1",
                                subobj: { subname: "submodule 1" }
                            },
                            two: {
                                name: "module 2",
                                subobj: { subname: "submodule 2", bad_attr: false }
                            }
                        }
                    }
                });
            }, /.*bad_attr/, "prevent nested undeclared props on initial assignment of sealed object model");

            const test_item = new Package({
                name: "Test item",
                data: {
                    description: "A test item",
                    hard_dependencies: {
                        one: {
                            name: "module 1",
                            subobj: { subname: "submodule 1" }
                        },
                        two: {
                            name: "module 2",
                            subobj: { subname: "submodule 2" }
                        }
                    }
                }
            });

            assert.throws(() => {
                test_item.data.hard_dependencies.one.bad_attr = true;
            }, /.*bad_attr/, "prevent undeclared props on post mutation of sealed object model");
            assert.equal(test_item.data.hard_dependencies.one.bad_attr, undefined);

            assert.throws(() => {
                test_item.data.hard_dependencies.two.subobj.bad_attr = true;
            }, /.*bad_attr/, "prevent nested undeclared props on post mutation of sealed object model");
            assert.equal(test_item.data.hard_dependencies.two.subobj.bad_attr, undefined);

            Dependency.sealed = false;
            test_item.data.hard_dependencies.one.bad_attr = true;
            assert.equal(test_item.data.hard_dependencies.one.bad_attr, true, "undeclared prop in unsealed model");
            test_item.data.hard_dependencies.two.subobj.bad_attr = true;
            assert.equal(test_item.data.hard_dependencies.two.subobj.bad_attr, true, "undeclared nested prop in unsealed model");
        });

        it("Null-safe object traversal", () => {
            const Config = new ObjectModel({
                local: {
                    time: {
                        format: ["12h", "24h", undefined]
                    }
                }
            });

            const config = Config({ local: undefined }); // object duck typed

            assert.equal(config.local.time.format, undefined, "null-safe object traversal getter");
            config.local.time.format = "12h";
            assert.equal(config.local.time.format, "12h", "null-safe object traversal setter");
        });
    });

    describe("function models", () => {
        const {
            model: { extra: { ArrayModel, ObjectModel, FunctionModel } }
        } = adone;

        it("constructor && proto", () => {
            assert.equal(typeof FunctionModel, "function", "FunctionModel is defined");

            const Operation = FunctionModel(Number, Number).return(Number);

            assert.ok(Operation instanceof FunctionModel, "model instance of FunctionModel");

            assert.ok(is.function(Operation.extend), "test Function model method extend");
            assert.ok(is.function(Operation.assert), "test Function model method assert");
            assert.ok(is.function(Operation.test), "test Function model method test");
            assert.ok(is.function(Operation.validate), "test Function model method validate");
            assert.ok(is.function(Operation.return), "test Function model method return");
            assert.equal(Operation.definition.arguments.map((a) => a.name).join(","),
                "Number,Number", "test Function model prop definition");
            assert.ok(Operation.definition.return === Number, "test Function model prop return");
            assert.ok(typeof Operation.assertions === "object", "test Function model prop assertions");
        });

        it("instanciation and controls", () => {
            const op = FunctionModel(Number, Number).return(Number);

            const add = op((a, b) => {
                return a + b;
            });
            const add3 = op((a, b, c) => {
                return a + b + c;
            });
            const noop = op(() => {
                return undefined;
            });
            const addStr = op((a, b) => {
                return String(a) + String(b);
            });

            assert.ok(add instanceof Function && add instanceof op, "fn instanceof functionModel and Function");

            assert.equal(add(15, 25), 40, "valid function model call");
            assert.throws(() => {
                add(15);
            }, TypeError);
            assert.throws(() => {
                add3(15, 25, 42);
            }, TypeError);
            assert.throws(() => {
                noop(15, 25);
            }, TypeError);
            assert.throws(() => {
                addStr(15, 25);
            }, TypeError);
        });

        it("object models methods", () => {
            const Person = ObjectModel({
                name: String,
                age: Number,
                // function without arguments returning a String
                sayMyName: FunctionModel().return(String)
            }).defaults({
                sayMyName() {
                    return `my name is ${this.name}`;
                }
            });

            const greetFnModel = FunctionModel(Person).return(String);

            Person.prototype.greet = greetFnModel(function (otherguy) {
                return `Hello ${otherguy.name}, ${this.sayMyName()}`;
            });

            const joe = new Person({ name: "Joe", age: 28 });
            const ann = new Person({ name: "Ann", age: 23 });

            assert.equal(joe.sayMyName(), "my name is Joe", "valid function model method call 1/2");
            assert.equal(joe.greet(ann), "Hello Ann, my name is Joe", "valid function model method call 2/2");

            assert.throws(() => {
                joe.greet("dog");
            }, TypeError);

        });

        it("defaults arguments & arguments control", () => {

            const Calculator = FunctionModel(Number, ["+", "-", "*", "/", undefined], [Number])
                .return(Number);

            const calc = new Calculator(((a = 0, operator = "+", b = 1) => {
                switch (operator) {
                    case "+": return a + b;
                    case "-": return a - b;
                    case "*": return a * b;
                    case "/": return a / b;
                }
                return null;
            }));

            assert.equal(calc(3, "+"), 4, "default argument value");
            assert.equal(calc(41), 42, "defaults arguments values");
            assert.throws(() => {
                calc(6, "*", false);
            }, TypeError);

        });

        it("other models & objects as arguments", () => {
            const api = FunctionModel({
                list: ArrayModel(Number),
                op: ["sum", "product"]
            })((options) => {
                return options.list.reduce((a, b) => {
                    switch (options.op) {
                        case "sum":
                            return a + b;
                        case "product":
                            return a * b;
                    }
                }, options.op === "product" ? 1 : 0);
            });

            assert.equal(api({ list: [1, 2, 3, 4], op: "sum" }), 10, "FunctionModel object argument 1/5");
            assert.equal(api({ list: [1, 2, 3, 4], op: "product" }), 24, "FunctionModel object argument 2/5");
            assert.throws(() => {
                api({ list: [1, 2, "3", 4], op: "product" });
            }, TypeError);
            assert.throws(() => {
                api({ list: [1, 2, 3, 4], op: "divide" });
            }, TypeError);
            assert.throws(() => {
                api({ list: [1, 2, 3, 4] });
            }, TypeError);

            assert.ok(FunctionModel() instanceof FunctionModel, "FunctionModel does not throw when receiving no arguments");
        });

        it("defaultTo", () => {
            const yell = FunctionModel(String).return(String).defaultTo((s) => s.toUpperCase());

            assert.strictEqual(yell()("yo!"), "YO!", "Function model default value");
            assert.throws(() => {
                yell()(42);
            }, /.*got Number 42/, "invalid arguments still throws TypeError for defaulted function models");

            yell.default = function (s) {
                return s.length;
            };

            assert.throws(() => {
                yell()("yo!");
            }, /.*got Number 3/, "invalid default property still throws TypeError for function models");
        });

        it("Automatic model casting", () => {
            const N = ObjectModel({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
            const F = FunctionModel(N, N).return(N);
            const f = F((a, b) => {
                return { x: a.x + b.x, y: a.y + b.y };
            });
            const returnValue = f({ x: 1 }, { x: 2 });

            assert.ok(returnValue instanceof N, "test automatic model casting with return value");
            assert.equal(returnValue.x, 3, "test automatic casting with function args 1/2");
            assert.equal(returnValue.y, 14, "test automatic casting with function args 2/2");
        });
    });

    describe("array models", () => {
        const {
            model: { extra: { ObjectModel, ArrayModel } }
        } = adone;
        it("constructor && proto", () => {
            assert.ok(ArrayModel instanceof Function, "ArrayModel instanceof Function");

            const Arr = ArrayModel(Number);

            assert.ok(Arr instanceof ArrayModel, "Array models can be declared");

            assert.ok(is.function(Arr.extend), "test Array model method extend");
            assert.ok(is.function(Arr.assert), "test Array model method assert");
            assert.ok(is.function(Arr.test), "test Array model method test");
            assert.ok(is.function(Arr.validate), "test Array model method validate");
            assert.ok(Arr.definition === Number, "test Array model prop definition");
            assert.ok(typeof Arr.assertions === "object", "test Array model prop assertions");


            assert.ok(ArrayModel(undefined) instanceof ArrayModel, "ArrayModel can receive undefined as argument");
        });

        it("instanciation && mutation methods watchers", () => {

            const Arr = ArrayModel(Number);
            const a = Arr([]);

            assert.ok(a instanceof Arr && a instanceof Array, "Array models can be instanciated");

            assert.equal(a.push.name, "push", "proxyfied methods keep original properties");

            a.push(1);
            a[0] = 42;
            a.splice(1, 0, 5, 6, Infinity);
            assert.throws(() => {
                a.push("toto");
            }, TypeError);
            assert.throws(() => {
                a[0] = {};
            }, TypeError);
            assert.throws(() => {
                a.splice(1, 0, 7, "oups", 9);
            }, TypeError);
            assert.equal(a.length, 4, "array length change is ok");

        });

        it("validation in constructor", () => {

            const Arr = ArrayModel(Number);
            const b = Arr([1, 2, 3]);
            assert.equal(b.length, 3, "array.length is ok");

            assert.throws(() => {
                Arr([1, false, 3]);
            }, TypeError);

            assert.throws(() => {
                Arr([1, 2, 3, function () {
                }]);
            }, TypeError);

        });

        it("union types & submodels", () => {

            const Question = ObjectModel({
                answer: Number
            });

            const Arr = ArrayModel([Question, String, Boolean]);
            const a = Arr(["test"]);
            a.unshift(true);
            a.push(Question({ answer: 42 }));
            a.push({ answer: 43 });
            assert.throws(() => {
                a.unshift(42);
            }, TypeError);
            assert.throws(() => {
                a[0] = null;
            }, TypeError);

        });

        it("union types & fixed values", () => {

            const Arr = ArrayModel([true, 2, "3"]);
            assert.throws(() => {
                Arr(["3", 2, true, 1]);
            }, /[\s\S]*Array\[3]/, "ArrayModel fixed values");

            const Cards = ArrayModel([Number, "J", "Q", "K"]); // array of Numbers, J, Q or K
            const Hand = Cards.extend().assert((cards) => cards.length === 2);
            const pokerHand = new Hand(["K", 10]);

            assert.ok(Object.getPrototypeOf(Hand.prototype) === Cards.prototype, "extension respect prototypal chain");
            assert.ok(pokerHand instanceof Hand && pokerHand instanceof Cards, "array model inheritance");
            Cards(["K", 10]).push(7);
            assert.throws(() => {
                Hand(["K", 10]).push(7);
            }, TypeError);

            const CheaterHand = Cards.extend("joker");
            CheaterHand(["K", 10, "joker"]);
            assert.throws(() => {
                Hand("K", 10, "joker");
            }, TypeError);

        });

        it("Child array models in object models", () => {
            const Child = ObjectModel({ arr: ArrayModel(String) });
            const Parent = ObjectModel({ child: Child });

            const childO = Child({ arr: ["a", "b", "c"] });
            assert.ok(childO.arr instanceof Array, "child array model is array");
            const parentO = Parent({ child: childO });
            assert.ok(parentO.child.arr instanceof Array, "child array model from parent is array");

            childO.arr.push("a");
            assert.throws(() => {
                childO.arr.push(false);
            }, TypeError);
            assert.throws(() => {
                childO.arr[0] = 1;
            }, TypeError);
        });

        it("defaults values", () => {
            const ArrModel = ArrayModel([Number, String]).defaultTo([]);
            const a = ArrModel();

            assert.ok(a instanceof Array && a.length === 0, "Array model default value");

            ArrModel.default.push(1, 2, 3);

            const b = ArrModel();

            assert.ok(b.length === 3 && b.join(";") === "1;2;3", "array model default value is mutable array");

            ArrModel.default = "nope";

            assert.throws(() => {
                ArrModel();
            }, /.*got String "nope"/, "invalid default property still throws TypeError for array models");
        });

        it("Assertions", () => {

            const ArrayMax3 = ArrayModel(Number).assert(function maxRange(arr) {
                return arr.length <= 3;
            });
            let arr = ArrayMax3([1, 2]);

            arr.push(3);
            assert.throws(() => {
                arr.push(4);
            }, /[\s\S]*maxRange/, "test assertion after array method");

            const ArraySumMax10 = ArrayModel(Number).assert((arr) => {
                return arr.reduce((a, b) => a + b, 0) <= 10;
            });

            arr = ArraySumMax10([2, 3, 4]);
            assert.throws(() => {
                arr[1] = 7;
            }, TypeError);

            const AssertArray = ArrayModel(Number).assert((v) => v.length >= 0, "may throw exception");

            new AssertArray([]);

            assert.throws(() => {
                new AssertArray();
            }, /assertion "may throw exception" returned TypeError.*for value undefined/, "assertions catch exceptions on Array models");
        });

        it("Automatic model casting", () => {
            const N = ObjectModel({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
            const Arr = ArrayModel(N);
            const a = Arr([{ x: 9 }]);

            assert.ok(a[0] instanceof N, "test automatic model casting with array init 1/2");
            assert.equal(a[0].x * a[0].y, 63, "test automatic model casting with array init 2/2");

            a.push({ x: 3 });

            assert.ok(a[1] instanceof N, "test automatic model casting with array mutator method 1/2");
            assert.equal(a[1].x * a[1].y, 21, "test automatic model casting with array mutator method 2/2");

            a[0] = { x: 10 };

            assert.ok(a[0] instanceof N, "test automatic model casting with array set index 1/2");
            assert.equal(a[0].x * a[0].y, 70, "test automatic model casting with array set index 2/2");
        });

        it("Other traps", () => {
            const Arr = ArrayModel(Number);
            const a = Arr([1, 2, 3]);

            delete a.unknownProperty;
            delete a[3];

            assert.throws(() => {
                delete a[2];
            }, TypeError);

            const ArrB = ArrayModel([Number]);
            const b = ArrB([1, 2, 3]);

            delete b[2];
            assert.equal(b[2], undefined, "deleteProperty trap does not block when def is optional");
        });

        it("toString", () => {
            assert.equal(ArrayModel(Number).toString(), "Array of Number");
            assert.equal(ArrayModel([String, 42]).toString(), "Array of String or 42");
        });
    });

    describe("map models", () => {
        const {
            model: { extra: { ObjectModel, MapModel } }
        } = adone;

        it("constructor && proto", () => {

            assert.ok(MapModel instanceof Function, "MapModel instanceof Function");

            const Dict = MapModel(String, Number);

            assert.ok(Dict instanceof MapModel, "Map models can be declared");

            assert.ok(is.function(Dict.extend), "test Map model method extend");
            assert.ok(is.function(Dict.assert), "test Map model method assert");
            assert.ok(is.function(Dict.test), "test Map model method test");
            assert.ok(is.function(Dict.validate), "test Map model method validate");
            assert.ok(Dict.definition.key === String, "test Map model prop definition 1/2");
            assert.ok(Dict.definition.value === Number, "test Map model prop definition 2/2");
            assert.ok(typeof Dict.assertions === "object", "test Map model prop assertions");

            assert.ok(MapModel(undefined, undefined) instanceof MapModel, "MapModel can receive undefined as argument");
        });

        it("instanciation && mutation methods watchers", () => {
            const Dict = MapModel(String, Number).assert((m) => m.size >= 2, "minsize assert");
            const m = Dict([["one", 1], ["two", 2]]);

            assert.ok(m instanceof Dict && m instanceof Map, "Map models can be instanciated");

            m.set("three", 3);

            assert.equal(m.set.name, "set", "proxyfied methods keep original properties");

            assert.throws(() => {
                m.set("four", "4");
            }, /.*four/, "set calls are catched");

            assert.equal(m.size, 3, "map size change is ok 1/2");

            m.delete("three");
            assert.throws(() => {
                m.delete("two");
            }, /.*minsize assert/, "delete calls are catched");

            assert.throws(() => {
                m.clear();
            }, /.*minsize assert/, "clear calls are catched");

            assert.equal(m.size, 2, "map size change is ok 2/2");
        });

        it("validation in constructor", () => {
            const Dict = MapModel(String, Number);
            const m = Dict([["one", 1], ["two", 2]]);
            assert.equal(m.size, 2, "map size is ok");

            assert.throws(() => {
                Dict(["one", 1], [1, 2]);
            }, TypeError);

            assert.throws(() => {
                Dict(["one", 1], ["two", "2"]);
            }, TypeError);
        });

        it("union types & submodels", () => {
            const Question = ObjectModel({ question: String });
            const Answer = ObjectModel({ answer: Number });

            const Dict = MapModel([Question, String], [Answer, String, Boolean]);
            const m = Dict([["test", "test"]]);
            m.set("is it real life ?", true);
            m.set(Question({ question: "life universe and everything" }), Answer({ answer: 42 }));
            m.set("another one with autocast", { answer: 43 });
            assert.throws(() => {
                m.set(42, false);
            }, /.*expecting Map key to be.*[\s\S]*42/, "map set multiple types for keys");
            assert.throws(() => {
                m.set("test", 42);
            }, /.*test/, "map set multiple types for values");
        });

        it("union types & fixed values", () => {
            const DictA = MapModel([true, 2, "3"], [4, "5"]);
            assert.throws(() => {
                DictA([["3", 4], ["2", "5"]]);
            }, /.*expecting Map key to be true or 2 or "3", got String "2"/, "MapModel fixed values");

            DictA([[true, 4], [2, "5"]]);
            const DictB = DictA.extend().assert((m) => m.size === 2);
            const dictB = new DictB([[2, 4], ["3", "5"]]);

            assert.ok(Object.getPrototypeOf(DictB.prototype) === DictA.prototype, "extension respect prototypal chain");
            assert.ok(dictB instanceof DictB && dictB instanceof DictA, "map model inheritance");
            DictA([[true, 4], [2, "5"]]).set("3", 4);
            assert.throws(() => {
                DictB([[true, 4], [2, "5"]]).set("3", 4);
            }, TypeError);

            const DictC = DictB.extend("new", "val");
            DictC([["new", "5"], [true, "val"]]);
            assert.throws(() => {
                DictB([["new", "5"], ["3", 4]]);
            }, TypeError);
            assert.throws(() => {
                DictB([["3", 4], [true, "val"]]);
            }, TypeError);
        });

        it("Child map models in object models", () => {
            const Child = ObjectModel({ map: MapModel(Number, String) });
            const Parent = ObjectModel({ child: Child });

            const childO = Child({ map: new Map([[1, "one"], [2, "two"]]) });
            assert.ok(childO.map instanceof Map, "child map model is instanceof Map");
            const parentO = Parent({ child: childO });
            assert.ok(parentO.child.map instanceof Map, "child map model from parent is Map");

            childO.map.set(3, "three");
            assert.throws(() => {
                childO.map.set(4, false);
            }, TypeError);
            assert.throws(() => {
                childO.map.set("four", "four");
            }, TypeError);
        });

        it("defaults values", () => {
            const M = MapModel(Number, String).defaultTo(new Map([[1, "one"], [2, "two"]]));
            const a = M();

            assert.ok(a instanceof Map && a.size === 2, "Map model default value");

            M.default.set(3, "three");

            const b = M();

            assert.ok(b.size === 3 && Array.from(b.keys()).sort().join(";") === "1;2;3", "map model default value is mutable");

            M.default = "nope";

            assert.throws(() => {
                M();
            }, TypeError);
        });

        it("assertions", () => {
            const MapMax3 = MapModel(Number, String).assert(function maxEntries(map) {
                return map.size <= 3;
            });
            const map = MapMax3([[1, "one"], [2, "two"]]);

            map.set(3, "three");
            assert.throws(() => {
                map.set(4, "four");
            }, /[\s\S]*maxEntries/, "test assertion after map method");

            const AssertMap = MapModel(Number, Number).assert((m) => m.size > 0, "may throw exception");

            new AssertMap([[1, 2]]);

            assert.throws(() => {
                new AssertMap([]);
            }, /assertion "may throw exception" returned false.*for Map = \[]/, "assertions catch exceptions on Map models");
        });

        it("Automatic model casting", () => {
            const X = ObjectModel({ x: Number }).defaults({ x: 5 });
            const Y = ObjectModel({ y: [Number] }).defaults({ y: 7 });
            const M = MapModel(X, Y);
            const m = M([[{ x: 9 }, {}]]);

            assert.ok(Array.from(m.keys())[0] instanceof X, "test automatic model casting with map init 1/3");
            assert.ok(Array.from(m.values())[0] instanceof Y, "test automatic model casting with map init 2/3");
            let [k, v] = Array.from(m.entries())[0];
            assert.equal(k.x * v.y, 63, "test automatic model casting with map init 3/3");

            m.set({ x: 3 }, { y: 4 });

            assert.ok(Array.from(m.keys())[1] instanceof X, "test automatic model casting with map mutator method 1/3");
            assert.ok(Array.from(m.values())[1] instanceof Y, "test automatic model casting with map mutator method 2/3");

            [k, v] = Array.from(m.entries())[1];
            assert.equal(k.x * v.y, 12, "test automatic model casting with map mutator method 3/3");
        });

        it("toString", () => {
            assert.equal(MapModel(Number, String).toString(), "Map of Number : String");
            assert.equal(MapModel(Date, [String, 42]).toString(), "Map of Date : String or 42");
        });
    });

    describe("set models", () => {
        const {
            model: { extra: { ObjectModel, SetModel } }
        } = adone;

        it("constructor && proto", () => {
            assert.ok(SetModel instanceof Function, "SetModel instanceof Function");

            const MySet = SetModel(String);

            assert.ok(MySet instanceof SetModel, "Set models can be declared");

            assert.ok(is.function(MySet.extend), "test Set model method extend");
            assert.ok(is.function(MySet.assert), "test Set model method assert");
            assert.ok(is.function(MySet.test), "test Set model method test");
            assert.ok(is.function(MySet.validate), "test Set model method validate");
            assert.ok(MySet.definition === String, "test Set model prop definition");
            assert.ok(typeof MySet.assertions === "object", "test Set model prop assertions");

            assert.ok(SetModel(undefined) instanceof SetModel, "SetModel can receive undefined as argument");

        });

        it("instanciation && mutation methods watchers", () => {

            const S = SetModel(Number).assert((s) => s.size >= 2, "minsize assert");
            const s = S([1, 2]);

            assert.ok(s instanceof S && s instanceof Set, "Set models can be instanciated");

            s.add(3);

            assert.equal(s.add.name, "add", "proxyfied methods keep original properties");

            assert.throws(() => {
                s.add("four");
            }, /.*four/, "add calls are catched");

            assert.equal(s.size, 3, "set size change is ok 1/2");

            s.delete(3);
            assert.throws(() => {
                s.delete(2);
            }, /.*minsize assert/, "delete calls are catched");

            assert.throws(() => {
                s.clear();
            }, /.*minsize assert/, "clear calls are catched");

            assert.equal(s.size, 2, "set size change is ok 2/2");

        });

        it("validation in constructor", () => {
            const S = SetModel(String);
            const s = S(["one", "two"]);
            assert.equal(s.size, 2, "set size is ok");

            assert.throws(() => {
                S(["one", 2]);
            }, TypeError);

            assert.throws(() => {
                S([1, "two"]);
            }, TypeError);

        });

        it("union types & submodels", () => {
            const Question = ObjectModel({
                answer: Number
            });

            const Quiz = SetModel([Question, String, Boolean]);
            const s = Quiz(["test", true, { answer: 42 }]);
            s.add("is it real life ?");
            s.add(true);
            s.add({ answer: 43 });
            assert.throws(() => {
                s.add(42);
            }, /[\s\S]*got Number 42/m, "set invalid type on union type");

        });

        it("union types & fixed values", () => {

            const S = SetModel([true, 2, "3"]);
            assert.throws(() => {
                S(["3", 4]);
            }, /[\s\S]*Set.*Number 4/, "SetModel fixed values");

            S([2, true]);
            const S2 = S.extend().assert((s) => s.size === 2);
            const s2 = new S2([2, "3"]);

            assert.ok(Object.getPrototypeOf(S2.prototype) === S.prototype, "extension respect prototypal chain");
            assert.ok(s2 instanceof S2 && s2 instanceof S, "set model inheritance");
            S([2, true]).add("3");
            assert.throws(() => {
                S2([2, true]).add("3");
            }, TypeError);

            const S3 = S2.extend("new", "val");
            S3(["val", true]);
            S3([true, "new"]);
            assert.throws(() => {
                S2(["val", true]);
            }, TypeError);
        });

        it("Child set models in object models", () => {
            const Child = ObjectModel({ set: SetModel(Number) });
            const Parent = ObjectModel({ child: Child });

            const childO = Child({ set: new Set([1, 2, 3, 5, 8]) });
            assert.ok(childO.set instanceof Set, "child set model is instanceof Set");
            const parentO = Parent({ child: childO });
            assert.ok(parentO.child.set instanceof Set, "child set model from parent is Set");

            childO.set.add(13);
            assert.throws(() => {
                childO.set.add("21");
            }, TypeError);
        });

        it("defaults values", () => {
            const S = SetModel(Number).defaultTo(new Set([1, 2]));
            const a = S();

            assert.ok(a instanceof Set && a.size === 2, "Set model default value");

            S.default.add(3);

            const b = S();

            assert.ok(b.size === 3 && Array.from(b.values()).sort().join(";") === "1;2;3", "set model default value is mutable");

            S.default = "nope";

            assert.throws(() => {
                S();
            }, TypeError);
        });

        it("assertions", () => {
            const SetMax3 = SetModel(String).assert(function maxEntries(set) {
                return set.size <= 3;
            });

            const set = SetMax3(["one", "two"]);

            set.add("three");
            assert.throws(() => {
                set.add("four");
            }, /[\s\S]*maxEntries/, "test assertion after set method");

            const AssertSet = SetModel(Number).assert((s) => s.size > 0, "may throw exception");

            new AssertSet([1, 2]);

            assert.throws(() => {
                new AssertSet([]);
            }, /assertion "may throw exception" returned false.*for value \[]/, "assertions catch exceptions on Set models");
        });

        it("Automatic model casting", () => {

            const N = ObjectModel({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
            const S = SetModel(N);
            const s = S([{ x: 9 }]);

            let n = Array.from(s.values())[0];
            assert.ok(n instanceof N, "test automatic model casting with set init 1/2");
            assert.equal(n.x * n.y, 63, "test automatic model casting with set init 2/2");

            s.add({ x: 3 });
            n = Array.from(s.values())[1];

            assert.ok(n instanceof N, "test automatic model casting with array mutator method 1/2");
            assert.equal(n.x * n.y, 21, "test automatic model casting with array mutator method 2/2");
        });

        it("toString", () => {
            assert.equal(SetModel(Number).toString(), "Set of Number");
            assert.equal(SetModel([String, 42]).toString(), "Set of String or 42");
        });
    });
});
