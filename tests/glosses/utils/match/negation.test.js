import mm from "./support/match";

const isWindows = require("is-windows");

describe("util", "match", "negation", () => {
    it("should negate files with extensions:", () => {
        mm([".md"], "!.md", []);
        mm(["a.js", "b.md", "c.txt"], "!**/*.md", ["a.js", "c.txt"]);
        mm(["a.js", "b.md", "c.txt"], "!*.md", ["a.js", "c.txt"]);
        mm(["abc.md", "abc.txt"], "!*.md", ["abc.txt"]);
        mm(["foo.md"], "!*.md", []);
        mm(["foo.md"], "!.md", ["foo.md"]);
    });

    it("should only treat leading exclamation as special", () => {
        mm(["foo!.md", "bar.md"], "foo!.md", ["foo!.md"]);
        mm(["foo!.md", "bar.md"], "*.md", ["foo!.md", "bar.md"]);
        mm(["foo!.md", "bar.md"], "*!.md", ["foo!.md"]);
        mm(["foobar.md"], "*b*.md", ["foobar.md"]);
        mm(["foo!bar.md", "foo!.md", "!foo!.md"], "*!*.md", ["foo!bar.md", "foo!.md", "!foo!.md"]);
        mm(["foo!bar.md", "foo!.md", "!foo!.md"], "\\!*!*.md", ["!foo!.md"]);
        mm(["foo!.md", "ba!r.js"], "**/*!*.*", ["foo!.md", "ba!r.js"]);
    });

    it("should support negated file names", () => {
        mm(["bar", "baz", "foo"], "!foo", ["bar", "baz"]);
        mm(["bar", "baz", "foo"], ["!foo"], ["bar", "baz"]);
        mm(["bar", "baz", "foo"], ["!foo", "bar"], ["bar"]);
        mm(["bar", "baz", "foo"], ["bar", "!foo", "!bar"], []);
        mm(["bar", "baz", "foo"], ["!bar", "bar"], []);
        mm(["bar", "baz", "foo"], ["!bar", "bar", "*"], ["baz", "foo"]);
    });

    it('should support negated globs ("*")', () => {
        mm(["a.js", "b.txt", "c.md"], "!*.md", ["a.js", "b.txt"]);
        mm(["a/a/a.js", "a/b/a.js", "a/c/a.js"], "!a/*/a.js", []);
        mm(["a/a/a/a.js", "b/a/b/a.js", "c/a/c/a.js"], "!a/*/*/a.js", ["b/a/b/a.js", "c/a/c/a.js"]);
        mm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/a*.txt", ["a/b.txt", "a/c.txt"]);
        mm(["a.a.txt", "a.b.txt", "a.c.txt"], "!a.a*.txt", ["a.b.txt", "a.c.txt"]);
        mm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/*.txt", []);
    });

    it('should support negated globstars ("**")', () => {
        mm(["a.js", "b.txt", "c.md"], "!*.md", ["a.js", "b.txt"]);
        mm(["a/a/a.js", "a/b/a.js", "a/c/a.js", "a/a/b.js"], "!**/a.js", ["a/a/b.js"]);
        mm(["a/a/a/a.js", "b/a/b/a.js", "c/a/c/a.js"], "!a/**/a.js", ["b/a/b/a.js", "c/a/c/a.js"]);
        mm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/b.txt", ["a/a.txt", "a/c.txt"]);
        mm(["a/b.js", "a.js", "a/b.md", "a.md"], "!**/*.md", ["a/b.js", "a.js"]);
        mm(["a/b.js", "a.js", "a/b.md", "a.md"], "**/*.md", ["a/b.md", "a.md"]);

        mm(["a/b.js"], "!**/*.md", ["a/b.js"]);
        mm(["a.js"], "!**/*.md", ["a.js"]);
        mm(["a/b.md"], "!**/*.md", []);
        mm(["a.md"], "!**/*.md", []);

        mm(["a/b.js"], "!*.md", ["a/b.js"]);
        mm(["a.js"], "!*.md", ["a.js"]);
        mm(["a/b.md"], "!*.md", ["a/b.md"]);
        mm(["a.md"], "!*.md", []);

        mm(["a.js"], "!**/*.md", ["a.js"]);
        mm(["b.md"], "!**/*.md", []);
        mm(["c.txt"], "!**/*.md", ["c.txt"]);
    });

    it("should negate dotfiles:", () => {
        mm([".dotfile.md"], "!*.md", { dot: true }, []);
        mm([".dotfile.md"], "!*.md", [".dotfile.md"]);
        mm([".dotfile.txt"], "!*.md", [".dotfile.txt"]);
        mm([".dotfile.txt", "a/b/.dotfile"], "!*.md", [".dotfile.txt", "a/b/.dotfile"]);
        mm([".gitignore", "a", "b"], "!.gitignore", ["a", "b"]);
    });

    it("should negate files in the immediate directory:", () => {
        mm(["a/b.js", "a.js", "a/b.md", "a.md"], "!*.md", ["a/b.js", "a.js", "a/b.md"]);
    });

    it("should support any number of leading exclamations", () => {
        mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!a*", ["a!b"]);
        mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!a*", ["a!b"]);
        mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!!a*", ["a!b"]);
        if (!isWindows()) {
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!a*", ["d", "e", "!ab", "!abc", "\\!a"]);
        } else {
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!!!a*", ["d", "e", "!ab", "!abc", "/!a"]);
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!a*", ["d", "e", "!ab", "!abc", "/!a"]);
            mm(["d", "e", "!ab", "!abc", "a!b", "\\!a"], "!!!a*", ["d", "e", "!ab", "!abc", "/!a"]);
        }
    });

    it("should not give special meaning to non-leading exclamations", () => {
        mm(["a", "aa", "a/b", "a!b", "a!!b", "a/!!/b"], "a!!b", ["a!!b"]);
    });

    it("should negate files in any directory:", () => {
        mm(["a/a.txt", "a/b.txt", "a/c.txt"], "!a/b.txt", ["a/a.txt", "a/c.txt"]);
    });
});
