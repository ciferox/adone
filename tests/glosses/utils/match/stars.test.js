import mm from "./support/match";

describe("util", "match", "stars", () => {
    it("should match one directory level with a single star (*)", () => {
        const fixtures = ["/a", "/b", "a", "b", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        mm(fixtures, "*", ["a", "b"]);
        mm(fixtures, "*/*", ["a/a", "a/b", "a/c", "a/x", "x/y", "z/z"]);
        mm(fixtures, "*/*/*", ["a/a/a", "a/a/b"]);
        mm(fixtures, "*/*/*/*", ["a/a/a/a"]);
        mm(fixtures, "*/*/*/*/*", ["a/a/a/a/a"]);
        mm(fixtures, "a/*", ["a/a", "a/b", "a/c", "a/x"]);
        mm(fixtures, "a/*/*", ["a/a/a", "a/a/b"]);
        mm(fixtures, "a/*/*/*", ["a/a/a/a"]);
        mm(fixtures, "a/*/*/*/*", ["a/a/a/a/a"]);
        mm(fixtures, "a/*/a", ["a/a/a"]);
        mm(fixtures, "a/*/b", ["a/a/b"]);
    });

    it("should match one or more characters", () => {
        const fixtures = ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        mm(fixtures, "*", ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac"]);
        mm(fixtures, "a*", ["a", "aa", "aaa", "aaaa", "ab"]);
        mm(fixtures, "*b", ["ab", "b", "bb"]);
    });

    it("should match one or zero characters", () => {
        const fixtures = ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac", "a/a", "a/b", "a/c", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a", "x/y", "z/z"];
        mm(fixtures, "*", ["a", "aa", "aaa", "aaaa", "ab", "b", "bb", "c", "cc", "cac"]);
        mm(fixtures, "*a*", ["a", "aa", "aaa", "aaaa", "ab", "cac"]);
        mm(fixtures, "*b*", ["ab", "b", "bb"]);
        mm(fixtures, "*c*", ["c", "cc", "cac"]);
    });

    it("should respect trailing slashes on paterns", () => {
        const fixtures = ["a", "a/", "b", "b/", "a/a", "a/a/", "a/b", "a/b/", "a/c", "a/c/", "a/x", "a/x/", "a/a/a", "a/a/b", "a/a/b/", "a/a/a/", "a/a/a/a", "a/a/a/a/", "a/a/a/a/a", "a/a/a/a/a/", "x/y", "z/z", "x/y/", "z/z/", "a/b/c/.d/e/"];
        mm(fixtures, "*/", ["a/", "b/"]);
        mm(fixtures, "*/*/", ["a/a/", "a/b/", "a/c/", "a/x/", "x/y/", "z/z/"]);
        mm(fixtures, "*/*/*/", ["a/a/a/", "a/a/b/"]);
        mm(fixtures, "*/*/*/*/", ["a/a/a/a/"]);
        mm(fixtures, "*/*/*/*/*/", ["a/a/a/a/a/"]);
        mm(fixtures, "a/*/", ["a/a/", "a/b/", "a/c/", "a/x/"]);
        mm(fixtures, "a/*/*/", ["a/a/a/", "a/a/b/"]);
        mm(fixtures, "a/*/*/*/", ["a/a/a/a/"]);
        mm(fixtures, "a/*/*/*/*/", ["a/a/a/a/a/"]);
        mm(fixtures, "a/*/a/", ["a/a/a/"]);
        mm(fixtures, "a/*/b/", ["a/a/b/"]);
    });

    it("should match a literal star when escaped", () => {
        const fixtures = [".md", "a**a.md", "**a.md", "**/a.md", "**.md", ".md", "*", "**", "*.md"];
        mm(fixtures, "\\*", ["*"]);
        mm(fixtures, "\\*.md", ["*.md"]);
        mm(fixtures, "\\**.md", ["**a.md", "**.md", "*.md"]);
        mm(fixtures, "a\\**.md", ["a**a.md"]);
    });

    it("should match leading `./`", () => {
        const fixtures = ["a", "./a", "b", "a/a", "./a/b", "a/c", "./a/x", "./a/a/a", "a/a/b", "./a/a/a/a", "./a/a/a/a/a", "x/y", "./z/z"];
        mm(fixtures, "*", ["a", "b"]);
        mm(fixtures, "*", ["a", "./a", "b"], { unixify: false });
        mm(fixtures, "**/a/**", ["a/a", "a/c", "a/b", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a"]);
        mm(fixtures, "**/a/**", ["a/a", "a/c", "./a/b", "./a/x", "./a/a/a", "a/a/b", "./a/a/a/a", "./a/a/a/a/a"], { unixify: false });
        mm(fixtures, "*/*", ["a/a", "a/b", "a/c", "a/x", "x/y", "z/z"]);
        mm(fixtures, "*/*", ["a/a", "./a/b", "a/c", "./a/x", "x/y", "./z/z"], { unixify: false });
        mm(fixtures, "*/*/*", ["a/a/a", "a/a/b"]);
        mm(fixtures, "*/*/*", ["./a/a/a", "a/a/b"], { unixify: false });
        mm(fixtures, "./a/*/a", ["a/a/a"]);
        mm(fixtures, "./a/*/a", ["./a/a/a"], { unixify: false });
        mm(fixtures, "*/*/*/*", ["a/a/a/a"]);
        mm(fixtures, "*/*/*/*", ["./a/a/a/a"], { unixify: false });
        mm(fixtures, "*/*/*/*/*", ["a/a/a/a/a"]);
        mm(fixtures, "*/*/*/*/*", ["./a/a/a/a/a"], { unixify: false });
        mm(fixtures, "./*", ["a", "b"]);
        mm(fixtures, "./*", ["a", "./a", "b"], { unixify: false });
        mm(fixtures, "./**/a/**", ["a/a", "a/c", "a/b", "a/x", "a/a/a", "a/a/b", "a/a/a/a", "a/a/a/a/a"]);
        mm(fixtures, "./**/a/**", ["a/a", "a/c", "./a/b", "./a/x", "./a/a/a", "a/a/b", "./a/a/a/a", "./a/a/a/a/a"], { unixify: false });
        mm(fixtures, "a/*", ["a/a", "a/b", "a/c", "a/x"]);
        mm(fixtures, "a/*", ["a/a", "./a/b", "a/c", "./a/x"], { unixify: false });
        mm(fixtures, "a/*/*", ["a/a/a", "a/a/b"]);
        mm(fixtures, "a/*/*", ["./a/a/a", "a/a/b"], { unixify: false });
        mm(fixtures, "a/*/*/*", ["a/a/a/a"]);
        mm(fixtures, "a/*/*/*", ["./a/a/a/a"], { unixify: false });
        mm(fixtures, "a/*/*/*/*", ["a/a/a/a/a"]);
        mm(fixtures, "a/*/*/*/*", ["./a/a/a/a/a"], { unixify: false });
        mm(fixtures, "a/*/a", ["a/a/a"]);
        mm(fixtures, "a/*/a", ["./a/a/a"], { unixify: false });
    });
});
