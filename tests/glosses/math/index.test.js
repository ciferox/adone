describe("math", () => {
    const { math } = adone;

    describe("random(min, max)", () => {
        it("should generate number in interval [min, max)", () => {
            for (let i = 0; i < 100; i++) {
                const max = Math.floor(Math.random() * (1000000 - 100) + 100);
                const min = Math.floor(Math.random() * max);

                for (let i = 0; i < 100; i++) {
                    const num = math.random(min, max);
                    expect(num).to.be.least(min);
                    expect(num).to.be.below(max);
                }
            }
        });
    });

    describe("max", () => {
        const { max } = math;

        it("should find the maximum value of an array", () => {
            expect(max([1, 2, 3])).to.be.equal(3);
            expect(max([-1, -2, -2])).to.be.equal(-1);
        });

        it("should return undefined for empty array", () => {
            expect(max([])).to.be.undefined();
        });

        it("should support score evaluator", () => {
            const f = (x) => x[0] + x[1];
            expect(max([[1, 2], [3, 4], [-1, 7]], f)).to.be.deep.equal([3, 4]);
        });
    });

    describe("min", () => {
        const { min } = math;

        it("should find the maximum value of an array", () => {
            expect(min([1, 2, 3])).to.be.equal(1);
            expect(min([-1, -2, -2])).to.be.equal(-2);
        });

        it("should return undefined for empty array", () => {
            expect(min([])).to.be.undefined();
        });

        it("should support score evaluator", () => {
            const f = (x) => x[0] + x[1];
            expect(min([[1, 2], [3, 4], [-1, 7]], f)).to.be.deep.equal([1, 2]);
        });
    });
});
