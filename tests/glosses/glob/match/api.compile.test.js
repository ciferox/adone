const mm = adone.glob.match;

describe("glob", "match", ".compile()", () => {
    it("should throw an error when arguments are invalid", () => {
        assert.throws(() => {
            mm.compile();
        });
    });

    it("should return an AST for a glob", () => {
        const foo = mm.compile("a/*");
        delete foo.ast.state;
        assert.deepEqual(foo.ast, {
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

        const bar = mm.compile("a/**/*");
        delete bar.ast.state;
        assert.deepEqual(bar.ast, {
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
