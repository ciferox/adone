import nm from "./support/match";

const isWindows = require("is-windows");

describe("glob", "match", "minimal", "negation", () => {
    it("should negate files with extensions:", () => {
        nm([".md"], "!.md", []);
        nm(["a.js", "b.md", "c.txt"], "!**/*.md", ["a.js", "c.txt"]);
        nm(["a.js", "b.md", "c.txt"], "!*.md", ["a.js", "c.txt"]);
        nm(["abc.md", "abc.txt"], "!*.md", ["abc.txt"]);
        nm(["foo.md"], "!*.md", []);
        nm(["foo.md"], "!.md", ["foo.md"]);
    });

    it("should only treat leading exclamation as special", () => {
        nm(["foo!.md", "bar.md"], "foo!.md", ["foo!.md"]);
        nm(["foo!.md", "bar.md"], "*.md", ["foo!.md", "bar.md"]);
        nm(["foo!.md", "bar.md"], "*!.md", ["foo!.md"]);
        nm(["foobar.md"], "*b*.md", ["foobar.md"]);
        nm(["foo!bar.md", "foo!.md", "!foo!.md"], "*!*.md", ["foo!bar.md", "foo!.md", "!foo!.md"]);
        nm(["foo!bar.md", "foo!.md", "!foo!.md"], "\\!*!*.md", ["!foo!.md"]);
        nm(["foo!.md", "ba!r.js"], "**/*!*.*", ["foo!.md", "ba!r.js"]);
    });

    it('should support negated globs ("*")', () => {
        nm(["a.js", "b.txt", "c.md"], "!*.md", ["a.js", "b.txt"]);
        nm(["a/a/a.js", "a/b/a.js", "a/c/a.js"], "!a/*/a.js", []);
        nm(["a/a/a/a.js", "b/a/b/a.js", "c/a/c/a.js"], "!a/*/*/a.js", ["b/a/b/a.js", "c/a/c/a.js"]);
        nm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/a*.txt", ["a/b.txt", "a/c.txt"]);
        nm(["a.a.txt", "a.b.txt", "a.c.txt"], "!a.a*.txt", ["a.b.txt", "a.c.txt"]);
        nm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/*.txt", []);
    });

    it('should support negated globstars ("**")', () => {
        nm(["a.js", "b.txt", "c.md"], "!*.md", ["a.js", "b.txt"]);
        nm(["a/a/a.js", "a/b/a.js", "a/c/a.js", "a/a/b.js"], "!**/a.js", ["a/a/b.js"]);
        nm(["a/a/a/a.js", "b/a/b/a.js", "c/a/c/a.js"], "!a/**/a.js", ["b/a/b/a.js", "c/a/c/a.js"]);
        nm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/b.txt", ["a/a.txt", "a/c.txt"]);
        nm(["a/b.js", "a.js", "a/b.md", "a.md"], "!**/*.md", ["a/b.js", "a.js"]);
        nm(["a/b.js", "a.js", "a/b.md", "a.md"], "**/*.md", ["a/b.md", "a.md"]);

        nm(["a/b.js"], "!**/*.md", ["a/b.js"]);
        nm(["a.js"], "!**/*.md", ["a.js"]);
        nm(["a/b.md"], "!**/*.md", []);
        nm(["a.md"], "!**/*.md", []);

        nm(["a/b.js"], "!*.md", ["a/b.js"]);
        nm(["a.js"], "!*.md", ["a.js"]);
        nm(["a/b.md"], "!*.md", ["a/b.md"]);
        nm(["a.md"], "!*.md", []);

        nm(["a.js"], "!**/*.md", ["a.js"]);
        nm(["b.md"], "!**/*.md", []);
        nm(["c.txt"], "!**/*.md", ["c.txt"]);
    });

    it("should negate dotfiles:", () => {
        nm([".dotfile.md"], "!*.md", { dot: true }, []);
        nm([".dotfile.md"], "!*.md", [".dotfile.md"]);
        nm([".dotfile.txt"], "!*.md", [".dotfile.txt"]);
        nm([".dotfile.txt", "a/b/.dotfile"], "!*.md", [".dotfile.txt", "a/b/.dotfile"]);
        nm([".gitignore", "a", "b"], "!.gitignore", ["a", "b"]);
    });

    it("should negate files in the immediate directory:", () => {
        nm(["a/b.js", "a.js", "a/b.md", "a.md"], "!*.md", ["a/b.js", "a.js", "a/b.md"]);
    });

    it("should support any number of leading exclamations", () => {
        nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!a*", ["a!b"]);
        nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!a*", ["a!b"]);
        nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!!a*", ["a!b"]);
        if (!isWindows()) {
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
        } else {
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!a*", ["d", "e", "!ab", "!abc", "/!a"]);
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!a*", ["d", "e", "!ab", "!abc", "/!a"]);
            nm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!a*", ["d", "e", "!ab", "!abc", "/!a"]);
        }
    });

    it("should not give special meaning to non-leading exclamations", () => {
        nm(["a", "aa", "a/b", "a!b", "a!!b", "a/!!/b"], "a!!b", ["a!!b"]);
    });

    it("should negate files in any directory:", () => {
        nm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/b.txt", ["a/a.txt", "a/c.txt"]);
    });
});
