import mm from "./support/match";

describe("glob", "match", "globstars", () => {
    it("should support globstars (**)", () => {
        const fixtures = [".a/a", "a/a", "aa/a", "aaa/a", "aab/a", "a/.a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z", "a/../a", "ab/../ac", "../a", "a", "../../b", "../c", "../c/d"];

        mm(fixtures, "**", ["a", "a/a", "aa/a", "aaa/a", "aab/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "**/**", ["a", "a/a", "aa/a", "aaa/a", "aab/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "**/", []);
        mm(fixtures, "**/**/*", ["a", "a/a", "aa/a", "aaa/a", "aab/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "**/**/x", ["a/x"]);
        mm(fixtures, "**/x", ["a/x"]);
        mm(fixtures, "**/x/*", ["a/x/y"]);
        mm(fixtures, "*/x/**", ["a/x/y", "a/x/y/z"]);
        mm(fixtures, "**/x/**", ["a/x/y", "a/x/y/z"]);
        mm(fixtures, "**/x/*/*", ["a/x/y/z"]);
        mm(fixtures, "a/**", ["a/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "a/**/*", ["a/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "a/**/**/*", ["a/a", "a/b", "a/c", "a/x", "a/x/y", "a/x/y/z"]);
        mm(fixtures, "b/**", []);

        assert(!mm.isMatch("a/b", "a/**/"));
        assert(!mm.isMatch("a/b/.js/c.txt", "**/*"));
        assert(!mm.isMatch("a/b/c/d", "a/**/"));
        assert(!mm.isMatch("a/bb", "a/**/"));
        assert(!mm.isMatch("a/cb", "a/**/"));
        assert(mm.isMatch("/a/b", "/**"));
        assert(mm.isMatch("a.b", "**/*"));
        assert(mm.isMatch("a.js", "**/*"));
        assert(mm.isMatch("a.js", "**/*.js"));
        assert(mm.isMatch("a.md", "**/*.md"));
        assert(mm.isMatch("a/", "a/**/"));
        assert(mm.isMatch("a/a.js", "**/*.js"));
        assert(mm.isMatch("a/a/b.js", "**/*.js"));
        assert(mm.isMatch("a/b", "a/**/b"));
        assert(mm.isMatch("a/b", "a/**b"));
        assert(mm.isMatch("a/b.md", "**/*.md"));
        assert(mm.isMatch("a/b/c.js", "**/*"));
        assert(mm.isMatch("a/b/c.txt", "**/*"));
        assert(mm.isMatch("a/b/c/d/", "a/**/"));
        assert(mm.isMatch("a/b/c/d/a.js", "**/*"));
        assert(mm.isMatch("a/b/c/z.js", "a/b/**/*.js"));
        assert(mm.isMatch("a/b/z.js", "a/b/**/*.js"));
        assert(mm.isMatch("ab", "**/*"));
        assert(mm.isMatch("ab/a/d", "**/*"));
        assert(mm.isMatch("ab/b", "**/*"));
        assert(mm.isMatch("za.js", "**/*"));
    });

    it("should support multiple globstars in one pattern", () => {
        assert(!mm.isMatch("a/b/c/d/e/z/foo.md", "a/**/j/**/z/*.md"));
        assert(!mm.isMatch("a/b/c/j/e/z/foo.txt", "a/**/j/**/z/*.md"));
        assert(mm.isMatch("a/b/c/d/e/j/n/p/o/z/foo.md", "a/**/j/**/z/*.md"));
        assert(mm.isMatch("a/b/c/d/e/z/foo.md", "a/**/z/*.md"));
        assert(mm.isMatch("a/b/c/j/e/z/foo.md", "a/**/j/**/z/*.md"));
    });

    it("should match dotfiles", () => {
        const fixtures = [".gitignore", "a/b/z/.dotfile", "a/b/z/.dotfile.md", "a/b/z/.dotfile.md", "a/b/z/.dotfile.md"];
        assert(!mm.isMatch(".gitignore", "a/**/z/*.md"));
        assert(!mm.isMatch("a/b/z/.dotfile", "a/**/z/*.md"));
        assert(!mm.isMatch("a/b/z/.dotfile.md", "**/c/.*.md"));
        assert(mm.isMatch("a/b/z/.dotfile.md", "**/.*.md"));
        assert(mm.isMatch("a/b/z/.dotfile.md", "a/**/z/.*.md"));
        mm(fixtures, "a/**/z/.*.md", ["a/b/z/.dotfile.md"]);
    });

    it("should match file extensions:", () => {
        mm([".md", "a.md", "a/b/c.md", ".txt"], "**/*.md", ["a.md", "a/b/c.md"]);
        mm([".md", "a/b/.md"], "**/.md", [".md", "a/b/.md"]);
    });

    it("should respect trailing slashes on paterns", () => {
        const fixtures = ["a", "a/", "b", "b/", "a/a", "a/a/", "a/b", "a/b/", "a/c", "a/c/", "a/x", "a/x/", "a/a/a", "a/a/b", "a/a/b/", "a/a/a/", "a/a/a/a", "a/a/a/a/", "a/a/a/a/a", "a/a/a/a/a/", "x/y", "z/z", "x/y/", "z/z/", "a/b/c/.d/e/"];

        mm(fixtures, "**/*/a/", ["a/a/", "a/a/a/", "a/a/a/a/", "a/a/a/a/a/"]);
        mm(fixtures, "**/*/a/*/", ["a/a/a/", "a/a/a/a/", "a/a/a/a/a/", "a/a/b/"]);
        mm(fixtures, "**/*/x/", ["a/x/"]);
        mm(fixtures, "**/*/*/*/*/", ["a/a/a/a/", "a/a/a/a/a/"]);
        mm(fixtures, "**/*/*/*/*/*/", ["a/a/a/a/a/"]);
        mm(fixtures, "*a/a/*/", ["a/a/a/", "a/a/b/"]);
        mm(fixtures, "**a/a/*/", ["a/a/a/", "a/a/b/"]);
        mm(fixtures, "**/a/*/*/", ["a/a/a/", "a/a/b/", "a/a/a/a/", "a/a/a/a/a/"]);
        mm(fixtures, "**/a/*/*/*/", ["a/a/a/a/", "a/a/a/a/a/"]);
        mm(fixtures, "**/a/*/*/*/*/", ["a/a/a/a/a/"]);
        mm(fixtures, "**/a/*/a/", ["a/a/a/", "a/a/a/a/", "a/a/a/a/a/"]);
        mm(fixtures, "**/a/*/b/", ["a/a/b/"]);
    });

    it("should match literal globstars when escaped", () => {
        const fixtures = [".md", "**a.md", "**.md", ".md", "**"];
        mm(fixtures, "\\*\\**.md", ["**a.md", "**.md"]);
        mm(fixtures, "\\*\\*.md", ["**.md"]);
    });
});
