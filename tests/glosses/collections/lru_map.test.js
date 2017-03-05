const { LruMap } = adone.collection;
const describeDict = require("./dict");
const describeMap = require("./map");
const describeToJson = require("./to_json");

describe("LruMap", function () {

    describeDict(LruMap);
    describeMap(LruMap);
    describeToJson(LruMap, [[{ a: 1 }, 10], [{ b: 2 }, 20], [{ c: 3 }, 30]]);

    it("should remove stale entries", function () {
        const map = new LruMap({ a: 10, b: 20, c: 30 }, 3);
        map.get("b");
        map.set("d", 40);
        expect(map.keysArray()).to.be.eql(["c", "b", "d"]);
        expect(map.length).to.be.equal(3);
    });

    it("should not grow when re-adding", function () {
        const map = new LruMap({ a: 10, b: 20, c: 30 }, 3);

        expect(map.keysArray()).to.be.eql(["a", "b", "c"]);
        expect(map.length).to.be.equal(3);

        map.get("b");
        expect(map.keysArray()).to.be.eql(["a", "c", "b"]);
        expect(map.length).to.be.equal(3);

        map.set("c", 40);
        expect(map.keysArray()).to.be.eql(["a", "b", "c"]);
        expect(map.length).to.be.equal(3);
    });

    it("should grow when adding new values", function () {
        const map = new LruMap({}, 3);
        expect(map.length).to.be.equal(0);

        map.set("a", 10);
        expect(map.length).to.be.equal(1);
        map.set("a", 10);
        expect(map.length).to.be.equal(1);

        map.set("b", 20);
        expect(map.length).to.be.equal(2);
        map.set("b", 20);
        expect(map.length).to.be.equal(2);

        map.set("c", 30);
        expect(map.length).to.be.equal(3);
        map.set("c", 30);
        expect(map.length).to.be.equal(3);

        // stops growing
        map.set("d", 40);
        expect(map.length).to.be.equal(3);
        map.set("d", 40);
        expect(map.length).to.be.equal(3);

        map.set("e", 50);
        expect(map.length).to.be.equal(3);
    });
});
