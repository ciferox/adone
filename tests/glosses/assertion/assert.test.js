import { err } from "./utils";
const { is, assertion } = adone;
assertion.loadAssertInterface();
assertion.loadExpectInterface();
const { assert, expect, AssertionError, getAssertion } = assertion;

describe("assertion", "assert", () => {
    it("assert", () => {
        const foo = "bar";
        assert(foo === "bar", "expected foo to equal `bar`");

        err(() => {
            assert(foo === "baz", "expected foo to equal `bar`");
        }, "expected foo to equal `bar`");

        err(() => {
            assert(foo === "baz", () => {
                return "expected foo to equal `bar`";
            });
        }, "expected foo to equal `bar`");
    });

    describe("fail", () => {
        it("should accept a message as the 3rd argument", () => {
            err(() => {
                assert.fail(0, 1, "this has failed");
            }, /this has failed/);
        });

        it("should accept a message as the only argument", () => {
            err(() => {
                assert.fail("this has failed");
            }, /this has failed/);
        });

        it("should produce a default message when called without any arguments", () => {
            err(() => {
                assert.fail();
            }, /assert\.fail()/);
        });
    });

    it("true", () => {
        assert.true(true);

        err(() => {
            assert.true(false, "blah");
        }, "blah: expected false to be true");

        err(() => {
            assert.true(1);
        }, "expected 1 to be true");

        err(() => {
            assert.true("test");
        }, "expected 'test' to be true");
    });

    it("notTrue", () => {
        assert.notTrue(false);

        err(() => {
            assert.notTrue(true, "blah");
        }, "blah: expected true to not equal true");
    });

    it("ok", () => {
        assert.ok(true);
        assert.ok(1);
        assert.ok("test");

        err(() => {
            assert.ok(false, "blah");
        }, "blah: expected false to be truthy");

        err(() => {
            assert.ok(0);
        }, "expected 0 to be truthy");

        err(() => {
            assert.ok("");
        }, "expected '' to be truthy");
    });

    it("notOk", () => {
        assert.notOk(false);
        assert.notOk(0);
        assert.notOk("");

        err(() => {
            assert.notOk(true, "blah");
        }, "blah: expected true to be falsy");

        err(() => {
            assert.notOk(1);
        }, "expected 1 to be falsy");

        err(() => {
            assert.notOk("test");
        }, "expected 'test' to be falsy");
    });

    it("false", () => {
        assert.false(false);

        err(() => {
            assert.false(true, "blah");
        }, "blah: expected true to be false");

        err(() => {
            assert.false(0);
        }, "expected 0 to be false");
    });

    it("notFalse", () => {
        assert.notFalse(true);

        err(() => {
            assert.notFalse(false, "blah");
        }, "blah: expected false to not equal false");
    });

    it("equal", () => {
        let foo;
        assert.equal(foo, undefined);

        if (is.function(Symbol)) {
            const sym = Symbol();
            assert.equal(sym, sym);
        }

        err(() => {
            assert.equal(1, 2, "blah");
        }, "blah: expected 1 to equal 2");
    });

    it("typeof", () => {
        assert.typeOf("test", "string");
        assert.typeOf(true, "boolean");
        assert.typeOf(5, "number");

        if (is.function(Symbol)) {
            assert.typeOf(Symbol(), "symbol");
        }

        err(() => {
            assert.typeOf(5, "string", "blah");
        }, "blah: expected 5 to be a string");

    });

    it("notTypeOf", () => {
        assert.notTypeOf("test", "number");

        err(() => {
            assert.notTypeOf(5, "number", "blah");
        }, "blah: expected 5 not to be a number");
    });

    it("instanceOf", () => {
        function Foo() { }
        assert.instanceOf(new Foo(), Foo);

        err(() => {
            assert.instanceOf(new Foo(), 1, "blah");
        }, "blah: The instanceof assertion needs a constructor but number was given.");

        err(() => {
            assert.instanceOf(new Foo(), "batman");
        }, "The instanceof assertion needs a constructor but string was given.");

        err(() => {
            assert.instanceOf(new Foo(), {});
        }, "The instanceof assertion needs a constructor but object was given.");

        err(() => {
            assert.instanceOf(new Foo(), true);
        }, "The instanceof assertion needs a constructor but boolean was given.");

        err(() => {
            assert.instanceOf(new Foo(), null);
        }, "The instanceof assertion needs a constructor but null was given.");

        err(() => {
            assert.instanceOf(new Foo(), undefined);
        }, "The instanceof assertion needs a constructor but undefined was given.");

        err(() => {
            assert.instanceOf(new Foo(), Symbol());
        }, "The instanceof assertion needs a constructor but symbol was given.");

        err(() => {
            function Thing() { }
            const t = new Thing();
            Thing.prototype = 1337;
            assert.instanceOf(t, Thing);
        }, "The instanceof assertion needs a constructor but function was given.", true);

        err(() => {
            const FakeConstructor = {};
            const fakeInstanceB = 4;
            FakeConstructor[Symbol.hasInstance] = function (val) {
                return val === 3;
            };

            assert.instanceOf(fakeInstanceB, FakeConstructor);
        }, "expected 4 to be an instance of an unnamed constructor");

        err(() => {
            assert.instanceOf(5, Foo, "blah");
        }, "blah: expected 5 to be an instance of Foo");

        function CrashyObject() { }
        CrashyObject.prototype.inspect = function () {
            throw new Error("Arg's inspect() called even though the test passed");
        };
        assert.instanceOf(new CrashyObject(), CrashyObject);
    });

    it("notInstanceOf", () => {
        function Foo() { }
        assert.notInstanceOf(new Foo(), String);

        err(() => {
            assert.notInstanceOf(new Foo(), 1, "blah");
        }, "blah: The instanceof assertion needs a constructor but number was given.");

        err(() => {
            assert.notInstanceOf(new Foo(), "batman");
        }, "The instanceof assertion needs a constructor but string was given.");

        err(() => {
            assert.notInstanceOf(new Foo(), {});
        }, "The instanceof assertion needs a constructor but object was given.");

        err(() => {
            assert.notInstanceOf(new Foo(), true);
        }, "The instanceof assertion needs a constructor but boolean was given.");

        err(() => {
            assert.notInstanceOf(new Foo(), null);
        }, "The instanceof assertion needs a constructor but null was given.");

        err(() => {
            assert.notInstanceOf(new Foo(), undefined);
        }, "The instanceof assertion needs a constructor but undefined was given.");


        if (!is.undefined(Symbol) && !is.undefined(Symbol.hasInstance)) {
            err(() => {
                assert.notInstanceOf(new Foo(), Symbol());
            }, "The instanceof assertion needs a constructor but symbol was given.");

            err(() => {
                const FakeConstructor = {};
                const fakeInstanceB = 4;
                FakeConstructor[Symbol.hasInstance] = function (val) {
                    return val === 4;
                };

                assert.notInstanceOf(fakeInstanceB, FakeConstructor);
            }, "expected 4 to not be an instance of an unnamed constructor");
        }

        err(() => {
            assert.notInstanceOf(new Foo(), Foo, "blah");
        }, "blah: expected {} to not be an instance of Foo");
    });

    it("object", () => {
        function Foo() { }
        assert.object({});
        assert.object(new Foo());

        err(() => {
            assert.object(true, "blah");
        }, "blah: expected true to be an object");

        err(() => {
            assert.object(Foo);
        }, "expected [Function: Foo] to be an object");

        err(() => {
            assert.object("foo");
        }, "expected 'foo' to be an object");
    });

    it("notObject", () => {
        function Foo() { }
        assert.notObject(5);

        err(() => {
            assert.notObject({}, "blah");
        }, "blah: expected {} not to be an object");
    });

    it("notEqual", () => {
        assert.notEqual(3, 4);

        if (is.function(Symbol)) {
            let sym1 = Symbol(),
                sym2 = Symbol();
            assert.notEqual(sym1, sym2);
        }

        err(() => {
            assert.notEqual(5, 5, "blah");
        }, "blah: expected 5 to not equal 5");
    });

    it("strictEqual", () => {
        assert.strictEqual("foo", "foo");

        if (is.function(Symbol)) {
            const sym = Symbol();
            assert.strictEqual(sym, sym);
        }

        err(() => {
            assert.strictEqual("5", 5, "blah");
        }, "blah: expected \'5\' to equal 5");
    });

    it("notStrictEqual", () => {
        assert.notStrictEqual(5, "5");

        if (is.function(Symbol)) {
            let sym1 = Symbol(),
                sym2 = Symbol();
            assert.notStrictEqual(sym1, sym2);
        }

        err(() => {
            assert.notStrictEqual(5, 5, "blah");
        }, "blah: expected 5 to not equal 5");
    });

    it("deepEqual", () => {
        assert.deepEqual({ tea: "chai" }, { tea: "chai" });
        assert.deepStrictEqual({ tea: "chai" }, { tea: "chai" }); // Alias of deepEqual

        assert.deepEqual([NaN], [NaN]);
        assert.deepEqual({ tea: NaN }, { tea: NaN });

        err(() => {
            assert.deepEqual({ tea: "chai" }, { tea: "black" }, "blah");
        }, "blah: expected { tea: \'chai\' } to deeply equal { tea: \'black\' }");

        let obja = Object.create({ tea: "chai" }),
            objb = Object.create({ tea: "chai" });

        assert.deepEqual(obja, objb);

        let obj1 = Object.create({ tea: "chai" }),
            obj2 = Object.create({ tea: "black" });

        err(() => {
            assert.deepEqual(obj1, obj2);
        }, "expected { tea: \'chai\' } to deeply equal { tea: \'black\' }");
    });

    it("deepEqual (ordering)", () => {
        let a = { a: "b", c: "d" },
            b = { c: "d", a: "b" };
        assert.deepEqual(a, b);
    });

    it("deepEqual /regexp/", () => {
        assert.deepEqual(/a/, /a/);
        assert.notDeepEqual(/a/, /b/);
        assert.notDeepEqual(/a/, {});
        assert.deepEqual(/a/g, /a/g);
        assert.notDeepEqual(/a/g, /b/g);
        assert.deepEqual(/a/i, /a/i);
        assert.notDeepEqual(/a/i, /b/i);
        assert.deepEqual(/a/m, /a/m);
        assert.notDeepEqual(/a/m, /b/m);
    });

    it("deepEqual (Date)", () => {
        let a = new Date(1, 2, 3),
            b = new Date(4, 5, 6);
        assert.deepEqual(a, a);
        assert.notDeepEqual(a, b);
        assert.notDeepEqual(a, {});
    });

    it("deepEqual (circular)", () => {
        let circularObject = {},
            secondCircularObject = {};
        circularObject.field = circularObject;
        secondCircularObject.field = secondCircularObject;

        assert.deepEqual(circularObject, secondCircularObject);

        err(() => {
            secondCircularObject.field2 = secondCircularObject;
            assert.deepEqual(circularObject, secondCircularObject);
        }, "expected { field: [Circular] } to deeply equal { Object (field, field2) }");
    });

    it("notDeepEqual", () => {
        assert.notDeepEqual({ tea: "jasmine" }, { tea: "chai" });

        err(() => {
            assert.notDeepEqual({ tea: "chai" }, { tea: "chai" }, "blah");
        }, "blah: expected { tea: \'chai\' } to not deeply equal { tea: \'chai\' }");
    });

    it("notDeepEqual (circular)", () => {
        let circularObject = {},
            secondCircularObject = { tea: "jasmine" };
        circularObject.field = circularObject;
        secondCircularObject.field = secondCircularObject;

        assert.notDeepEqual(circularObject, secondCircularObject);

        err(() => {
            delete secondCircularObject.tea;
            assert.notDeepEqual(circularObject, secondCircularObject);
        }, "expected { field: [Circular] } to not deeply equal { field: [Circular] }");
    });

    it("null", () => {
        assert.null(null);

        err(() => {
            assert.null(undefined, "blah");
        }, "blah: expected undefined to equal null");
    });

    it("notNull", () => {
        assert.notNull(undefined);

        err(() => {
            assert.notNull(null, "blah");
        }, "blah: expected null to not equal null");
    });

    it("NaN", () => {
        assert.NaN(NaN);

        err(() => {
            assert.NaN(Infinity, "blah");
        }, "blah: expected Infinity to be NaN");

        err(() => {
            assert.NaN(undefined);
        }, "expected undefined to be NaN");

        err(() => {
            assert.NaN({});
        }, "expected {} to be NaN");

        err(() => {
            assert.NaN(4);
        }, "expected 4 to be NaN");
    });

    it("notNaN", () => {
        assert.notNaN(4);
        assert.notNaN(Infinity);
        assert.notNaN(undefined);
        assert.notNaN({});

        err(() => {
            assert.notNaN(NaN, "blah");
        }, "blah: expected NaN not to be NaN");
    });

    it("exists", () => {
        const meeber = "awesome";
        let iDoNotExist;

        assert.exists(meeber);
        assert.exists(0);
        assert.exists(false);
        assert.exists("");

        err(() => {
            assert.exists(iDoNotExist, "blah");
        }, "blah: expected undefined to exist");
    });

    it("notExists", () => {
        const meeber = "awesome";
        let iDoNotExist;

        assert.notExists(iDoNotExist);

        err(() => {
            assert.notExists(meeber, "blah");
        }, "blah: expected 'awesome' to not exist");
    });

    it("undefined", () => {
        assert.undefined(undefined);

        err(() => {
            assert.undefined(null, "blah");
        }, "blah: expected null to equal undefined");
    });

    it("defined", () => {
        assert.defined(null);

        err(() => {
            assert.defined(undefined, "blah");
        }, "blah: expected undefined to not equal undefined");
    });

    it("function", () => {
        const func = function () { };
        assert.function(func);

        err(() => {
            assert.function({}, "blah");
        }, "blah: expected {} to be a function");
    });

    it("notFunction", () => {
        assert.notFunction(5);

        err(() => {
            assert.notFunction(() => { }, "blah");
        }, "blah: expected [Function] not to be a function");
    });

    it("array", () => {
        assert.array([]);
        assert.array(new Array());

        err(() => {
            assert.array({}, "blah");
        }, "blah: expected {} to be an array");
    });

    it("notArray", () => {
        assert.notArray(3);

        err(() => {
            assert.notArray([], "blah");
        }, "blah: expected [] not to be an array");

        err(() => {
            assert.notArray(new Array());
        }, "expected [] not to be an array");
    });

    it("string", () => {
        assert.string("Foo");
        assert.string(new String("foo"));

        err(() => {
            assert.string(1, "blah");
        }, "blah: expected 1 to be a string");
    });

    it("notString", () => {
        assert.notString(3);
        assert.notString(["hello"]);

        err(() => {
            assert.notString("hello", "blah");
        }, "blah: expected 'hello' not to be a string");
    });

    it("number", () => {
        assert.number(1);
        assert.number(Number("3"));

        err(() => {
            assert.number("1", "blah");
        }, "blah: expected \'1\' to be a number");
    });

    it("number", () => {
        assert.notNumber("hello");
        assert.notNumber([5]);

        err(() => {
            assert.notNumber(4, "blah");
        }, "blah: expected 4 not to be a number");
    });

    it("finite", () => {
        assert.finite(4);
        assert.finite(-10);

        err(() => {
            assert.finite(NaN, "blah");
        }, "blah: expected NaN to be a finite number");

        err(() => {
            assert.finite(Infinity);
        }, "expected Infinity to be a finite number");

        err(() => {
            assert.finite("foo");
        }, "expected \'foo\' to be a finite number");

        err(() => {
            assert.finite([]);
        }, "expected [] to be a finite number");

        err(() => {
            assert.finite({});
        }, "expected {} to be a finite number");
    });

    it("boolean", () => {
        assert.boolean(true);
        assert.boolean(false);

        err(() => {
            assert.boolean("1", "blah");
        }, "blah: expected \'1\' to be a boolean");
    });

    it("notBoolean", () => {
        assert.notBoolean("true");

        err(() => {
            assert.notBoolean(true, "blah");
        }, "blah: expected true not to be a boolean");

        err(() => {
            assert.notBoolean(false);
        }, "expected false not to be a boolean");
    });

    it("include", () => {
        assert.include("foobar", "bar");
        assert.include("", "");
        assert.include([1, 2, 3], 3);

        // .include should work with Error objects and objects with a custom
        // `@@toStringTag`.
        assert.include(new Error("foo"), { message: "foo" });
        const customObj = { a: 1 };
        customObj[Symbol.toStringTag] = "foo";

        assert.include(customObj, { a: 1 });

        let obj1 = { a: 1 },
            obj2 = { b: 2 };
        assert.include([obj1, obj2], obj1);
        assert.include({ foo: obj1, bar: obj2 }, { foo: obj1 });
        assert.include({ foo: obj1, bar: obj2 }, { foo: obj1, bar: obj2 });

        const map = new Map();
        const val = [{ a: 1 }];
        map.set("a", val);
        map.set("b", 2);
        map.set("c", -0);
        map.set("d", NaN);

        assert.include(map, val);
        assert.include(map, 2);
        assert.include(map, 0);
        assert.include(map, NaN);

        const set = new Set();
        set.add(val);
        set.add(2);
        set.add(-0);
        set.add(NaN);

        assert.include(set, val);
        assert.include(set, 2);
        assert.include(set, 0);
        assert.include(set, NaN);

        const ws = new WeakSet();
        ws.add(val);

        assert.include(ws, val);

        let sym1 = Symbol(),
            sym2 = Symbol();
        assert.include([sym1, sym2], sym1);

        err(() => {
            assert.include("foobar", "baz", "blah");
        }, "blah: expected \'foobar\' to include \'baz\'");

        err(() => {
            assert.include([{ a: 1 }, { b: 2 }], { a: 1 });
        }, "expected [ { a: 1 }, { b: 2 } ] to include { a: 1 }");

        err(() => {
            assert.include({ foo: { a: 1 }, bar: { b: 2 } }, { foo: { a: 1 } }, "blah");
        }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to have property 'foo' of { a: 1 }, but got { a: 1 }");

        err(() => {
            assert.include(true, true, "blah");
        }, "blah: object tested must be an array, a map, an object, a set, a string, or a weakset, but boolean given");

        err(() => {
            assert.include(42, "bar");
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but number given");

        err(() => {
            assert.include(null, 42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but null given");

        err(() => {
            assert.include(undefined, "bar");
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but undefined given");
    });

    it("notInclude", () => {
        assert.notInclude("foobar", "baz");
        assert.notInclude([1, 2, 3], 4);

        let obj1 = { a: 1 },
            obj2 = { b: 2 };
        assert.notInclude([obj1, obj2], { a: 1 });
        assert.notInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 } });
        assert.notInclude({ foo: obj1, bar: obj2 }, { foo: obj1, bar: { b: 2 } });

        const map = new Map();
        const val = [{ a: 1 }];
        map.set("a", val);
        map.set("b", 2);

        assert.notInclude(map, [{ a: 1 }]);
        assert.notInclude(map, 3);

        const set = new Set();
        set.add(val);
        set.add(2);

        assert.include(set, val);
        assert.include(set, 2);

        assert.notInclude(set, [{ a: 1 }]);
        assert.notInclude(set, 3);

        const ws = new WeakSet();
        ws.add(val);

        assert.notInclude(ws, [{ a: 1 }]);
        assert.notInclude(ws, {});

        let sym1 = Symbol(),
            sym2 = Symbol(),
            sym3 = Symbol();
        assert.notInclude([sym1, sym2], sym3);

        err(() => {
            let obj1 = { a: 1 },
                obj2 = { b: 2 };
            assert.notInclude([obj1, obj2], obj1, "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 } ] to not include { a: 1 }");

        err(() => {
            let obj1 = { a: 1 },
                obj2 = { b: 2 };
            assert.notInclude({ foo: obj1, bar: obj2 }, { foo: obj1, bar: obj2 }, "blah");
        }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to not have property 'foo' of { a: 1 }");

        err(() => {
            assert.notInclude(true, true, "blah");
        }, "blah: object tested must be an array, a map, an object, a set, a string, or a weakset, but boolean given");

        err(() => {
            assert.notInclude(42, "bar");
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but number given");

        err(() => {
            assert.notInclude(null, 42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but null given");

        err(() => {
            assert.notInclude(undefined, "bar");
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but undefined given");

        err(() => {
            assert.notInclude("foobar", "bar");
        }, "expected \'foobar\' to not include \'bar\'");
    });

    it("deepInclude and notDeepInclude", () => {
        let obj1 = { a: 1 },
            obj2 = { b: 2 };
        assert.deepInclude([obj1, obj2], { a: 1 });
        assert.notDeepInclude([obj1, obj2], { a: 9 });
        assert.notDeepInclude([obj1, obj2], { z: 1 });
        assert.deepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 } });
        assert.deepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 }, bar: { b: 2 } });
        assert.notDeepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 9 } });
        assert.notDeepInclude({ foo: obj1, bar: obj2 }, { foo: { z: 1 } });
        assert.notDeepInclude({ foo: obj1, bar: obj2 }, { baz: { a: 1 } });
        assert.notDeepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 }, bar: { b: 9 } });

        const map = new Map();
        map.set(1, [{ a: 1 }]);

        assert.deepInclude(map, [{ a: 1 }]);

        const set = new Set();
        set.add([{ a: 1 }]);

        assert.deepInclude(set, [{ a: 1 }]);

        err(() => {
            assert.deepInclude(new WeakSet(), {}, "foo");
        }, "foo: unable to use .deep.include with WeakSet");

        err(() => {
            assert.deepInclude([obj1, obj2], { a: 9 }, "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 } ] to deep include { a: 9 }");

        err(() => {
            assert.notDeepInclude([obj1, obj2], { a: 1 });
        }, "expected [ { a: 1 }, { b: 2 } ] to not deep include { a: 1 }");

        err(() => {
            assert.deepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 }, bar: { b: 9 } }, "blah");
        }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to have deep property 'bar' of { b: 9 }, but got { b: 2 }");

        err(() => {
            assert.notDeepInclude({ foo: obj1, bar: obj2 }, { foo: { a: 1 }, bar: { b: 2 } }, "blah");
        }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to not have deep property 'foo' of { a: 1 }");
    });

    it("nestedInclude and notNestedInclude", () => {
        assert.nestedInclude({ a: { b: ["x", "y"] } }, { "a.b[1]": "y" });
        assert.notNestedInclude({ a: { b: ["x", "y"] } }, { "a.b[1]": "x" });
        assert.notNestedInclude({ a: { b: ["x", "y"] } }, { "a.c": "y" });

        assert.notNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { x: 1 } });

        assert.nestedInclude({ ".a": { "[b]": "x" } }, { "\\.a.\\[b\\]": "x" });
        assert.notNestedInclude({ ".a": { "[b]": "x" } }, { "\\.a.\\[b\\]": "y" });

        err(() => {
            assert.nestedInclude({ a: { b: ["x", "y"] } }, { "a.b[1]": "x" }, "blah");
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.b[1]' of 'x', but got 'y'");

        err(() => {
            assert.nestedInclude({ a: { b: ["x", "y"] } }, { "a.b[1]": "x" }, "blah");
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.b[1]' of 'x', but got 'y'");

        err(() => {
            assert.nestedInclude({ a: { b: ["x", "y"] } }, { "a.c": "y" });
        }, "expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.c'");

        err(() => {
            assert.notNestedInclude({ a: { b: ["x", "y"] } }, { "a.b[1]": "y" }, "blah");
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to not have nested property 'a.b[1]' of 'y'");
    });

    it("deepNestedInclude and notDeepNestedInclude", () => {
        assert.deepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { x: 1 } });
        assert.notDeepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { y: 2 } });
        assert.notDeepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.c": { x: 1 } });

        assert.deepNestedInclude({ ".a": { "[b]": { x: 1 } } }, { "\\.a.\\[b\\]": { x: 1 } });
        assert.notDeepNestedInclude({ ".a": { "[b]": { x: 1 } } }, { "\\.a.\\[b\\]": { y: 2 } });

        err(() => {
            assert.deepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { y: 2 } }, "blah");
        }, "blah: expected { a: { b: [ [Object] ] } } to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

        err(() => {
            assert.deepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { y: 2 } }, "blah");
        }, "blah: expected { a: { b: [ [Object] ] } } to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

        err(() => {
            assert.deepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.c": { x: 1 } });
        }, "expected { a: { b: [ [Object] ] } } to have deep nested property 'a.c'");

        err(() => {
            assert.notDeepNestedInclude({ a: { b: [{ x: 1 }] } }, { "a.b[0]": { x: 1 } }, "blah");
        }, "blah: expected { a: { b: [ [Object] ] } } to not have deep nested property 'a.b[0]' of { x: 1 }");
    });

    it("ownInclude and notOwnInclude", () => {
        assert.ownInclude({ a: 1 }, { a: 1 });
        assert.notOwnInclude({ a: 1 }, { a: 3 });
        assert.notOwnInclude({ a: 1 }, { toString: Object.prototype.toString });

        assert.notOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });

        err(() => {
            assert.ownInclude({ a: 1 }, { a: 3 }, "blah");
        }, "blah: expected { a: 1 } to have own property 'a' of 3, but got 1");

        err(() => {
            assert.ownInclude({ a: 1 }, { a: 3 }, "blah");
        }, "blah: expected { a: 1 } to have own property 'a' of 3, but got 1");

        err(() => {
            assert.ownInclude({ a: 1 }, { toString: Object.prototype.toString });
        }, "expected { a: 1 } to have own property 'toString'");

        err(() => {
            assert.notOwnInclude({ a: 1 }, { a: 1 }, "blah");
        }, "blah: expected { a: 1 } to not have own property 'a' of 1");
    });

    it("deepOwnInclude and notDeepOwnInclude", () => {
        assert.deepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } });
        assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } });
        assert.notDeepOwnInclude({ a: { b: 2 } }, { toString: Object.prototype.toString });

        err(() => {
            assert.deepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } }, "blah");
        }, "blah: expected { a: { b: 2 } } to have deep own property 'a' of { c: 3 }, but got { b: 2 }");

        err(() => {
            assert.deepOwnInclude({ a: { b: 2 } }, { a: { c: 3 } }, "blah");
        }, "blah: expected { a: { b: 2 } } to have deep own property 'a' of { c: 3 }, but got { b: 2 }");

        err(() => {
            assert.deepOwnInclude({ a: { b: 2 } }, { toString: Object.prototype.toString });
        }, "expected { a: { b: 2 } } to have deep own property 'toString'");

        err(() => {
            assert.notDeepOwnInclude({ a: { b: 2 } }, { a: { b: 2 } }, "blah");
        }, "blah: expected { a: { b: 2 } } to not have deep own property 'a' of { b: 2 }");
    });

    it("keys(array|Object|arguments)", () => {
        assert.hasAllKeys({ foo: 1 }, ["foo"]);
        assert.hasAllKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        assert.hasAllKeys({ foo: 1 }, { foo: 30 });
        assert.hasAllKeys({ foo: 1, bar: 2 }, { foo: 6, bar: 7 });

        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, ["foo", "bar"]);
        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, ["bar", "foo"]);
        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, ["baz"]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, ["foo"]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, ["bar"]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, { foo: 6 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { bar: 7 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { foo: 6 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { bar: 7, foo: 6 });

        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["baz"]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo"]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo", "baz"]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2, baz: 3 }, ["foo", "bar", "baz", "fake"]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["baz", "foo"]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { baz: 8 });
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { baz: 8, foo: 7 });
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { baz: 8, fake: 7 });

        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["foo", "baz"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["foo"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["bar", "baz"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["bar", "foo"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, ["baz", "fake", "foo"]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, { foo: 6 });
        assert.hasAnyKeys({ foo: 1, bar: 2 }, { baz: 6, foo: 12 });

        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, ["baz", "abc", "def"]);
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, ["baz"]);
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { baz: 1, biz: 2, fake: 3 });
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { baz: 1 });

        var enumProp1 = "enumProp1",
            enumProp2 = "enumProp2",
            nonEnumProp = "nonEnumProp",
            obj = {};

        obj[enumProp1] = "enumProp1";
        obj[enumProp2] = "enumProp2";

        Object.defineProperty(obj, nonEnumProp, {
            enumerable: false,
            value: "nonEnumProp"
        });

        assert.hasAllKeys(obj, [enumProp1, enumProp2]);
        assert.doesNotHaveAllKeys(obj, [enumProp1, enumProp2, nonEnumProp]);

        if (is.function(Symbol)) {
            var sym1 = Symbol("sym1"),
                sym2 = Symbol("sym2"),
                sym3 = Symbol("sym3"),
                str = "str",
                obj = {};

            obj[sym1] = "sym1";
            obj[sym2] = "sym2";
            obj[str] = "str";

            Object.defineProperty(obj, sym3, {
                enumerable: false,
                value: "sym3"
            });

            assert.hasAllKeys(obj, [sym1, sym2, str]);
            assert.doesNotHaveAllKeys(obj, [sym1, sym2, sym3, str]);
        }

        if (!is.undefined(Map)) {
            // Not using Map constructor args because not supported in IE 11.
            var aKey = { thisIs: "anExampleObject" },
                anotherKey = { doingThisBecauseOf: "referential equality" },
                testMap = new Map();

            testMap.set(aKey, "aValue");
            testMap.set(anotherKey, "anotherValue");

            assert.hasAnyKeys(testMap, [aKey]);
            assert.hasAnyKeys(testMap, ["thisDoesNotExist", "thisToo", aKey]);
            assert.hasAllKeys(testMap, [aKey, anotherKey]);

            assert.containsAllKeys(testMap, [aKey]);
            assert.doesNotHaveAllKeys(testMap, [aKey, { iDoNot: "exist" }]);

            assert.doesNotHaveAnyKeys(testMap, [{ iDoNot: "exist" }]);
            assert.doesNotHaveAnyKeys(testMap, ["thisDoesNotExist", "thisToo", { iDoNot: "exist" }]);
            assert.doesNotHaveAllKeys(testMap, ["thisDoesNotExist", "thisToo", anotherKey]);

            assert.doesNotHaveAnyKeys(testMap, [{ iDoNot: "exist" }, "thisDoesNotExist"]);
            assert.doesNotHaveAnyKeys(testMap, ["thisDoesNotExist", "thisToo", { iDoNot: "exist" }]);
            assert.doesNotHaveAllKeys(testMap, [aKey, { iDoNot: "exist" }]);

            // Ensure the assertions above use strict equality
            assert.doesNotHaveAnyKeys(testMap, { thisIs: "anExampleObject" });
            assert.doesNotHaveAllKeys(testMap, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            err(() => {
                assert.hasAnyKeys(testMap, [{ thisIs: "anExampleObject" }]);
            });

            err(() => {
                assert.hasAllKeys(testMap, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);
            });

            err(() => {
                assert.containsAllKeys(testMap, [{ thisIs: "anExampleObject" }]);
            });

            // Tests for the deep variations of the keys assertion
            assert.hasAnyDeepKeys(testMap, { thisIs: "anExampleObject" });
            assert.hasAnyDeepKeys(testMap, [{ thisIs: "anExampleObject" }, { three: "three" }]);
            assert.hasAnyDeepKeys(testMap, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.hasAllDeepKeys(testMap, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.containsAllDeepKeys(testMap, { thisIs: "anExampleObject" });
            assert.containsAllDeepKeys(testMap, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.doesNotHaveAnyDeepKeys(testMap, { thisDoesNot: "exist" });
            assert.doesNotHaveAnyDeepKeys(testMap, [{ twenty: "twenty" }, { fifty: "fifty" }]);

            assert.doesNotHaveAllDeepKeys(testMap, { thisDoesNot: "exist" });
            assert.doesNotHaveAllDeepKeys(testMap, [{ twenty: "twenty" }, { thisIs: "anExampleObject" }]);

            let weirdMapKey1 = Object.create(null),
                weirdMapKey2 = { toString: NaN },
                weirdMapKey3 = [],
                weirdMap = new Map();

            weirdMap.set(weirdMapKey1, "val1");
            weirdMap.set(weirdMapKey2, "val2");

            assert.hasAllKeys(weirdMap, [weirdMapKey1, weirdMapKey2]);
            assert.doesNotHaveAllKeys(weirdMap, [weirdMapKey1, weirdMapKey3]);

            if (is.function(Symbol)) {
                let symMapKey1 = Symbol(),
                    symMapKey2 = Symbol(),
                    symMapKey3 = Symbol(),
                    symMap = new Map();

                symMap.set(symMapKey1, "val1");
                symMap.set(symMapKey2, "val2");

                assert.hasAllKeys(symMap, [symMapKey1, symMapKey2]);
                assert.hasAnyKeys(symMap, [symMapKey1, symMapKey3]);
                assert.containsAllKeys(symMap, [symMapKey2, symMapKey1]);

                assert.doesNotHaveAllKeys(symMap, [symMapKey1, symMapKey3]);
                assert.doesNotHaveAnyKeys(symMap, [symMapKey3]);
            }

            const errMap = new Map();

            errMap.set({ 1: 20 }, "number");

            err(() => {
                assert.hasAllKeys(errMap, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.containsAllKeys(errMap, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.doesNotHaveAllKeys(errMap, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.hasAnyKeys(errMap, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.doesNotHaveAnyKeys(errMap, [], "blah");
            }, "blah: keys required");

            // Uncomment this after solving https://github.com/chaijs/chai/issues/662
            // This should fail because of referential equality (this is a strict comparison)
            // err(function(){
            //   assert.containsAllKeys(new Map([[{foo: 1}, 'bar']]), { foo: 1 });
            // }, 'expected [ [ { foo: 1 }, 'bar' ] ] to contain key { foo: 1 }');

            // err(function(){
            //   assert.containsAllDeepKeys(new Map([[{foo: 1}, 'bar']]), { iDoNotExist: 0 })
            // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');
        }

        if (!is.undefined(Set)) {
            // Not using Set constructor args because not supported in IE 11.
            var aKey = { thisIs: "anExampleObject" },
                anotherKey = { doingThisBecauseOf: "referential equality" },
                testSet = new Set();

            testSet.add(aKey);
            testSet.add(anotherKey);

            assert.hasAnyKeys(testSet, [aKey]);
            assert.hasAnyKeys(testSet, [20, 1, aKey]);
            assert.hasAllKeys(testSet, [aKey, anotherKey]);

            assert.containsAllKeys(testSet, [aKey]);
            assert.doesNotHaveAllKeys(testSet, [aKey, { iDoNot: "exist" }]);

            assert.doesNotHaveAnyKeys(testSet, [{ iDoNot: "exist" }]);
            assert.doesNotHaveAnyKeys(testSet, ["thisDoesNotExist", "thisToo", { iDoNot: "exist" }]);
            assert.doesNotHaveAllKeys(testSet, ["thisDoesNotExist", "thisToo", anotherKey]);

            assert.doesNotHaveAnyKeys(testSet, [{ iDoNot: "exist" }, "thisDoesNotExist"]);
            assert.doesNotHaveAnyKeys(testSet, [20, 1, { iDoNot: "exist" }]);
            assert.doesNotHaveAllKeys(testSet, ["thisDoesNotExist", "thisToo", { iDoNot: "exist" }]);

            // Ensure the assertions above use strict equality
            assert.doesNotHaveAnyKeys(testSet, { thisIs: "anExampleObject" });
            assert.doesNotHaveAllKeys(testSet, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            err(() => {
                assert.hasAnyKeys(testSet, [{ thisIs: "anExampleObject" }]);
            });

            err(() => {
                assert.hasAllKeys(testSet, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);
            });

            err(() => {
                assert.containsAllKeys(testSet, [{ thisIs: "anExampleObject" }]);
            });

            // Tests for the deep variations of the keys assertion
            assert.hasAnyDeepKeys(testSet, { thisIs: "anExampleObject" });
            assert.hasAnyDeepKeys(testSet, [{ thisIs: "anExampleObject" }, { three: "three" }]);
            assert.hasAnyDeepKeys(testSet, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.hasAllDeepKeys(testSet, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.containsAllDeepKeys(testSet, { thisIs: "anExampleObject" });
            assert.containsAllDeepKeys(testSet, [{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            assert.doesNotHaveAnyDeepKeys(testSet, { twenty: "twenty" });
            assert.doesNotHaveAnyDeepKeys(testSet, [{ twenty: "twenty" }, { fifty: "fifty" }]);

            assert.doesNotHaveAllDeepKeys(testSet, { twenty: "twenty" });
            assert.doesNotHaveAllDeepKeys(testSet, [{ thisIs: "anExampleObject" }, { fifty: "fifty" }]);

            let weirdSetKey1 = Object.create(null),
                weirdSetKey2 = { toString: NaN },
                weirdSetKey3 = [],
                weirdSet = new Set();

            weirdSet.add(weirdSetKey1);
            weirdSet.add(weirdSetKey2);

            assert.hasAllKeys(weirdSet, [weirdSetKey1, weirdSetKey2]);
            assert.doesNotHaveAllKeys(weirdSet, [weirdSetKey1, weirdSetKey3]);

            if (is.function(Symbol)) {
                let symSetKey1 = Symbol(),
                    symSetKey2 = Symbol(),
                    symSetKey3 = Symbol(),
                    symSet = new Set();

                symSet.add(symSetKey1);
                symSet.add(symSetKey2);

                assert.hasAllKeys(symSet, [symSetKey1, symSetKey2]);
                assert.hasAnyKeys(symSet, [symSetKey1, symSetKey3]);
                assert.containsAllKeys(symSet, [symSetKey2, symSetKey1]);

                assert.doesNotHaveAllKeys(symSet, [symSetKey1, symSetKey3]);
                assert.doesNotHaveAnyKeys(symSet, [symSetKey3]);
            }

            const errSet = new Set();

            errSet.add({ 1: 20 });
            errSet.add("number");

            err(() => {
                assert.hasAllKeys(errSet, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.containsAllKeys(errSet, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.doesNotHaveAllKeys(errSet, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.hasAnyKeys(errSet, [], "blah");
            }, "blah: keys required");

            err(() => {
                assert.doesNotHaveAnyKeys(errSet, [], "blah");
            }, "blah: keys required");

            // Uncomment this after solving https://github.com/chaijs/chai/issues/662
            // This should fail because of referential equality (this is a strict comparison)
            // err(function(){
            //   assert.containsAllKeys(new Set([{foo: 1}]), { foo: 1 });
            // }, 'expected [ [ { foo: 1 }, 'bar' ] ] to contain key { foo: 1 }');

            // err(function(){
            //   assert.containsAllDeepKeys(new Set([{foo: 1}]), { iDoNotExist: 0 })
            // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');
        }

        err(() => {
            assert.hasAllKeys({ foo: 1 }, [], "blah");
        }, "blah: keys required");

        err(() => {
            assert.containsAllKeys({ foo: 1 }, [], "blah");
        }, "blah: keys required");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1 }, [], "blah");
        }, "blah: keys required");

        err(() => {
            assert.hasAnyKeys({ foo: 1 }, [], "blah");
        }, "blah: keys required");

        err(() => {
            assert.doesNotHaveAnyKeys({ foo: 1 }, [], "blah");
        }, "blah: keys required");

        err(() => {
            assert.hasAllKeys({ foo: 1 }, ["bar"], "blah");
        }, "blah: expected { foo: 1 } to have key 'bar'");

        err(() => {
            assert.hasAllKeys({ foo: 1 }, ["bar", "baz"]);
        }, "expected { foo: 1 } to have keys 'bar', and 'baz'");

        err(() => {
            assert.hasAllKeys({ foo: 1 }, ["foo", "bar", "baz"]);
        }, "expected { foo: 1 } to have keys 'foo', 'bar', and 'baz'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1 }, ["foo"], "blah");
        }, "blah: expected { foo: 1 } to not have key 'foo'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            assert.hasAllKeys({ foo: 1, bar: 2 }, ["foo"]);
        }, "expected { foo: 1, bar: 2 } to have key 'foo'");

        err(() => {
            assert.containsAllKeys({ foo: 1 }, ["foo", "bar"], "blah");
        }, "blah: expected { foo: 1 } to contain keys 'foo', and 'bar'");

        err(() => {
            assert.hasAnyKeys({ foo: 1 }, ["baz"], "blah");
        }, "blah: expected { foo: 1 } to have key 'baz'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, ["foo", "baz"], "blah");
        }, "blah: expected { foo: 1, bar: 2 } to not have keys 'foo', or 'baz'");

        // repeat previous tests with Object as arg.
        err(() => {
            assert.hasAllKeys({ foo: 1 }, { bar: 1 }, "blah");
        }, "blah: expected { foo: 1 } to have key 'bar'");

        err(() => {
            assert.hasAllKeys({ foo: 1 }, { bar: 1, baz: 1 });
        }, "expected { foo: 1 } to have keys 'bar', and 'baz'");

        err(() => {
            assert.hasAllKeys({ foo: 1 }, { foo: 1, bar: 1, baz: 1 });
        }, "expected { foo: 1 } to have keys 'foo', 'bar', and 'baz'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1 }, { foo: 1 }, "blah");
        }, "blah: expected { foo: 1 } to not have key 'foo'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1 }, { foo: 1 });
        }, "expected { foo: 1 } to not have key 'foo'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { foo: 1, bar: 1 });
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            assert.hasAnyKeys({ foo: 1 }, "baz", "blah");
        }, "blah: expected { foo: 1 } to have key 'baz'");

        err(() => {
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { foo: 1, bar: 1 });
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { foo: 1, baz: 1 }, "blah");
        }, "blah: expected { foo: 1, bar: 2 } to not have keys 'foo', or 'baz'");
    });

    it("lengthOf", () => {
        assert.lengthOf([1, 2, 3], 3);
        assert.lengthOf("foobar", 6);

        err(() => {
            assert.lengthOf("foobar", 5, "blah");
        }, "blah: expected 'foobar' to have a length of 5 but got 6");

        err(() => {
            assert.lengthOf(1, 5);
        }, "expected 1 to have property \'length\'");
    });

    it("match", () => {
        assert.match("foobar", /^foo/);
        assert.notMatch("foobar", /^bar/);

        err(() => {
            assert.match("foobar", /^bar/i, "blah");
        }, "blah: expected 'foobar' to match /^bar/i");

        err(() => {
            assert.notMatch("foobar", /^foo/i, "blah");
        }, "blah: expected 'foobar' not to match /^foo/i");
    });

    it("property", () => {
        const obj = { foo: { bar: "baz" } };
        const simpleObj = { foo: "bar" };
        const undefinedKeyObj = { foo: undefined };
        const dummyObj = { a: "1" };
        assert.property(obj, "foo");
        assert.property(obj, "toString");
        assert.propertyVal(obj, "toString", Object.prototype.toString);
        assert.property(undefinedKeyObj, "foo");
        assert.propertyVal(undefinedKeyObj, "foo", undefined);
        assert.nestedProperty(obj, "foo.bar");
        assert.notProperty(obj, "baz");
        assert.notProperty(obj, "foo.bar");
        assert.notPropertyVal(simpleObj, "foo", "flow");
        assert.notPropertyVal(simpleObj, "flow", "bar");
        assert.notPropertyVal(obj, "foo", { bar: "baz" });
        assert.notNestedProperty(obj, "foo.baz");
        assert.nestedPropertyVal(obj, "foo.bar", "baz");
        assert.notNestedPropertyVal(obj, "foo.bar", "flow");
        assert.notNestedPropertyVal(obj, "foo.flow", "baz");

        err(() => {
            assert.property(obj, "baz", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to have property 'baz'");

        err(() => {
            assert.nestedProperty(obj, "foo.baz", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to have nested property 'foo.baz'");

        err(() => {
            assert.notProperty(obj, "foo", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to not have property 'foo'");

        err(() => {
            assert.notNestedProperty(obj, "foo.bar", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to not have nested property 'foo.bar'");

        err(() => {
            assert.propertyVal(simpleObj, "foo", "ball", "blah");
        }, "blah: expected { foo: 'bar' } to have property 'foo' of 'ball', but got 'bar'");

        err(() => {
            assert.propertyVal(simpleObj, "foo", undefined);
        }, "expected { foo: 'bar' } to have property 'foo' of undefined, but got 'bar'");

        err(() => {
            assert.nestedPropertyVal(obj, "foo.bar", "ball", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to have nested property 'foo.bar' of 'ball', but got 'baz'");

        err(() => {
            assert.notPropertyVal(simpleObj, "foo", "bar", "blah");
        }, "blah: expected { foo: 'bar' } to not have property 'foo' of 'bar'");

        err(() => {
            assert.notNestedPropertyVal(obj, "foo.bar", "baz", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to not have nested property 'foo.bar' of 'baz'");

        err(() => {
            assert.property(null, "a", "blah");
        }, "blah: Target cannot be null or undefined.");

        err(() => {
            assert.property(undefined, "a", "blah");
        }, "blah: Target cannot be null or undefined.");

        err(() => {
            assert.property({ a: 1 }, { a: "1" }, "blah");
        }, "blah: the argument to property must be a string, number, or symbol");

        err(() => {
            assert.propertyVal(dummyObj, "a", "2", "blah");
        }, "blah: expected { a: '1' } to have property 'a' of '2', but got '1'");

        err(() => {
            assert.nestedProperty({ a: 1 }, { a: "1" }, "blah");
        }, "blah: the argument to property must be a string when using nested syntax");
    });

    it("deepPropertyVal", () => {
        const obj = { a: { b: 1 } };
        assert.deepPropertyVal(obj, "a", { b: 1 });
        assert.notDeepPropertyVal(obj, "a", { b: 7 });
        assert.notDeepPropertyVal(obj, "a", { z: 1 });
        assert.notDeepPropertyVal(obj, "z", { b: 1 });

        err(() => {
            assert.deepPropertyVal(obj, "a", { b: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep property 'a' of { b: 7 }, but got { b: 1 }");

        err(() => {
            assert.deepPropertyVal(obj, "z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep property 'z'");

        err(() => {
            assert.notDeepPropertyVal(obj, "a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep property 'a' of { b: 1 }");
    });

    it("ownProperty", () => {
        const coffeeObj = { coffee: "is good" };

        // This has length = 17
        const teaObj = "but tea is better";

        assert.ownProperty(coffeeObj, "coffee");
        assert.ownProperty(teaObj, "length");

        assert.ownPropertyVal(coffeeObj, "coffee", "is good");
        assert.ownPropertyVal(teaObj, "length", 17);

        assert.notOwnProperty(coffeeObj, "length");
        assert.notOwnProperty(coffeeObj, "toString");
        assert.notOwnProperty(teaObj, "calories");

        assert.notOwnPropertyVal(coffeeObj, "coffee", "is bad");
        assert.notOwnPropertyVal(teaObj, "length", 1);
        assert.notOwnPropertyVal(coffeeObj, "toString", Object.prototype.toString);
        assert.notOwnPropertyVal({ a: { b: 1 } }, "a", { b: 1 });

        err(() => {
            assert.ownProperty(coffeeObj, "calories", "blah");
        }, "blah: expected { coffee: 'is good' } to have own property 'calories'");

        err(() => {
            assert.notOwnProperty(coffeeObj, "coffee", "blah");
        }, "blah: expected { coffee: 'is good' } to not have own property 'coffee'");

        err(() => {
            assert.ownPropertyVal(teaObj, "length", 1, "blah");
        }, "blah: expected 'but tea is better' to have own property 'length' of 1, but got 17");

        err(() => {
            assert.notOwnPropertyVal(teaObj, "length", 17, "blah");
        }, "blah: expected 'but tea is better' to not have own property 'length' of 17");

        err(() => {
            assert.ownPropertyVal(teaObj, "calories", 17);
        }, "expected 'but tea is better' to have own property 'calories'");

        err(() => {
            assert.ownPropertyVal(teaObj, "calories", 17);
        }, "expected 'but tea is better' to have own property 'calories'");
    });

    it("deepOwnPropertyVal", () => {
        const obj = { a: { b: 1 } };
        assert.deepOwnPropertyVal(obj, "a", { b: 1 });
        assert.notDeepOwnPropertyVal(obj, "a", { z: 1 });
        assert.notDeepOwnPropertyVal(obj, "a", { b: 7 });
        assert.notDeepOwnPropertyVal(obj, "toString", Object.prototype.toString);

        err(() => {
            assert.deepOwnPropertyVal(obj, "a", { z: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'a' of { z: 7 }, but got { b: 1 }");

        err(() => {
            assert.deepOwnPropertyVal(obj, "z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'z'");

        err(() => {
            assert.notDeepOwnPropertyVal(obj, "a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep own property 'a' of { b: 1 }");
    });

    it("deepNestedPropertyVal", () => {
        const obj = { a: { b: { c: 1 } } };
        assert.deepNestedPropertyVal(obj, "a.b", { c: 1 });
        assert.notDeepNestedPropertyVal(obj, "a.b", { c: 7 });
        assert.notDeepNestedPropertyVal(obj, "a.b", { z: 1 });
        assert.notDeepNestedPropertyVal(obj, "a.z", { c: 1 });

        err(() => {
            assert.deepNestedPropertyVal(obj, "a.b", { c: 7 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.b' of { c: 7 }, but got { c: 1 }");

        err(() => {
            assert.deepNestedPropertyVal(obj, "a.z", { c: 1 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.z'");

        err(() => {
            assert.notDeepNestedPropertyVal(obj, "a.b", { c: 1 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to not have deep nested property 'a.b' of { c: 1 }");
    });

    it("throws / throw / Throw", () => {
        ["throws", "throw", "Throw"].forEach((throws) => {
            assert[throws](() => {
                throw new Error("foo");
            });
            assert[throws](() => {
                throw new Error("");
            }, "");
            assert[throws](() => {
                throw new Error("bar");
            }, "bar");
            assert[throws](() => {
                throw new Error("bar");
            }, /bar/);
            assert[throws](() => {
                throw new Error("bar");
            }, Error);
            assert[throws](() => {
                throw new Error("bar");
            }, Error, "bar");
            assert[throws](() => {
                throw new Error("");
            }, Error, "");
            assert[throws](() => {
                throw new Error("foo");
            }, "");

            const thrownErr = assert[throws](() => {
                throw new Error("foo");
            });
            assert(thrownErr instanceof Error, `assert.${throws} returns error`);
            assert(thrownErr.message === "foo", `assert.${throws} returns error message`);

            err(() => {
                assert[throws](() => {
                    throw new Error("foo");
                }, TypeError);
            }, "expected [Function] to throw 'TypeError' but 'Error: foo' was thrown");

            err(() => {
                assert[throws](() => {
                    throw new Error("foo");
                }, "bar");
            }, "expected [Function] to throw error including 'bar' but got 'foo'");

            err(() => {
                assert[throws](() => {
                    throw new Error("foo");
                }, Error, "bar", "blah");
            }, "blah: expected [Function] to throw error including 'bar' but got 'foo'");

            err(() => {
                assert[throws](() => {
                    throw new Error("foo");
                }, TypeError, "bar", "blah");
            }, "blah: expected [Function] to throw 'TypeError' but 'Error: foo' was thrown");

            err(() => {
                assert[throws](() => { });
            }, "expected [Function] to throw an error");

            err(() => {
                assert[throws](() => {
                    throw new Error("");
                }, "bar");
            }, "expected [Function] to throw error including 'bar' but got ''");

            err(() => {
                assert[throws](() => {
                    throw new Error("");
                }, /bar/);
            }, "expected [Function] to throw error matching /bar/ but got ''");

            err(() => {
                assert[throws]({});
            }, "expected {} to be a function");

            err(() => {
                assert[throws]({}, Error, "testing", "blah");
            }, "blah: expected {} to be a function");
        });
    });

    it("throws async", async () => {
        const e = await assert.throws(async () => {
            throw new Error("123");
        });
        expect(e).to.exist();
        expect(e.message).to.be.equal("123");

        await assert.throws(async () => {
            throw new adone.error.Timeout("timeout exceeded");
        }, adone.error.Timeout, /exceeded/);
    });

    it("doesNotThrow", () => {
        function CustomError(message) {
            this.name = "CustomError";
            this.message = message;
        }
        CustomError.prototype = Object.create(Error.prototype);

        assert.doesNotThrow(() => { });
        assert.doesNotThrow(() => { }, "foo");
        assert.doesNotThrow(() => { }, "");

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, TypeError);

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, "Another message");

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, /Another message/);

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, Error, "Another message");

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, Error, /Another message/);

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, TypeError, "Another message");

        assert.doesNotThrow(() => {
            throw new Error("This is a message");
        }, TypeError, /Another message/);

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("foo");
            });
        }, "expected [Function] to not throw an error but 'Error: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new CustomError("foo");
            });
        }, "expected [Function] to not throw an error but 'CustomError: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("foo");
            }, Error);
        }, "expected [Function] to not throw 'Error' but 'Error: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new CustomError("foo");
            }, CustomError);
        }, "expected [Function] to not throw 'CustomError' but 'CustomError: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("foo");
            }, "foo");
        }, "expected [Function] to throw error not including 'foo'");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("foo");
            }, /foo/);
        }, "expected [Function] to throw error not matching /foo/");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("foo");
            }, Error, "foo", "blah");
        }, "blah: expected [Function] to not throw 'Error' but 'Error: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new CustomError("foo");
            }, CustomError, "foo", "blah");
        }, "blah: expected [Function] to not throw 'CustomError' but 'CustomError: foo' was thrown");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("");
            }, "");
        }, "expected [Function] to throw error not including ''");

        err(() => {
            assert.doesNotThrow(() => {
                throw new Error("");
            }, Error, "");
        }, "expected [Function] to not throw 'Error' but 'Error' was thrown");

        err(() => {
            assert.doesNotThrow({});
        }, "expected {} to be a function");

        err(() => {
            assert.doesNotThrow({}, Error, "testing", "blah");
        }, "blah: expected {} to be a function");
    });

    it("doesNotThrow async", async () => {
        let check = false;
        await assert.doesNotThrow(async () => {
            await adone.promise.delay(100);
            check = true;
        });
        expect(check).to.be.true();
        let err = null;
        try {
            await assert.doesNotThrow(async () => {
                throw new Error();
            });
        } catch (e) {
            err = e;
        }
        expect(err).to.be.an("error");
    });

    it("ifError", () => {
        assert.ifError(false);
        assert.ifError(null);
        assert.ifError(undefined);

        err(() => {
            const err = new Error("This is an error message");
            assert.ifError(err);
        }, "This is an error message");
    });

    it("operator", () => {
        // For testing undefined and null with == and ===
        let w;

        assert.operator(1, "<", 2);
        assert.operator(2, ">", 1);
        assert.operator(1, "==", 1);
        assert.operator(1, "<=", 1);
        assert.operator(1, ">=", 1);
        assert.operator(1, "!=", 2);
        assert.operator(1, "!==", 2);
        assert.operator(1, "!==", "1");
        assert.operator(w, "==", undefined);
        assert.operator(w, "===", undefined);
        assert.operator(w, "==", null);

        err(() => {
            assert.operator(1, "=", 2, "blah");
        }, 'blah: Invalid operator "="');

        err(() => {
            assert.operator(2, "<", 1, "blah");
        }, "blah: expected 2 to be < 1");

        err(() => {
            assert.operator(1, ">", 2);
        }, "expected 1 to be > 2");

        err(() => {
            assert.operator(1, "==", 2);
        }, "expected 1 to be == 2");

        err(() => {
            assert.operator(1, "===", "1");
        }, "expected 1 to be === \'1\'");

        err(() => {
            assert.operator(2, "<=", 1);
        }, "expected 2 to be <= 1");

        err(() => {
            assert.operator(1, ">=", 2);
        }, "expected 1 to be >= 2");

        err(() => {
            assert.operator(1, "!=", 1);
        }, "expected 1 to be != 1");

        err(() => {
            assert.operator(1, "!==", 1);
        }, "expected 1 to be !== 1");

        err(() => {
            assert.operator(w, "===", null);
        }, "expected undefined to be === null");


    });

    it("closeTo", () => {
        assert.closeTo(1.5, 1.0, 0.5);
        assert.closeTo(10, 20, 20);
        assert.closeTo(-10, 20, 30);

        err(() => {
            assert.closeTo(2, 1.0, 0.5, "blah");
        }, "blah: expected 2 to be close to 1 +/- 0.5");

        err(() => {
            assert.closeTo(-10, 20, 29);
        }, "expected -10 to be close to 20 +/- 29");

        err(() => {
            assert.closeTo([1.5], 1.0, 0.5, "blah");
        }, "blah: expected [ 1.5 ] to be a number");

        err(() => {
            assert.closeTo(1.5, "1.0", 0.5, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");

        err(() => {
            assert.closeTo(1.5, 1.0, true, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");
    });

    it("approximately", () => {
        assert.approximately(1.5, 1.0, 0.5);
        assert.approximately(10, 20, 20);
        assert.approximately(-10, 20, 30);

        err(() => {
            assert.approximately(2, 1.0, 0.5, "blah");
        }, "blah: expected 2 to be close to 1 +/- 0.5");

        err(() => {
            assert.approximately(-10, 20, 29);
        }, "expected -10 to be close to 20 +/- 29");

        err(() => {
            assert.approximately([1.5], 1.0, 0.5);
        }, "expected [ 1.5 ] to be a number");

        err(() => {
            assert.approximately(1.5, "1.0", 0.5, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");

        err(() => {
            assert.approximately(1.5, 1.0, true, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");
    });

    it("sameMembers", () => {
        assert.sameMembers([], []);
        assert.sameMembers([1, 2, 3], [3, 2, 1]);
        assert.sameMembers([4, 2], [4, 2]);
        assert.sameMembers([4, 2, 2], [4, 2, 2]);

        err(() => {
            assert.sameMembers([], [1, 2], "blah");
        }, "blah: expected [] to have the same members as [ 1, 2 ]");

        err(() => {
            assert.sameMembers([1, 54], [6, 1, 54]);
        }, "expected [ 1, 54 ] to have the same members as [ 6, 1, 54 ]");

        err(() => {
            assert.sameMembers({}, [], "blah");
        }, "blah: expected {} to be an array");

        err(() => {
            assert.sameMembers([], {}, "blah");
        }, "blah: expected {} to be an array");
    });

    it("notSameMembers", () => {
        assert.notSameMembers([1, 2, 3], [2, 1, 5]);
        assert.notSameMembers([1, 2, 3], [1, 2, 3, 3]);
        assert.notSameMembers([1, 2], [1, 2, 2]);
        assert.notSameMembers([1, 2, 2], [1, 2]);
        assert.notSameMembers([1, 2, 2], [1, 2, 3]);
        assert.notSameMembers([1, 2, 3], [1, 2, 2]);
        assert.notSameMembers([{ a: 1 }], [{ a: 1 }]);

        err(() => {
            assert.notSameMembers([1, 2, 3], [2, 1, 3], "blah");
        }, "blah: expected [ 1, 2, 3 ] to not have the same members as [ 2, 1, 3 ]");
    });

    it("sameDeepMembers", () => {
        assert.sameDeepMembers([{ b: 3 }, { a: 2 }, { c: 5 }], [{ c: 5 }, { b: 3 }, { a: 2 }], "same deep members");
        assert.sameDeepMembers([{ b: 3 }, { a: 2 }, 5, "hello"], ["hello", 5, { b: 3 }, { a: 2 }], "same deep members");
        assert.sameDeepMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            assert.sameDeepMembers([{ b: 3 }], [{ c: 3 }], "blah");
        }, "blah: expected [ { b: 3 } ] to have the same members as [ { c: 3 } ]");

        err(() => {
            assert.sameDeepMembers([{ b: 3 }], [{ b: 5 }]);
        }, "expected [ { b: 3 } ] to have the same members as [ { b: 5 } ]");
    });

    it("notSameDeepMembers", () => {
        assert.notSameDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }, { f: 5 }]);
        assert.notSameDeepMembers([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);
        assert.notSameDeepMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }]);
        assert.notSameDeepMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { c: 3 }]);
        assert.notSameDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            assert.notSameDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }, { c: 3 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not have the same members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");
    });

    it("sameOrderedMembers", () => {
        assert.sameOrderedMembers([1, 2, 3], [1, 2, 3]);
        assert.sameOrderedMembers([1, 2, 2], [1, 2, 2]);

        err(() => {
            assert.sameOrderedMembers([1, 2, 3], [2, 1, 3], "blah");
        }, "blah: expected [ 1, 2, 3 ] to have the same ordered members as [ 2, 1, 3 ]");
    });

    it("notSameOrderedMembers", () => {
        assert.notSameOrderedMembers([1, 2, 3], [2, 1, 3]);
        assert.notSameOrderedMembers([1, 2, 3], [1, 2]);
        assert.notSameOrderedMembers([1, 2], [1, 2, 2]);
        assert.notSameOrderedMembers([1, 2, 2], [1, 2]);
        assert.notSameOrderedMembers([1, 2, 2], [1, 2, 3]);
        assert.notSameOrderedMembers([1, 2, 3], [1, 2, 2]);

        err(() => {
            assert.notSameOrderedMembers([1, 2, 3], [1, 2, 3], "blah");
        }, "blah: expected [ 1, 2, 3 ] to not have the same ordered members as [ 1, 2, 3 ]");
    });

    it("sameDeepOrderedMembers", () => {
        assert.sameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { c: 3 }]);
        assert.sameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            assert.sameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }, { c: 3 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to have the same ordered members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");
    });

    it("notSameDeepOrderedMembers", () => {
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }, { c: 3 }]);
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { f: 5 }]);
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }]);
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { b: 2 }], [{ a: 1 }, { b: 2 }, { c: 3 }]);
        assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            assert.notSameDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { c: 3 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not have the same ordered members as [ { a: 1 }, { b: 2 }, { c: 3 } ]");
    });

    it("includeMembers", () => {
        assert.includeMembers([1, 2, 3], [2, 3, 2]);
        assert.includeMembers([1, 2, 3], []);
        assert.includeMembers([1, 2, 3], [3]);

        err(() => {
            assert.includeMembers([5, 6], [7, 8], "blah");
        }, "blah: expected [ 5, 6 ] to be a superset of [ 7, 8 ]");

        err(() => {
            assert.includeMembers([5, 6], [5, 6, 0]);
        }, "expected [ 5, 6 ] to be a superset of [ 5, 6, 0 ]");
    });

    it("notIncludeMembers", () => {
        assert.notIncludeMembers([1, 2, 3], [5, 1]);
        assert.notIncludeMembers([{ a: 1 }], [{ a: 1 }]);

        err(() => {
            assert.notIncludeMembers([1, 2, 3], [2, 1], "blah");
        }, "blah: expected [ 1, 2, 3 ] to not be a superset of [ 2, 1 ]");
    });

    it("includeDeepMembers", () => {
        assert.includeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ c: 3 }, { b: 2 }]);
        assert.includeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], []);
        assert.includeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ c: 3 }]);
        assert.includeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }, { c: 3 }], [{ c: 3 }, { c: 3 }]);
        assert.includeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ c: 3 }, { c: 3 }]);

        err(() => {
            assert.includeDeepMembers([{ e: 5 }, { f: 6 }], [{ g: 7 }, { h: 8 }], "blah");
        }, "blah: expected [ { e: 5 }, { f: 6 } ] to be a superset of [ { g: 7 }, { h: 8 } ]");

        err(() => {
            assert.includeDeepMembers([{ e: 5 }, { f: 6 }], [{ e: 5 }, { f: 6 }, { z: 0 }]);
        }, "expected [ { e: 5 }, { f: 6 } ] to be a superset of [ { e: 5 }, { f: 6 }, { z: 0 } ]");
    });

    it("notIncludeDeepMembers", () => {
        assert.notIncludeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { f: 5 }]);

        err(() => {
            assert.notIncludeDeepMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not be a superset of [ { b: 2 }, { a: 1 } ]");
    });

    it("includeOrderedMembers", () => {
        assert.includeOrderedMembers([1, 2, 3], [1, 2]);

        err(() => {
            assert.includeOrderedMembers([1, 2, 3], [2, 1], "blah");
        }, "blah: expected [ 1, 2, 3 ] to be an ordered superset of [ 2, 1 ]");
    });

    it("notIncludeOrderedMembers", () => {
        assert.notIncludeOrderedMembers([1, 2, 3], [2, 1]);
        assert.notIncludeOrderedMembers([1, 2, 3], [2, 3]);
        assert.notIncludeOrderedMembers([1, 2, 3], [1, 2, 2]);

        err(() => {
            assert.notIncludeOrderedMembers([1, 2, 3], [1, 2], "blah");
        }, "blah: expected [ 1, 2, 3 ] to not be an ordered superset of [ 1, 2 ]");
    });

    it("includeDeepOrderedMembers", () => {
        assert.includeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }]);

        err(() => {
            assert.includeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be an ordered superset of [ { b: 2 }, { a: 1 } ]");
    });

    it("notIncludeDeepOrderedMembers", () => {
        assert.notIncludeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ b: 2 }, { a: 1 }]);
        assert.notIncludeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { f: 5 }]);
        assert.notIncludeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            assert.notIncludeDeepOrderedMembers([{ a: 1 }, { b: 2 }, { c: 3 }], [{ a: 1 }, { b: 2 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not be an ordered superset of [ { a: 1 }, { b: 2 } ]");
    });

    it("oneOf", () => {
        assert.oneOf(1, [1, 2, 3]);

        const three = [3];
        assert.oneOf(three, [1, 2, three]);

        const four = { four: 4 };
        assert.oneOf(four, [1, 2, four]);

        err(() => {
            assert.oneOf(1, 1, "blah");
        }, "blah: expected 1 to be an array");

        err(() => {
            assert.oneOf(1, { a: 1 });
        }, "expected { a: 1 } to be an array");

        err(() => {
            assert.oneOf(9, [1, 2, 3], "Message");
        }, "Message: expected 9 to be one of [ 1, 2, 3 ]");

        err(() => {
            assert.oneOf([3], [1, 2, [3]]);
        }, "expected [ 3 ] to be one of [ 1, 2, [ 3 ] ]");

        err(() => {
            assert.oneOf({ four: 4 }, [1, 2, { four: 4 }]);
        }, "expected { four: 4 } to be one of [ 1, 2, { four: 4 } ]");

    });

    it("above", () => {
        assert.above(5, 2, "5 should be above 2");

        err(() => {
            assert.above(1, 3, "blah");
        }, "blah: expected 1 to be above 3");

        err(() => {
            assert.above(1, 1);
        }, "expected 1 to be above 1");

        err(() => {
            assert.above(null, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.above(1, null, "blah");
        }, "blah: the argument to above must be a number");
    });

    it("above (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        assert.above(now, oneSecondAgo, "Now should be above 1 second ago");

        err(() => {
            assert.above(oneSecondAgo, now, "blah");
        }, `blah: expected ${oneSecondAgo.toUTCString()} to be above ${now.toUTCString()}`);

        err(() => {
            assert.above(now, now, "blah");
        }, `blah: expected ${now.toUTCString()} to be above ${now.toUTCString()}`);

        err(() => {
            assert.above(null, now);
        }, "expected null to be a number or a date");

        err(() => {
            assert.above(now, null, "blah");
        }, "blah: the argument to above must be a date");

        err(() => {
            assert.above(now, 1, "blah");
        }, "blah: the argument to above must be a date");

        err(() => {
            assert.above(1, now, "blah");
        }, "blah: the argument to above must be a number");
    });

    it("atLeast", () => {
        assert.atLeast(5, 2, "5 should be above 2");
        assert.atLeast(1, 1, "1 should be equal to 1");

        err(() => {
            assert.atLeast(1, 3, "blah");
        }, "blah: expected 1 to be at least 3");

        err(() => {
            assert.atLeast(null, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.atLeast(1, null, "blah");
        }, "blah: the argument to least must be a number");
    });

    it("atLeast (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);

        assert.atLeast(now, oneSecondAgo, "Now should be above one second ago");
        assert.atLeast(now, now, "Now should be equal to now");

        err(() => {
            assert.atLeast(now, oneSecondAfter, "blah");
        }, `blah: expected ${now.toUTCString()} to be at least ${oneSecondAfter.toUTCString()}`);

        err(() => {
            assert.atLeast(null, now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.atLeast(now, null, "blah");
        }, "blah: the argument to least must be a date");

        err(() => {
            assert.atLeast(1, now, "blah");
        }, "blah: the argument to least must be a number");

        err(() => {
            assert.atLeast(now, 1, "blah");
        }, "blah: the argument to least must be a date");
    });

    it("below", () => {
        assert.below(2, 5, "2 should be below 5");

        err(() => {
            assert.below(3, 1, "blah");
        }, "blah: expected 3 to be below 1");

        err(() => {
            assert.below(1, 1);
        }, "expected 1 to be below 1");

        err(() => {
            assert.below(null, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.below(1, null, "blah");
        }, "blah: the argument to below must be a number");
    });

    it("below (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        assert.below(oneSecondAgo, now, "One second ago should be below now");

        err(() => {
            assert.below(now, oneSecondAgo, "blah");
        }, `blah: expected ${now.toUTCString()} to be below ${oneSecondAgo.toUTCString()}`);

        err(() => {
            assert.below(now, now);
        }, `expected ${now.toUTCString()} to be below ${now.toUTCString()}`);

        err(() => {
            assert.below(null, now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.below(now, null, "blah");
        }, "blah: the argument to below must be a date");

        err(() => {
            assert.below(now, 1, "blah");
        }, "blah: the argument to below must be a date");

        err(() => {
            assert.below(1, now, "blah");
        }, "blah: the argument to below must be a number");
    });

    it("atMost", () => {
        assert.atMost(2, 5, "2 should be below 5");
        assert.atMost(1, 1, "1 should be equal to 1");

        err(() => {
            assert.atMost(3, 1, "blah");
        }, "blah: expected 3 to be at most 1");

        err(() => {
            assert.atMost(null, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.atMost(1, null, "blah");
        }, "blah: the argument to most must be a number");
    });

    it("atMost (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);

        assert.atMost(oneSecondAgo, now, "Now should be below one second ago");
        assert.atMost(now, now, "Now should be equal to now");

        err(() => {
            assert.atMost(oneSecondAfter, now, "blah");
        }, `blah: expected ${oneSecondAfter.toUTCString()} to be at most ${now.toUTCString()}`);

        err(() => {
            assert.atMost(null, now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            assert.atMost(now, null, "blah");
        }, "blah: the argument to most must be a date");

        err(() => {
            assert.atMost(now, 1, "blah");
        }, "blah: the argument to most must be a date");

        err(() => {
            assert.atMost(1, now, "blah");
        }, "blah: the argument to most must be a number");
    });

    it("change", () => {
        const obj = { value: 10, str: "foo" };
        const heroes = ["spiderman", "superman"];
        const fn = function () {
            obj.value += 5;
        };
        const fnDec = function () {
            obj.value -= 20;
        };
        const bangFn = function () {
            obj.str += "!";
        };
        const smFn = function () {
            "foo" + "bar";
        };
        const batFn = function () {
            heroes.push("batman");
        };
        const lenFn = function () {
            return heroes.length;
        };
        assert.changes(fn, obj, "value");
        assert.changesBy(fn, obj, "value", 5);
        assert.changesBy(fn, obj, "value", -5);
        assert.changesBy(fnDec, obj, "value", 20);

        assert.doesNotChange(smFn, obj, "value");
        assert.changesButNotBy(fnDec, obj, "value", 1);

        assert.changes(bangFn, obj, "str");

        assert.changesBy(batFn, lenFn, 1);
        assert.changesButNotBy(batFn, lenFn, 2);

        err(() => {
            assert.changes(smFn, obj, "value", "blah");
        }, "blah: expected .value to change");

        err(() => {
            assert.doesNotChange(fn, obj, "value", "blah");
        }, "blah: expected .value to not change");

        err(() => {
            assert.changes({}, obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            assert.changes(fn, {}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            assert.changesBy(fn, obj, "value", 10, "blah");
        }, "blah: expected .value to change by 10");

        err(() => {
            assert.changesButNotBy(fn, obj, "value", 5, "blah");
        }, "blah: expected .value to not change by 5");
    });

    it("increase, decrease", () => {
        let obj = { value: 10, noop: null },
            arr = ["one", "two"],
            pFn = function () {
                arr.push("three");
            },
            popFn = function () {
                arr.pop();
            },
            lenFn = function () {
                return arr.length;
            },
            incFn = function () {
                obj.value += 2;
            },
            decFn = function () {
                obj.value -= 3;
            },
            smFn = function () {
                obj.value += 0;
            };

        assert.decreases(decFn, obj, "value");
        assert.doesNotDecrease(smFn, obj, "value");
        assert.decreasesBy(decFn, obj, "value", 3);
        assert.decreasesButNotBy(decFn, obj, "value", 10);

        assert.increases(incFn, obj, "value");
        assert.doesNotIncrease(smFn, obj, "value");
        assert.increasesBy(incFn, obj, "value", 2);
        assert.increasesButNotBy(incFn, obj, "value", 1);

        assert.decreases(popFn, lenFn);
        assert.doesNotDecrease(pFn, lenFn);
        assert.decreasesBy(popFn, lenFn, 1);
        assert.decreasesButNotBy(popFn, lenFn, 2);

        assert.increases(pFn, lenFn);
        assert.doesNotIncrease(popFn, lenFn);
        assert.increasesBy(pFn, lenFn, 1);
        assert.increasesButNotBy(pFn, lenFn, 2);

        err(() => {
            assert.increases(smFn, obj, "value", "blah");
        }, "blah: expected .value to increase");

        err(() => {
            assert.doesNotIncrease(incFn, obj, "value", "blah");
        }, "blah: expected .value to not increase");

        err(() => {
            assert.increases({}, obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            assert.increases(incFn, {}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            assert.increases(incFn, obj, "noop", "blah");
        }, "blah: expected null to be a number");

        err(() => {
            assert.increasesBy(incFn, obj, "value", 10, "blah");
        }, "blah: expected .value to increase by 10");

        err(() => {
            assert.increasesButNotBy(incFn, obj, "value", 2, "blah");
        }, "blah: expected .value to not increase by 2");

        err(() => {
            assert.decreases(smFn, obj, "value", "blah");
        }, "blah: expected .value to decrease");

        err(() => {
            assert.doesNotDecrease(decFn, obj, "value", "blah");
        }, "blah: expected .value to not decrease");

        err(() => {
            assert.decreases({}, obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            assert.decreases(decFn, {}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            assert.decreases(decFn, obj, "noop", "blah");
        }, "blah: expected null to be a number");

        err(() => {
            assert.decreasesBy(decFn, obj, "value", 10, "blah");
        }, "blah: expected .value to decrease by 10");

        err(() => {
            assert.decreasesButNotBy(decFn, obj, "value", 3, "blah");
        }, "blah: expected .value to not decrease by 3");
    });

    it("extensible", () => {
        const nonExtensibleObject = Object.preventExtensions({});

        assert.extensible({});

        err(() => {
            assert.extensible(nonExtensibleObject, "blah");
        }, "blah: expected {} to be extensible");

        // Making sure ES6-like Object.isExtensible response is respected for all primitive types

        err(() => {
            assert.extensible(42);
        }, "expected 42 to be extensible");

        err(() => {
            assert.extensible(null);
        }, "expected null to be extensible");

        err(() => {
            assert.extensible("foo");
        }, "expected 'foo' to be extensible");

        err(() => {
            assert.extensible(false);
        }, "expected false to be extensible");

        err(() => {
            assert.extensible(undefined);
        }, "expected undefined to be extensible");

        const proxy = new Proxy({}, {
            isExtensible() {
                throw new TypeError();
            }
        });

        err(() => {
            // isExtensible should not suppress errors, thrown in proxy traps
            assert.extensible(proxy);
        }, { name: "TypeError" }, true);
    });

    it("notExtensible", () => {
        const nonExtensibleObject = Object.preventExtensions({});

        assert.notExtensible(nonExtensibleObject);

        err(() => {
            assert.notExtensible({}, "blah");
        }, "blah: expected {} to not be extensible");

        // Making sure ES6-like Object.isExtensible response is respected for all primitive types

        assert.notExtensible(42);
        assert.notExtensible(null);
        assert.notExtensible("foo");
        assert.notExtensible(false);
        assert.notExtensible(undefined);

        if (is.function(Symbol)) {
            assert.notExtensible(Symbol());
        }

        if (is.function(Proxy)) {
            const proxy = new Proxy({}, {
                isExtensible() {
                    throw new TypeError();
                }
            });

            err(() => {
                // isNotExtensible should not suppress errors, thrown in proxy traps
                assert.notExtensible(proxy);
            }, { name: "TypeError" }, true);
        }
    });

    it("sealed", () => {
        const sealedObject = Object.seal({});

        assert.sealed(sealedObject);

        err(() => {
            assert.sealed({}, "blah");
        }, "blah: expected {} to be sealed");

        // Making sure ES6-like Object.isSealed response is respected for all primitive types

        assert.sealed(42);
        assert.sealed(null);
        assert.sealed("foo");
        assert.sealed(false);
        assert.sealed(undefined);

        if (is.function(Symbol)) {
            assert.sealed(Symbol());
        }

        const proxy = new Proxy({}, {
            ownKeys() {
                throw new TypeError();
            }
        });

        // Object.isSealed will call ownKeys trap only if object is not extensible
        Object.preventExtensions(proxy);

        err(() => {
            // isSealed should not suppress errors, thrown in proxy traps
            assert.sealed(proxy);
        }, { name: "TypeError" }, true);
    });

    it("notSealed", () => {
        const sealedObject = Object.seal({});

        assert.notSealed({});

        err(() => {
            assert.notSealed(sealedObject, "blah");
        }, "blah: expected {} to not be sealed");

        // Making sure ES6-like Object.isSealed response is respected for all primitive types

        err(() => {
            assert.notSealed(42);
        }, "expected 42 to not be sealed");

        err(() => {
            assert.notSealed(null);
        }, "expected null to not be sealed");

        err(() => {
            assert.notSealed("foo");
        }, "expected 'foo' to not be sealed");

        err(() => {
            assert.notSealed(false);
        }, "expected false to not be sealed");

        err(() => {
            assert.notSealed(undefined);
        }, "expected undefined to not be sealed");

        const proxy = new Proxy({}, {
            ownKeys() {
                throw new TypeError();
            }
        });

        // Object.isSealed will call ownKeys trap only if object is not extensible
        Object.preventExtensions(proxy);

        err(() => {
            // isNotSealed should not suppress errors, thrown in proxy traps
            assert.notSealed(proxy);
        }, { name: "TypeError" }, true);
    });

    it("frozen", () => {
        const frozenObject = Object.freeze({});

        assert.frozen(frozenObject);

        err(() => {
            assert.frozen({}, "blah");
        }, "blah: expected {} to be frozen");

        // Making sure ES6-like Object.isFrozen response is respected for all primitive types

        assert.frozen(42);
        assert.frozen(null);
        assert.frozen("foo");
        assert.frozen(false);
        assert.frozen(undefined);

        if (is.function(Symbol)) {
            assert.frozen(Symbol());
        }

        if (is.function(Proxy)) {
            const proxy = new Proxy({}, {
                ownKeys() {
                    throw new TypeError();
                }
            });

                // Object.isFrozen will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(() => {
                // isFrozen should not suppress errors, thrown in proxy traps
                assert.frozen(proxy);
            }, { name: "TypeError" }, true);
        }
    });

    it("notFrozen", () => {
        const frozenObject = Object.freeze({});

        assert.notFrozen({});

        err(() => {
            assert.notFrozen(frozenObject, "blah");
        }, "blah: expected {} to not be frozen", true);

        // Making sure ES6-like Object.isFrozen response is respected for all primitive types

        err(() => {
            assert.notFrozen(42);
        }, "expected 42 to not be frozen");

        err(() => {
            assert.notFrozen(null);
        }, "expected null to not be frozen");

        err(() => {
            assert.notFrozen("foo");
        }, "expected 'foo' to not be frozen");

        err(() => {
            assert.notFrozen(false);
        }, "expected false to not be frozen");

        err(() => {
            assert.notFrozen(undefined);
        }, "expected undefined to not be frozen");

        const proxy = new Proxy({}, {
            ownKeys() {
                throw new TypeError();
            }
        });

        // Object.isFrozen will call ownKeys trap only if object is not extensible
        Object.preventExtensions(proxy);

        err(() => {
            // isNotFrozen should not suppress errors, thrown in proxy traps
            assert.notFrozen(proxy);
        }, { name: "TypeError" }, true);
    });

    it("empty", () => {
        function FakeArgs() { }
        FakeArgs.prototype.length = 0;

        assert.empty("");
        assert.empty([]);
        assert.empty(new FakeArgs());
        assert.empty({});

        if (is.function(WeakMap)) {
            err(() => {
                assert.empty(new WeakMap(), "blah");
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(WeakSet)) {
            err(() => {
                assert.empty(new WeakSet(), "blah");
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(Map)) {
            assert.empty(new Map());

            const map = new Map();
            map.key = "val";
            assert.empty(map);
        }

        if (is.function(Set)) {
            assert.empty(new Set());

            const set = new Set();
            set.key = "val";
            assert.empty(set);
        }

        err(() => {
            assert.empty("foo", "blah");
        }, "blah: expected \'foo\' to be empty");

        err(() => {
            assert.empty(["foo"]);
        }, "expected [ \'foo\' ] to be empty");

        err(() => {
            assert.empty({ arguments: 0 });
        }, "expected { arguments: 0 } to be empty");

        err(() => {
            assert.empty({ foo: "bar" });
        }, "expected { foo: \'bar\' } to be empty");

        err(() => {
            assert.empty(null, "blah");
        }, "blah: .empty was passed non-string primitive null");

        err(() => {
            assert.empty(undefined);
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            assert.empty();
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            assert.empty(0);
        }, ".empty was passed non-string primitive 0");

        err(() => {
            assert.empty(1);
        }, ".empty was passed non-string primitive 1");

        err(() => {
            assert.empty(true);
        }, ".empty was passed non-string primitive true");

        err(() => {
            assert.empty(false);
        }, ".empty was passed non-string primitive false");

        if (!is.undefined(Symbol)) {
            err(() => {
                assert.empty(Symbol());
            }, ".empty was passed non-string primitive Symbol()");

            err(() => {
                assert.empty(Symbol.iterator);
            }, ".empty was passed non-string primitive Symbol(Symbol.iterator)");
        }

        err(() => {
            assert.empty(() => { }, "blah");
        }, "blah: .empty was passed a function");

        if (FakeArgs.name === "FakeArgs") {
            err(() => {
                assert.empty(FakeArgs);
            }, ".empty was passed a function FakeArgs");
        }
    });

    it("notEmpty", () => {
        function FakeArgs() { }
        FakeArgs.prototype.length = 0;

        assert.notEmpty("foo");
        assert.notEmpty(["foo"]);
        assert.notEmpty({ arguments: 0 });
        assert.notEmpty({ foo: "bar" });

        if (is.function(WeakMap)) {
            err(() => {
                assert.notEmpty(new WeakMap(), "blah");
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(WeakSet)) {
            err(() => {
                assert.notEmpty(new WeakSet(), "blah");
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(Map)) {
            // Not using Map constructor args because not supported in IE 11.
            const map = new Map();
            map.set("a", 1);
            assert.notEmpty(map);

            err(() => {
                assert.notEmpty(new Map());
            }, "expected {} not to be empty");
        }

        if (is.function(Set)) {
            // Not using Set constructor args because not supported in IE 11.
            const set = new Set();
            set.add(1);
            assert.notEmpty(set);

            err(() => {
                assert.notEmpty(new Set());
            }, "expected {} not to be empty");
        }

        err(() => {
            assert.notEmpty("", "blah");
        }, "blah: expected \'\' not to be empty");

        err(() => {
            assert.notEmpty([]);
        }, "expected [] not to be empty");

        err(() => {
            assert.notEmpty(new FakeArgs());
        }, "expected { length: 0 } not to be empty");

        err(() => {
            assert.notEmpty({});
        }, "expected {} not to be empty");

        err(() => {
            assert.notEmpty(null, "blah");
        }, "blah: .empty was passed non-string primitive null");

        err(() => {
            assert.notEmpty(undefined);
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            assert.notEmpty();
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            assert.notEmpty(0);
        }, ".empty was passed non-string primitive 0");

        err(() => {
            assert.notEmpty(1);
        }, ".empty was passed non-string primitive 1");

        err(() => {
            assert.notEmpty(true);
        }, ".empty was passed non-string primitive true");

        err(() => {
            assert.notEmpty(false);
        }, ".empty was passed non-string primitive false");

        if (!is.undefined(Symbol)) {
            err(() => {
                assert.notEmpty(Symbol());
            }, ".empty was passed non-string primitive Symbol()");

            err(() => {
                assert.notEmpty(Symbol.iterator);
            }, ".empty was passed non-string primitive Symbol(Symbol.iterator)");
        }

        err(() => {
            assert.notEmpty(() => { }, "blah");
        }, "blah: .empty was passed a function");

        if (FakeArgs.name === "FakeArgs") {
            err(() => {
                assert.notEmpty(FakeArgs);
            }, ".empty was passed a function FakeArgs");
        }
    });

    it("showDiff true with actual and expected args", () => {
        try {
            getAssertion().assert(
                "one" === "two"
                , "expected #{this} to equal #{exp}"
                , "expected #{this} to not equal #{act}"
                , "one"
                , "two"
            );
        } catch (e) {
            assert.true(e.showDiff);
        }
    });

    it("showDiff false without expected and actual", () => {
        try {
            getAssertion().assert(
                "one" === "two"
                , "expected #{this} to equal #{exp}"
                , "expected #{this} to not equal #{act}"
                , "one"
                , "two"
                , false
            );
        } catch (e) {
            assert.false(e.showDiff);
        }
    });
});
