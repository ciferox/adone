const { util: { match: { minimal: nm } } } = adone;

describe("util", "match", "minimal", ".isMatch():", () => {
    describe("error handling:", () => {
        it("should throw on bad args", () => {
            assert.throws(() => {
                nm.isMatch({});
            });
        });
    });

    describe("matching:", () => {
        it("should escape plus signs to match string literals", () => {
            assert(nm.isMatch("a+b/src/glimini.js", "a+b/src/*.js"));
            assert(nm.isMatch("+b/src/glimini.js", "+b/src/*.js"));
            assert(nm.isMatch("coffee+/src/glimini.js", "coffee+/src/*.js"));
            assert(nm.isMatch("coffee+/src/glimini.js", "coffee+/src/*.js"));
            assert(nm.isMatch("coffee+/src/glimini.js", "coffee+/src/*"));
        });

        it("should not escape plus signs that follow brackets", () => {
            assert(nm.isMatch("a", "[a]+"));
            assert(nm.isMatch("aa", "[a]+"));
            assert(nm.isMatch("aaa", "[a]+"));
            assert(nm.isMatch("az", "[a-z]+"));
            assert(nm.isMatch("zzz", "[a-z]+"));
        });

        it("should support stars following brackets", () => {
            assert(nm.isMatch("a", "[a]*"));
            assert(nm.isMatch("aa", "[a]*"));
            assert(nm.isMatch("aaa", "[a]*"));
            assert(nm.isMatch("az", "[a-z]*"));
            assert(nm.isMatch("zzz", "[a-z]*"));
        });

        it("should not escape plus signs that follow parens", () => {
            assert(nm.isMatch("a", "(a)+"));
            assert(nm.isMatch("ab", "(a|b)+"));
            assert(nm.isMatch("aa", "(a)+"));
            assert(nm.isMatch("aaab", "(a|b)+"));
            assert(nm.isMatch("aaabbb", "(a|b)+"));
        });

        it("should support stars following parens", () => {
            assert(nm.isMatch("a", "(a)*"));
            assert(nm.isMatch("ab", "(a|b)*"));
            assert(nm.isMatch("aa", "(a)*"));
            assert(nm.isMatch("aaab", "(a|b)*"));
            assert(nm.isMatch("aaabbb", "(a|b)*"));
        });

        it("should not match slashes with single stars", () => {
            assert(!nm.isMatch("a/b", "(a)*"));
            assert(!nm.isMatch("a/b", "[a]*"));
            assert(!nm.isMatch("a/b", "a*"));
            assert(!nm.isMatch("a/b", "(a|b)*"));
        });

        it("should not match dots with stars by default", () => {
            assert(!nm.isMatch(".a", "(a)*"));
            assert(!nm.isMatch(".a", "*[a]*"));
            assert(!nm.isMatch(".a", "*[a]"));
            assert(!nm.isMatch(".a", "*a*"));
            assert(!nm.isMatch(".a", "*a"));
            assert(!nm.isMatch(".a", "*(a|b)"));
        });

        it("should correctly deal with empty globs", () => {
            assert(!nm.isMatch("ab", ""));
            assert(!nm.isMatch("a", ""));
            assert(!nm.isMatch(".", ""));
        });

        it("should match with non-glob patterns", () => {
            assert(nm.isMatch(".", "."));
            assert(nm.isMatch("/a", "/a"));
            assert(!nm.isMatch("/ab", "/a"));
            assert(nm.isMatch("a", "a"));
            assert(!nm.isMatch("ab", "/a"));
            assert(!nm.isMatch("ab", "a"));
            assert(nm.isMatch("ab", "ab"));
            assert(!nm.isMatch("abcd", "cd"));
            assert(!nm.isMatch("abcd", "bc"));
            assert(!nm.isMatch("abcd", "ab"));
        });

        it("should match file names", () => {
            assert(nm.isMatch("a.b", "a.b"));
            assert(nm.isMatch("a.b", "*.b"));
            assert(nm.isMatch("a.b", "a.*"));
            assert(nm.isMatch("a.b", "*.*"));
            assert(nm.isMatch("a-b.c-d", "a*.c*"));
            assert(nm.isMatch("a-b.c-d", "*b.*d"));
            assert(nm.isMatch("a-b.c-d", "*.*"));
            assert(nm.isMatch("a-b.c-d", "*.*-*"));
            assert(nm.isMatch("a-b.c-d", "*-*.*-*"));
            assert(nm.isMatch("a-b.c-d", "*.c-*"));
            assert(nm.isMatch("a-b.c-d", "*.*-d"));
            assert(nm.isMatch("a-b.c-d", "a-*.*-d"));
            assert(nm.isMatch("a-b.c-d", "*-b.c-*"));
            assert(nm.isMatch("a-b.c-d", "*-b*c-*"));

            // false
            assert(!nm.isMatch("a-b.c-d", "*-bc-*"));
        });

        it("should match with conmon glob patterns", () => {
            assert(nm.isMatch("/ab", "/*"));
            assert(nm.isMatch("/cd", "/*"));
            assert(!nm.isMatch("ef", "/*"));
            assert(nm.isMatch("ab", "./*"));
            assert(nm.isMatch("ab/", "./*/"));
            assert(!nm.isMatch("ab", "./*/"));
            assert(nm.isMatch("ab", "*"));
            assert(nm.isMatch("ab", "ab"));
        });

        it("should exactly match leading slash", () => {
            assert(!nm.isMatch("ef", "/*"));
            assert(nm.isMatch("/ef", "/*"));
        });

        it("should match files with the given extension", () => {
            assert(!nm.isMatch(".md", "*.md"));
            assert(nm.isMatch(".md", ".md"));
            assert(!nm.isMatch(".c.md", "*.md"));
            assert(nm.isMatch(".c.md", ".*.md"));
            assert(nm.isMatch("c.md", "*.md"));
            assert(nm.isMatch("c.md", "*.md"));
            assert(!nm.isMatch("a/b/c/c.md", "*.md"));
            assert(!nm.isMatch("a/b/c.md", "a/*.md"));
            assert(nm.isMatch("a/b/c.md", "a/*/*.md"));
            assert(nm.isMatch("a/b/c.md", "**/*.md"));
            assert(nm.isMatch("a/b/c.js", "a/**/*.*"));
        });

        it("should match wildcards", () => {
            assert(!nm.isMatch("a/b/c/z.js", "*.js"));
            assert(!nm.isMatch("a/b/z.js", "*.js"));
            assert(!nm.isMatch("a/z.js", "*.js"));
            assert(nm.isMatch("z.js", "*.js"));

            assert(nm.isMatch("z.js", "z*.js"));
            assert(nm.isMatch("a/z.js", "a/z*.js"));
            assert(nm.isMatch("a/z.js", "*/z*.js"));
        });

        it("should match globstars", () => {
            assert(nm.isMatch("a/b/c/z.js", "**/*.js"));
            assert(nm.isMatch("a/b/z.js", "**/*.js"));
            assert(nm.isMatch("a/z.js", "**/*.js"));
            assert(nm.isMatch("a/b/c/d/e/z.js", "a/b/**/*.js"));
            assert(nm.isMatch("a/b/c/d/z.js", "a/b/**/*.js"));
            assert(nm.isMatch("a/b/c/z.js", "a/b/c/**/*.js"));
            assert(nm.isMatch("a/b/c/z.js", "a/b/c**/*.js"));
            assert(nm.isMatch("a/b/c/z.js", "a/b/**/*.js"));
            assert(nm.isMatch("a/b/z.js", "a/b/**/*.js"));

            assert(!nm.isMatch("a/z.js", "a/b/**/*.js"));
            assert(!nm.isMatch("z.js", "a/b/**/*.js"));

            // issue #23
            assert(!nm.isMatch("zzjs", "z*.js"));
            assert(!nm.isMatch("zzjs", "*z.js"));

            // issue #24
            assert(nm.isMatch("a", "**"));
            assert(!nm.isMatch("a", "a/**"));
            assert(nm.isMatch("a/", "**"));
            assert(nm.isMatch("a/b/c/d", "**"));
            assert(nm.isMatch("a/b/c/d/", "**"));
            assert(nm.isMatch("a/b/c/d/", "**/**"));
            assert(nm.isMatch("a/b/c/d/", "**/b/**"));
            assert(nm.isMatch("a/b/c/d/", "a/b/**"));
            assert(nm.isMatch("a/b/c/d/", "a/b/**/"));
            assert(nm.isMatch("a/b/c/d/", "a/b/**/c/**/"));
            assert(nm.isMatch("a/b/c/d/", "a/b/**/c/**/d/"));
            assert(!nm.isMatch("a/b/c/d/", "a/b/**/f"));
            assert(nm.isMatch("a/b/c/d/e.f", "a/b/**/**/*.*"));
            assert(nm.isMatch("a/b/c/d/e.f", "a/b/**/*.*"));
            assert(nm.isMatch("a/b/c/d/e.f", "a/b/**/c/**/d/*.*"));
            assert(nm.isMatch("a/b/c/d/e.f", "a/b/**/d/**/*.*"));
            assert(nm.isMatch("a/b/c/d/g/e.f", "a/b/**/d/**/*.*"));
            assert(nm.isMatch("a/b/c/d/g/g/e.f", "a/b/**/d/**/*.*"));

            // https://github.com/jonschlinkert/micromatch/issues/15
            assert(nm.isMatch("z.js", "z*"));
            assert(nm.isMatch("z.js", "**/z*"));
            assert(nm.isMatch("z.js", "**/z*.js"));
            assert(nm.isMatch("z.js", "**/*.js"));
            assert(nm.isMatch("foo", "**/foo"));

            assert(nm.isMatch("a/b-c/z.js", "a/b-*/**/z.js"));
            assert(nm.isMatch("a/b-c/d/e/z.js", "a/b-*/**/z.js"));
        });

        it("should match slashes", () => {
            assert(!nm.isMatch("bar/baz/foo", "*/foo"));
            assert(!nm.isMatch("deep/foo/bar", "**/bar/*"));
            assert(!nm.isMatch("deep/foo/bar/baz/x", "*/bar/**"));
            assert(!nm.isMatch("foo", "foo/**"));
            assert(!nm.isMatch("foo/bar", "foo?bar"));
            assert(!nm.isMatch("foo/bar/baz", "**/bar*"));
            assert(!nm.isMatch("foo/bar/baz", "**/bar**"));
            assert(!nm.isMatch("foo/baz/bar", "foo**bar"));
            assert(!nm.isMatch("foo/baz/bar", "foo*bar"));
            assert(nm.isMatch("a/b/j/c/z/x.md", "a/**/j/**/z/*.md"));
            assert(nm.isMatch("a/j/z/x.md", "a/**/j/**/z/*.md"));
            assert(nm.isMatch("bar/baz/foo", "**/foo"));
            assert(nm.isMatch("deep/foo/bar/", "**/bar/**"));
            assert(nm.isMatch("deep/foo/bar/baz", "**/bar/*"));
            assert(nm.isMatch("deep/foo/bar/baz/", "**/bar/*"));
            assert(nm.isMatch("deep/foo/bar/baz/", "**/bar/**"));
            assert(nm.isMatch("deep/foo/bar/baz/x", "**/bar/*/*"));
            assert(nm.isMatch("foo/b/a/z/bar", "foo/**/**/bar"));
            assert(nm.isMatch("foo/b/a/z/bar", "foo/**/bar"));
            assert(nm.isMatch("foo/bar", "foo/**/**/bar"));
            assert(nm.isMatch("foo/bar", "foo/**/bar"));
            assert(nm.isMatch("foo/bar", "foo[/]bar"));
            assert(nm.isMatch("foo/bar/baz/x", "*/bar/**"));
            assert(nm.isMatch("foo/baz/bar", "foo/**/**/bar"));
            assert(nm.isMatch("foo/baz/bar", "foo/**/bar"));
            assert(nm.isMatch("foobazbar", "foo**bar"));
            assert(nm.isMatch("XXX/foo", "**/foo"));
        });

        it("question marks should not match slashes", () => {
            assert(!nm.isMatch("aaa/bbb", "aaa?bbb"));
        });

        it("should not match dotfiles when `dot` or `dotfiles` are not set", () => {
            assert(!nm.isMatch(".c.md", "*.md"));
            assert(!nm.isMatch("a/.c.md", "*.md"));
            assert(nm.isMatch("a/.c.md", "a/.c.md"));
            assert(!nm.isMatch(".a", "*.md"));
            assert(!nm.isMatch(".verb.txt", "*.md"));
            assert(nm.isMatch("a/b/c/.xyz.md", "a/b/c/.*.md"));
            assert(nm.isMatch(".md", ".md"));
            assert(!nm.isMatch(".txt", ".md"));
            assert(nm.isMatch(".md", ".md"));
            assert(nm.isMatch(".a", ".a"));
            assert(nm.isMatch(".b", ".b*"));
            assert(nm.isMatch(".ab", ".a*"));
            assert(nm.isMatch(".ab", ".*"));
            assert(!nm.isMatch(".ab", "*.*"));
            assert(!nm.isMatch(".md", "a/b/c/*.md"));
            assert(!nm.isMatch(".a.md", "a/b/c/*.md"));
            assert(nm.isMatch("a/b/c/d.a.md", "a/b/c/*.md"));
            assert(!nm.isMatch("a/b/d/.md", "a/b/c/*.md"));
        });

        it("should match dotfiles when `dot` or `dotfiles` is set", () => {
            assert(nm.isMatch(".c.md", "*.md", { dot: true }));
            assert(nm.isMatch(".c.md", ".*", { dot: true }));
            assert(nm.isMatch("a/b/c/.xyz.md", "a/b/c/*.md", { dot: true }));
            assert(nm.isMatch("a/b/c/.xyz.md", "a/b/c/.*.md", { dot: true }));
        });

        it("should match file paths", () => {
            assert(nm.isMatch("a/b/c/xyz.md", "a/b/c/*.md"));
            assert(nm.isMatch("a/bb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.isMatch("a/bbbb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.isMatch("a/bb.bb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.isMatch("a/bb.bb/aa/bb/aa/c/xyz.md", "a/**/c/*.md"));
            assert(nm.isMatch("a/bb.bb/aa/b.b/aa/c/xyz.md", "a/**/c/*.md"));
        });

        it("should match full file paths", () => {
            assert(!nm.isMatch("a/.b", "a/**/z/*.md"));
            assert(nm.isMatch("a/.b", "a/.*"));
            assert(!nm.isMatch("a/b/z/.a", "a/**/z/*.a"));
            assert(!nm.isMatch("a/b/z/.a", "a/*/z/*.a"));
            assert(nm.isMatch("a/b/z/.a", "a/*/z/.a"));
            assert(nm.isMatch("a/b/c/d/e/z/c.md", "a/**/z/*.md"));
            assert(nm.isMatch("a/b/c/d/e/j/n/p/o/z/c.md", "a/**/j/**/z/*.md"));
            assert(!nm.isMatch("a/b/c/j/e/z/c.txt", "a/**/j/**/z/*.md"));
        });

        it("should match paths with leading `./` when pattern has `./`", () => {
            assert(nm.isMatch("./a/b/c/d/e/j/n/p/o/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/d/e/z/c.md", "./a/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/j/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.isMatch("./a/b/z/.a", "./a/**/z/.a"));
            // sanity checks
            assert(!nm.isMatch("./a/b/c/d/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(!nm.isMatch("./a/b/c/j/e/z/c.txt", "./a/**/j/**/z/*.md"));
        });

        it("should match paths with leading `./`", () => {
            assert(!nm.isMatch("./.a", "*.a"));
            assert(!nm.isMatch("./.a", "./*.a"));
            assert(!nm.isMatch("./.a", "a/**/z/*.md"));
            assert(!nm.isMatch("./a/b/c/d/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(!nm.isMatch("./a/b/c/j/e/z/c.txt", "./a/**/j/**/z/*.md"));
            assert(!nm.isMatch("a/b/c/d/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.isMatch("./.a", "./.a"));
            assert(nm.isMatch("./a/b/c.md", "a/**/*.md"));
            assert(nm.isMatch("./a/b/c/d/e/j/n/p/o/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/d/e/z/c.md", "**/*.md"));
            assert(nm.isMatch("./a/b/c/d/e/z/c.md", "./a/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/d/e/z/c.md", "a/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/j/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.isMatch("./a/b/c/j/e/z/c.md", "a/**/j/**/z/*.md"));
            assert(nm.isMatch("./a/b/z/.a", "./a/**/z/.a"));
            assert(nm.isMatch("./a/b/z/.a", "a/**/z/.a"));
            assert(nm.isMatch(".a", "./.a"));
            assert(nm.isMatch("a/b/c.md", "./a/**/*.md"));
            assert(nm.isMatch("a/b/c.md", "a/**/*.md"));
            assert(nm.isMatch("a/b/c/d/e/z/c.md", "a/**/z/*.md"));
            assert(nm.isMatch("a/b/c/j/e/z/c.md", "a/**/j/**/z/*.md"));
        });
    });
});
