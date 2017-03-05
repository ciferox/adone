const { SortedArray } = adone.collection;
const describeCollection = require("./collection");
const describeDeque = require("./deque");
const describeOrder = require("./order");
const describeToJson = require("./to_json");

describe("SortedArray", function () {
    describeDeque(SortedArray);
    describeCollection(SortedArray, [1, 2, 3, 4]);
    describeOrder(SortedArray);
    describeToJson(SortedArray, [1, 2, 3, 4]);

    describe("non-uniqueness", function () {
        it("should retain non-unique values", function () {
            const array = new SortedArray([1, 2, 3, 1, 2, 3]);
            expect(array.slice()).to.be.eql([1, 1, 2, 2, 3, 3]);
        });
    });

    describe("deleteAll", function () {
        it("should delete a range of equivalent values", function () {
            const array = new SortedArray([1, 1, 1, 2, 2, 2, 3, 3, 3]);
            expect(array.deleteAll(2)).to.be.equal(3);
            expect(array.toArray()).to.be.eql([1, 1, 1, 3, 3, 3]);
        });
        it("deletes all equivalent values for an alternate relation", function () {
            const equivalent = function (a, b) {
                return a % 2 === b % 2;
            };
            const collection = new SortedArray([1, 2, 3, 4, 5]);
            expect(collection.deleteAll(2, equivalent)).to.be.eql(2);
            expect(collection.toArray()).to.be.eql([1, 3, 5]);
            expect(collection.length).to.be.equal(3);
        });
    });

    // TODO test stability

});
