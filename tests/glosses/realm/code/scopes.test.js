const {
    error,
    realm: { code: { scope } }
} = adone;

describe("scopes", () => {
    describe("Scope", () => {
        it("defaults", () => {
            const s = new scope.Scope();

            assert.equal(s.identifiers.size, 0);
            assert.lengthOf(s.children, 0);
        });

        describe("public methods", () => {
            const methods = [
                "contains",
                "addDeclaration"
            ];

            const s = new scope.Scope("a");

            for (const m of methods) {
                it(`${m}()`, () => {
                    assert.isFunction(s[m]);
                });
            }
        });
    });

    describe("GlobalScope", () => {

        it("defaults", () => {
            const gs = new scope.GlobalScope();
        
            assert.instanceOf(gs, scope.Scope);
            assert.sameMembers([...gs.identifiers.keys()], ["global", "console", "undefined"]);
        });
    });

});
