const srcPath = (...args) => adone.getPath("lib", "glosses", "glob", "match", "braces", ...args);
const compile = require(srcPath("compile"));
const parse = require(srcPath("parse"));

describe("braces.compile()", () => {
    describe("errors", () => {
        it("should throw an error when invalid args are passed", () => {
            assert.throws(() => compile());
        });
    });

    describe("invalid characters", () => {
        it("should escape invalid bracket characters", () => {
            assert.equal(compile(parse("]{a,b,c}")), "\\](a|b|c)");
        });
    });

    describe("sets", () => {
        it("should support empty sets", () => {
            assert.equal(compile(parse("{a,}")), "(a|)");
            assert.equal(compile(parse("{a,,}")), "(a|)");
            assert.equal(compile(parse("{a,,,}")), "(a|)");
            assert.equal(compile(parse("{a,,,,}")), "(a|)");
            assert.equal(compile(parse("{a,,,,,}")), "(a|)");
        });
    });

    describe("ranges", () => {
        it("should escape braces with invalid ranges", () => {
            assert.equal(compile(parse("{a...b}")), "{a...b}");
            assert.equal(compile(parse("{a...b}"), { escapeInvalid: true }), "\\{a...b\\}");
        });

        it("should expand brace patterns with both sets and ranges", () => {
            assert.equal(compile(parse("{a..e,z}")), "(a..e|z)");
            assert.equal(compile(parse("{a..e,a..z}")), "(a..e|a..z)");
        });

        it("should escape braces with too many range expressions", () => {
            assert.equal(compile(parse("{a..e..x..z}")), "{a..e..x..z}");
            assert.equal(compile(parse("{a..e..x..z}"), { escapeInvalid: true }), "\\{a..e..x..z\\}");
        });
    });

    describe("invalid", () => {
        it("should escape incomplete brace patterns", () => {
            assert.equal(compile(parse("]{a/b")), "\\]{a/b");
            assert.equal(compile(parse("]{a/b"), { escapeInvalid: true }), "\\]\\{a/b");
        });

        it("should escape non-brace patterns (no sets or ranges)", () => {
            assert.equal(compile(parse("]{a/b}")), "\\]{a/b}");
            assert.equal(compile(parse("]{a/b}"), { escapeInvalid: true }), "\\]\\{a/b\\}");
        });
    });
});
