const {
    util: { toMs }
} = adone;

describe("util", "toMs", () => {
    it("should not throw an error", () => {
        toMs("1m");
    });
  
    it("should preserve ms", () => {
        assert.equal(toMs("100"), 100);
    });
  
    it("should convert from m to ms", () => {
        assert.equal(toMs("1m"), 60000);
    });
  
    it("should convert from h to ms", () => {
        assert.equal(toMs("1h"), 3600000);
    });
  
    it("should convert d to ms", () => {
        assert.equal(toMs("2d"), 172800000);
    });
  
    it("should convert w to ms", () => {
        assert.equal(toMs("3w"), 1814400000);
    });
  
    it("should convert s to ms", () => {
        assert.equal(toMs("1s"), 1000);
    });
  
    it("should convert ms to ms", () => {
        assert.equal(toMs("100ms"), 100);
    });
  
    it("should work with decimals", () => {
        assert.equal(toMs("1.5h"), 5400000);
    });
  
    it("should work with multiple spaces", () => {
        assert.equal(toMs("1   s"), 1000);
    });
  
    it("should return NaN if invalid", () => {
        assert.true(isNaN(toMs("☃")));
    });
  
    it("should be case-insensitive", () => {
        assert.equal(toMs("1.5H"), 5400000);
    });
  
    it("should work with numbers starting with .", () => {
        assert.equal(toMs(".5ms"), 0.5);
    });
  
    it("should work with negative integers", () => {
        assert.equal(toMs("-100ms"), -100);
    });
  
    it("should work with negative decimals", () => {
        assert.equal(toMs("-1.5h"), -5400000);
        assert.equal(toMs("-10.5h"), -37800000);
    });
  
    it('should work with negative decimals starting with "."', () => {
        assert.equal(toMs("-.5h"), -1800000);
    });
});
  
// long strings
  
describe("toMs(long string)", () => {
    it("should not throw an error", () => {
        toMs("53 milliseconds");
    });
  
    it("should convert milliseconds to ms", () => {
        assert.equal(toMs("53 milliseconds"), 53);
    });
  
    it("should convert msecs to ms", () => {
        assert.equal(toMs("17 msecs"), 17);
    });
  
    it("should convert sec to ms", () => {
        assert.equal(toMs("1 sec"), 1000);
    });
  
    it("should convert from min to ms", () => {
        assert.equal(toMs("1 min"), 60000);
    });
  
    it("should convert from hr to ms", () => {
        assert.equal(toMs("1 hr"), 3600000);
    });
  
    it("should convert days to ms", () => {
        assert.equal(toMs("2 days"), 172800000);
    });
  
    it("should work with decimals", () => {
        assert.equal(toMs("1.5 hours"), 5400000);
    });
  
    it("should work with negative integers", () => {
        assert.equal(toMs("-100 milliseconds"), -100);
    });
  
    it("should work with negative decimals", () => {
        assert.equal(toMs("-1.5 hours"), -5400000);
    });
  
    it('should work with negative decimals starting with "."', () => {
        assert.equal(toMs("-.5 hr"), -1800000);
    });
});
  
// numbers
  
describe("toMs(number, { long: true })", () => {
    it("should not throw an error", () => {
        toMs(500, { long: true });
    });
  
    it("should support milliseconds", () => {
        assert.equal(toMs(500, { long: true }), "500 ms");
  
        assert.equal(toMs(-500, { long: true }), "-500 ms");
    });
  
    it("should support seconds", () => {
        assert.equal(toMs(1000, { long: true }), "1 second");
        assert.equal(toMs(1200, { long: true }), "1 second");
        assert.equal(toMs(10000, { long: true }), "10 seconds");
  
        assert.equal(toMs(-1000, { long: true }), "-1 second");
        assert.equal(toMs(-1200, { long: true }), "-1 second");
        assert.equal(toMs(-10000, { long: true }), "-10 seconds");
    });
  
    it("should support minutes", () => {
        assert.equal(toMs(60 * 1000, { long: true }), "1 minute");
        assert.equal(toMs(60 * 1200, { long: true }), "1 minute");
        assert.equal(toMs(60 * 10000, { long: true }), "10 minutes");
  
        assert.equal(toMs(-1 * 60 * 1000, { long: true }), "-1 minute");
        assert.equal(toMs(-1 * 60 * 1200, { long: true }), "-1 minute");
        assert.equal(toMs(-1 * 60 * 10000, { long: true }), "-10 minutes");
    });
  
    it("should support hours", () => {
        assert.equal(toMs(60 * 60 * 1000, { long: true }), "1 hour");
        assert.equal(toMs(60 * 60 * 1200, { long: true }), "1 hour");
        assert.equal(toMs(60 * 60 * 10000, { long: true }), "10 hours");
  
        assert.equal(toMs(-1 * 60 * 60 * 1000, { long: true }), "-1 hour");
        assert.equal(toMs(-1 * 60 * 60 * 1200, { long: true }), "-1 hour");
        assert.equal(toMs(-1 * 60 * 60 * 10000, { long: true }), "-10 hours");
    });
  
    it("should support days", () => {
        assert.equal(toMs(24 * 60 * 60 * 1000, { long: true }), "1 day");
        assert.equal(toMs(24 * 60 * 60 * 1200, { long: true }), "1 day");
        assert.equal(toMs(24 * 60 * 60 * 10000, { long: true }), "10 days");
  
        assert.equal(toMs(-1 * 24 * 60 * 60 * 1000, { long: true }), "-1 day");
        assert.equal(toMs(-1 * 24 * 60 * 60 * 1200, { long: true }), "-1 day");
        assert.equal(toMs(-1 * 24 * 60 * 60 * 10000, { long: true }), "-10 days");
    });
  
    it("should round", () => {
        assert.equal(toMs(234234234, { long: true }), "3 days");
  
        assert.equal(toMs(-234234234, { long: true }), "-3 days");
    });
});
  
// numbers
  
describe("toMs(number)", () => {
    it("should not throw an error", () => {
        toMs(500);
    });
  
    it("should support milliseconds", () => {
        assert.equal(toMs(500), "500ms");
  
        assert.equal(toMs(-500), "-500ms");
    });
  
    it("should support seconds", () => {
        assert.equal(toMs(1000), "1s");
        assert.equal(toMs(10000), "10s");
  
        assert.equal(toMs(-1000), "-1s");
        assert.equal(toMs(-10000), "-10s");
    });
  
    it("should support minutes", () => {
        assert.equal(toMs(60 * 1000), "1m");
        assert.equal(toMs(60 * 10000), "10m");
  
        assert.equal(toMs(-1 * 60 * 1000), "-1m");
        assert.equal(toMs(-1 * 60 * 10000), "-10m");
    });
  
    it("should support hours", () => {
        assert.equal(toMs(60 * 60 * 1000), "1h");
        assert.equal(toMs(60 * 60 * 10000), "10h");
  
        assert.equal(toMs(-1 * 60 * 60 * 1000), "-1h");
        assert.equal(toMs(-1 * 60 * 60 * 10000), "-10h");
    });
  
    it("should support days", () => {
        assert.equal(toMs(24 * 60 * 60 * 1000), "1d");
        assert.equal(toMs(24 * 60 * 60 * 10000), "10d");
  
        assert.equal(toMs(-1 * 24 * 60 * 60 * 1000), "-1d");
        assert.equal(toMs(-1 * 24 * 60 * 60 * 10000), "-10d");
    });
  
    it("should round", () => {
        assert.equal(toMs(234234234), "3d");
  
        assert.equal(toMs(-234234234), "-3d");
    });
});
  
// invalid inputs
  
describe("toMs(invalid inputs)", () => {
    it('should throw an error, when toMs("")', () => {
        assert.throws(() => {
            toMs("");
        });
    });
  
    it("should throw an error, when toMs(undefined)", () => {
        assert.throws(() => {
            toMs(undefined);
        });
    });
  
    it("should throw an error, when toMs(null)", () => {
        assert.throws(() => {
            toMs(null);
        });
    });
  
    it("should throw an error, when toMs([])", () => {
        assert.throws(() => {
            toMs([]);
        });
    });
  
    it("should throw an error, when toMs({})", () => {
        assert.throws(() => {
            toMs({});
        });
    });
  
    it("should throw an error, when toMs(NaN)", () => {
        assert.throws(() => {
            toMs(NaN);
        });
    });
});
  
