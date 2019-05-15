const { fillRange } = adone.glob.match;

describe("error handling", () => {
    it("should throw when range arguments are invalid and `strictRanges` is true", () => {
        assert.throws(() => {
            fillRange("0a", "0z", { strictRanges: true });
        }, /Invalid range arguments: \[ '0a', '0z' \]/);

        assert.throws(() => {
            fillRange("", "*", 2, { strictRanges: true });
        }, /Invalid range arguments: \[ '', '\*' \]/);
    });

    it("should throw when args are incompatible", () => {
        assert.throws(() => {
            fillRange("a8", 10, { strictRanges: true });
        }, /Invalid range arguments: \[ 'a8', 10 \]/);

        assert.throws(() => {
            fillRange(1, "zz", { strictRanges: true });
        }, /Invalid range arguments: \[ 1, 'zz' \]/);
    });

    it("should throw when the step is bad.", () => {
        const opts = { strictRanges: true };
        assert.throws(() => fillRange("1", "10", "z", opts), /Expected step "z" to be a number/);
        assert.throws(() => fillRange("a", "z", "a", opts), /Expected step "a" to be a number/);
        assert.throws(() => fillRange("a", "z", "0a", opts), /Expected step "0a" to be a number/);
    });
});
