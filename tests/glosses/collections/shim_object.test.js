/*
    Based in part on extras from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

require("../../../lib/glosses/collections/shim");
const { Set, Dict } = adone.collection;

describe("Object", function () {

    it("should have no enumerable properties", function () {
        expect(Object.keys(Object.prototype)).to.be.eql([]);
    });

    describe("empty", function () {

        it("should own no properties", function () {
            expect(Object.getOwnPropertyNames(Object.empty)).to.be.eql([]);
            expect(Object.keys(Object.empty)).to.be.eql([]);
        });

        it("should have no prototype", function () {
            expect(Object.getPrototypeOf(Object.empty)).to.be.null;
        });

        it("should be immutable", function () {
            "strict mode";
            expect(function () {
                Object.empty.a = 10; // should throw an error in strict mode
                if (Object.empty.a !== 10) {
                    throw new Error("Unchanged");
                }
            }).to.throw();
        });

    });

    describe("isObject", function () {

        [
            ["null is not an object", null, false],
            ["numbers are not objects", 1, false],
            ["undefined is not an object", undefined, false],
            ["arrays are objects", [], true],
            ["object literals are objects", {}, true],
            [
                "pure objects (null prototype) are",
                Object.create(null),
                true
            ]
        ].forEach(function (test) {
            it("should recognize that " + test[0], function () {
                expect(Object.isObject(test[1])).to.be.eql(test[2]);
            });
        });

    });

    describe("getValueOf", function () {
        const fakeNumber = Object.create({
            valueOf: function () {
                return 10;
            }
        });

        const object = {valueOf: 10};
        const tests = [
            [10, 10, "number"],
            [object, object, "object (identical, with misleading owned property)"],
            [new Number(20), 20, "boxed number"],
            [fakeNumber, 10, "fake number"]
        ];

        tests.forEach(function (test) {
            it(test[2], function () {
                expect(Object.getValueOf(test[0])).to.be.equal(test[1]);
            });
        });

    });

    describe("owns", function () {

        it("should recognized an owned property", function () {
            expect(Object.owns({a: 0}, "a")).to.be.eql(true);
        });

        it("should distinguish an inherited property", function () {
            expect(Object.owns(Object.prototype, "toString")).to.be.eql(true);
        });

    });

    describe("has", function () {

        it("should recognized an owned property", function () {
            expect(Object.has({toString: true}, "toString")).to.be.eql(true);
        });

        it("should recognize an inherited propertry", function () {
            const parent = {"a": 10};
            const child = Object.create(parent);
            expect(Object.has(child, "a")).to.be.eql(true);
        });

        it("should distinguish a property from the Object prototype", function () {
            expect(Object.has({}, "toString")).to.be.eql(false);
        });

        it("should recognize a property on a null prototype chain", function () {
            const parent = Object.create(null);
            parent.a = 10;
            const child = Object.create(parent);
            expect(Object.has(child, "a")).to.be.eql(true);
        });

        it("should recognize a falsy property", function () {
            expect(Object.has({a: 0}, "a")).to.be.eql(true);
        });

        it("should throw an error if the first argument is not an object", function () {
            expect(function () {
                Object.has(10, 10);
            }).to.throw();
        });

        it("should delegate to a prototype method", function () {
            const Type = Object.create(Object.prototype, {
                has: {
                    value: function (key) {
                        return key === "a";
                    }
                }
            });
            const instance = Object.create(Type);
            expect(Object.has(instance, "a")).to.be.eql(true);
            expect(Object.has(instance, "toString")).to.be.eql(false);
        });

        it("should delegate to a set", function () {
            const set = new Set([1, 2, 3]);
            expect(Object.has(set, 2)).to.be.eql(true);
            expect(Object.has(set, 4)).to.be.eql(false);
            expect(Object.has(set, "toString")).to.be.eql(false);
        });

    });

    describe("get", function () {

        it("should get an owned property from an object literal", function () {
            expect(Object.get({a: 10}, "a")).to.be.eql(10);
        });

        it("should not get a property from the Object prototype on a literal", function () {
            expect(Object.get({}, "toString")).to.be.eql(undefined);
        });

        it("should delegate to a prototype method", function () {
            const Type = Object.create(Object.prototype, {
                get: {
                    value: function (key) {
                        if (key === "a")
                            return 10;
                    }
                }
            });
            const instance = Object.create(Type);
            expect(Object.get(instance, "a")).to.be.eql(10);
        });

        it("should not delegate to an owned 'get' method", function () {
            expect(Object.get({get: 10}, "get")).to.be.eql(10);
        });

        it("should fallback to a default argument if defined", function () {
            expect(Object.get({}, "toString", 10)).to.be.eql(10);
        });

    });

    describe("set", function () {

        it("should set a property", function () {
            const object = {};
            Object.set(object, "set", 10);
            expect(Object.get(object, "set")).to.be.eql(10);
        });

        // it("should delegate to a 'set' method", function () {
        //     var spy = jasmine.createSpy();
        //     var Type = Object.create(Object.prototype, {
        //         set: {
        //             value: spy
        //         }
        //     });
        //     var instance = Object.create(Type);
        //     Object.set(instance, "a", 10);
        //     expect(spy.argsForCall).to.be.eql([
        //         ["a", 10]
        //     ]);
        // });

    });

    describe("forEach", function () {

        // it("should iterate the owned properties of an object", function () {
        //     var spy = jasmine.createSpy();
        //     var object = {a: 10, b: 20, c: 30};
        //     Object.forEach(object, spy);
        //     expect(spy.argsForCall).to.be.eql([
        //         [10, "a", object],
        //         [20, "b", object],
        //         [30, "c", object]
        //     ]);
        // });

        it("should pass a thisp into the callback", function () {
            let thisp = {};
            Object.forEach([1], function (value, key, object) {
                expect(this).to.be.equal(thisp);
                expect(value).to.be.eql(1);
                expect(key).to.be.eql("0");
                expect(object).to.be.eql([1]);
                thisp = null;
            }, thisp);
            expect(thisp).to.be.eql(null);
        });

    });

    describe("map", function () {

        it("should iterate the owned properties of an object with a context thisp", function () {
            const object = {a: 10, b: 20};
            const result = Object.map(object, function (value, key, o) {
                expect(o).to.be.equal(object);
                return key + this + value;
            }, ": ").join(", ");
            expect(result).to.be.eql("a: 10, b: 20");
        });

    });

    describe("values", function () {

        it("should produce the values for owned properties", function () {
            expect(Object.values({b: 10, a: 20})).to.be.eql([10, 20]);
        });

    });

    describe("concat", function () {

        it("should merge objects into a new object", function () {
            expect(Object.concat({a: 10}, {b: 20})).to.be.eql({a: 10, b: 20});
        });

        it("should prioritize latter objects", function () {
            expect(Object.concat({a: 10}, {a: 20})).to.be.eql({a: 20});
        });

        it("should delegate to arrays", function () {
            expect(Object.concat({a: 10, b: 20}, [["c", 30]])).to.be.eql({a: 10, b: 20, c: 30});
        });

        it("should delegate to maps", function () {
            expect(Object.concat({a: 10, b: 20}, Dict({c: 30}))).to.be.eql({a: 10, b: 20, c: 30});
        });

    });

    describe("is", function () {

        const distinctValues = {
            "positive zero": 0,
            "negative zero": -0,
            "positive infinity": 1/0,
            "negative infinity": -1/0,
            "one": 1,
            "two": 2,
            "NaN": NaN,
            "objects": {},
            "other objects": {}
        };

        Object.forEach(distinctValues, function (a, ai) {
            Object.forEach(distinctValues, function (b, bi) {
                if (ai < bi)
                    return;
                const operation = ai === bi ? "recognizes" : "distinguishes";
                it(operation + " " + ai + " and " + bi, function () {
                    expect(Object.is(a, b)).to.be.eql(ai === bi);
                });
            });
        });

    });

    describe("equals", function () {
        const fakeNumber = {
            valueOf: function () {
                return 10;
            }
        };
        const equatable = {
            value: 10,
            clone: function () {
                return this;
            },
            equals: function (n) {
                return n === 10 || typeof n === "object" && n !== null && n.value === 10;
            }
        };

        const equivalenceClasses = [
            {
                "unboxed number": 10,
                "boxed number": new Number(10),
                "faked number": fakeNumber,
                "equatable": equatable
            },
            {
                "array": [10],
                "other array": [10]
            },
            {
                "nested array": [[10, 20], [30, 40]]
            },
            {
                "object": {a: 10},
                "other object": {a: 10}
            },
            {
                "now": new Date()
            },
            {
                "NaN": NaN
            },
            {
                "undefined": undefined
            },
            {
                "null": null
            }
        ];

        // positives:
        // everything should be equal to every other thing in
        // its equivalence class
        equivalenceClasses.forEach(function (equivalenceClass) {
            Object.forEach(equivalenceClass, function (a, ai) {
                equivalenceClass[ai + " clone"] = Object.clone(a);
            });
            // within each pair of class, test exhaustive combinations to cover
            // the commutative property
            Object.forEach(equivalenceClass, function (a, ai) {
                Object.forEach(equivalenceClass, function (b, bi) {
                    it(": " + ai + " equals " + bi, function () {
                        expect(Object.equals(a, b)).to.be.equal(true);
                    });
                });
            });
        });

        // negatives
        // everything from one equivalence class should not equal
        // any other thing from a different equivalence class
        equivalenceClasses.forEach(function (aClass, aClassIndex) {
            equivalenceClasses.forEach(function (bClass, bClassIndex) {
                // only compare each respective class against another once (>),
                // and not for equivalence classes to themselves (==).
                // This cuts the bottom right triangle below the diagonal out
                // of the test matrix of equivalence classes.
                if (aClassIndex >= bClassIndex)
                    return;
                // but within each pair of classes, test exhaustive
                // combinations to cover the commutative property
                Object.forEach(aClass, function (a, ai) {
                    Object.forEach(bClass, function (b, bi) {
                        it(ai + " not equals " + bi, function () {
                            expect(Object.equals(a, b)).to.be.equal(false);
                        });
                    });
                });
            });
        });

    });

    describe("compare", function () {

        const fakeOne = Object.create({
            valueOf: function () {
                return 1;
            }
        });

        const comparable = Object.create({
            create: function (compare) {
                const self = Object.create(this);
                self._compare = compare;
                return self;
            },
            compare: function (other) {
                return this._compare(other);
            }
        });

        const now = new Date();

        const tests = [
            [0, 0, 0],
            [0, 1, -1],
            [1, 0, 1],
            [[10], [10], 0],
            [[10], [20], -10],
            [[100, 10], [100, 0], 10],
            ["a", "b", -Infinity],
            [now, now, 0, "now to itself"],
            [
                comparable.create(function () {
                    return -1;
                }),
                null,
                -1,
                "comparable"
            ],
            [
                null,
                comparable.create(function () {
                    return 1;
                }),
                -1,
                "opposite comparable"
            ],
            [{b: 10}, {a: 0}, 0, "incomparable to another"],
            [new Number(-10), 20, -30, "boxed number to real number"],
            [fakeOne, 0, 1, "fake number to real number"]
        ];

        tests.forEach(function (test) {
            it(
                test[3] ||
                (
                    JSON.stringify(test[0]) + " to " +
                    JSON.stringify(test[1])
                ),
                function () {
                    expect(Object.compare(test[0], test[1])).to.be.eql(test[2]);
                }
            );
        });

    });

    describe("clone", function () {

        const graph = {
            object: {a: 10},
            array: [1, 2, 3],
            string: "hello",
            number: 10,
            nestedObject: {
                a: {a1: 10, a2: 20},
                b: {b1: "a", b2: "c"}
            },
            nestedArray: [
                [1, 2, 3],
                [4, 5, 6]
            ],
            mixedObject: {
                array: [1, 3, 4],
                object: {a: 10, b: 20}
            },
            mixedArray: [
                [],
                {a: 10, b: 20}
            ],
            arrayWithHoles: [],
            clonable: Object.create({
                clone: function () {
                    return this;
                }
            })
        };

        graph.cycle = graph;
        graph.arrayWithHoles[10] = 10;

        graph.typedObject = Object.create(null);
        graph.typedObject.a = 10;
        graph.typedObject.b = 10;

        Object.forEach(graph, function (value, name) {
            it(name + " cloned equals self", function () {
                expect(Object.clone(value)).to.be.eql(value);
            });
        });

        it("should clone zero levels of depth", function () {
            const clone = Object.clone(graph, 0);
            expect(clone).to.be.equal(graph);
        });

        it("should clone object at one level of depth", function () {
            const clone = Object.clone(graph, 1);
            expect(clone).to.be.eql(graph);
            expect(clone).to.not.be.equal(graph);
        });

        it("should clone object at two levels of depth", function () {
            const clone = Object.clone(graph, 2);
            expect(clone).to.be.eql(graph);
            expect(clone.object).to.not.be.equal(graph.object);
            expect(clone.object).to.be.eql(graph.object);
            expect(clone.nestedObject.a).to.be.equal(graph.nestedObject.a);
        });

        it("should clone array at two levels of depth", function () {
            const clone = Object.clone(graph, 2);
            expect(clone).to.be.eql(graph);
            expect(clone.array).to.not.be.equal(graph.array);
            expect(clone.array).to.be.eql(graph.array);
        });

        it("should clone identical values at least once", function () {
            const clone = Object.clone(graph);
            expect(clone.cycle).to.not.be.equal(graph.cycle);
        });

        it("should clone identical values only once", function () {
            const clone = Object.clone(graph);
            expect(clone.cycle).to.be.equal(clone);
        });

        it("should clone clonable", function () {
            const clone = Object.clone(graph);
            expect(clone.clonable).to.be.equal(graph.clonable);
        });

    });

    describe("clone", function () {
        const object = {a: {a1: 10, a2: 20}, b: {b1: 10, b2: 20}};

        it("should clone zero levels", function () {
            expect(Object.clone(object, 0)).to.be.equal(object);
        });

        it("should clone one level", function () {
            const clone = Object.clone(object, 1);
            expect(clone).to.be.eql(object);
            expect(clone).to.not.be.equal(object);
            expect(clone.a).to.be.equal(object.a);
        });

        it("should clone two levels", function () {
            const clone = Object.clone(object, 2);
            expect(clone).to.be.eql(object);
            expect(clone).to.not.be.equal(object);
            expect(clone.a).to.not.be.equal(object.a);
        });

        it("should clone with reference cycles", function () {
            const cycle = {};
            cycle.cycle = cycle;
            const clone = Object.clone(cycle);
            expect(clone).to.be.eql(cycle);
            expect(clone).to.not.be.equal(cycle);
            expect(clone.cycle).to.be.equal(clone);
        });

    });

    describe("clear", function () {

        it("should clear all owned properties of the object", function () {
            expect(Object.keys(Object.clear({a: 10}))).to.be.eql([]);
        });

    });

});
