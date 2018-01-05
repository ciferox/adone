const {
    util: { xorDistance }
} = adone;

describe("util", "xorDistance", () => {
    it("distance", () => {
        assert.deepEqual(xorDistance.create(Buffer.from([1, 0]), Buffer.from([0, 1])), Buffer.from([1, 1]));
        assert.deepEqual(xorDistance.create(Buffer.from([1, 1]), Buffer.from([0, 1])), Buffer.from([1, 0]));
        assert.deepEqual(xorDistance.create(Buffer.from([1, 1]), Buffer.from([1, 1])), Buffer.from([0, 0]));
    });

    it("compare", () => {
        assert.deepEqual(xorDistance.compare(Buffer.from([0, 0]), Buffer.from([0, 1])), -1);
        assert.deepEqual(xorDistance.compare(Buffer.from([0, 1]), Buffer.from([0, 1])), 0);
        assert.deepEqual(xorDistance.compare(Buffer.from([1, 1]), Buffer.from([0, 1])), 1);
    });

    it("shorthands", () => {
        assert.ok(xorDistance.lt(Buffer.from([0, 0]), Buffer.from([0, 1])));
        assert.ok(xorDistance.eq(Buffer.from([0, 1]), Buffer.from([0, 1])));
        assert.ok(xorDistance.gt(Buffer.from([1, 1]), Buffer.from([0, 1])));
    });
});
