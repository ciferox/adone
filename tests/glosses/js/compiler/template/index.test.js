const { generate, template } = adone.js.compiler;

const comments = "// Sum two numbers\nconst add = (a, b) => a + b;";

describe("js", "compiler", "template", () => {
    it("import statement will cause parser to throw by default", () => {
        expect(() => {
            template("import foo from 'foo'")({});
        }).to.throw();
    });

    it("import statements are allowed with sourceType: module", () => {
        expect(() => {
            template("import foo from 'foo'", { sourceType: "module" })({});
        }).not.to.throw();
    });

    it("should strip comments by default", () => {
        const code = "const add = (a, b) => a + b;";
        const output = template(comments)();
        expect(generate(output).code).to.be.equal(code);
    });

    it("should preserve comments with a flag", () => {
        const output = template(comments, { preserveComments: true })();
        expect(generate(output).code).to.be.equal(comments);
    });
});
