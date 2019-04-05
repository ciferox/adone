const {
    error,
    realm: { code }
} = adone;

describe("scopes", () => {
    describe("Scope", () => {
        it("defaults", () => {
            const s = new code.Scope();

            assert.equal(s.size, 0);
            assert.lengthOf(s.children, 0);
        });

        describe("public methods", () => {
            const methods = [
                "contains",
                "add"
            ];

            const s = new code.Scope("a");

            for (const m of methods) {
                it(`${m}()`, () => {
                    assert.isFunction(s[m]);
                });
            }
        });
    });

    describe("GlobalScope", () => {

        it("defaults", () => {
            const gs = new code.GlobalScope();
        
            assert.instanceOf(gs, code.Scope);
            assert.sameMembers(gs.identifiers, ["global", "undefined"]);
        });
    });

});
