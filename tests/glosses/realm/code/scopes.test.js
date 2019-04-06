import { createModule } from "./helpers";

const {
    error,
    realm: { code }
} = adone;

describe("scopes", () => {
    describe("Scope", () => {
        it("defaults", () => {
            const s = new code.Scope();

            assert.equal(s.size, 0);
            assert.isNull(s.astNodes, null);
            assert.lengthOf(s.children, 0);
        });

        describe("public methods", () => {
            const methods = [
                "contains",
                "addDeclaration",
                "get",
                "getAll",
                "addChild"
            ];

            const s = new code.Scope();

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
            assert.isNull(gs.astNodes, null);
            assert.sameMembers(gs.identifiers, ["global", "undefined"]);
        });
    });
});
