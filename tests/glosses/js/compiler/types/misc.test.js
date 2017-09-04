const {
    js: { compiler: { types: t, parse } }
} = adone;

const parseCode = (string) => {
    return parse(string, {
        allowReturnOutsideFunction: true
    }).program.body[0];
};

describe("js", "compiler", "types", "misc helpers", () => {
    describe("matchesPattern", () => {
        it("matches explicitly", () => {
            const ast = parseCode("a.b.c.d").expression;
            assert(t.matchesPattern(ast, "a.b.c.d"));
            assert.isFalse(t.matchesPattern(ast, "a.b.c"));
            assert.isFalse(t.matchesPattern(ast, "b.c.d"));
            assert.isFalse(t.matchesPattern(ast, "a.b.c.d.e"));
        });

        it("matches partially", () => {
            const ast = parseCode("a.b.c.d").expression;
            assert(t.matchesPattern(ast, "a.b.c.d", true));
            assert(t.matchesPattern(ast, "a.b.c", true));
            assert.isFalse(t.matchesPattern(ast, "b.c.d", true));
            assert.isFalse(t.matchesPattern(ast, "a.b.c.d.e", true));
        });

        it("matches string literal expressions", () => {
            const ast = parseCode("a['b'].c.d").expression;
            assert(t.matchesPattern(ast, "a.b.c.d"));
            assert.isFalse(t.matchesPattern(ast, "a.b.c"));
            assert.isFalse(t.matchesPattern(ast, "b.c.d"));
            assert.isFalse(t.matchesPattern(ast, "a.b.c.d.e"));
        });

        it("matches string literal expressions partially", () => {
            const ast = parseCode("a['b'].c.d").expression;
            assert(t.matchesPattern(ast, "a.b.c.d", true));
            assert(t.matchesPattern(ast, "a.b.c", true));
            assert.isFalse(t.matchesPattern(ast, "b.c.d", true));
            assert.isFalse(t.matchesPattern(ast, "a.b.c.d.e", true));
        });
    });
});
