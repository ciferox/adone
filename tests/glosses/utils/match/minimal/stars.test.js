import nm from "./support/match";

describe("util", "match", "minimal", "stars", () => {
    it("should match one directory level with a single star (*)", () => {
        const fixtures = ["/a", "/a/", "/b", "a", "a/", "b", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        nm(fixtures, "*", ["a", "b", "a/"]);
        nm(fixtures, "/*", ["/a", "/b", "/a/"]);
        nm(fixtures, "*/", ["a/"]);
        nm(fixtures, "/*/", ["/a/"]);
        nm(fixtures, "*/*", ["a/a", "a/b", "a/c", "a/x", "x/y", "z/z"]);
        nm(fixtures, "*/*/*", ["a/a/a", "a/a/b"]);
        nm(fixtures, "*/*/*/*", ["a/a/a/a"]);
        nm(fixtures, "*/*/*/*/*", ["a/a/a/a/a"]);
        nm(fixtures, "a/*", ["a/a", "a/b", "a/c", "a/x"]);
        nm(fixtures, "a/*/*", ["a/a/a", "a/a/b"]);
        nm(fixtures, "a/*/*/*", ["a/a/a/a"]);
        nm(fixtures, "a/*/*/*/*", ["a/a/a/a/a"]);
        nm(fixtures, "a/*/a", ["a/a/a"]);
        nm(fixtures, "a/*/b", ["a/a/b"]);
    });

    it("should match one or more characters", () => {
        const fixtures = ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        nm(fixtures, "*", ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac"]);
        nm(fixtures, "a*", ["a", "aa", "aaa", "aaaa", "ab"]);
        nm(fixtures, "*b", ["ab", "b", "bb"]);
    });

    it("should match one or zero characters", () => {
        const fixtures = ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        nm(fixtures, "*", ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac"]);
        nm(fixtures, "*a*", ["a", "aa", "aaa", "aaaa", "ab", "cac"]);
        nm(fixtures, "*b*", ["ab", "b", "bb"]);
        nm(fixtures, "*c*", ["c", "cc", "cac"]);
    });

    it("should respect trailing slashes on paterns", () => {
        const fixtures = ["a", "a/", "b", "b/", "a/a", "a/a/", "a/b", "a/b/", "a/c", "a/c/", "a/x", "a/x/", "a/a/a", "a/a/b", "a/a/b/", "a/a/a/", "a/a/a/a", "a/a/a/a/", "a/a/a/a/a", "a/a/a/a/a/", "x/y", "z/z", "x/y/", "z/z/", "a/b/c/.d/e/"];
        nm(fixtures, "*/", ["a/", "b/"]);
        nm(fixtures, "*/*/", ["a/a/", "a/b/", "a/c/", "a/x/", "x/y/", "z/z/"]);
        nm(fixtures, "*/*/*/", ["a/a/a/", "a/a/b/"]);
        nm(fixtures, "*/*/*/*/", ["a/a/a/a/"]);
        nm(fixtures, "*/*/*/*/*/", ["a/a/a/a/a/"]);
        nm(fixtures, "a/*/", ["a/a/", "a/b/", "a/c/", "a/x/"]);
        nm(fixtures, "a/*/*/", ["a/a/a/", "a/a/b/"]);
        nm(fixtures, "a/*/*/*/", ["a/a/a/a/"]);
        nm(fixtures, "a/*/*/*/*/", ["a/a/a/a/a/"]);
        nm(fixtures, "a/*/a/", ["a/a/a/"]);
        nm(fixtures, "a/*/b/", ["a/a/b/"]);
    });

    it("should match a literal star when escaped", () => {
        const fixtures = [".md", "a**a.md", "**a.md", "**/a.md", "**.md", ".md", "*", "**", "*.md"];
        nm(fixtures, "\\*", ["*"]);
        nm(fixtures, "\\*.md", ["*.md"]);
        nm(fixtures, "\\**.md", ["**a.md", "**.md", "*.md"]);
        nm(fixtures, "a\\**.md", ["a**a.md"]);
    });

    it("should match leading `./`", () => {
        const fixtures = ["a", "./a", "b", "a/a", "./a/b", "a/c", "./a/x", "./a/a/a", "a/a/b", "./a/a/a/a", "./a/a/a/a/a", "x/y", "./z/z"];
        nm(fixtures, "*", ["a", "b"]);
        nm(fixtures, "**/a/**", ["a/a", "a/c", "a/b", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a"]);
        nm(fixtures, "*/*", ["a/a", "a/b", "a/c", "a/x", "x/y", "z/z"]);
        nm(fixtures, "*/*/*", ["a/a/a", "a/a/b"]);
        nm(fixtures, "*/*/*/*", ["a/a/a/a"]);
        nm(fixtures, "*/*/*/*/*", ["a/a/a/a/a"]);
        nm(fixtures, "./*", ["a", "b"]);
        nm(fixtures, "./**/a/**", ["a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a"]);
        nm(fixtures, "./a/*/a", ["a/a/a"]);
        nm(fixtures, "a/*", ["a/a", "a/b", "a/c", "a/x"]);
        nm(fixtures, "a/*/*", ["a/a/a", "a/a/b"]);
        nm(fixtures, "a/*/*/*", ["a/a/a/a"]);
        nm(fixtures, "a/*/*/*/*", ["a/a/a/a/a"]);
        nm(fixtures, "a/*/a", ["a/a/a"]);
    });
});
