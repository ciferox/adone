describe("shani", "util", "match", () => {
    const {
        is,
        error,
        shani: { util: { match } }
    } = adone;

    const propertyMatcherTests = (matcher, additionalTests) => () => {
        it("returns matcher", () => {
            const has = matcher("foo");

            assert(match.isMatcher(has));
        });

        it("throws if first argument is not string", () => {
            assert.throws(() => {
                matcher();
            }, TypeError);
            assert.throws(() => {
                matcher(123);
            }, TypeError);
        });

        it("returns false if value is undefined or null", () => {
            const has = matcher("foo");

            assert.isFalse(has.test(undefined));
            assert.isFalse(has.test(null));
        });

        it("returns true if object has property", () => {
            const has = matcher("foo");

            assert(has.test({ foo: null }));
        });

        it("returns false if object value is not equal to given value", () => {
            const has = matcher("foo", 1);

            assert.isFalse(has.test({ foo: null }));
        });

        it("returns true if object value is equal to given value", () => {
            const has = matcher("message", "hello");

            assert(has.test({ message: "hello" }));
            assert(has.test(new Error("hello")));
        });

        it("returns true if string property matches", () => {
            const has = matcher("length", 5);

            assert(has.test("hello"));
        });

        it("allows to expect undefined", () => {
            const has = matcher("foo", undefined);

            assert.isFalse(has.test({ foo: 1 }));
        });

        it("compares value deeply", () => {
            const has = matcher("foo", { bar: "doo", test: 42 });

            assert(has.test({ foo: { bar: "doo", test: 42 } }));
        });

        it("compares with matcher", () => {
            const has = matcher("callback", match.typeOf("function"));

            assert(has.test({ callback() { } }));
        });

        if (is.function(additionalTests)) {
            additionalTests();
        }
    };

    it("returns matcher", () => {
        const m = match(() => { });

        assert(match.isMatcher(m));
    });

    it("exposes test function", () => {
        const test = function () { };

        const m = match(test);

        assert.equal(m.test, test);
    });

    it("returns true if properties are equal", () => {
        const m = match({ str: "hello", nr: 1 });

        assert(m.test({ str: "hello", nr: 1, other: "ignored" }));
    });

    it("returns true if properties are deep equal", () => {
        const m = match({ deep: { str: "hello" } });

        assert(m.test({ deep: { str: "hello", ignored: "value" } }));
    });

    it("returns false if a property is not equal", () => {
        const m = match({ str: "hello", nr: 1 });

        assert.isFalse(m.test({ str: "hello", nr: 2 }));
    });

    it("returns false if a property is missing", () => {
        const m = match({ str: "hello", nr: 1 });

        assert.isFalse(m.test({ nr: 1 }));
    });

    it("returns true if array is equal", () => {
        const m = match({ arr: ["a", "b"] });

        assert(m.test({ arr: ["a", "b"] }));
    });

    it("returns false if array is not equal", () => {
        const m = match({ arr: ["b", "a"] });

        assert.isFalse(m.test({ arr: ["a", "b"] }));
    });

    it("returns false if array is not equal (even if the contents would match (deep equal))", () => {
        const m = match([{ str: "hello" }]);

        assert.isFalse(m.test([{ str: "hello", ignored: "value" }]));
    });

    it("returns true if number objects are equal", () => {
        /**
         * eslint-disable no-new-wrappers
         */
        const m = match({ one: new Number(1) });

        assert(m.test({ one: new Number(1) }));
        /*eslint-enable no-new-wrappers*/
    });

    it("returns true if test matches", () => {
        const m = match({ prop: match.typeOf("boolean") });

        assert(m.test({ prop: true }));
    });

    it("returns false if test does not match", () => {
        const m = match({ prop: match.typeOf("boolean") });

        assert.isFalse(m.test({ prop: "no" }));
    });

    it("returns true if deep test matches", () => {
        const m = match({ deep: { prop: match.typeOf("boolean") } });

        assert(m.test({ deep: { prop: true } }));
    });

    it("returns false if deep test does not match", () => {
        const m = match({ deep: { prop: match.typeOf("boolean") } });

        assert.isFalse(m.test({ deep: { prop: "no" } }));
    });

    it("returns false if tested value is null or undefined", () => {
        const m = match({});

        assert.isFalse(m.test(null));
        assert.isFalse(m.test(undefined));
    });

    it("returns true if error message matches", () => {
        const m = match({ message: "evil error" });

        assert(m.test(new Error("evil error")));
    });

    it("returns true if string property matches", () => {
        const m = match({ length: 5 });

        assert(m.test("hello"));
    });

    it("returns true if number property matches", () => {
        const m = match({ toFixed: match.func });

        assert(m.test(0));
    });

    it("returns true for string match", () => {
        const m = match("hello");

        assert(m.test("hello"));
    });

    it("returns true for substring match", () => {
        const m = match("el");

        assert(m.test("hello"));
    });

    it("returns false for string mismatch", () => {
        const m = match("hello.WORLD");

        assert.isFalse(m.test(null));
        assert.isFalse(m.test({}));
        assert.isFalse(m.test("hello"));
        assert.isFalse(m.test("hello.world"));
    });

    it("returns true for regexp match", () => {
        const m = match(/^[helo]+$/);

        assert(m.test("hello"));
    });

    it("returns false for regexp string mismatch", () => {
        const m = match(/^[hel]+$/);

        assert.isFalse(m.test("hello"));
    });

    it("returns false for regexp type mismatch", () => {
        const m = match(/.*/);

        assert.isFalse(m.test());
        assert.isFalse(m.test(null));
        assert.isFalse(m.test(123));
        assert.isFalse(m.test({}));
    });

    it("returns true for number match", () => {
        const m = match(1);

        assert(m.test(1));
        assert(m.test("1"));
        assert(m.test(true));
    });

    it("returns false for number mismatch", () => {
        const m = match(1);

        assert.isFalse(m.test());
        assert.isFalse(m.test(null));
        assert.isFalse(m.test(2));
        assert.isFalse(m.test(false));
        assert.isFalse(m.test({}));
    });

    it("returns true for Symbol match", () => {
        const symbol = Symbol();

        const m = match(symbol);

        assert(m.test(symbol));
    });

    it("returns false for Symbol mismatch", () => {
        const m = match(Symbol());

        assert.isFalse(m.test());
        assert.isFalse(m.test(Symbol(null)));
        assert.isFalse(m.test(Symbol()));
        assert.isFalse(m.test(Symbol({})));
    });

    it("returns true for Symbol inside object", () => {
        const symbol = Symbol();

        const m = match({ prop: symbol });

        assert(m.test({ prop: symbol }));
    });

    it("returns true if test function in object returns true", () => {
        const m = match({
            test() {
                return true;
            }
        });

        assert(m.test());
    });

    it("returns false if test function in object returns false", () => {
        const m = match({
            test() {
                return false;
            }
        });

        assert.isFalse(m.test());
    });

    it("returns false if test function in object returns nothing", () => {
        const m = match({ test() { } });

        assert.isFalse(m.test());
    });

    it("passes actual value to test function in object", () => {
        const m = match({
            test(arg) {
                return arg;
            }
        });

        assert(m.test(true));
    });

    it("uses matcher", () => {
        const m = match(match("test"));

        assert(m.test("testing"));
    });

    describe(".toString", () => {
        it("returns message", () => {
            const message = "hello Match";

            const m = match(() => { }, message);

            assert.equal(m.toString(), message);
        });

        it("defaults to match(functionName)", () => {
            const m = match(function custom() { });

            assert.equal(m.toString(), "match(custom)");
        });
    });

    describe(".any", () => {
        it("is matcher", () => {
            assert(match.isMatcher(match.any));
        });

        it("returns true when tested", () => {
            assert(match.any.test());
        });
    });

    describe(".defined", () => {
        it("is matcher", () => {
            assert(match.isMatcher(match.defined));
        });

        it("returns false if test is called with null", () => {
            assert.isFalse(match.defined.test(null));
        });

        it("returns false if test is called with undefined", () => {
            assert.isFalse(match.defined.test(undefined));
        });

        it("returns true if test is called with any value", () => {
            assert(match.defined.test(false));
            assert(match.defined.test(true));
            assert(match.defined.test(0));
            assert(match.defined.test(1));
            assert(match.defined.test(""));
        });

        it("returns true if test is called with any object", () => {
            assert(match.defined.test({}));
            assert(match.defined.test(() => { }));
        });
    });

    describe(".truthy", () => {
        it("is matcher", () => {
            assert(match.isMatcher(match.truthy));
        });

        it("returns true if test is called with trueish value", () => {
            assert(match.truthy.test(true));
            assert(match.truthy.test(1));
            assert(match.truthy.test("yes"));
        });

        it("returns false if test is called falsy value", () => {
            assert.isFalse(match.truthy.test(false));
            assert.isFalse(match.truthy.test(null));
            assert.isFalse(match.truthy.test(undefined));
            assert.isFalse(match.truthy.test(""));
        });
    });

    describe(".falsy", () => {
        it("is matcher", () => {
            assert(match.isMatcher(match.falsy));
        });

        it("returns true if test is called falsy value", () => {
            assert(match.falsy.test(false));
            assert(match.falsy.test(null));
            assert(match.falsy.test(undefined));
            assert(match.falsy.test(""));
        });

        it("returns false if test is called with trueish value", () => {
            assert.isFalse(match.falsy.test(true));
            assert.isFalse(match.falsy.test(1));
            assert.isFalse(match.falsy.test("yes"));
        });
    });

    describe(".same", () => {
        it("returns matcher", () => {
            const same = match.same();

            assert(match.isMatcher(same));
        });

        it("returns true if test is called with same argument", () => {
            const object = {};
            const same = match.same(object);

            assert(same.test(object));
        });

        it("returns true if test is called with same symbol", () => {
            const symbol = Symbol();
            const same = match.same(symbol);

            assert(same.test(symbol));
        });

        it("returns false if test is not called with same argument", () => {
            const same = match.same({});

            assert.isFalse(same.test({}));
        });
    });

    describe(".typeOf", () => {
        it("throws if given argument is not a string", () => {
            assert.throws(() => {
                match.typeOf();
            }, TypeError);
            assert.throws(() => {
                match.typeOf(123);
            }, TypeError);
        });

        it("returns matcher", () => {
            const typeOf = match.typeOf("string");

            assert(match.isMatcher(typeOf));
        });

        it("returns true if test is called with string", () => {
            const typeOf = match.typeOf("string");

            assert(typeOf.test("hello"));
        });

        it("returns false if test is not called with string", () => {
            const typeOf = match.typeOf("string");

            assert.isFalse(typeOf.test(123));
        });

        it("returns true if test is called with symbol", () => {
            const typeOf = match.typeOf("symbol");

            assert(typeOf.test(Symbol()));
        });

        it("returns true if test is called with regexp", () => {
            const typeOf = match.typeOf("regexp");

            assert(typeOf.test(/.+/));
        });

        it("returns false if test is not called with regexp", () => {
            const typeOf = match.typeOf("regexp");

            assert.isFalse(typeOf.test(true));
        });
    });

    describe(".instanceOf", () => {
        it("throws if given argument is not a function", () => {
            assert.throws(() => {
                match.instanceOf();
            }, TypeError);
            assert.throws(() => {
                match.instanceOf("foo");
            }, TypeError);
        });

        it("returns matcher", () => {
            const instanceOf = match.instanceOf(() => { });

            assert(match.isMatcher(instanceOf));
        });

        it("returns true if test is called with instance of argument", () => {
            const instanceOf = match.instanceOf(Array);

            assert(instanceOf.test([]));
        });

        it("returns false if test is not called with instance of argument", () => {
            const instanceOf = match.instanceOf(Array);

            assert.isFalse(instanceOf.test({}));
        });

        it("does not throw if given argument defines Symbol.hasInstance", () => {
            const objectWithCustomTypeChecks = {};
            objectWithCustomTypeChecks[Symbol.hasInstance] = function () { };
            match.instanceOf(objectWithCustomTypeChecks);
        });
    });

    describe(".has", propertyMatcherTests(match.has));
    describe(".hasOwn", propertyMatcherTests(match.hasOwn));

    describe(".hasNested", propertyMatcherTests(match.hasNested, () => {

        it("compares nested value", () => {
            const hasNested = match.hasNested("foo.bar", "doo");

            assert(hasNested.test({ foo: { bar: "doo" } }));
        });

        it("compares nested array value", () => {
            const hasNested = match.hasNested("foo[0].bar", "doo");

            assert(hasNested.test({ foo: [{ bar: "doo" }] }));
        });

    }));

    describe(".hasSpecial", () => {
        it("returns true if object has inherited property", () => {
            const has = match.has("toString");

            assert(has.test({}));
        });

        it("only includes property in message", () => {
            const has = match.has("test");

            assert.equal(has.toString(), "has(\"test\")");
        });

        it("includes property and value in message", () => {
            const has = match.has("test", undefined);

            assert.equal(has.toString(), "has(\"test\", undefined)");
        });

        it("returns true if string function matches", () => {
            const has = match.has("toUpperCase", match.func);

            assert(has.test("hello"));
        });

        it("returns true if number function matches", () => {
            const has = match.has("toFixed", match.func);

            assert(has.test(0));
        });

        it("returns true if object has Symbol", () => {
            const symbol = Symbol();

            const has = match.has("prop", symbol);

            assert(has.test({ prop: symbol }));
        });

        it("returns true if embedded object has Symbol", () => {
            const symbol = Symbol();

            const has = match.has("prop", match.has("embedded", symbol));

            assert(has.test({ prop: { embedded: symbol }, ignored: 42 }));
        });
    });

    describe(".hasOwnSpecial", () => {
        it("returns false if object has inherited property", () => {
            const hasOwn = match.hasOwn("toString");

            assert.isFalse(hasOwn.test({}));
        });

        it("only includes property in message", () => {
            const hasOwn = match.hasOwn("test");

            assert.equal(hasOwn.toString(), "hasOwn(\"test\")");
        });

        it("includes property and value in message", () => {
            const hasOwn = match.hasOwn("test", undefined);

            assert.equal(hasOwn.toString(), "hasOwn(\"test\", undefined)");
        });
    });

    describe(".every", () => {
        it("throws if given argument is not a matcher", () => {
            assert.throws(() => {
                match.every({});
            }, TypeError);
            assert.throws(() => {
                match.every(123);
            }, TypeError);
            assert.throws(() => {
                match.every("123");
            }, TypeError);
        });

        it("returns matcher", () => {
            const every = match.every(match.any);

            assert(match.isMatcher(every));
        });

        it("wraps the given matcher message with an \"every()\"", () => {
            const every = match.every(match.number);

            assert.equal(every.toString(), "every(typeOf(\"number\"))");
        });

        it("fails to match anything that is not an object or an iterable", () => {
            const every = match.every(match.any);

            assert.isFalse(every.test(1));
            assert.isFalse(every.test("a"));
            assert.isFalse(every.test(null));
            assert.isFalse(every.test(() => {}));
        });

        it("matches an object if the predicate is true for every property", () => {
            const every = match.every(match.number);

            assert.isTrue(every.test({ a: 1, b: 2 }));
        });

        it("fails if the predicate is false for some of the object properties", () => {
            const every = match.every(match.number);

            assert.isFalse(every.test({ a: 1, b: "b" }));
        });

        it("matches an array if the predicate is true for every element", () => {
            const every = match.every(match.number);

            assert(every.test([1, 2]));
        });

        it("fails if the predicate is false for some of the array elements", () => {
            const every = match.every(match.number);

            assert.isFalse(every.test([1, "b"]));
        });

        if (is.function(Set)) {
            it("matches an iterable if the predicate is true for every element", () => {
                const every = match.every(match.number);
                const set = new Set();
                set.add(1);
                set.add(2);

                assert(every.test(set));
            });

            it("fails if the predicate is false for some of the iterable elements", () => {
                const every = match.every(match.number);
                const set = new Set();
                set.add(1);
                set.add("b");

                assert.isFalse(every.test(set));
            });
        }
    });

    describe(".some", () => {
        it("throws if given argument is not a matcher", () => {
            assert.throws(() => {
                match.some({});
            }, TypeError);
            assert.throws(() => {
                match.some(123);
            }, TypeError);
            assert.throws(() => {
                match.some("123");
            }, TypeError);
        });

        it("returns matcher", () => {
            const some = match.some(match.any);

            assert(match.isMatcher(some));
        });

        it("wraps the given matcher message with an \"some()\"", () => {
            const some = match.some(match.number);

            assert.equal(some.toString(), "some(typeOf(\"number\"))");
        });

        it("fails to match anything that is not an object or an iterable", () => {
            const some = match.some(match.any);

            assert.isFalse(some.test(1));
            assert.isFalse(some.test("a"));
            assert.isFalse(some.test(null));
            assert.isFalse(some.test(() => {}));
        });

        it("matches an object if the predicate is true for some of the properties", () => {
            const some = match.some(match.number);

            assert.isTrue(some.test({ a: 1, b: "b" }));
        });

        it("fails if the predicate is false for all of the object properties", () => {
            const some = match.some(match.number);

            assert.isFalse(some.test({ a: "a", b: "b" }));
        });

        it("matches an array if the predicate is true for some element", () => {
            const some = match.some(match.number);

            assert(some.test([1, "b"]));
        });

        it("fails if the predicate is false for all of the array elements", () => {
            const some = match.some(match.number);

            assert.isFalse(some.test(["a", "b"]));
        });

        if (is.function(Set)) {
            it("matches an iterable if the predicate is true for some element", () => {
                const some = match.some(match.number);
                const set = new Set();
                set.add(1);
                set.add("b");

                assert(some.test(set));
            });

            it("fails if the predicate is false for all of the iterable elements", () => {
                const some = match.some(match.number);
                const set = new Set();
                set.add("a");
                set.add("b");


                assert.isFalse(some.test(set));
            });
        }
    });

    describe(".bool", () => {
        it("is typeOf boolean matcher", () => {
            const bool = match.bool;

            assert(match.isMatcher(bool));
            assert.equal(bool.toString(), "typeOf(\"boolean\")");
        });
    });

    describe(".number", () => {
        it("is typeOf number matcher", () => {
            const number = match.number;

            assert(match.isMatcher(number));
            assert.equal(number.toString(), "typeOf(\"number\")");
        });
    });

    describe(".string", () => {
        it("is typeOf string matcher", () => {
            const string = match.string;

            assert(match.isMatcher(string));
            assert.equal(string.toString(), "typeOf(\"string\")");
        });
    });

    describe(".object", () => {
        it("is typeOf object matcher", () => {
            const object = match.object;

            assert(match.isMatcher(object));
            assert.equal(object.toString(), "typeOf(\"object\")");
        });
    });

    describe(".func", () => {
        it("is typeOf function matcher", () => {
            const func = match.func;

            assert(match.isMatcher(func));
            assert.equal(func.toString(), "typeOf(\"function\")");
        });
    });

    describe(".array", () => {
        it("is typeOf array matcher", () => {
            const array = match.array;

            assert(match.isMatcher(array));
            assert.equal(array.toString(), "typeOf(\"array\")");
        });

        describe("array.deepEquals", () => {
            it("has a .deepEquals matcher", () => {
                const deepEquals = match.array.deepEquals([1, 2, 3]);

                assert(match.isMatcher(deepEquals));
                assert.equal(deepEquals.toString(), "deepEquals([1,2,3])");
            });

            it("matches arrays with the exact same elements", () => {
                const deepEquals = match.array.deepEquals([1, 2, 3]);
                assert(deepEquals.test([1, 2, 3]));
                assert.isFalse(deepEquals.test([1, 2]));
                assert.isFalse(deepEquals.test([3]));
            });

            it("fails when passed a non-array object", () => {
                const deepEquals = match.array.deepEquals(["one", "two", "three"]);
                assert.isFalse(deepEquals.test({ 0: "one", 1: "two", 2: "three", length: 3 }));
            });
        });

        describe("array.startsWith", () => {
            it("has a .startsWith matcher", () => {
                const startsWith = match.array.startsWith([1, 2]);

                assert(match.isMatcher(startsWith));
                assert.equal(startsWith.toString(), "startsWith([1,2])");
            });

            it("matches arrays starting with the same elements", () => {
                assert(match.array.startsWith([1]).test([1, 2]));
                assert(match.array.startsWith([1, 2]).test([1, 2]));
                assert.isFalse(match.array.startsWith([1, 2, 3]).test([1, 2]));
                assert.isFalse(match.array.startsWith([2]).test([1, 2]));
            });

            it("fails when passed a non-array object", () => {
                const startsWith = match.array.startsWith(["one", "two"]);
                assert.isFalse(startsWith.test({ 0: "one", 1: "two", 2: "three", length: 3 }));
            });
        });

        describe("array.endsWith", () => {
            it("has an .endsWith matcher", () => {
                const endsWith = match.array.endsWith([2, 3]);

                assert(match.isMatcher(endsWith));
                assert.equal(endsWith.toString(), "endsWith([2,3])");
            });

            it("matches arrays ending with the same elements", () => {
                assert(match.array.endsWith([2]).test([1, 2]));
                assert(match.array.endsWith([1, 2]).test([1, 2]));
                assert.isFalse(match.array.endsWith([1, 2, 3]).test([1, 2]));
                assert.isFalse(match.array.endsWith([3]).test([1, 2]));
            });

            it("fails when passed a non-array object", () => {
                const endsWith = match.array.endsWith(["two", "three"]);

                assert.isFalse(endsWith.test({ 0: "one", 1: "two", 2: "three", length: 3 }));
            });
        });

        describe("array.contains", () => {
            it("has a .contains matcher", () => {
                const contains = match.array.contains([2, 3]);

                assert(match.isMatcher(contains));
                assert.equal(contains.toString(), "contains([2,3])");
            });

            it("matches arrays containing all the expected elements", () => {
                assert(match.array.contains([2]).test([1, 2, 3]));
                assert(match.array.contains([1, 2]).test([1, 2]));
                assert.isFalse(match.array.contains([1, 2, 3]).test([1, 2]));
                assert.isFalse(match.array.contains([3]).test([1, 2]));
            });

            it("fails when passed a non-array object", () => {
                const contains = match.array.contains(["one", "three"]);

                assert.isFalse(contains.test({ 0: "one", 1: "two", 2: "three", length: 3 }));
            });
        });
    });

    describe(".map", () => {
        it("is typeOf map matcher", () => {
            const map = match.map;

            assert(match.isMatcher(map));
            assert.equal(map.toString(), "typeOf(\"map\")");
        });

        describe("map.deepEquals", () => {
            it("has a .deepEquals matcher", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const deepEquals = match.map.deepEquals(mapOne);
                assert(match.isMatcher(deepEquals));
                assert.equal(deepEquals.toString(), "deepEquals(Map[['one',1],['two',2],['three',3]])");
            });

            it("matches maps with the exact same elements", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const mapTwo = new Map();
                mapTwo.set("one", 1);
                mapTwo.set("two", 2);
                mapTwo.set("three", 3);

                const mapThree = new Map();
                mapThree.set("one", 1);
                mapThree.set("two", 2);

                const deepEquals = match.map.deepEquals(mapOne);
                assert(deepEquals.test(mapTwo));
                assert.isFalse(deepEquals.test(mapThree));
                assert.isFalse(deepEquals.test(new Map()));
            });

            it("fails when maps have the same keys but different values", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const mapTwo = new Map();
                mapTwo.set("one", 2);
                mapTwo.set("two", 4);
                mapTwo.set("three", 8);

                const mapThree = new Map();
                mapTwo.set("one", 1);
                mapTwo.set("two", 2);
                mapTwo.set("three", 4);

                const deepEquals = match.map.deepEquals(mapOne);
                assert.isFalse(deepEquals.test(mapTwo));
                assert.isFalse(deepEquals.test(mapThree));
            });

            it("fails when passed a non-map object", () => {
                const deepEquals = match.array.deepEquals(new Map());
                assert.isFalse(deepEquals.test({}));
                assert.isFalse(deepEquals.test([]));
            });
        });

        describe("map.contains", () => {
            it("has a .contains matcher", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const contains = match.map.contains(mapOne);
                assert(match.isMatcher(contains));
                assert.equal(contains.toString(), "contains(Map[['one',1],['two',2],['three',3]])");
            });

            it("matches maps containing the given elements", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const mapTwo = new Map();
                mapTwo.set("one", 1);
                mapTwo.set("two", 2);
                mapTwo.set("three", 3);

                const mapThree = new Map();
                mapThree.set("one", 1);
                mapThree.set("two", 2);

                const mapFour = new Map();
                mapFour.set("one", 1);
                mapFour.set("four", 4);

                assert(match.map.contains(mapTwo).test(mapOne));
                assert(match.map.contains(mapThree).test(mapOne));
                assert.isFalse(match.map.contains(mapFour).test(mapOne));
            });

            it("fails when maps contain the same keys but different values", () => {
                const mapOne = new Map();
                mapOne.set("one", 1);
                mapOne.set("two", 2);
                mapOne.set("three", 3);

                const mapTwo = new Map();
                mapTwo.set("one", 2);
                mapTwo.set("two", 4);
                mapTwo.set("three", 8);

                const mapThree = new Map();
                mapThree.set("one", 1);
                mapThree.set("two", 2);
                mapThree.set("three", 4);

                assert.isFalse(match.map.contains(mapTwo).test(mapOne));
                assert.isFalse(match.map.contains(mapThree).test(mapOne));
            });

            it("fails when passed a non-map object", () => {
                const contains = match.map.contains(new Map());
                assert.isFalse(contains.test({}));
                assert.isFalse(contains.test([]));
            });
        });
    });

    describe(".set", () => {
        it("is typeOf set matcher", () => {
            const set = match.set;

            assert(match.isMatcher(set));
            assert.equal(set.toString(), "typeOf(\"set\")");
        });

        describe("set.deepEquals", () => {
            it("has a .deepEquals matcher", () => {
                const setOne = new Set();
                setOne.add("one");
                setOne.add("two");
                setOne.add("three");

                const deepEquals = match.set.deepEquals(setOne);
                assert(match.isMatcher(deepEquals));
                assert.equal(deepEquals.toString(), "deepEquals(Set['one','two','three'])");
            });

            it("matches sets with the exact same elements", () => {
                const setOne = new Set();
                setOne.add("one");
                setOne.add("two");
                setOne.add("three");

                const setTwo = new Set();
                setTwo.add("one");
                setTwo.add("two");
                setTwo.add("three");

                const setThree = new Set();
                setThree.add("one");
                setThree.add("two");

                const deepEquals = match.set.deepEquals(setOne);
                assert(deepEquals.test(setTwo));
                assert.isFalse(deepEquals.test(setThree));
                assert.isFalse(deepEquals.test(new Set()));
            });

            it("fails when passed a non-set object", () => {
                const deepEquals = match.array.deepEquals(new Set());
                assert.isFalse(deepEquals.test({}));
                assert.isFalse(deepEquals.test([]));
            });
        });

        describe("set.contains", () => {
            it("has a .contains matcher", () => {
                const setOne = new Set();
                setOne.add("one");
                setOne.add("two");
                setOne.add("three");

                const contains = match.set.contains(setOne);
                assert(match.isMatcher(contains));
                assert.equal(contains.toString(), "contains(Set['one','two','three'])");
            });

            it("matches sets containing the given elements", () => {
                const setOne = new Set();
                setOne.add("one");
                setOne.add("two");
                setOne.add("three");

                const setTwo = new Set();
                setTwo.add("one");
                setTwo.add("two");
                setTwo.add("three");

                const setThree = new Set();
                setThree.add("one");
                setThree.add("two");

                const setFour = new Set();
                setFour.add("one");
                setFour.add("four");

                assert(match.set.contains(setTwo).test(setOne));
                assert(match.set.contains(setThree).test(setOne));
                assert.isFalse(match.set.contains(setFour).test(setOne));
            });

            it("fails when passed a non-set object", () => {
                const contains = match.set.contains(new Set());
                assert.isFalse(contains.test({}));
                assert.isFalse(contains.test([]));
            });
        });
    });

    describe(".regexp", () => {
        it("is typeOf regexp matcher", () => {
            const regexp = match.regexp;

            assert(match.isMatcher(regexp));
            assert.equal(regexp.toString(), "typeOf(\"regexp\")");
        });
    });

    describe(".date", () => {
        it("is typeOf regexp matcher", () => {
            const date = match.date;

            assert(match.isMatcher(date));
            assert.equal(date.toString(), "typeOf(\"date\")");
        });
    });

    describe(".symbol", () => {
        it("is typeOf symbol matcher", () => {
            const symbol = match.symbol;

            assert(match.isMatcher(symbol));
            assert.equal(symbol.toString(), "typeOf(\"symbol\")");
        });
    });

    describe(".or", () => {
        it("is matcher", () => {
            const numberOrString = match.number.or(match.string);

            assert(match.isMatcher(numberOrString));
            assert.equal(numberOrString.toString(),
                "typeOf(\"number\").or(typeOf(\"string\"))");
        });

        it("requires matcher argument", () => {
            assert.throws(() => {
                match.instanceOf(Error).or();
            }, error.InvalidArgumentException);
        });

        it("will coerce argument to matcher", () => {
            const abcOrDef = match("abc").or("def");

            assert(match.isMatcher(abcOrDef));
            assert.equal(abcOrDef.toString(),
                "match(\"abc\").or(match(\"def\"))");
        });

        it("returns true if either matcher matches", () => {
            const numberOrString = match.number.or(match.string);

            assert(numberOrString.test(123));
            assert(numberOrString.test("abc"));
        });

        it("returns false if neither matcher matches", () => {
            const numberOrAbc = match.number.or("abc");

            assert.isFalse(numberOrAbc.test(/.+/));
            assert.isFalse(numberOrAbc.test(new Date()));
            assert.isFalse(numberOrAbc.test({}));
        });

        it("can be used with undefined", () => {
            const numberOrUndef = match.number.or(undefined);

            assert(numberOrUndef.test(123));
            assert(numberOrUndef.test(undefined));
        });
    });

    describe(".and", () => {
        it("is matcher", () => {
            const fooAndBar = match.has("foo").and(match.has("bar"));

            assert(match.isMatcher(fooAndBar));
            assert.equal(fooAndBar.toString(), "has(\"foo\").and(has(\"bar\"))");
        });

        it("requires matcher argument", () => {
            assert.throws(() => {
                match.instanceOf(Error).and();
            }, error.InvalidArgumentException);
        });

        it("will coerce to matcher", () => {
            const abcOrObj = match("abc").or({ a: 1 });

            assert(match.isMatcher(abcOrObj));
            assert.equal(abcOrObj.toString(),
                "match(\"abc\").or(match(a: 1))");
        });

        it("returns true if both matchers match", () => {
            const fooAndBar = match.has("foo").and({ bar: "bar" });

            assert(fooAndBar.test({ foo: "foo", bar: "bar" }));
        });

        it("returns false if either matcher does not match", () => {
            const fooAndBar = match.has("foo").and(match.has("bar"));

            assert.isFalse(fooAndBar.test({ foo: "foo" }));
            assert.isFalse(fooAndBar.test({ bar: "bar" }));
        });

        it("can be used with undefined", () => {
            const falsyAndUndefined = match.falsy.and(undefined);

            assert.isFalse(falsyAndUndefined.test(false));
            assert(falsyAndUndefined.test(undefined));
        });
    });

    describe("nested", () => {
        it("returns true for an object with nested matcher", () => {
            const m = match({ outer: match({ inner: "hello" }) });

            assert.isTrue(m.test({ outer: { inner: "hello", foo: "bar" } }));
        });

        it("returns true for an array of nested matchers", () => {
            const m = match([match({ str: "hello" })]);

            assert.isTrue(m.test([{ str: "hello", foo: "bar" }]));
        });
    });
});
