const { glob: { match: { minimal: nm } } } = adone;

describe("glob", "match", "minimal", ".any()", () => {
    describe("empty patterns", () => {
        it("should correctly handle empty patterns", () => {
            assert(!nm.any("", ""));
            assert(!nm.any("", [""]));
            assert(!nm.any(".", ""));
            assert(!nm.any(".", [""]));
            assert(!nm.any("./", ""));
            assert(!nm.any("./", [""]));
            assert(!nm.any("a", ""));
            assert(!nm.any("a", [""]));
            assert(!nm.any("ab", ""));
            assert(!nm.any("ab", [""]));
        });
    });

    describe("non-globs", () => {
        it("should match literal paths", () => {
            assert(!nm.any("aaa", "aa"));
            assert(nm.any("aaa", "aaa"));
            assert(nm.any("aaa", ["aa", "aaa"]));
            assert(nm.any("aaa/bbb", "aaa/bbb"));
            assert(nm.any("aaa/bbb", "aaa[/]bbb"));
            assert(nm.any("aaa/bbb", ["aaa\\bbb", "aaa/bbb"]));
            assert(nm.any("aaa\\bbb", ["aaa\\bbb", "aaa/bbb"]));
        });
    });

    describe("stars (single pattern)", () => {
        it("should return true when one of the given patterns matches the string", () => {
            assert(!nm.any("/ab", "*/*"));
            assert(!nm.any("a/.b", "a/"));
            assert(!nm.any("a/b/c/d/e/z/c.md", "b/c/d/e"));
            assert(!nm.any("a/b/z/.a", "b/z"));
            assert(nm.any(".", "."));
            assert(nm.any("/ab", "/*"));
            assert(nm.any("/ab", "/??"));
            assert(nm.any("/ab", "/?b"));
            assert(nm.any("/cd", "/*"));
            assert(nm.any("a", "a"));
            assert(nm.any("a/.b", "a/.*"));
            assert(nm.any("a/b", "?/?"));
            assert(nm.any("a/b/c/d/e/j/n/p/o/z/c.md", "a/**/j/**/z/*.md"));
            assert(nm.any("a/b/c/d/e/z/c.md", "a/**/z/*.md"));
            assert(nm.any("a/b/c/xyz.md", "a/b/c/*.md"));
            assert(nm.any("a/b/c/xyz.md", ["foo", "a/b/c/*.md"]));
            assert(nm.any("a/b/z/.a", "a/*/z/.a"));
            assert(nm.any("a/bb.bb/aa/b.b/aa/c/xyz.md", "a/**/c/*.md"));
            assert(nm.any("a/bb.bb/aa/bb/aa/c/xyz.md", "a/**/c/*.md"));
            assert(nm.any("a/bb.bb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.any("a/bb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.any("a/bbbb/c/xyz.md", "a/*/c/*.md"));
            assert(nm.any("aaa", ["foo", "*"]));
            assert(nm.any("ab", "*"));
            assert(nm.any("ab", "./*"));
            assert(nm.any("ab", "ab"));
            assert(nm.any("ab/", "./*/"));
        });

        it("should return false when the path does not match the pattern", () => {
            assert(!nm.any("/ab", "*/"));
            assert(!nm.any("/ab", "*/*"));
            assert(!nm.any("/ab", "*/a"));
            assert(!nm.any("/ab", "/"));
            assert(!nm.any("/ab", "/?"));
            assert(!nm.any("/ab", "/a"));
            assert(!nm.any("/ab", "?/?"));
            assert(!nm.any("/ab", "a/*"));
            assert(!nm.any("a/.b", "a/"));
            assert(!nm.any("a/b/c", "a/*"));
            assert(!nm.any("a/b/c", "a/b"));
            assert(!nm.any("a/b/c/d/e/z/c.md", "b/c/d/e"));
            assert(!nm.any("a/b/z/.a", "b/z"));
            assert(!nm.any("ab", "*/*"));
            assert(!nm.any("ab", "/a"));
            assert(!nm.any("ab", "a"));
            assert(!nm.any("ab", "b"));
            assert(!nm.any("ab", "c"));
            assert(!nm.any("ab/", "*/*"));
            assert(!nm.any("abcd", "ab"));
            assert(!nm.any("abcd", "bc"));
            assert(!nm.any("abcd", "c"));
            assert(!nm.any("abcd", "cd"));
            assert(!nm.any("abcd", "d"));
            assert(!nm.any("abcd", "f"));
            assert(!nm.any("ef", "/*"));
        });

        it("should match a path segment for each single star", () => {
            assert(!nm.any("aaa", "*/*/*"));
            assert(!nm.any("aaa/bb/aa/rr", "*/*/*"));
            assert(!nm.any("aaa/bba/ccc", "aaa*"));
            assert(!nm.any("aaa/bba/ccc", "aaa**"));
            assert(!nm.any("aaa/bba/ccc", "aaa/*"));
            assert(!nm.any("aaa/bba/ccc", "aaa/*ccc"));
            assert(!nm.any("aaa/bba/ccc", "aaa/*z"));
            assert(!nm.any("aaa/bbb", "*/*/*"));
            assert(!nm.any("ab/zzz/ejkl/hi", "*/*jk*/*i"));
            assert(nm.any("aaa/bba/ccc", "*/*/*"));
            assert(nm.any("aaa/bba/ccc", "aaa/**"));
            assert(nm.any("aaa/bbb", "aaa/*"));
            assert(nm.any("ab/zzz/ejkl/hi", "*/*z*/*/*i"));
            assert(nm.any("abzzzejklhi", "*j*i"));
        });

        it("should regard non-exclusive double-stars as single stars", () => {
            assert(!nm.any("aaa/bba/ccc", "aaa/**ccc"));
            assert(!nm.any("aaa/bba/ccc", "aaa/**z"));
        });

        it("should return false when full file paths are not matched:", () => {
            assert(!nm.any("a/.b", "a/**/z/*.md"));
            assert(!nm.any("a/b/c/j/e/z/c.txt", "a/**/j/**/z/*.md"));
            assert(!nm.any("a/b/c/xyz.md", "a/b/**/c{d,e}/**/xyz.md"));
            assert(!nm.any("a/b/d/xyz.md", "a/b/**/c{d,e}/**/xyz.md"));
            assert(!nm.any("a/b/z/.a", "a/**/z/*.a"));
            assert(!nm.any("a/b/z/.a", "a/*/z/*.a"));
            assert(!nm.any("a/b/z/.a", "b/a"));
        });
    });

    describe("stars (multiple patterns)", () => {
        it("should return true when any of the patterns match", () => {
            assert(nm.any(".", [".", "foo"]));
            assert(nm.any("a", ["a", "foo"]));
            assert(nm.any("ab", ["*", "foo", "bar"]));
            assert(nm.any("ab", ["*b", "foo", "bar"]));
            assert(nm.any("ab", ["./*", "foo", "bar"]));
            assert(nm.any("ab", ["a*", "foo", "bar"]));
            assert(nm.any("ab", ["ab", "foo"]));
        });

        it("should return false when none of the patterns match", () => {
            assert(!nm.any("/ab", ["/a", "foo"]));
            assert(!nm.any("/ab", ["?/?", "foo", "bar"]));
            assert(!nm.any("/ab", ["a/*", "foo", "bar"]));
            assert(!nm.any("a/b/c", ["a/b", "foo"]));
            assert(!nm.any("ab", ["*/*", "foo", "bar"]));
            assert(!nm.any("ab", ["/a", "foo", "bar"]));
            assert(!nm.any("ab", ["a", "foo"]));
            assert(!nm.any("ab", ["b", "foo"]));
            assert(!nm.any("ab", ["c", "foo", "bar"]));
            assert(!nm.any("abcd", ["ab", "foo"]));
            assert(!nm.any("abcd", ["bc", "foo"]));
            assert(!nm.any("abcd", ["c", "foo"]));
            assert(!nm.any("abcd", ["cd", "foo"]));
            assert(!nm.any("abcd", ["d", "foo"]));
            assert(!nm.any("abcd", ["f", "foo", "bar"]));
            assert(!nm.any("ef", ["/*", "foo", "bar"]));
        });
    });

    describe("file extensions", () => {
        it("should match files that contain the given extension:", () => {
            assert(nm.any(".c.md", ".*.md"));
            assert(nm.any("a/b/c.md", "**/*.md"));
            assert(nm.any("a/b/c.md", "a/*/*.md"));
            assert(nm.any("c.md", "*.md"));
        });

        it("should not match files that do not contain the given extension:", () => {
            assert(!nm.any(".c.md", "*.md"));
            assert(!nm.any(".c.md", ".c."));
            assert(!nm.any(".c.md", ".md"));
            assert(!nm.any(".md", "*.md"));
            assert(!nm.any(".md", ".m"));
            assert(!nm.any("a/b/c.md", "*.md"));
            assert(!nm.any("a/b/c.md", ".md"));
            assert(!nm.any("a/b/c.md", "a/*.md"));
            assert(!nm.any("a/b/c/c.md", "*.md"));
            assert(!nm.any("a/b/c/c.md", "c.js"));
        });
    });

    describe("dot files", () => {
        it("should match dotfiles when a dot is explicitly defined in the pattern:", () => {
            assert(nm.any(".a", ".a"));
            assert(nm.any(".ab", ".*"));
            assert(nm.any(".ab", ".a*"));
            assert(nm.any(".b", ".b*"));
            assert(nm.any(".md", ".md"));
            assert(nm.any("a/.c.md", "a/.c.md"));
            assert(nm.any("a/b/c/.xyz.md", "a/b/c/.*.md"));
            assert(nm.any("a/b/c/d.a.md", "a/b/c/*.md"));
        });

        it("should match leading `./` when `**` is in the pattern", () => {
            assert(nm.any("./a", "a"));
            assert(nm.any(".ab", ".*"));
            assert(nm.any(".ab", ".a*"));
            assert(nm.any(".b", ".b*"));
            assert(nm.any(".md", ".md"));
            assert(nm.any("a/.c.md", "a/.c.md"));
            assert(nm.any("a/b/c/.xyz.md", "a/b/c/.*.md"));
            assert(nm.any("a/b/c/d.a.md", "a/b/c/*.md"));
        });

        it("should not match dotfiles when a dot is not defined in the pattern:", () => {
            assert(!nm.any(".abc", ".a"));
            assert(!nm.any(".c.md", "*.md"));
            assert(!nm.any("a/.c.md", "*.md"));
        });

        it("should match dotfiles when `dot` is set:", () => {
            assert(!nm.any("a/b/c/.xyz.md", ".*.md", { dot: true }));
            assert(nm.any(".c.md", "*.md", { dot: true }));
            assert(nm.any(".c.md", ".*", { dot: true }));
            assert(nm.any("a/b/c/.xyz.md", "**/*.md", { dot: true }));
            assert(nm.any("a/b/c/.xyz.md", "**/.*.md", { dot: true }));
            assert(nm.any("a/b/c/.xyz.md", "a/b/c/*.md", { dot: true }));
            assert(nm.any("a/b/c/.xyz.md", "a/b/c/.*.md", { dot: true }));
        });

        it("should not match dotfiles when `dot` is not set:", () => {
            assert(!nm.any(".a", "*.md"));
            assert(!nm.any(".ba", ".a"));
            assert(!nm.any(".a.md", "a/b/c/*.md"));
            assert(!nm.any(".ab", "*.*"));
            assert(!nm.any(".md", "a/b/c/*.md"));
            assert(!nm.any(".txt", ".md"));
            assert(!nm.any(".verb.txt", "*.md"));
            assert(!nm.any("a/b/d/.md", "a/b/c/*.md"));
        });
    });

    describe("qmarks", () => {
        it("question marks should not match slashes:", () => {
            assert(!nm.any("aaa/bbb", "aaa?bbb"));
        });
    });

    describe("dot-slash", () => {
        it("should match paths with leading `./`:", () => {
            assert(!nm.any("./.a", "a/**/z/*.md"));
            assert(!nm.any("./a/b/c/d/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(!nm.any("./a/b/c/j/e/z/c.txt", "./a/**/j/**/z/*.md"));
            assert(nm.any("./a/b/c/d/e/j/n/p/o/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.any("./a/b/c/d/e/z/c.md", "./a/**/z/*.md"));
            assert(nm.any("./a/b/c/d/e/z/c.md", "a/**/z/*.md"));
            assert(nm.any("./a/b/c/j/e/z/c.md", "./a/**/j/**/z/*.md"));
            assert(nm.any("./a/b/c/j/e/z/c.md", "a/**/j/**/z/*.md"));
            assert(nm.any("./a/b/z/.a", "./a/**/z/.a"));
            assert(nm.any("./a/b/z/.a", "a/**/z/.a"));
        });
    });
});
