const { SortedArraySet } = adone.collection;
const describeDeque = require("./deque");
const describeCollection = require("./collection");
const describeSet = require("./set");
const describeToJson = require("./to_json");

describe("SortedArraySet", function () {
    describeDeque(SortedArraySet);
    describeCollection(SortedArraySet, [1, 2, 3, 4]);
    describeSet(SortedArraySet);
    describeToJson(SortedArraySet, [1, 2, 3, 4]);

    describe("uniqueness", function () {
        const set = new SortedArraySet([1, 2, 3, 1, 2, 3]);
        expect(set.slice()).to.be.eql([1, 2, 3]);
    });

});
