const { matrix } = adone.math;

describe("math", "matrix", () => {
    let result;

    describe("toRadian", () => {
        beforeEach(() => {
            result = matrix.toRadian(180);
        });
        it("should return a value of 3.141592654(Math.PI)", () => {
            assert.equal(result, Math.PI);
        });
    });

    describe("equals", () => {
        let r0;
        let r1;
        let r2;
        beforeEach(() => {
            r0 = matrix.equals(1.0, 0.0);
            r1 = matrix.equals(1.0, 1.0);
            r2 = matrix.equals(1.0 + matrix.EPSILON / 2, 1.0);
        });
        it("should return false for different numbers", () => {
            assert.false(r0);
        });
        it("should return true for the same number", () => {
            assert.true(r1);
        });
        it("should return true for numbers that are close", () => {
            assert.true(r2);
        });
    });
});
