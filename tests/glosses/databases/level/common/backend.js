export const args = function (leveldown) {
    describe("backend", () => {
        it("database creation no-arg throws", () => {
            assert.throws(() => leveldown());
        });
        it("database creation non-string location throws", () => {
            assert.throws(() => leveldown({}));
        });

        it("database open no-arg throws", () => {
            const db = leveldown("foo");
            assert.ok(adone.is.function(db.open));
        });
    });
};
