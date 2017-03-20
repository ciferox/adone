const { math } = adone;

describe("adone.math", () => {
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
});
