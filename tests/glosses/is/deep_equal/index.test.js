const {
    is
} = adone;
const { deepEqual } = is;
const { MemoizeMap } = deepEqual;

const describeIf = (condition) => condition ? describe : describe.skip;

describe("is", "deepEqual", () => {
    describe("Generic", () => {

        describe("strings", () => {

            it("returns true for same values", () => {
                assert(deepEqual("x", "x"), 'deepEqual("x", "x")');
            });

            it("returns true for different instances with same values", () => {
                assert(deepEqual(new String("x"), new String("x")), 'deepEqual(new String("x"), new String("x"))');
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual("x", new String("x")) === false, 'deepEqual("x", new String("x")) === false');
                assert(deepEqual(new String("x"), "x") === false, 'deepEqual(new String("x"), "x") === false');
            });

            it("returns false for different instances with different values", () => {
                assert(deepEqual(new String("x"), new String("y")) === false,
                    'deepEqual(new String("x"), new String("y")) === false');
            });

            it("returns false for different values", () => {
                assert(deepEqual("x", "y") === false, 'deepEqual("x", "y") === false');
            });

        });

        describe("booleans", () => {

            it("returns true for same values", () => {
                assert(deepEqual(true, true), "deepEqual(true, true)");
            });

            it("returns true for instances with same value", () => {
                assert(deepEqual(new Boolean(true), new Boolean(true)), "deepEqual(new Boolean(true), new Boolean(true))");
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual(true, new Boolean(true)) === false, "deepEqual(true, new Boolean(true)) === false");
            });

            it("returns false for literal vs instance with different values", () => {
                assert(deepEqual(false, new Boolean(true)) === false, "deepEqual(false, new Boolean(true)) === false");
                assert(deepEqual(new Boolean(false), true) === false, "deepEqual(new Boolean(false), true) === false");
            });

            it("returns false for instances with different values", () => {
                assert(deepEqual(new Boolean(false), new Boolean(true)) === false,
                    "deepEqual(new Boolean(false), new Boolean(true)) === false");
                assert(deepEqual(new Boolean(true), new Boolean(false)) === false,
                    "deepEqual(new Boolean(true), new Boolean(false)) === false");
            });

            it("returns false for different values", () => {
                assert(deepEqual(true, false) === false, "deepEqual(true, false) === false");
                assert(deepEqual(true, Boolean(false)) === false, "deepEqual(true, Boolean(false)) === false");
            });

        });

        describe("null", () => {

            it("returns true for two nulls", () => {
                assert(deepEqual(null, null), "deepEqual(null, null)");
            });

            it("returns false for null, undefined", () => {
                assert(deepEqual(null, undefined) === false, "deepEqual(null, undefined) === false");
            });

            it("doesn't crash on weakmap key error (#33)", () => {
                assert(deepEqual({}, null) === false, "deepEqual({}, null) === false");
            });

        });

        describe("undefined", () => {

            it("returns true for two undefineds", () => {
                assert(deepEqual(undefined, undefined), "deepEqual(undefined, undefined)");
            });

            it("returns false for undefined, null", () => {
                assert(deepEqual(undefined, null) === false, "deepEqual(undefined, null) === false");
            });

        });

        describe("numbers", () => {

            it("returns true for same values", () => {
                assert(deepEqual(-0, -0), "deepEqual(-0, -0)");
                assert(deepEqual(+0, +0), "deepEqual(+0, +0)");
                assert(deepEqual(0, 0), "deepEqual(0, 0)");
                assert(deepEqual(1, 1), "deepEqual(1, 1)");
                assert(deepEqual(Infinity, Infinity), "deepEqual(Infinity, Infinity)");
                assert(deepEqual(-Infinity, -Infinity), "deepEqual(-Infinity, -Infinity)");
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual(1, new Number(1)) === false, "deepEqual(1, new Number(1)) === false");
            });

            it("returns true NaN vs NaN", () => {
                assert(deepEqual(NaN, NaN), "deepEqual(NaN, NaN)");
            });

            it("returns true for NaN instances", () => {
                assert(deepEqual(new Number(NaN), new Number(NaN)), "deepEqual(new Number(NaN), new Number(NaN))");
            });

            it("returns false on numbers with different signs", () => {
                assert(deepEqual(-1, 1) === false, "deepEqual(-1, 1) === false");
                assert(deepEqual(-0, +0) === false, "deepEqual(-0, +0) === false");
                assert(deepEqual(-Infinity, Infinity) === false, "deepEqual(-Infinity, +Infinity) === false");
            });

            it("returns false on instances with different signs", () => {
                assert(deepEqual(new Number(-1), new Number(1)) === false, "deepEqual(new Number(-1), new Number(1)) === false");
                assert(deepEqual(new Number(-0), new Number(+0)) === false, "deepEqual(new Number(-0), new Number(+0)) === false");
                assert(deepEqual(new Number(-Infinity), new Number(Infinity)) === false,
                    "deepEqual(new Number(-Infinity), new Number(+Infinity)) === false");
            });

        });

        describe("dates", () => {

            it("returns true given two dates with the same time", () => {
                const dateA = new Date();
                assert(deepEqual(dateA, new Date(dateA.getTime())), "deepEqual(dateA, new Date(dateA.getTime()))");
            });

            it("returns true given two invalid dates", () => {
                assert(deepEqual(new Date(NaN), new Date(NaN)), "deepEqual(new Date(NaN), new Date(NaN))");
            });

            it("returns false given two dates with the different times", () => {
                const dateA = new Date();
                assert(deepEqual(dateA, new Date(dateA.getTime() + 1)) === false,
                    "deepEqual(dateA, new Date(dateA.getTime() + 1)) === false");
            });

        });

        describe("regexp", () => {

            it("returns true given two regexes with the same source", () => {
                assert(deepEqual(/\s/, /\s/), "deepEqual(/\\s/, /\\s/)");
                assert(deepEqual(/\s/, new RegExp("\\s")), 'deepEqual(/\\s/, new RegExp("\\s"))');
            });

            it("returns false given two regexes with different source", () => {
                assert(deepEqual(/^$/, /^/) === false, "deepEqual(/^$/, /^/) === false");
                assert(deepEqual(/^$/, new RegExp("^")) === false, 'deepEqual(/^$/, new RegExp("^"))');
            });

            it("returns false given two regexes with different flags", () => {
                assert(deepEqual(/^/m, /^/i) === false, "deepEqual(/^/m, /^/i) === false");
            });

        });

        describe("empty types", () => {

            it("returns true on two empty objects", () => {
                assert(deepEqual({}, {}), "deepEqual({}, {})");
            });

            it("returns true on two empty arrays", () => {
                assert(deepEqual([], []), "deepEqual([], [])");
            });

            it("returns false on different types", () => {
                assert(deepEqual([], {}) === false, "deepEqual([], {}) === false");
            });

        });

        describe("class instances", () => {

            it("returns true given two empty class instances", () => {
                function BaseA() { }
                assert(deepEqual(new BaseA(), new BaseA()), "deepEqual(new BaseA(), new BaseA())");
            });

            it("returns true given two class instances with same properties", () => {
                function BaseA(prop) {
                    this.prop = prop;
                }
                assert(deepEqual(new BaseA(1), new BaseA(1)), "deepEqual(new BaseA(1), new BaseA(1))");
            });

            it("returns true given two class instances with deeply equal bases", () => {
                function BaseA() { }
                function BaseB() { }
                BaseA.prototype.foo = { a: 1 };
                BaseB.prototype.foo = { a: 1 };
                assert(deepEqual(new BaseA(), new BaseB()) === true,
                    "deepEqual(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 1 }>) === true");
            });

            it("returns false given two class instances with different properties", () => {
                function BaseA(prop) {
                    this.prop = prop;
                }
                assert(deepEqual(new BaseA(1), new BaseA(2)) === false, "deepEqual(new BaseA(1), new BaseA(2)) === false");
            });

            it("returns false given two class instances with deeply unequal bases", () => {
                function BaseA() { }
                function BaseB() { }
                BaseA.prototype.foo = { a: 1 };
                BaseB.prototype.foo = { a: 2 };
                assert(deepEqual(new BaseA(), new BaseB()) === false,
                    "deepEqual(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 2 }>) === false");
            });

        });

        describe("arguments", () => {
            function getArguments() {
                return arguments;
            }

            it("returns true given two arguments", () => {
                const argumentsA = getArguments();
                const argumentsB = getArguments();
                assert(deepEqual(argumentsA, argumentsB), "deepEqual(argumentsA, argumentsB)");
            });

            it("returns true given two arguments with same properties", () => {
                const argumentsA = getArguments(1, 2);
                const argumentsB = getArguments(1, 2);
                assert(deepEqual(argumentsA, argumentsB), "deepEqual(argumentsA, argumentsB)");
            });

            it("returns false given two arguments with different properties", () => {
                const argumentsA = getArguments(1, 2);
                const argumentsB = getArguments(3, 4);
                assert(deepEqual(argumentsA, argumentsB) === false, "deepEqual(argumentsA, argumentsB) === false");
            });

            it("returns false given an array", function () {
                assert(deepEqual([], arguments) === false, "deepEqual([], arguments) === false");
            });

            it("returns false given an object", function () {
                assert(deepEqual({}, arguments) === false, "deepEqual({}, arguments) === false");
            });

        });

        describe("arrays", () => {

            it("returns true with arrays containing same literals", () => {
                assert(deepEqual([1, 2, 3], [1, 2, 3]), "deepEqual([ 1, 2, 3 ], [ 1, 2, 3 ])");
                assert(deepEqual(["a", "b", "c"], ["a", "b", "c"]), 'deepEqual([ "a", "b", "c" ], [ "a", "b", "c" ])');
            });

            it("returns true given literal or constructor", () => {
                assert(deepEqual([1, 2, 3], new Array(1, 2, 3)), "deepEqual([ 1, 2, 3 ], new Array(1, 2, 3))");
            });

            it("returns false with arrays containing literals in different order", () => {
                assert(deepEqual([3, 2, 1], [1, 2, 3]) === false, "deepEqual([ 3, 2, 1 ], [ 1, 2, 3 ]) === false");
            });

            it("returns false for arrays of different length", () => {
                assert(deepEqual(new Array(1), new Array(100)) === false, "deepEqual(new Array(1), new Array(100)) === false");
            });

        });

        describe("objects", () => {

            it("returns true with objects containing same literals", () => {
                assert(deepEqual({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }), "deepEqual({ foo: 1, bar: 2 }, { foo: 1, bar: 2 })");
                assert(deepEqual({ foo: "baz" }, { foo: "baz" }), 'deepEqual({ foo: "baz" }, { foo: "baz" })');
            });

            it("returns true for deeply nested objects", () => {
                assert(deepEqual({ foo: { bar: "foo" } }, { foo: { bar: "foo" } }),
                    'deepEqual({ foo: { bar: "foo" }}, { foo: { bar: "foo" }})');
            });

            it("returns true with objects with same circular reference", () => {
                const objectA = { foo: 1 };
                const objectB = { foo: 1 };
                const objectC = { a: objectA, b: objectB };
                objectA.bar = objectC;
                objectB.bar = objectC;
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual({ foo: 1, bar: objectC }, { foo: 1, bar: objectC }) === true");
            });

            it("returns true with objects with deeply equal prototypes", () => {
                const objectA = Object.create({ foo: { a: 1 } });
                const objectB = Object.create({ foo: { a: 1 } });
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 1 } })) === true");
            });

            it("returns false with objects containing different literals", () => {
                assert(deepEqual({ foo: 1, bar: 1 }, { foo: 1, bar: 2 }) === false,
                    "deepEqual({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }) === false");
                assert(deepEqual({ foo: "bar" }, { foo: "baz" }) === false, 'deepEqual({ foo: "bar" }, { foo: "baz" }) === false');
                assert(deepEqual({ foo: { bar: "foo" } }, { foo: { bar: "baz" } }) === false,
                    'deepEqual({ foo: { bar: "foo" }}, { foo: { bar: "baz" }}) === false');
            });

            it("returns false with objects containing different keys", () => {
                assert(deepEqual({ foo: 1, bar: 1 }, { foo: 1, baz: 2 }) === false,
                    "deepEqual({ foo: 1, bar: 2 }, { foo: 1, baz: 2 }) === false");
                assert(deepEqual({ foo: "bar" }, { bar: "baz" }) === false, 'deepEqual({ foo: "bar" }, { foo: "baz" }) === false');
            });

            it("returns true with circular objects", () => {
                const objectA = { foo: 1 };
                const objectB = { foo: 1 };
                objectA.bar = objectB;
                objectB.bar = objectA;
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual({ foo: 1, bar: -> }, { foo: 1, bar: <- }) === true");
            });

            it("returns true with non-extensible objects", () => {
                const objectA = Object.preventExtensions({ foo: 1 });
                const objectB = Object.preventExtensions({ foo: 1 });
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual(Object.preventExtensions({ foo: 1 }), Object.preventExtensions({ foo: 1 })) === true");
            });

            it("returns true with sealed objects", () => {
                const objectA = Object.seal({ foo: 1 });
                const objectB = Object.seal({ foo: 1 });
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual(Object.seal({ foo: 1 }), Object.seal({ foo: 1 })) === true");
            });

            it("returns true with frozen objects", () => {
                const objectA = Object.freeze({ foo: 1 });
                const objectB = Object.freeze({ foo: 1 });
                assert(deepEqual(objectA, objectB) === true,
                    "deepEqual(Object.freeze({ foo: 1 }), Object.freeze({ foo: 1 })) === true");
            });

            it("returns false with objects with deeply unequal prototypes", () => {
                const objectA = Object.create({ foo: { a: 1 } });
                const objectB = Object.create({ foo: { a: 2 } });
                assert(deepEqual(objectA, objectB) === false,
                    "deepEqual(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 2 } })) === false");
            });

        });

        describe("functions", () => {

            it("returns true for same functions", () => {
                function foo() { }
                assert(deepEqual(foo, foo), "deepEqual(function foo() {}, function foo() {})");
            });

            it("returns false for different functions", () => {
                assert(deepEqual(function foo() { }, function bar() { }) === false,
                    "deepEqual(function foo() {}, function bar() {}) === false");
            });

        });

        describe("errors", () => {

            it("returns true for same errors", () => {
                const error = Error("foo");
                assert(deepEqual(error, error), "deepEqual(error, error)");
            });

            it("returns true for errors with same name and message", () => {
                assert(deepEqual(Error("foo"), Error("foo")),
                    'deepEqual(Error("foo"), Error("foo"))');
            });

            it("returns true for errors with same name and message despite different constructors", () => {
                const err1 = Error("foo");
                const err2 = TypeError("foo");
                err2.name = "Error";
                assert(deepEqual(err1, err2),
                    'deepEqual(Error("foo"), Object.assign(TypeError("foo"), { name: "Error" }))');
            });

            it("returns false for errors with same name but different messages", () => {
                assert(deepEqual(Error("foo"), Error("bar")) === false,
                    'deepEqual(Error("foo"), Error("bar")) === false');
            });

            it("returns false for errors with same message but different names", () => {
                assert(deepEqual(Error("foo"), TypeError("foo")) === false,
                    'deepEqual(Error("foo"), TypeError("foo")) === false');
            });

            it("returns false for errors with same message but different names despite same constructors", () => {
                const err1 = Error("foo");
                const err2 = Error("foo");
                err2.name = "TypeError";
                assert(deepEqual(err1, err2) === false,
                    'deepEqual(Error("foo"), Object.assign(Error("foo"), { name: "TypeError" })) === false');
            });

            it("returns true for errors with same code", () => {
                const err1 = Error("foo");
                const err2 = Error("foo");
                err1.code = 42;
                err2.code = 42;
                assert(deepEqual(err1, err2),
                    'deepEqual(Object.assign(Error("foo"), { code: 42 }), Object.assign(Error("foo"), { code: 42 }))');
            });

            it("returns false for errors with different code", () => {
                const err1 = Error("foo");
                const err2 = Error("foo");
                err1.code = 42;
                err2.code = 13;
                assert(deepEqual(err1, err2) === false,
                    'deepEqual(Object.assign(new Error("foo"), { code: 42 }), Object.assign(new Error("foo"), { code: 13 })) === false');
            });

            it("returns true for errors with same name and message despite different otherProp", () => {
                const err1 = Error("foo");
                const err2 = Error("foo");
                err1.otherProp = 42;
                err2.otherProp = 13;
                assert(deepEqual(err1, err2),
                    'deepEqual(Object.assign(Error("foo"), { otherProp: 42 }), Object.assign(Error("foo"), { otherProp: 13 }))');
            });

        });

    });

    describe("Node Specific", () => {

        describeIf(is.function(Buffer))("buffers", () => {

            it("returns true for same buffers", () => {
                assert(deepEqual(Buffer.from([1]), Buffer.from([1])) === true,
                    "deepEqual(Buffer.from([ 1 ]), Buffer.from([ 1 ])) === true");
            });

            it("returns false for different buffers", () => {
                assert(deepEqual(Buffer.from([1]), Buffer.from([2])) === false,
                    "deepEqual(Buffer.from([ 1 ]), Buffer.from([ 2 ])) === false");
            });

        });

    });

    describe("Memoize", () => {

        it("returns true if MemoizeMap says so", () => {
            const memoizeMap = new MemoizeMap();
            const valueAMap = new MemoizeMap();
            const valueA = {};
            const valueB = { not: "equal" };
            valueAMap.set(valueB, true);
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === true,
                'deepEqual({}, {not:"equal"}, <memoizeMap>) === true');
        });

        it("returns false if MemoizeMap says so", () => {
            const memoizeMap = new MemoizeMap();
            const valueAMap = new MemoizeMap();
            const valueA = {};
            const valueB = {};
            valueAMap.set(valueB, false);
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === false,
                "deepEqual({}, {}, <memoizeMap>) === false");
        });

        it("resorts to default behaviour if MemoizeMap has no answer (same objects)", () => {
            const memoizeMap = new MemoizeMap();
            const valueAMap = new MemoizeMap();
            const valueA = {};
            const valueB = {};
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === true,
                "deepEqual({}, {}, <memoizeMap>) === true");
        });

        it("resorts to default behaviour if MemoizeMap has no answer (different objects)", () => {
            const memoizeMap = new MemoizeMap();
            const valueAMap = new MemoizeMap();
            const valueA = {};
            const valueB = { not: "equal" };
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === false,
                "deepEqual({}, {}, <memoizeMap>) === false");
        });

    });

    describe("Comparator", () => {
        function specialComparator(left, right) {
            return left["@@specialValue"] === right["@@specialValue"];
        }
        function Matcher(func) {
            this.func = func;
        }
        function matcherComparator(left, right) {
            if (left instanceof Matcher) {
                return left.func(right);
            } else if (right instanceof Matcher) {
                return right.func(left);
            }
            return null;
        }
        function falseComparator() {
            return false;
        }
        function nullComparator() {
            return null;
        }

        it("returns true if Comparator says so", () => {
            const valueA = { "@@specialValue": 1, a: 1 };
            const valueB = { "@@specialValue": 1, a: 2 };
            assert(deepEqual(valueA, valueB, { comparator: specialComparator }) === true,
                "deepEqual({@@specialValue:1,a:1}, {@@specialValue:1,a:2}, <comparator>) === true");
        });

        it("returns true if Comparator says so even on primitives", () => {
            const valueA = {
                a: new Matcher(((value) => {
                    return is.number(value);
                }))
            };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: matcherComparator }) === true,
                'deepEqual({a:value => typeof value === "number"}, {a:1}, <comparator>) === true');
        });

        it("returns true if Comparator says so even on primitives (switch arg order)", () => {
            const valueA = { a: 1 };
            const valueB = {
                a: new Matcher(((value) => {
                    return is.number(value);
                }))
            };
            assert(deepEqual(valueA, valueB, { comparator: matcherComparator }) === true,
                'deepEqual({a:1}, {a:value => typeof value === "number"}, <comparator>) === true');
        });

        it("returns true if Comparator says so (deep-equality)", () => {
            const valueA = { a: { "@@specialValue": 1, a: 1 }, b: 1 };
            const valueB = { a: { "@@specialValue": 1, a: 2 }, b: 1 };
            assert(deepEqual(valueA, valueB, { comparator: specialComparator }) === true,
                "deepEqual({a:{@@specialValue:1,a:1},b:1}, {a:{@@specialValue:2,a:2},b:1}, <comparator>) === true");
        });

        it("returns false if Comparator returns false (same objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: falseComparator }) === false,
                "deepEqual({}, {}, <falseComparator>) === false");
        });

        it("resorts to deep-deepEqual if Comparator returns null (same objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: nullComparator }) === true,
                "deepEqual({}, {}, <nullComparator>) === true");
        });

        it("resorts to deep-deepEqual behaviour if Comparator returns null (different objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 2 };
            assert(deepEqual(valueA, valueB, { comparator: nullComparator }) === false,
                "deepEqual({}, {}, <nullComparator>) === false");
        });

    });
});