const mm = adone.glob.match;

describe("glob", "match", ".parse()", () => {
    it("should throw an error when arguments are invalid", () => {
        assert.throws(() => {
            mm.parse();
        });
    });

    it("should return an AST for a glob", () => {
        let ast = mm.parse("a/*");
        delete ast.state;
        assert.deepEqual(ast, {
            type: "root",
            errors: [],
            nodes: [
                { type: "bos", val: "" },
                { type: "text", val: "a" },
                { type: "slash", val: "/" },
                { type: "star", val: "*" },
                { type: "eos", val: "" }
            ],
            input: "a/*"
        });

        ast = mm.parse("a/**/*");
        delete ast.state;
        assert.deepEqual(ast, {
            type: "root",
            errors: [],
            nodes: [
                { type: "bos", val: "" },
                { type: "text", val: "a" },
                { type: "slash", val: "/" },
                { type: "globstar", val: "**" },
                { type: "slash", val: "/" },
                { type: "star", val: "*" },
                { type: "eos", val: "" }
            ],
            input: "a/**/*"
        });
    });
});
