const {
    util: { movingAverage }
} = adone;

describe("util", "movingAverage", () => {
    it("moving average with no time span errors", () => {
        assert.throws(() => {
            movingAverage();
        });
    });

    it("moving average with zero time errors", () => {
        assert.throws(() => {
            movingAverage(0);
        });
    });

    it("moving average with negative time errors", () => {
        assert.throws(() => {
            movingAverage(-1);
        });
    });

    it("moving average with one value gets that value", () => {

        const ma = movingAverage(5000);
        ma.push(Date.now(), 5);
        assert.strictEqual(ma.movingAverage(), 5);
    });

    it("moving average on a constant value returns that value", () => {
        const ma = movingAverage(5000);

        const now = Date.now();
        ma.push(now, 5);
        ma.push(now + 1000, 5);
        ma.push(now + 2000, 5);
        ma.push(now + 3000, 5);

        assert.strictEqual(ma.movingAverage(), 5);
    });

    it("moving average works", () => {
        const ma = movingAverage(50000);

        const now = Date.now();
        ma.push(now, 1);
        ma.push(now + 1000, 2);
        ma.push(now + 2000, 3);
        ma.push(now + 3000, 3);
        ma.push(now + 4000, 10);

        const m = ma.movingAverage();
        assert.true(m < 1.28);
        assert.true(m > 1.27);
    });

    it("variance is 0 on one sample", () => {
        const ma = movingAverage(5000);
        ma.push(Date.now(), 5);

        assert.strictEqual(ma.variance(), 0);
    });

    it("variance is 0 on samples with same value", () => {
        const ma = movingAverage(5000);
        const now = Date.now();
        ma.push(now, 3);
        ma.push(now + 1000, 3);
        ma.push(now + 2000, 3);
        ma.push(now + 3000, 3);
        ma.push(now + 4000, 3);

        assert.strictEqual(ma.variance(), 0);
    });

    it("variance works (1)", () => {
        const ma = movingAverage(5000);
        const now = Date.now();
        ma.push(now, 0);
        ma.push(now + 1000, 1);
        ma.push(now + 2000, 2);
        ma.push(now + 3000, 3);
        ma.push(now + 4000, 4);

        const v = ma.variance();
        assert.true(v > 2.53);
        assert.true(v < 2.54);
    });

    it("variance works (2)", () => {
        const ma = movingAverage(5000);
        const now = Date.now();
        ma.push(now, 0);
        ma.push(now + 1000, 1);
        ma.push(now + 2000, 1);
        ma.push(now + 3000, 1);
        ma.push(now + 4000, 1);

        const v = ma.variance();
        assert.true(v > 0.24);
        assert.true(v < 0.25);
    });
});
