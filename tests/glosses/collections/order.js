const GenericCollection = require("../../../lib/glosses/collections/generic_collection");

module.exports = describeOrder;
function describeOrder(Collection) {

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
    const fakeArray = new FakeArray();

    describe("equals", function () {

        it("identifies itself", function () {
            const collection = new Collection([1, 2]);
            expect(collection.equals(collection)).to.be.true;
        });

        it("distinguishes incomparable objects", function () {
            expect(new Collection([]).equals(null)).to.be.false;
        });

        it("compares itself to an array-like collection", function () {
            expect(new Collection([10, 20, 30]).equals(fakeArray)).to.be.true;
        });

    });

    describe("compare", function () {

        it("compares to itself", function () {
            const collection = new Collection([1, 2]);
            expect(collection.compare(collection)).to.be.equal(0);
        });

        // contains 10, 20, 30
        it("a fake array should be equal to collection", function () {
            expect(Object.compare(fakeArray, new Collection([10, 20, 30]))).to.be.equal(0);
        });

        it("a fake array should be less than a collection", function () {
            expect(Object.compare(fakeArray, new Collection([10, 30]))).to.be.equal(-10);
        });

        it("a fake array should be greater than a real array because it is longer", function () {
            expect(Object.compare(fakeArray, new Collection([10, 20]))).to.be.equal(1);
        });

        it("a fake array should be less than a longer but otherwise equal", function () {
            expect(Object.compare(fakeArray, new Collection([10, 20, 30, 40]))).to.be.equal(-1);
        });

        it("an array should be equal to a fake array", function () {
            expect(new Collection([10, 20, 30]).compare(fakeArray)).to.be.equal(0);
        });

        it("an array should be greater than a fake array", function () {
            expect(new Collection([10, 30]).compare(fakeArray)).to.be.equal(10);
        });

        it("an array should be less than a fake array because it is shorter but otherwise equal", function () {
            expect(new Collection([10, 20]).compare(fakeArray)).to.be.equal(-1);
        });

        it("an array should be less than a fake array because it is longer but otherwise equal", function () {
            expect(new Collection([10, 20, 30, 40]).compare(fakeArray)).to.be.equal(1);
        });

    });

    describe("indexOf", function () {
        if (!Collection.prototype.indexOf)
            return;

        it("finds first value", function () {
            const collection = new Collection([1, 2, 3]);
            expect(collection.indexOf(2)).to.be.equal(1);
        });

        it("finds first identical value", function () {
            if (Collection.prototype.isSet)
                return;
            const collection = new Collection([1, 1, 2, 2, 3, 3]);
            expect(collection.indexOf(2)).to.be.equal(2);
        });

        it("finds first value after index", function () {
            if (Collection.prototype.isSet || Collection.prototype.isSorted)
                return;
            const collection = new Collection([1, 2, 3, 1, 2, 3]);
            expect(collection.indexOf(2, 3)).to.be.equal(4);
        });

        it("finds first value after negative index", function () {
            if (Collection.prototype.isSet || Collection.prototype.isSorted)
                return;
            const collection = new Collection([1, 2, 3, 1, 2, 3]);
            expect(collection.indexOf(2, -3)).to.be.equal(4);
        });

    });

    describe("lastIndexOf", function () {
        if (!Collection.prototype.lastIndexOf)
            return;

        it("finds last value", function () {
            const collection = new Collection([1, 2, 3]);
            expect(collection.lastIndexOf(2)).to.be.equal(1);
        });

        it("finds last identical value", function () {
            if (Collection.prototype.isSet)
                return;
            const collection = new Collection([1, 1, 2, 2, 3, 3]);
            expect(collection.lastIndexOf(2)).to.be.equal(3);
        });

        it("finds the last value before index", function () {
            if (Collection.prototype.isSet || Collection.prototype.isSorted)
                return;
            const collection = new Collection([1, 2, 3, 1, 2, 3]);
            expect(collection.lastIndexOf(2, 3)).to.be.equal(1);
        });

        it("finds the last value before negative index", function () {
            if (Collection.prototype.isSet || Collection.prototype.isSorted)
                return;
            const collection = new Collection([1, 2, 3, 1, 2, 3]);
            expect(collection.lastIndexOf(2, -3)).to.be.equal(1);
        });

    });

    describe("find", function () {

        it("finds equivalent values", function () {
            expect(new Collection([10, 10, 10]).findValue(10)).to.be.equal(0);
        });

        it("finds equivalent values", function () {
            expect(new Collection([10, 10, 10]).findValue(10)).to.be.equal(0);
        });

    });

    describe("findLast", function () {

        it("finds equivalent values", function () {
            expect(new Collection([10, 10, 10]).findLast(10)).to.be.equal(2);
        });

    });

    describe("has", function () {

        it("finds equivalent values", function () {
            expect(new Collection([10]).has(10)).to.be.true;
        });

        it("does not find absent values", function () {
            expect(new Collection([]).has(-1)).to.be.false;
        });

    });

    describe("has", function () {

        it("finds a value", function () {
            const collection = new Collection([1, 2, 3]);
            expect(collection.has(2)).to.be.true;
        });

        it("does not find an absent value", function () {
            const collection = new Collection([1, 2, 3]);
            expect(collection.has(4)).to.be.false;
        });

        // TODO
        // it("makes use of equality override", function () {
        //     var collection = new Collection([1, 2, 3]);
        //     expect(collection.has(4, function (a, b) {
        //         return a - 1 === b;
        //     })).to.be.true;
        // });

    });


    describe("any", function () {

        const tests = [
            [[0, false], false],
            [["0"], true],
            [[{}], true],
            [[{a: 10}], true],
            [[0, 1, 0], true],
            [[1, 1, 1], true],
            [[true, true, true], true],
            [[0, 0, 0, true], true],
            [[], false],
            [[false, false, false], false]
        ];

        tests.forEach(function (test) {
            it(JSON.stringify(test[0]) + ".any() should be " + test[1], function () {
                expect(new Collection(test[0]).any()).to.be.equal(test[1]);
            });
        });

    });

    describe("all", function () {

        const tests = [
            [[], true],
            [[true], true],
            [[1], true],
            [[{}], true],
            [[false, true, true, true], false]
        ];

        tests.forEach(function (test) {
            it(JSON.stringify(test[0]) + ".all() should be " + test[1], function () {
                expect(new Collection(test[0]).all()).to.be.equal(test[1]);
            });
        });

    });

    describe("min", function () {

        it("finds the minimum of numeric values", function () {
            expect(new Collection([1, 2, 3]).min()).to.be.equal(1);
        });

    });

    describe("max", function () {

        it("finds the maximum of numeric values", function () {
            expect(new Collection([1, 2, 3]).max()).to.be.equal(3);
        });

    });

    describe("sum", function () {

        it("computes the sum of numeric values", function () {
            expect(new Collection([1, 2, 3]).sum()).to.be.equal(6);
        });

        // sum has deprecated behaviors for implicit flattening and
        // property path mapping, not tested here

    });

    describe("average", function () {

        it("computes the arithmetic mean of values", function () {
            expect(new Collection([1, 2, 3]).average()).to.be.equal(2);
        });

    });

    describe("flatten", function () {

        it("flattens an array one level", function () {
            const collection = new Collection([
                [[1, 2, 3], [4, 5, 6]],
                new Collection([[7, 8, 9], [10, 11, 12]])
            ]);
            expect(collection.flatten()).to.be.eql([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
                [10, 11, 12]
            ]);
        });

    });

    describe("one", function () {

        it("gets the first value", function () {
            expect(new Collection([0]).one()).to.be.equal(0);
        });

        it("throws if empty", function () {
            expect(new Collection([]).one()).to.be.undefined;
        });

    });

    describe("only", function () {

        it("gets the first value", function () {
            expect(new Collection([0]).only()).to.be.equal(0);
        });

        it("is undefined if empty", function () {
            expect(new Collection([]).only()).to.be.undefined;
        });

        it("is undefined if more than one value", function () {
            expect(new Collection([1, 2]).only()).to.be.undefined;
        });

    });

    describe("clone", function () {

        // should have been adequately covered by Object.clone tests

        it("should clone with indefinite depth", function () {
            const collection = new Collection([[[]]]);
            const clone = collection.clone();
            expect(clone).to.be.eql(collection);
            expect(clone).to.not.equal(collection);
        });

        it("should clone with depth 0", function () {
            const collection = new Collection([]);
            expect(collection.clone(0)).to.be.eql(collection);
        });

        it("should clone with depth 1", function () {
            const collection = [new Collection({})];
            expect(collection.clone(1)).to.not.equal(collection);
            expect(collection.clone(1).one()).to.be.eql(collection.one());
        });

        it("should clone with depth 2", function () {
            const collection = new Collection([{a: 10}]);
            expect(collection.clone(2)).to.not.equal(collection);
            expect(collection.clone(2).one()).to.not.equal(collection.one());
            expect(collection.clone(2).one()).to.be.eql(collection.one());
        });

    });

}

