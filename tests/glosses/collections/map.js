module.exports = describeMap;
function describeMap(Map, values) {

    values = values || [];
    const a = values[0] || {};
    const b = values[1] || {};
    const c = values[2] || {};

    function shouldHaveTheUsualContent(map) {
        expect(map.has(a)).to.be.true;
        expect(map.has(b)).to.be.true;
        expect(map.has(c)).to.be.false;
        expect(map.get(a)).to.be.equal(10);
        expect(map.get(b)).to.be.equal(20);
        expect(map.get(c)).to.be.undefined;
        expect(map.length).to.be.equal(2);
        expect(map.keysArray()).to.be.eql([a, b]);
        expect(map.valuesArray()).to.be.eql([10, 20]);
        expect(map.entriesArray()).to.be.eql([[a, 10], [b, 20]]);
        expect(map.reduce(function (basis, value, key) {
            basis.push([this, key, value]);
            return basis;
        }, [], map)).to.be.eql([
            [map, a, 10],
            [map, b, 20]
        ]);
    }

    it("should be constructable from entry duples with object keys", function () {
        const map = new Map([[a, 10], [b, 20]]);
        shouldHaveTheUsualContent(map);
    });

    it("should be constructable from an interable", function () {
        const map = Map.from({
            forEach: function (callback, thisp) {
                callback.call(thisp, [a, 10]);
                callback.call(thisp, [b, 20]);
            }
        });
        shouldHaveTheUsualContent(map);
    });

    it("should support filter", function () {
        const map = Map.from({a: 10, b: 20, c: 30});
        expect(map.filter(function (value, key) {
            return key === "a" || value === 30;
        }).entriesArray()).to.be.eql([
            ["a", 10],
            ["c", 30]
        ]);
    });

    describe("delete", function () {
        it("should remove one entry", function () {
            const map = new Map([[a, 10], [b, 20], [c, 30]]);
            expect(map.delete(c)).to.be.true;
            shouldHaveTheUsualContent(map);
        });
    });

    describe("clear", function () {
        it("should be able to delete all content", function () {
            const map = Map.from({a: 10, b: 20, c: 30});
            map.clear();
            expect(map.length).to.be.equal(0);
            expect(map.keysArray()).to.be.eql([]);
            expect(map.valuesArray()).to.be.eql([]);
            expect(map.entriesArray()).to.be.eql([]);
        });
    });

    describe("equals", function () {
        const map = Map.from({a: 10, b: 20});
        expect(Object.equals(map, map)).to.be.true;
        expect(map.equals(map)).to.be.true;
        expect(Map.from({a: 10, b: 20}).equals({b: 20, a: 10})).to.be.true;
        expect(Object.equals({a: 10, b: 20}, Map.from({b: 20, a: 10}))).to.be.true;
        expect(Object.equals(Map.from({b: 20, a: 10}), {a: 10, b: 20})).to.be.true;
        expect(Object.equals(Map.from({b: 20, a: 10}), Map.from({a: 10, b: 20}))).to.be.true;
    });

    describe("clone", function () {
        const map = Map.from({a: 10, b: 20});
        const clone = Object.clone(map);
        expect(map).to.not.equal(clone);
        expect(map.equals(clone)).to.be.true;
    });

}
