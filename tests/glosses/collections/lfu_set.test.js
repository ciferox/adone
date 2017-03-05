const { LfuSet } = adone.collection;
const describeCollection = require("./collection");
const describeSet = require("./set");
const describeToJson = require("./to_json");

describe("LfuSet", function () {
    // construction, has, add, get, delete
    describeCollection(LfuSet, [1, 2, 3, 4], true);
    describeCollection(LfuSet, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);
    describeSet(LfuSet);
    describeToJson(LfuSet, [1, 2, 3, 4]);

    it("should handle many repeated values", function () {
        const set = new LfuSet([1, 1, 1, 2, 2, 2, 1, 2]);
        expect(set.toArray()).to.be.eql([1, 2]);
    });

    it("should remove stale entries", function () {
        const set = new LfuSet([3, 4, 1, 3, 2], 3);

        expect(set.length).to.be.equal(3);
        expect(set.toArray()).to.be.eql([1, 2, 3]);
        set.add(4);
        expect(set.toArray()).to.be.eql([2, 4, 3]);
    });
});
