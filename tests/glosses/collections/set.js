
const Iterator = require("../../../lib/glosses/collections/iterator");

module.exports = describeSet;
function describeSet(Set, sorted) {

    describe("uniqueness", function () {
        const set = new Set([1, 2, 3, 1, 2, 3]);
        expect(set.toArray().sort()).to.eql([1, 2, 3]);
    });

    describe("forEach", function () {
        it("the callback should receive value, value, set", function () {
            const set = new Set([1, 2, 3]);
            const other = new Set([]);
            let i = 1;
            set.forEach(function (value, key, object) {
                expect(key).to.be.eql(value);
                i++;
                other.add(value);
                expect(object).to.be.eql(set);
            });
            expect(other.length).to.be.eql(3);
            expect(other.union(set).length).to.be.eql(3);
            expect(other.intersection(set).length).to.be.eql(3);
            expect(other.difference(set).length).to.be.eql(0);
        });
    });

    it("should be initially empty", function () {
        expect(new Set().length).to.be.eql(0);
    });

    it("cleared set should be empty", function () {
        const set = new Set([1, 2]);
        expect(set.length).to.be.eql(2);
        set.delete(1);
        expect(set.length).to.be.eql(1);
        set.clear();
        expect(set.length).to.be.eql(0);
    });

    it("can add and delete an object", function () {
        const set = new Set();
        const object = {};
        set.add(object);
        expect(set.has(object)).to.be.eql(true);
        set.delete(object);
        expect(set.length).to.be.eql(0);
        expect(set.has(object)).to.be.eql(false);
    });

    it("can deleteAll", function () {
        const set = new Set([0]);
        expect(set.deleteAll(0)).to.be.eql(1);
        expect(set.deleteAll(0)).to.be.eql(0);
    });

    if (!sorted) {
        it("can add and delete objects from the same bucket", function () {
            let a = { id: 0 }, b = { id: 1 };
            const set = new Set();
            set.add(a);
            expect(set.has(a)).to.be.eql(true);
            set.add(b);
            expect(set.has(b)).to.be.eql(true);
            set.delete(b);
            expect(set.has(b)).to.be.eql(false);
            expect(set.has(a)).to.be.eql(true);
            set.delete(a);
            expect(set.has(a)).to.be.eql(false);
        });
    }

    it("can readd a deleted object", function () {
        const set = new Set();
        const object = {};
        set.add(object);
        expect(set.has(object)).to.be.eql(true);
        set.add(object);
        expect(set.length).to.be.eql(1);
        set.delete(object);
        expect(set.length).to.be.eql(0);
        expect(set.has(object)).to.be.eql(false);
        set.add(object);
        expect(set.length).to.be.eql(1);
        expect(set.has(object)).to.be.eql(true);
    });

    it("can be changed to an array", function () {
        const set = new Set([0]);
        expect(set.toArray()).to.eql([0]);
    });

    it("is a reducible", function () {
        const set = new Set([1, 1, 1, 2, 2, 2, 1, 2]);
        expect(set.length).to.be.eql(2);
        expect(set.min()).to.be.eql(1);
        expect(set.max()).to.be.eql(2);
        expect(set.sum()).to.be.eql(3);
        expect(set.average()).to.be.eql(1.5);
        expect(set.map(function (n) {
            return n + 1;
        }).indexOf(3)).to.not.be.eql(-1);
    });

    it("is iterable", function () {
        const set = new Set(["c", "b", "a"]);
        const valuesArray = set.valuesArray();
        expect(valuesArray.sort()).to.eql(["a", "b", "c"]);
    });

    it("is concatenatable", function () {
        const array = new Set([3, 2, 1]).concat([4, 5, 6]).toArray();
        array.sort();
        expect(array).to.eql([1, 2, 3, 4, 5, 6]);
    });

    it("should compute unions", function () {
        expect(new Set([1, 2, 3]).union([2, 3, 4]).sorted()).to.eql([1, 2, 3, 4]);
        expect(new Set([1, 2, 3]).union([2, 3, 4]).equals([1, 2, 3, 4])).to.be.eql(true);
    });

    it("should compute intersections", function () {
        expect(new Set([1, 2, 3]).intersection([2, 3, 4]).sorted()).to.eql([2, 3]);
    });

    it("should compute differences", function () {
        expect(new Set([1, 2, 3]).difference([2, 3, 4]).sorted()).to.eql([1]);
    });

    it("should compute symmetric differences", function () {
        expect(new Set([1, 2, 3]).symmetricDifference([2, 3, 4]).sorted()).to.eql([1, 4]);
    });

}
