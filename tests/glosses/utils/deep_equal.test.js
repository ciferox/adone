describe("glosses", "util", "deepEqual", () => {
    const { util: { deepEqual }, is } = adone;

    describe("genertic", () => {
        describe("strings", () => {

            it("returns true for same values", () => {
                assert(deepEqual("x", "x"), "eql('x', 'x')");
            });

            it("returns true for different instances with same values", () => {
                assert(deepEqual(new String("x"), new String("x")), "eql(new String('x'), new String('x'))");
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual("x", new String("x")) === false, "eql('x', new String('x')) === false");
                assert(deepEqual(new String("x"), "x") === false, "eql(new String('x'), 'x') === false");
            });

            it("returns false for different instances with different values", () => {
                assert(deepEqual(new String("x"), new String("y")) === false,
                    "eql(new String('x'), new String('y')) === false");
            });

            it("returns false for different values", () => {
                assert(deepEqual("x", "y") === false, "eql('x', 'y') === false");
            });

        });

        describe("booleans", () => {

            it("returns true for same values", () => {
                assert(deepEqual(true, true), "eql(true, true)");
            });

            it("returns true for instances with same value", () => {
                assert(deepEqual(new Boolean(true), new Boolean(true)), "eql(new Boolean(true), new Boolean(true))");
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual(true, new Boolean(true)) === false, "eql(true, new Boolean(true)) === false");
            });

            it("returns false for literal vs instance with different values", () => {
                assert(deepEqual(false, new Boolean(true)) === false, "eql(false, new Boolean(true)) === false");
                assert(deepEqual(new Boolean(false), true) === false, "eql(new Boolean(false), true) === false");
            });

            it("returns false for instances with different values", () => {
                assert(deepEqual(new Boolean(false), new Boolean(true)) === false,
                    "eql(new Boolean(false), new Boolean(true)) === false");
                assert(deepEqual(new Boolean(true), new Boolean(false)) === false,
                    "eql(new Boolean(true), new Boolean(false)) === false");
            });

            it("returns false for different values", () => {
                assert(deepEqual(true, false) === false, "eql(true, false) === false");
                assert(deepEqual(true, Boolean(false)) === false, "eql(true, Boolean(false)) === false");
            });

        });

        describe("null", () => {

            it("returns true for two nulls", () => {
                assert(deepEqual(null, null), "eql(null, null)");
            });

            it("returns false for null, undefined", () => {
                assert(deepEqual(null, undefined) === false, "eql(null, undefined) === false");
            });

            it("doesn't crash on weakmap key error (#33)", () => {
                assert(deepEqual({}, null) === false, "eql({}, null) === false");
            });

        });

        describe("undefined", () => {

            it("returns true for two undefineds", () => {
                assert(deepEqual(undefined, undefined), "eql(undefined, undefined)");
            });

            it("returns false for undefined, null", () => {
                assert(deepEqual(undefined, null) === false, "eql(undefined, null) === false");
            });

        });

        describe("numbers", () => {

            it("returns true for same values", () => {
                assert(deepEqual(-0, -0), "eql(-0, -0)");
                assert(deepEqual(+0, +0), "eql(+0, +0)");
                assert(deepEqual(0, 0), "eql(0, 0)");
                assert(deepEqual(1, 1), "eql(1, 1)");
                assert(deepEqual(Infinity, Infinity), "eql(Infinity, Infinity)");
                assert(deepEqual(-Infinity, -Infinity), "eql(-Infinity, -Infinity)");
            });

            it("returns false for literal vs instance with same value", () => {
                assert(deepEqual(1, new Number(1)) === false, "eql(1, new Number(1)) === false");
            });

            it("returns true NaN vs NaN", () => {
                assert(deepEqual(NaN, NaN), "eql(NaN, NaN)");
            });

            it("returns true for NaN instances", () => {
                assert(deepEqual(new Number(NaN), new Number(NaN)), "eql(new Number(NaN), new Number(NaN))");
            });

            it("returns false on numbers with different signs", () => {
                assert(deepEqual(-1, 1) === false, "eql(-1, 1) === false");
                assert(deepEqual(-0, +0) === false, "eql(-0, +0) === false");
                assert(deepEqual(-Infinity, Infinity) === false, "eql(-Infinity, +Infinity) === false");
            });

            it("returns false on instances with different signs", () => {
                assert(deepEqual(new Number(-1), new Number(1)) === false, "eql(new Number(-1), new Number(1)) === false");
                assert(deepEqual(new Number(-0), new Number(+0)) === false, "eql(new Number(-0), new Number(+0)) === false");
                assert(deepEqual(new Number(-Infinity), new Number(Infinity)) === false,
                    "eql(new Number(-Infinity), new Number(+Infinity)) === false");
            });

        });

        describe("dates", () => {

            it("returns true given two dates with the same time", () => {
                const dateA = new Date();
                assert(deepEqual(dateA, new Date(dateA.getTime())), "eql(dateA, new Date(dateA.getTime()))");
            });

            it("returns true given two invalid dates", () => {
                assert(deepEqual(new Date(NaN), new Date(NaN)), "eql(new Date(NaN), new Date(NaN))");
            });

            it("returns false given two dates with the different times", () => {
                const dateA = new Date();
                assert(deepEqual(dateA, new Date(dateA.getTime() + 1)) === false,
                    "eql(dateA, new Date(dateA.getTime() + 1)) === false");
            });

        });

        describe("regexp", () => {

            it("returns true given two regexes with the same source", () => {
                assert(deepEqual(/\s/, /\s/), "eql(/\\s/, /\\s/)");
                assert(deepEqual(/\s/, new RegExp("\\s")), "eql(/\\s/, new RegExp('\\s'))");
            });

            it("returns false given two regexes with different source", () => {
                assert(deepEqual(/^$/, /^/) === false, "eql(/^$/, /^/) === false");
                assert(deepEqual(/^$/, new RegExp("^")) === false, "eql(/^$/, new RegExp('^'))");
            });

            it("returns false given two regexes with different flags", () => {
                assert(deepEqual(/^/m, /^/i) === false, "eql(/^/m, /^/i) === false");
            });

        });

        describe("empty types", () => {

            it("returns true on two empty objects", () => {
                assert(deepEqual({}, {}), "eql({}, {})");
            });

            it("returns true on two empty arrays", () => {
                assert(deepEqual([], []), "eql([], [])");
            });

            it("returns false on different types", () => {
                assert(deepEqual([], {}) === false, "eql([], {}) === false");
            });

        });

        describe("class instances", () => {

            it("returns true given two empty class instances", () => {
                class BaseA { }
                assert(deepEqual(new BaseA(), new BaseA()), "eql(new BaseA(), new BaseA())");
            });

            it("returns true given two class instances with same properties", () => {
                class BaseA {
                    constructor(prop) {
                        this.prop = prop;
                    }
                }
                assert(deepEqual(new BaseA(1), new BaseA(1)), "eql(new BaseA(1), new BaseA(1))");
            });

            it("returns true given two class instances with deeply equal bases", () => {
                class BaseA { }
                class BaseB { }
                BaseA.prototype.foo = { a: 1 };
                BaseB.prototype.foo = { a: 1 };
                assert(deepEqual(new BaseA(), new BaseB()) === true,
                    "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 1 }>) === true");
            });

            it("returns false given two class instances with different properties", () => {
                class BaseA {
                    constructor(prop) {
                        this.prop = prop;
                    }
                }
                assert(deepEqual(new BaseA(1), new BaseA(2)) === false, "eql(new BaseA(1), new BaseA(2)) === false");
            });

            it("returns false given two class instances with deeply unequal bases", () => {
                class BaseA { }
                class BaseB { }
                BaseA.prototype.foo = { a: 1 };
                BaseB.prototype.foo = { a: 2 };
                assert(deepEqual(new BaseA(), new BaseB()) === false,
                    "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 2 }>) === false");
            });

        });

        describe("arguments", () => {
            const getArguments = function () {
                return arguments;  // eslint-disable-line prefer-rest-params
            };

            it("returns true given two arguments", () => {
                const argumentsA = getArguments();
                const argumentsB = getArguments();
                assert(deepEqual(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
            });

            it("returns true given two arguments with same properties", () => {
                const argumentsA = getArguments(1, 2);
                const argumentsB = getArguments(1, 2);
                assert(deepEqual(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
            });

            it("returns false given two arguments with different properties", () => {
                const argumentsA = getArguments(1, 2);
                const argumentsB = getArguments(3, 4);
                assert(deepEqual(argumentsA, argumentsB) === false, "eql(argumentsA, argumentsB) === false");
            });

            it("returns false given an array", function () {
                // eslint-disable-next-line prefer-rest-params
                assert(deepEqual([], arguments) === false, "eql([], arguments) === false");
            });

            it("returns false given an object", function () {
                // eslint-disable-next-line prefer-rest-params
                assert(deepEqual({}, arguments) === false, "eql({}, arguments) === false");
            });

        });

        describe("arrays", () => {

            it("returns true with arrays containing same literals", () => {
                assert(deepEqual([1, 2, 3], [1, 2, 3]), "eql([ 1, 2, 3 ], [ 1, 2, 3 ])");
                assert(deepEqual(["a", "b", "c"], ["a", "b", "c"]), "eql([ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ])");
            });

            it("returns true given literal or constructor", () => {
                // eslint-disable-next-line no-array-constructor
                assert(deepEqual([1, 2, 3], new Array(1, 2, 3)), "eql([ 1, 2, 3 ], new Array(1, 2, 3))");
            });

            it("returns false with arrays containing literals in different order", () => {
                assert(deepEqual([3, 2, 1], [1, 2, 3]) === false, "eql([ 3, 2, 1 ], [ 1, 2, 3 ]) === false");
            });

            it("returns false for arrays of different length", () => {
                assert(deepEqual(new Array(1), new Array(100)) === false, "eql(new Array(1), new Array(100)) === false");
            });

        });

        describe("objects", () => {

            it("returns true with objects containing same literals", () => {
                assert(deepEqual({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }), "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 })");
                assert(deepEqual({ foo: "baz" }, { foo: "baz" }), "eql({ foo: 'baz' }, { foo: 'baz' })");
            });

            it("returns true for deeply nested objects", () => {
                assert(deepEqual({ foo: { bar: "foo" } }, { foo: { bar: "foo" } }),
                    "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'foo' }})");
            });

            it("returns true with objects with same circular reference", () => {
                const objectA = { foo: 1 };
                const objectB = { foo: 1 };
                const objectC = { a: objectA, b: objectB };
                objectA.bar = objectC;
                objectB.bar = objectC;
                assert(deepEqual(objectA, objectB) === true,
                    "eql({ foo: 1, bar: objectC }, { foo: 1, bar: objectC }) === true");
            });

            it("returns true with objects with deeply equal prototypes", () => {
                const objectA = Object.create({ foo: { a: 1 } });
                const objectB = Object.create({ foo: { a: 1 } });
                assert(deepEqual(objectA, objectB) === true,
                    "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 1 } })) === true");
            });

            it("returns false with objects containing different literals", () => {
                assert(deepEqual({ foo: 1, bar: 1 }, { foo: 1, bar: 2 }) === false,
                    "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }) === false");
                assert(deepEqual({ foo: "bar" }, { foo: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
                assert(deepEqual({ foo: { bar: "foo" } }, { foo: { bar: "baz" } }) === false,
                    "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'baz' }}) === false");
            });

            it("returns false with objects containing different keys", () => {
                assert(deepEqual({ foo: 1, bar: 1 }, { foo: 1, baz: 2 }) === false,
                    "eql({ foo: 1, bar: 2 }, { foo: 1, baz: 2 }) === false");
                assert(deepEqual({ foo: "bar" }, { bar: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
            });

            it("returns true with circular objects", () => {
                const objectA = { foo: 1 };
                const objectB = { foo: 1 };
                objectA.bar = objectB;
                objectB.bar = objectA;
                assert(deepEqual(objectA, objectB) === true,
                    "eql({ foo: 1, bar: -> }, { foo: 1, bar: <- }) === true");
            });

            it("returns false with objects with deeply unequal prototypes", () => {
                const objectA = Object.create({ foo: { a: 1 } });
                const objectB = Object.create({ foo: { a: 2 } });
                assert(deepEqual(objectA, objectB) === false,
                    "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 2 } })) === false");
            });

        });

        describe("functions", () => {

            it("returns true for same functions", () => {
                const foo = () => { };
                assert(deepEqual(foo, foo), "eql(function foo() {}, function foo() {})");
            });

            it("returns false for different functions", () => {
                assert(deepEqual(function foo() { }, function bar() { }) === false,
                    "eql(function foo() {}, function bar() {}) === false");
            });

        });

        describe("errors", () => {

            it("returns true for same errors", () => {
                const error = new Error("foo");
                assert(deepEqual(error, error), "eql(error, error)");
            });

            it("returns false for different errors", () => {
                assert(deepEqual(new Error("foo"), new Error("foo")) === false,
                    "eql(new Error('foo'), new Error('foo')) === false");
            });

        });

    });

    describe("Node Specific", () => {

        describe("buffers", () => {

            it("returns true for same buffers", () => {
                assert(deepEqual(new Buffer([1]), new Buffer([1])) === true,
                    "eql(new Buffer([ 1 ]), new Buffer([ 1 ])) === true");
            });

            it("returns false for different buffers", () => {
                assert(deepEqual(new Buffer([1]), new Buffer([2])) === false,
                    "eql(new Buffer([ 1 ]), new Buffer([ 2 ])) === false");
            });

        });

    });

    describe("Memoize", () => {

        it("returns true if MemoizeMap says so", () => {
            const memoizeMap = new WeakMap();
            const valueAMap = new WeakMap();
            const valueA = {};
            const valueB = { not: "equal" };
            valueAMap.set(valueB, true);
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === true,
                "eql({}, {not:'equal'}, <memoizeMap>) === true");
        });

        it("returns false if MemoizeMap says so", () => {
            const memoizeMap = new WeakMap();
            const valueAMap = new WeakMap();
            const valueA = {};
            const valueB = {};
            valueAMap.set(valueB, false);
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === false,
                "eql({}, {}, <memoizeMap>) === false");
        });

        it("resorts to default behaviour if MemoizeMap has no answer (same objects)", () => {
            const memoizeMap = new WeakMap();
            const valueAMap = new WeakMap();
            const valueA = {};
            const valueB = {};
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === true,
                "eql({}, {}, <memoizeMap>) === true");
        });

        it("resorts to default behaviour if MemoizeMap has no answer (different objects)", () => {
            const memoizeMap = new WeakMap();
            const valueAMap = new WeakMap();
            const valueA = {};
            const valueB = { not: "equal" };
            memoizeMap.set(valueA, valueAMap);
            assert(deepEqual(valueA, valueB, { memoize: memoizeMap }) === false,
                "eql({}, {}, <memoizeMap>) === false");
        });

    });

    describe("Comparator", () => {
        const specialComparator = (left, right) => {
            return left["@@specialValue"] === right["@@specialValue"];
        };
        class Matcher {
            constructor(func) {
                this.func = func;
            }
        }
        const matcherComparator = (left, right) => {
            if (left instanceof Matcher) {
                return left.func(right);
            } else if (right instanceof Matcher) {
                return right.func(left);
            }
            return null;
        };
        const falseComparator = () => false;
        const nullComparator = () => null;

        it("returns true if Comparator says so", () => {
            const valueA = { "@@specialValue": 1, a: 1 };
            const valueB = { "@@specialValue": 1, a: 2 };
            assert(deepEqual(valueA, valueB, { comparator: specialComparator }) === true,
                "eql({@@specialValue:1,a:1}, {@@specialValue:1,a:2}, <comparator>) === true");
        });

        it("returns true if Comparator says so even on primitives", () => {
            const valueA = {
                a: new Matcher(is.number)
            };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: matcherComparator }) === true,
                "eql({a:value => typeof value === 'number'}, {a:1}, <comparator>) === true");
        });

        it("returns true if Comparator says so even on primitives (switch arg order)", () => {
            const valueA = { a: 1 };
            const valueB = {
                a: new Matcher(is.number)
            };
            assert(deepEqual(valueA, valueB, { comparator: matcherComparator }) === true,
                "eql({a:1}, {a:value => typeof value === 'number'}, <comparator>) === true");
        });

        it("returns true if Comparator says so (deep-equality)", () => {
            const valueA = { a: { "@@specialValue": 1, a: 1 }, b: 1 };
            const valueB = { a: { "@@specialValue": 1, a: 2 }, b: 1 };
            assert(deepEqual(valueA, valueB, { comparator: specialComparator }) === true,
                "eql({a:{@@specialValue:1,a:1},b:1}, {a:{@@specialValue:2,a:2},b:1}, <comparator>) === true");
        });

        it("returns false if Comparator returns false (same objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: falseComparator }) === false,
                "eql({}, {}, <falseComparator>) === false");
        });

        it("resorts to deep-eql if Comparator returns null (same objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 1 };
            assert(deepEqual(valueA, valueB, { comparator: nullComparator }) === true,
                "eql({}, {}, <nullComparator>) === true");
        });

        it("resorts to deep-eql behaviour if Comparator returns null (different objects)", () => {
            const valueA = { a: 1 };
            const valueB = { a: 2 };
            assert(deepEqual(valueA, valueB, { comparator: nullComparator }) === false,
                "eql({}, {}, <nullComparator>) === false");
        });

    });
});
