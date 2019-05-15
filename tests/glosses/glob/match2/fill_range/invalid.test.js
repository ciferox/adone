const { fillRange } = adone.glob.match;

describe("invalid ranges", () => {
    it("should return an empty array when options.strict is not true", () => {
        assert.deepEqual(fillRange("1", "0f"), []);
        assert.deepEqual(fillRange("1", "10", "ff"), []);
        assert.deepEqual(fillRange("1", "10.f"), []);
        assert.deepEqual(fillRange("1", "10f"), []);
        assert.deepEqual(fillRange("1", "20", "2f"), []);
        assert.deepEqual(fillRange("1", "20", "f2"), []);
        assert.deepEqual(fillRange("1", "2f"), []);
        assert.deepEqual(fillRange("1", "2f", "2"), []);
        assert.deepEqual(fillRange("1", "f2"), []);
        assert.deepEqual(fillRange("1", "ff"), []);
        assert.deepEqual(fillRange("1", "ff", "2"), []);
        assert.deepEqual(fillRange("1.1", "2.1"), []);
        assert.deepEqual(fillRange("1.2", "2"), []);
        assert.deepEqual(fillRange("1.20", "2"), []);
    });
});
