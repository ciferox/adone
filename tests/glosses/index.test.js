describe("Adone common", () => {
    describe("identity", () => {
        it("should return the first argument", () => {
            expect(adone.identity(1, 2, 3)).to.be.equal(1);
        });
    });

    describe("noop", () => {
        it("should return nothing", () => {
            expect(adone.noop(1, 2, 3)).to.be.undefined();
        });
    });
});

