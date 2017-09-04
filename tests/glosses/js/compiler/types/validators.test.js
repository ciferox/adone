const {
    js: { compiler: { types: t, parse } }
} = adone;

describe("js", "compiler", "types", "validators", () => {
    describe("isNodesEquivalent", () => {
        it("should handle simple cases", () => {
            const mem = t.memberExpression(t.identifier("a"), t.identifier("b"));
            assert(t.isNodesEquivalent(mem, mem) === true);

            const mem2 = t.memberExpression(t.identifier("a"), t.identifier("c"));
            assert(t.isNodesEquivalent(mem, mem2) === false);
        });

        it("should handle full programs", () => {
            assert(t.isNodesEquivalent(parse("1 + 1"), parse("1+1")) === true);
            assert(t.isNodesEquivalent(parse("1 + 1"), parse("1+2")) === false);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";

            assert(t.isNodesEquivalent(parse(program), parse(program)) === true);

            const program2 = "'use strict'; function lol() { wow();return -1; }";

            assert(t.isNodesEquivalent(parse(program), parse(program2)) === false);
        });

        it("rejects 'await' as an identifier", () => {
            assert(t.isValidIdentifier("await") === false);
        });
    });

    describe("patterns", () => {
        it("allows nested pattern structures", () => {
            const pattern = t.objectPattern([
                t.objectProperty(
                    t.identifier("a"),
                    t.objectPattern([
                        t.objectProperty(t.identifier("b"), t.identifier("foo")),
                        t.objectProperty(
                            t.identifier("c"),
                            t.arrayPattern([t.identifier("value")]),
                        )
                    ]),
                )
            ]);

            assert(t.isNodesEquivalent(pattern, pattern) === true);
        });
    });
});
