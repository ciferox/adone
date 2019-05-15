const match = require("./support/match");
const { isMatch } = adone.glob.match.picomatch;

describe("options.ignore", () => {
    it("should not match ignored patterns", () => {
        assert(isMatch("a+b/src/glimini.js", "a+b/src/*.js", { ignore: ["**/f*"] }));
        assert(!isMatch("a+b/src/glimini.js", "a+b/src/*.js", { ignore: ["**/g*"] }));
        assert(isMatch("+b/src/glimini.md", "+b/src/*", { ignore: ["**/*.js"] }));
        assert(!isMatch("+b/src/glimini.js", "+b/src/*", { ignore: ["**/*.js"] }));
    });

    const negations = ["a/a", "a/b", "a/c", "a/d", "a/e", "b/a", "b/b", "b/c"];
    const globs = [".a", ".a/a", ".a/a/a", ".a/a/a/a", "a", "a/.a", "a/a", "a/a/.a", "a/a/a", "a/a/a/a", "a/a/a/a/a", "a/a/b", "a/b", "a/b/c", "a/c", "a/x", "b", "b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "x/y", "z/z", "z/z/z"].sort();

    it("should filter out ignored patterns", () => {
        const opts = { ignore: ["a/**"], strictSlashes: true };
        const dotOpts = { ...opts, dot: true };

        assert.deepEqual(match(globs, "*", opts), ["b"]);
        assert.deepEqual(match(globs, "*", { ignore: "**/a" }), ["b"]);
        assert.deepEqual(match(globs, "*/*", opts), ["x/y", "z/z"]);
        assert.deepEqual(match(globs, "*/*/*", opts), ["b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "z/z/z"]);
        assert.deepEqual(match(globs, "*/*/*/*", opts), []);
        assert.deepEqual(match(globs, "*/*/*/*/*", opts), []);
        assert.deepEqual(match(globs, "a/*", opts), []);
        assert.deepEqual(match(globs, "**/*/x", opts), ["x/x/x"]);
        assert.deepEqual(match(globs, "**/*/[b-z]", opts), ["b/b/b", "b/b/c", "c/c/c", "e/f/g", "x/x/x", "x/y", "z/z", "z/z/z"]);

        assert.deepEqual(match(globs, "*", { ignore: "**/a", dot: true }), [".a", "b"]);
        assert.deepEqual(match(globs, "*", dotOpts), [".a", "b"]);
        assert.deepEqual(match(globs, "*/*", dotOpts), [".a/a", "x/y", "z/z"].sort());
        assert.deepEqual(match(globs, "*/*/*", dotOpts), [".a/a/a", "b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "z/z/z"].sort());
        assert.deepEqual(match(globs, "*/*/*/*", dotOpts), [".a/a/a/a"]);
        assert.deepEqual(match(globs, "*/*/*/*/*", dotOpts), []);
        assert.deepEqual(match(globs, "a/*", dotOpts), []);
        assert.deepEqual(match(globs, "**/*/x", dotOpts), ["x/x/x"]);

        // see https://github.com/jonschlinkert/micromatch/issues/79
        assert.deepEqual(match(["foo.js", "a/foo.js"], "**/foo.js"), ["foo.js", "a/foo.js"]);
        assert.deepEqual(match(["foo.js", "a/foo.js"], "**/foo.js", { dot: true }), ["foo.js", "a/foo.js"]);

        assert.deepEqual(match(negations, "!b/a", opts), ["b/b", "b/c"]);
        assert.deepEqual(match(negations, "!b/(a)", opts), ["b/b", "b/c"]);
        assert.deepEqual(match(negations, "!(b/(a))", opts), ["b/b", "b/c"]);
        assert.deepEqual(match(negations, "!(b/a)", opts), ["b/b", "b/c"]);

        assert.deepEqual(match(negations, "**"), negations, "nothing is ignored");
        assert.deepEqual(match(negations, "**", { ignore: ["*/b", "*/a"] }), ["a/c", "a/d", "a/e", "b/c"]);
        assert.deepEqual(match(negations, "**", { ignore: ["**"] }), []);
    });
});
