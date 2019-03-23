const {
    js: { parse, compiler: { types: t } }
} = adone;

function parseCode(string) {
    return parse(string, {
        allowReturnOutsideFunction: true
    }).program.body[0];
}

describe("misc helpers", () => {
    describe("matchesPattern", () => {
        it("matches explicitly", () => {
            const ast = parseCode("a.b.c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d")).to.be.ok;
            expect(t.matchesPattern(ast, "a.b.c")).to.be.equal(false);
            expect(t.matchesPattern(ast, "b.c.d")).to.be.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e")).to.be.equal(false);
        });

        it("matches partially", () => {
            const ast = parseCode("a.b.c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d", true)).to.be.ok;
            expect(t.matchesPattern(ast, "a.b.c", true)).to.be.ok;
            expect(t.matchesPattern(ast, "b.c.d", true)).to.be.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e", true)).to.be.equal(false);
        });

        it("matches string literal expressions", () => {
            const ast = parseCode("a['b'].c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d")).to.be.ok;
            expect(t.matchesPattern(ast, "a.b.c")).to.be.equal(false);
            expect(t.matchesPattern(ast, "b.c.d")).to.be.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e")).to.be.equal(false);
        });

        it("matches string literal expressions partially", () => {
            const ast = parseCode("a['b'].c.d").expression;
            expect(t.matchesPattern(ast, "a.b.c.d", true)).to.be.ok;
            expect(t.matchesPattern(ast, "a.b.c", true)).to.be.ok;
            expect(t.matchesPattern(ast, "b.c.d", true)).to.be.equal(false);
            expect(t.matchesPattern(ast, "a.b.c.d.e", true)).to.be.equal(false);
        });
    });
});
