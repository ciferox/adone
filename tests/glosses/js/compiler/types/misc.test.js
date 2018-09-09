const {
    js: { compiler: { types: t, parse } }
} = adone;


const parseCode = function (string) {
    return parse(string, {
        allowReturnOutsideFunction: true
    }).program.body[0];
};

describe("js", "compiler", "types", "misc helpers", () => {
    describe("matchesPattern", () => {
        it("matches explicitly", () => {
            const ast = parseCode("a.b.c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d")).to.true();
            expect(t.matchesPattern(ast, "a.b.c")).to.equal(false);
            expect(t.matchesPattern(ast, "b.c.d")).to.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e")).to.equal(false);
        });

        it("matches partially", () => {
            const ast = parseCode("a.b.c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d", true)).to.true();
            expect(t.matchesPattern(ast, "a.b.c", true)).to.true();
            expect(t.matchesPattern(ast, "b.c.d", true)).to.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e", true)).to.equal(false);
        });

        it("matches string literal expressions", () => {
            const ast = parseCode("a['b'].c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d")).to.true();
            expect(t.matchesPattern(ast, "a.b.c")).to.equal(false);
            expect(t.matchesPattern(ast, "b.c.d")).to.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e")).to.equal(false);
        });

        it("matches string literal expressions partially", () => {
            const ast = parseCode("a['b'].c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d", true)).to.true();
            expect(t.matchesPattern(ast, "a.b.c", true)).to.true();
            expect(t.matchesPattern(ast, "b.c.d", true)).to.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e", true)).to.equal(false);
        });
    });
});
