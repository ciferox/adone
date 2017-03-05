require("../../../lib/glosses/collections/shim");
const GenericCollection = require("../../../lib/glosses/collections/generic_collection");
const describeDeque = require("./deque");
const describeCollection = require("./collection");
const describeOrder = require("./order");

describe("Array", function () {
    describeDeque(Array.fromValues);
    describeCollection(Array, [1, 2, 3, 4]);
    describeCollection(Array, [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
    describeOrder(Array.fromValues);

    /*
        The following tests are from Montage.
        Copyright (c) 2012, Motorola Mobility LLC.
        All Rights Reserved.
        BSD License.
    */

    // contains 10, 20, 30
    function FakeArray() {
        this.length = 3;
    }
    Object.addEach(FakeArray.prototype, GenericCollection.prototype);
    FakeArray.prototype.reduce = function (callback, basis) {
        basis = callback(basis, 10, 0, this);
        basis = callback(basis, 20, 1, this);
        basis = callback(basis, 30, 2, this);
        return basis;
    };

    // get does not work the same way as most other ordered collections.  it
    // behaves like a map of indicies to values.  others behave like sets.
    describe("get", function () {

        it("should return the value for a given index", function () {
            expect([0].get(0)).to.be.eql(0);
        });

        it("should not return a named property", function () {
            expect(function () {
                [].get("length");
            }).to.throw();
        });

        it("should not return a named index", function () {
            expect(function () {
                [].get("0");
            }).to.throw();
        });

    });

    // Since these are brute force sought, they do not need to be comparable
    // for arrays, like they would for a SortedArray.  These tests would apply
    // to lists as well, but lists do not have indicies.

    describe("find", function () {

        it("should find equivalent objects", function () {
            expect([{ a: 10 }].findValue({ a: 10 })).to.be.eql(0);
        });

        it("should allow equality comparison override", function () {
            expect([{ a: 10 }].findValue({ a: 10 }, Object.is)).to.be.eql(-1);
        });

    });

    describe("findLast", function () {

        it("should find equivalent objects", function () {
            expect([{ a: 10 }].findLast({ a: 10 })).to.be.eql(0);
        });

        it("should allow equality comparison override", function () {
            expect([{ a: 10 }].findLast({ a: 10 }, Object.is)).to.be.eql(-1);
        });

        it("should find the last of equivalent objects", function () {
            const object = { a: 10 };
            expect([object, { a: 10 }].findLast(object)).to.be.eql(1);
        });

    });

    describe("has", function () {

        it("should find equivalent objects", function () {
            expect([{ a: 10 }].has({ a: 10 })).to.be.true;
        });

        it("should not find non-contained values", function () {
            expect([].has(-1)).to.be.false;
        });

        it("should allow equality comparison override", function () {
            const object = {};
            expect([{}].has(object, Object.is)).to.be.false;
            expect([object].has(object, Object.is)).to.be.true;
        });

    });

    describe("add", function () {

        it("should add values", function () {
            const array = [{ a: 10 }];
            array.add({ a: 10 });
            expect(array[0]).to.be.eql({ a: 10 });
            expect(array[1]).to.be.eql({ a: 10 });
            expect(array.has({ a: 10 })).to.be.true;
        });

    });

    describe("sorted", function () {
        let a = { foo: [1, 4] },
            b = { foo: [2, 3] },
            c = { foo: [2, 3] },
            d = { foo: [3, 2] },
            e = { foo: [4] },
            unsorted = [d, b, c, a, e], // b and c equal, in stable order
            sorted = [a, b, c, d, e],
            byFoo = adone.util.by(function (x) {
                return x.foo;
            });

        it("should not be an in-place sort", function () {
            expect(unsorted.sorted()).to.not.be.equal(unsorted);
        });

        it("should sort objects by a property array", function () {
            expect(unsorted.sorted(byFoo)).to.be.eql(sorted);
            unsorted.sorted(byFoo).forEach(function (x, i) {
                expect(x).to.be.equal(sorted[i]);
            });
        });

    });

    describe("clone", function () {

        // should have been adequately covered by Object.clone tests

        it("should clone with indefinite depth", function () {
            const array = [[[]]];
            const clone = array.clone();
            expect(clone).to.be.eql(array);
            expect(clone).to.not.be.equal(array);
        });

        it("should clone with depth 0", function () {
            const array = [];
            expect(array.clone(0)).to.be.equal(array);
        });

        it("should clone with depth 1", function () {
            const array = [{}];
            expect(array.clone(1)).to.not.be.equal(array);
            expect(array.clone(1)[0]).to.be.equal(array[0]);
        });

        it("should clone with depth 2", function () {
            const array = [{ a: 10 }];
            expect(array.clone(2)).to.not.be.equal(array);
            expect(array.clone(2)[0]).to.not.be.equal(array[0]);
            expect(array.clone(2)[0]).to.be.eql(array[0]);
        });

    });

    describe("zip", function () {
        it("should treat holes as undefined", function () {
            const a = [0, 1];
            const b = [];
            b[1] = "b";
            expect(a.zip(b)).to.be.eql([
                [0],
                [1, "b"]
            ]);
        });
    });

    describe("group", function () {
        it("should make a histogram", function () {
            const groups = [
                { x: 0 },
                { x: 1 },
                { x: 2 },
                { x: 3 }
            ].group(function (object) {
                return Math.floor(object.x / 2);
            });
            expect(groups).to.be.eql([
                [0, [{ x: 0 }, { x: 1 }]],
                [1, [{ x: 2 }, { x: 3 }]]
            ]);

        });
    });

    describe("swap", function () {
        let array;
        let otherArray;
        beforeEach(function () {
            array = [1, 2, 3];
        });
        it("should be able to replace content with content of another arraylike", function () {
            otherArray = { __proto__: Array.prototype };
            otherArray[0] = 4;
            otherArray[1] = 5;
            otherArray.length = 2;
            array.swap(0, array.length, otherArray);
            expect(array).to.be.eql([4, 5]);
        });
        it("should ignore non array like plus value", function () {
            array.swap(0, array.length, 4);
            expect(array).to.be.eql([]);

        });
        it("should ignore extra arguments", function () {
            array.swap(0, array.length, 4, 5, 6);
            expect(array).to.be.eql([]);

        });
        it("should work with large arrays", function () {
            otherArray = new Array(200000);
            expect(function () {
                array.swap(0, array.length, otherArray);
            }).not.to.throw();
            expect(array.length).to.be.eql(200000);
        });
        it("swaps at an outer index", function () {
            array.swap(4, 0, [5]);
            expect(array).to.be.eql([1, 2, 3, , 5]);
        });
    });

    describe("set", function () {

        it("sets an inner index", function () {
            const array = [1, 2, 3];
            array.set(1, 10);
            expect(array).to.be.eql([1, 10, 3]);
        });

        it("sets an outer index", function () {
            const array = [];
            array.set(4, 10);
            expect(array).to.be.eql([, , , , 10]);
        });
    });

    describe("deleteAll", function () {
        it("should delete a range of equivalent values", function () {
            const array = [1, 1, 1, 2, 2, 2, 3, 3, 3];
            expect(array.deleteAll(2)).to.be.equal(3);
            expect(array).to.be.eql([1, 1, 1, 3, 3, 3]);
        });
    });

});
