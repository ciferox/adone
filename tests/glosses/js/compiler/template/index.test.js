const { generate, template } = adone.js.compiler;

let comments = "// Sum two numbers\nconst add = (a, b) => a + b;";

describe("templating", function () {
    it("import statement will cause parser to throw by default", function () {
        expect(function () {
            template("import foo from 'foo'")({});
        }).to.throw();
    });

    it("import statements are allowed with sourceType: module", function () {
        expect(function () {
            template("import foo from 'foo'", { sourceType: "module" })({});
        }).not.to.throw();
    });

    it("should strip comments by default", function () {
        let code = "const add = (a, b) => a + b;";
        let output = template(comments)();
        expect(generate(output).code).to.be.equal(code);
    });

    it("should preserve comments with a flag", function () {
        let output = template(comments, { preserveComments: true })();
        expect(generate(output).code).to.be.equal(comments);
    });
});
