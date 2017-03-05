const { LruSet } = adone.collection;
const describeCollection = require("./collection");
const describeSet = require("./set");
const describeToJson = require("./to_json");

describe("LruSet", function () {
    // construction, has, add, get, delete
    describeCollection(LruSet, [1, 2, 3, 4], true);
    describeCollection(LruSet, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);
    describeSet(LruSet);
    describeToJson(LruSet, [1, 2, 3, 4]);

    it("should remove stale entries", function () {
        const set = new LruSet([4, 3, 1, 2, 3], 3);
        expect(set.length).to.be.equal(3);
        set.add(3);
        expect(set.toArray()).to.be.eql([1, 2, 3]);
        set.add(4);
        expect(set.toArray()).to.be.eql([2, 3, 4]);
    });
});
