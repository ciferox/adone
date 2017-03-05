/* global it describe assert */

import $match from "adone/glosses/shani/mock/match";

function propertyMatcherTests(matcher) {
    return function () {
        it("returns matcher", function () {
            const has = matcher("foo");

            assert($match.isMatcher(has));
        });

        it("throws if first argument is not string", function () {
            assert.throw(function () {
                matcher();
            }, TypeError);
            assert.throw(function () {
                matcher(123);
            }, TypeError);
        });

        it("returns false if value is undefined or null", function () {
            const has = matcher("foo");

            assert.isNotOk(has.test(undefined));
            assert.isNotOk(has.test(null));
        });

        it("returns true if object has property", function () {
            const has = matcher("foo");

            assert(has.test({ foo: null }));
        });

        it("returns false if object value is not equal to given value", function () {
            const has = matcher("foo", 1);

            assert.isNotOk(has.test({ foo: null }));
        });

        it("returns true if object value is equal to given value", function () {
            const has = matcher("message", "rocks");

            assert(has.test({ message: "rocks" }));
            assert(has.test(new Error("rocks")));
        });

        it("returns true if string property matches", function () {
            const has = matcher("length", 5);

            assert(has.test("12345"));
        });

        it("allows to expect undefined", function () {
            const has = matcher("foo", undefined);

            assert.isNotOk(has.test({ foo: 1 }));
        });

        it("compares value deeply", function () {
            const has = matcher("foo", { bar: "doo", test: 42 });

            assert(has.test({ foo: { bar: "doo", test: 42 } }));
        });

        it("compares with matcher", function () {
            const has = matcher("callback", $match.typeOf("function"));

            assert(has.test({ callback() {} }));
        });
    };
}

describe("match", function () {
    it("returns matcher", function () {
        const match = $match(function () {});

        assert($match.isMatcher(match));
    });

    it("exposes test function", function () {
        const test = function () {};

        const match = $match(test);

        assert.deepEqual(match.test, test);
    });

    it("returns true if properties are equal", function () {
        const match = $match({ str: "abcde", nr: 1 });

        assert(match.test({ str: "abcde", nr: 1, other: "ignored" }));
    });

    it("returns true if properties are deep equal", function () {
        const match = $match({ deep: { str: "abcde" } });

        assert(match.test({ deep: { str: "abcde", ignored: "value" } }));
    });

    it("returns false if a property is not equal", function () {
        const match = $match({ str: "abcde", nr: 1 });

        assert.isNotOk(match.test({ str: "abcde", nr: 2 }));
    });

    it("returns false if a property is missing", function () {
        const match = $match({ str: "abcde", nr: 1 });

        assert.isNotOk(match.test({ nr: 1 }));
    });

    it("returns true if array is equal", function () {
        const match = $match({ arr: ["a", "b"] });

        assert(match.test({ arr: ["a", "b"] }));
    });

    it("returns false if array is not equal", function () {
        const match = $match({ arr: ["b", "a"] });

        assert.isNotOk(match.test({ arr: ["a", "b"] }));
    });

    it("returns true if number objects are equal", function () {
        /*eslint-disable no-new-wrappers*/
        const match = $match({ one: new Number(1) });

        assert(match.test({ one: new Number(1) }));
        /*eslint-enable no-new-wrappers*/
    });

    it("returns true if test matches", function () {
        const match = $match({ prop: $match.typeOf("boolean") });

        assert(match.test({ prop: true }));
    });

    it("returns false if test does not match", function () {
        const match = $match({ prop: $match.typeOf("boolean") });

        assert.isNotOk(match.test({ prop: "no" }));
    });

    it("returns true if deep test matches", function () {
        const match = $match({ deep: { prop: $match.typeOf("boolean") } });

        assert(match.test({ deep: { prop: true } }));
    });

    it("returns false if deep test does not match", function () {
        const match = $match({ deep: { prop: $match.typeOf("boolean") } });

        assert.isNotOk(match.test({ deep: { prop: "no" } }));
    });

    it("returns false if tested value is null or undefined", function () {
        const match = $match({});

        assert.isNotOk(match.test(null));
        assert.isNotOk(match.test(undefined));
    });

    it("returns true if error message matches", function () {
        const match = $match({ message: "evil error" });

        assert(match.test(new Error("evil error")));
    });

    it("returns true if string property matches", function () {
        const match = $match({ length: 5 });

        assert(match.test("abcde"));
    });

    it("returns true if number property matches", function () {
        const match = $match({ toFixed: $match.func });

        assert(match.test(0));
    });

    it("returns true for string match", function () {
        const match = $match("abcde");

        assert(match.test("abcde"));
    });

    it("returns true for substring match", function () {
        const match = $match("cd");

        assert(match.test("abcde"));
    });

    it("returns false for string mismatch", function () {
        const match = $match("Hello 123");

        assert.isNotOk(match.test(null));
        assert.isNotOk(match.test({}));
        assert.isNotOk(match.test("hello"));
        assert.isNotOk(match.test("hello"));
    });

    it("returns true for regexp match", function () {
        const match = $match(/^[a-z]+$/);

        assert(match.test("abcde"));
    });

    it("returns false for regexp string mismatch", function () {
        const match = $match(/^[a-z]+$/);

        assert.isNotOk(match.test("abcde5"));
    });

    it("returns false for regexp type mismatch", function () {
        const match = $match(/.*/);

        assert.isNotOk(match.test());
        assert.isNotOk(match.test(null));
        assert.isNotOk(match.test(123));
        assert.isNotOk(match.test({}));
    });

    it("returns true for number match", function () {
        const match = $match(1);

        assert(match.test(1));
        assert(match.test("1"));
        assert(match.test(true));
    });

    it("returns false for number mismatch", function () {
        const match = $match(1);

        assert.isNotOk(match.test());
        assert.isNotOk(match.test(null));
        assert.isNotOk(match.test(2));
        assert.isNotOk(match.test(false));
        assert.isNotOk(match.test({}));
    });

    it("returns true for Symbol match", function () {
        if (typeof Symbol === "function") {
            const symbol = Symbol();

            const match = $match(symbol);

            assert(match.test(symbol));
        }
    });

    it("returns false for Symbol mismatch", function () {
        if (typeof Symbol === "function") {
            const match = $match(Symbol());

            assert.isNotOk(match.test());
            assert.isNotOk(match.test(Symbol(null)));
            assert.isNotOk(match.test(Symbol()));
            assert.isNotOk(match.test(Symbol({})));
        }
    });

    it("returns true for Symbol inside object", function () {
        if (typeof Symbol === "function") {
            const symbol = Symbol();

            const match = $match({ prop: symbol });

            assert(match.test({ prop: symbol }));
        }
    });

    it("returns true if test function in object returns true", function () {
        const match = $match({ test: function () {
            return true;
        }});

        assert(match.test());
    });

    it("returns false if test function in object returns false", function () {
        const match = $match({ test() {
            return false;
        }});

        assert.isNotOk(match.test());
    });

    it("returns false if test function in object returns nothing", function () {
        const match = $match({ test: function () {}});

        assert.isNotOk(match.test());
    });

    it("passes actual value to test function in object", function () {
        const match = $match({ test(arg) {
            return arg;
        }});

        assert(match.test(true));
    });

    it("uses matcher", function () {
        const match = $match($match("test"));

        assert(match.test("testing"));
    });

    describe(".toString", function () {
        it("returns message", function () {
            const message = "hello match";

            const match = $match(function () {}, message);

            assert.deepEqual(match.toString(), message);
        });

        it("defaults to match(functionName)", function () {
            const match = $match(function custom() {});

            assert.deepEqual(match.toString(), "match(custom)");
        });
    });

    describe(".any", function () {
        it("is matcher", function () {
            assert($match.isMatcher($match.any));
        });

        it("returns true when tested", function () {
            assert($match.any.test());
        });
    });

    describe(".defined", function () {
        it("is matcher", function () {
            assert($match.isMatcher($match.defined));
        });

        it("returns false if test is called with null", function () {
            assert.isNotOk($match.defined.test(null));
        });

        it("returns false if test is called with undefined", function () {
            assert.isNotOk($match.defined.test(undefined));
        });

        it("returns true if test is called with any value", function () {
            assert($match.defined.test(false));
            assert($match.defined.test(true));
            assert($match.defined.test(0));
            assert($match.defined.test(1));
            assert($match.defined.test(""));
        });

        it("returns true if test is called with any object", function () {
            assert($match.defined.test({}));
            assert($match.defined.test(function () {}));
        });
    });

    describe(".truthy", function () {
        it("is matcher", function () {
            assert($match.isMatcher($match.truthy));
        });

        it("returns true if test is called with trueish value", function () {
            assert($match.truthy.test(true));
            assert($match.truthy.test(1));
            assert($match.truthy.test("yes"));
        });

        it("returns false if test is called falsy value", function () {
            assert.isNotOk($match.truthy.test(false));
            assert.isNotOk($match.truthy.test(null));
            assert.isNotOk($match.truthy.test(undefined));
            assert.isNotOk($match.truthy.test(""));
        });
    });

    describe(".falsy", function () {
        it("is matcher", function () {
            assert($match.isMatcher($match.falsy));
        });

        it("returns true if test is called falsy value", function () {
            assert($match.falsy.test(false));
            assert($match.falsy.test(null));
            assert($match.falsy.test(undefined));
            assert($match.falsy.test(""));
        });

        it("returns false if test is called with trueish value", function () {
            assert.isNotOk($match.falsy.test(true));
            assert.isNotOk($match.falsy.test(1));
            assert.isNotOk($match.falsy.test("yes"));
        });
    });

    describe(".same", function () {
        it("returns matcher", function () {
            const same = $match.same();

            assert($match.isMatcher(same));
        });

        it("returns true if test is called with same argument", function () {
            const object = {};
            const same = $match.same(object);

            assert(same.test(object));
        });

        it("returns true if test is called with same symbol", function () {
            if (typeof Symbol === "function") {
                const symbol = Symbol();
                const same = $match.same(symbol);

                assert(same.test(symbol));
            }
        });

        it("returns false if test is not called with same argument", function () {
            const same = $match.same({});

            assert.isNotOk(same.test({}));
        });
    });

    describe(".typeOf", function () {
        it("throws if given argument is not a string", function () {
            assert.throw(function () {
                $match.typeOf();
            }, TypeError);
            assert.throw(function () {
                $match.typeOf(123);
            }, TypeError);
        });

        it("returns matcher", function () {
            const typeOf = $match.typeOf("string");

            assert($match.isMatcher(typeOf));
        });

        it("returns true if test is called with string", function () {
            const typeOf = $match.typeOf("string");

            assert(typeOf.test("hello"));
        });

        it("returns false if test is not called with string", function () {
            const typeOf = $match.typeOf("string");

            assert.isNotOk(typeOf.test(123));
        });

        it("returns true if test is called with symbol", function () {
            if (typeof Symbol === "function") {
                const typeOf = $match.typeOf("symbol");

                assert(typeOf.test(Symbol()));
            }
        });

        it("returns true if test is called with regexp", function () {
            const typeOf = $match.typeOf("regexp");

            assert(typeOf.test(/.+/));
        });

        it("returns false if test is not called with regexp", function () {
            const typeOf = $match.typeOf("regexp");

            assert.isNotOk(typeOf.test(true));
        });
    });

    describe(".instanceOf", function () {
        it("throws if given argument is not a function", function () {
            assert.throw(function () {
                $match.instanceOf();
            }, TypeError);
            assert.throw(function () {
                $match.instanceOf("foo");
            }, TypeError);
        });

        it("returns matcher", function () {
            const instanceOf = $match.instanceOf(function () {});

            assert($match.isMatcher(instanceOf));
        });

        it("returns true if test is called with instance of argument", function () {
            const instanceOf = $match.instanceOf(Array);

            assert(instanceOf.test([]));
        });

        it("returns false if test is not called with instance of argument", function () {
            const instanceOf = $match.instanceOf(Array);

            assert.isNotOk(instanceOf.test({}));
        });
    });

    describe(".has", propertyMatcherTests($match.has));
    describe(".hasOwn", propertyMatcherTests($match.hasOwn));

    describe(".hasSpecial", function () {
        it("returns true if object has inherited property", function () {
            const has = $match.has("toString");

            assert(has.test({}));
        });

        it("only includes property in message", function () {
            const has = $match.has("test");

            assert.equal(has.toString(), "has(\"test\")");
        });

        it("includes property and value in message", function () {
            const has = $match.has("test", undefined);

            assert.equal(has.toString(), "has(\"test\", undefined)");
        });

        it("returns true if string function matches", function () {
            const has = $match.has("toUpperCase", $match.func);

            assert(has.test("hello"));
        });

        it("returns true if number function matches", function () {
            const has = $match.has("toFixed", $match.func);

            assert(has.test(0));
        });

        it("returns true if object has Symbol", function () {
            if (typeof Symbol === "function") {
                const symbol = Symbol();

                const has = $match.has("prop", symbol);

                assert(has.test({ prop: symbol }));
            }
        });
    });

    describe(".hasOwnSpecial", function () {
        it("returns false if object has inherited property", function () {
            const hasOwn = $match.hasOwn("toString");

            assert.isNotOk(hasOwn.test({}));
        });

        it("only includes property in message", function () {
            const hasOwn = $match.hasOwn("test");

            assert.equal(hasOwn.toString(), "hasOwn(\"test\")");
        });

        it("includes property and value in message", function () {
            const hasOwn = $match.hasOwn("test", undefined);

            assert.equal(hasOwn.toString(), "hasOwn(\"test\", undefined)");
        });
    });

    describe(".bool", function () {
        it("is typeOf boolean matcher", function () {
            const bool = $match.bool;

            assert($match.isMatcher(bool));
            assert.equal(bool.toString(), "typeOf(\"boolean\")");
        });
    });

    describe(".number", function () {
        it("is typeOf number matcher", function () {
            const number = $match.number;

            assert($match.isMatcher(number));
            assert.equal(number.toString(), "typeOf(\"number\")");
        });
    });

    describe(".string", function () {
        it("is typeOf string matcher", function () {
            const string = $match.string;

            assert($match.isMatcher(string));
            assert.equal(string.toString(), "typeOf(\"string\")");
        });
    });

    describe(".object", function () {
        it("is typeOf object matcher", function () {
            const object = $match.object;

            assert($match.isMatcher(object));
            assert.equal(object.toString(), "typeOf(\"object\")");
        });
    });

    describe(".func", function () {
        it("is typeOf function matcher", function () {
            const func = $match.func;

            assert($match.isMatcher(func));
            assert.equal(func.toString(), "typeOf(\"function\")");
        });
    });

    describe(".array", function () {
        it("is typeOf array matcher", function () {
            const array = $match.array;

            assert($match.isMatcher(array));
            assert.equal(array.toString(), "typeOf(\"array\")");
        });

        describe("array.deepEquals", function () {
            it("has a .deepEquals matcher", function () {
                const deepEquals = $match.array.deepEquals([1, 2, 3]);

                assert($match.isMatcher(deepEquals));
                assert.equal(deepEquals.toString(), "deepEquals([1,2,3])");
            });

            it("matches arrays with the exact same elements", function () {
                const deepEquals = $match.array.deepEquals([1, 2, 3]);
                assert(deepEquals.test([1, 2, 3]));
                assert.isNotOk(deepEquals.test([1, 2]));
                assert.isNotOk(deepEquals.test([3]));
            });

            it("fails when passed a non-array object", function () {
                const deepEquals = $match.array.deepEquals(["one", "two", "three"]);
                assert.isNotOk(deepEquals.test({0: "one", 1: "two", 2: "three", length: 3}));
            });
        });

        describe("array.startsWith", function () {
            it("has a .startsWith matcher", function () {
                const startsWith = $match.array.startsWith([1, 2]);

                assert($match.isMatcher(startsWith));
                assert.equal(startsWith.toString(), "startsWith([1,2])");
            });

            it("matches arrays starting with the same elements", function () {
                assert($match.array.startsWith([1]).test([1, 2]));
                assert($match.array.startsWith([1, 2]).test([1, 2]));
                assert.isNotOk($match.array.startsWith([1, 2, 3]).test([1, 2]));
                assert.isNotOk($match.array.startsWith([2]).test([1, 2]));
            });

            it("fails when passed a non-array object", function () {
                const startsWith = $match.array.startsWith(["one", "two"]);
                assert.isNotOk(startsWith.test({0: "one", 1: "two", 2: "three", length: 3}));
            });
        });

        describe("array.endsWith", function () {
            it("has an .endsWith matcher", function () {
                const endsWith = $match.array.endsWith([2, 3]);

                assert($match.isMatcher(endsWith));
                assert.equal(endsWith.toString(), "endsWith([2,3])");
            });

            it("matches arrays ending with the same elements", function () {
                assert($match.array.endsWith([2]).test([1, 2]));
                assert($match.array.endsWith([1, 2]).test([1, 2]));
                assert.isNotOk($match.array.endsWith([1, 2, 3]).test([1, 2]));
                assert.isNotOk($match.array.endsWith([3]).test([1, 2]));
            });

            it("fails when passed a non-array object", function () {
                const endsWith = $match.array.endsWith(["two", "three"]);

                assert.isNotOk(endsWith.test({0: "one", 1: "two", 2: "three", length: 3}));
            });
        });

        describe("array.contains", function () {
            it("has a .contains matcher", function () {
                const contains = $match.array.contains([2, 3]);

                assert($match.isMatcher(contains));
                assert.equal(contains.toString(), "contains([2,3])");
            });

            it("matches arrays containing all the expected elements", function () {
                assert($match.array.contains([2]).test([1, 2, 3]));
                assert($match.array.contains([1, 2]).test([1, 2]));
                assert.isNotOk($match.array.contains([1, 2, 3]).test([1, 2]));
                assert.isNotOk($match.array.contains([3]).test([1, 2]));
            });

            it("fails when passed a non-array object", function () {
                const contains = $match.array.contains(["one", "three"]);

                assert.isNotOk(contains.test({0: "one", 1: "two", 2: "three", length: 3}));
            });
        });
    });

    describe(".map", function () {
        it("is typeOf map matcher", function () {
            const map = $match.map;

            assert($match.isMatcher(map));
            assert.equal(map.toString(), "typeOf(\"map\")");
        });

        describe("map.deepEquals", function () {
            if (typeof Map === "function") {
                it("has a .deepEquals matcher", function () {
                    const mapOne = new Map();
                    mapOne.set("one", 1);
                    mapOne.set("two", 2);
                    mapOne.set("three", 3);

                    const deepEquals = $match.map.deepEquals(mapOne);
                    assert($match.isMatcher(deepEquals));
                    assert.equal(deepEquals.toString(), "deepEquals(Map[['one',1],['two',2],['three',3]])");
                });

                it("matches maps with the exact same elements", function () {
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

                    const deepEquals = $match.map.deepEquals(mapOne);
                    assert(deepEquals.test(mapTwo));
                    assert.isNotOk(deepEquals.test(mapThree));
                    assert.isNotOk(deepEquals.test(new Map()));
                });

                it("fails when maps have the same keys but different values", function () {
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

                    const deepEquals = $match.map.deepEquals(mapOne);
                    assert.isNotOk(deepEquals.test(mapTwo));
                    assert.isNotOk(deepEquals.test(mapThree));
                });

                it("fails when passed a non-map object", function () {
                    const deepEquals = $match.array.deepEquals(new Map());
                    assert.isNotOk(deepEquals.test({}));
                    assert.isNotOk(deepEquals.test([]));
                });
            }
        });

        describe("map.contains", function () {
            if (typeof Map === "function") {
                it("has a .contains matcher", function () {
                    const mapOne = new Map();
                    mapOne.set("one", 1);
                    mapOne.set("two", 2);
                    mapOne.set("three", 3);

                    const contains = $match.map.contains(mapOne);
                    assert($match.isMatcher(contains));
                    assert.equal(contains.toString(), "contains(Map[['one',1],['two',2],['three',3]])");
                });

                it("matches maps containing the given elements", function () {
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

                    assert($match.map.contains(mapTwo).test(mapOne));
                    assert($match.map.contains(mapThree).test(mapOne));
                    assert.isNotOk($match.map.contains(mapFour).test(mapOne));
                });

                it("fails when maps contain the same keys but different values", function () {
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

                    assert.isNotOk($match.map.contains(mapTwo).test(mapOne));
                    assert.isNotOk($match.map.contains(mapThree).test(mapOne));
                });

                it("fails when passed a non-map object", function () {
                    const contains = $match.map.contains(new Map());
                    assert.isNotOk(contains.test({}));
                    assert.isNotOk(contains.test([]));
                });
            }
        });
    });

    describe(".regexp", function () {
        it("is typeOf regexp matcher", function () {
            const regexp = $match.regexp;

            assert($match.isMatcher(regexp));
            assert.equal(regexp.toString(), "typeOf(\"regexp\")");
        });
    });

    describe(".date", function () {
        it("is typeOf regexp matcher", function () {
            const date = $match.date;

            assert($match.isMatcher(date));
            assert.equal(date.toString(), "typeOf(\"date\")");
        });
    });

    describe(".symbol", function () {
        it("is typeOf symbol matcher", function () {
            const symbol = $match.symbol;

            assert($match.isMatcher(symbol));
            assert.equal(symbol.toString(), "typeOf(\"symbol\")");
        });
    });

    describe(".or", function () {
        it("is matcher", function () {
            const numberOrString = $match.number.or($match.string);

            assert($match.isMatcher(numberOrString));
            assert.equal(numberOrString.toString(),
                          "typeOf(\"number\").or(typeOf(\"string\"))");
        });

        it("requires matcher argument", function () {
            assert.throw(function () {
                $match.instanceOf(Error).or();
            }, TypeError);
        });

        it("will coerce argument to matcher", function () {
            const abcOrDef = $match("abc").or("def");

            assert($match.isMatcher(abcOrDef));
            assert.equal(abcOrDef.toString(),
                          "match(\"abc\").or(match(\"def\"))");
        });

        it("returns true if either matcher matches", function () {
            const numberOrString = $match.number.or($match.string);

            assert(numberOrString.test(123));
            assert(numberOrString.test("abc"));
        });

        it("returns false if neither matcher matches", function () {
            const numberOrAbc = $match.number.or("abc");

            assert.isNotOk(numberOrAbc.test(/.+/));
            assert.isNotOk(numberOrAbc.test(new Date()));
            assert.isNotOk(numberOrAbc.test({}));
        });

        it("can be used with undefined", function () {
            const numberOrUndef = $match.number.or(undefined);

            assert(numberOrUndef.test(123));
            assert(numberOrUndef.test(undefined));
        });
    });

    describe(".and", function () {
        it("is matcher", function () {
            const fooAndBar = $match.has("foo").and($match.has("bar"));

            assert($match.isMatcher(fooAndBar));
            assert.equal(fooAndBar.toString(), "has(\"foo\").and(has(\"bar\"))");
        });

        it("requires matcher argument", function () {
            assert.throw(function () {
                $match.instanceOf(Error).and();
            }, TypeError);
        });

        it("will coerce to matcher", function () {
            const abcOrObj = $match("abc").or({a: 1});

            assert($match.isMatcher(abcOrObj));
            assert.equal(abcOrObj.toString(),
                          "match(\"abc\").or(match(a: 1))");
        });

        it("returns true if both matchers match", function () {
            const fooAndBar = $match.has("foo").and({ bar: "bar" });

            assert(fooAndBar.test({ foo: "foo", bar: "bar" }));
        });

        it("returns false if either matcher does not match", function () {
            const fooAndBar = $match.has("foo").and($match.has("bar"));

            assert.isNotOk(fooAndBar.test({ foo: "foo" }));
            assert.isNotOk(fooAndBar.test({ bar: "bar" }));
        });

        it("can be used with undefined", function () {
            const falsyAndUndefined = $match.falsy.and(undefined);

            assert.isNotOk(falsyAndUndefined.test(false));
            assert(falsyAndUndefined.test(undefined));
        });
    });
});
