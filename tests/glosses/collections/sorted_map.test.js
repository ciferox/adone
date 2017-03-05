const { SortedMap } = adone.collection;
const describeDict = require("./dict");
const describeToJson = require("./to_json");

describe("SortedMap", function () {
    describeDict(SortedMap);
    describeToJson(SortedMap, [[1, 10], [2, 20], [3, 30]]);

    describe("reduceRight", function () {
        const map = new SortedMap([
            [1, 2],
            [2, 4],
            [3, 6],
            [4, 8]
        ]);
        expect(map.reduceRight(function (valid, value, key) {
            return valid && key * 2 == value;
        }, true)).to.be.true;
    });

    describe("iterator", function () {
        const map = new SortedMap([
            [1, 2],
            [2, 4],
            [3, 6],
            [4, 8]
        ]);
        const iterator = map.iterator();
        const a = iterator.next().value;
        const b = iterator.next().value;
        const c = iterator.next().value;
        const d = iterator.next().value;
        expect(a.key).to.be.equal(1);
        expect(a.value).to.be.equal(2);
        expect(b.key).to.be.equal(2);
        expect(b.value).to.be.equal(4);
        expect(c.key).to.be.equal(3);
        expect(c.value).to.be.equal(6);
        expect(d.key).to.be.equal(4);
        expect(d.value).to.be.equal(8);

    });

});
