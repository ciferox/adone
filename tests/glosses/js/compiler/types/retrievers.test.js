const {
    js: { parse, compiler: { types: t } }
} = adone;

function getBody(program) {
    return parse(program, { sourceType: "module" }).program.body;
}

describe("retrievers", () => {
    describe("getBindingIdentifiers", () => {
        it("variable declarations", () => {
            const program = "var a = 1; let b = 2; const c = 3;";
            const ids = t.getBindingIdentifiers(getBody(program));
            expect(Object.keys(ids)).to.eql(["a", "b", "c"]);
        });
        it("function declarations", () => {
            const program = "var foo = 1; function bar() { var baz = 2; }";
            const ids = t.getBindingIdentifiers(getBody(program));
            expect(Object.keys(ids)).to.eql(["bar", "foo"]);
        });
        it("export named declarations", () => {
            const program = "export const foo = 'foo';";
            const ids = t.getBindingIdentifiers(getBody(program));
            expect(Object.keys(ids)).to.eql(["foo"]);
        });
    });
});
