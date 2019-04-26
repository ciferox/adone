import mm from "./support/match";

describe("glob", "match", "dotfiles", () => {
    describe("file name matching", () => {
        it("should not match a dot when the dot is not explicitly defined", () => {
            assert(!mm.isMatch(".dot", "*dot"));
            assert(!mm.isMatch("a/.dot", "a/*dot"));
        });

        it("should not match leading dots with question marks", () => {
            assert(!mm.isMatch(".dot", "?dot"));
            assert(!mm.isMatch("/.dot", "/?dot"));
            assert(!mm.isMatch("a/.dot", "a/?dot"));
        });

        it("should match with double dots", () => {
            const fixtures = ["a/../a", "ab/../ac", "../a", "a", "../../b", "../c", "../c/d"];
            mm(fixtures, "../*", ["../a", "../c"]);
            mm(fixtures, "*/../*", ["a/../a", "ab/../ac"]);
            mm(fixtures, "**/../*", ["a/../a", "ab/../ac", "../a", "../c"]);
        });

        it("should not match a dot when the dot is not explicitly defined", () => {
            const fixtures = ["a/b/.x", ".x", ".x/", ".x/a", ".x/a/b", ".x/.x", "a/.x", "a/b/.x/c", "a/b/.x/c/d", "a/b/.x/c/d/e", "a/b/.x/", "a/.x/b", "a/.x/b/.x/c"];
            mm(fixtures, "**/.x/**", [".x/", ".x/a", ".x/a/b", "a/b/.x/c", "a/b/.x/c/d", "a/b/.x/c/d/e", "a/b/.x/", "a/.x/b"]);
        });

        it("should match a dot when the dot is explicitly defined", () => {
            // first one is from minimatch tests
            const fixtures = ["a/b/.x/c", "a/b/.x/c/d", "a/b/.x/c/d/e", "a/b/.x", "a/b/.x/", "a/.x/b", ".x", ".x/", ".x/a", ".x/a/b", "a/.x/b/.x/c", ".x/.x"];
            const expected = [".x/", ".x/a", ".x/a/b", "a/.x/b", "a/b/.x/", "a/b/.x/c", "a/b/.x/c/d", "a/b/.x/c/d/e"];

            mm(fixtures, "**/.x/**", expected);
            mm("/.dot", "/[.]dot", ["/.dot"]);
            mm(".dot", "[.]dot", [".dot"]);
            mm(".dot", ".[d]ot", [".dot"]);
            mm(".dot", ".dot*", [".dot"]);
            mm(".dot", ".d?t", [".dot"]);

            assert(!mm.isMatch(".bar.baz", ".*.*/"));
            assert(!mm.isMatch("/.dot", "*/[.]dot"));
            assert(mm.isMatch(".bar.baz/", ".*.*"));
            assert(mm.isMatch(".bar.baz", ".*.*"));
            assert(mm.isMatch(".bar.baz", ".*.baz"));
            assert(mm.isMatch(".bar.baz/", ".*.*/"));
            assert(mm.isMatch(".dot", ".*ot"));
            assert(mm.isMatch(".dot", ".[d]ot"));
            assert(mm.isMatch(".dot.foo.bar", ".*ot.*.*"));
            assert(mm.isMatch(".dotfile.js", ".*.js"));
            assert(mm.isMatch("/.dot", "**/.[d]ot"));
            assert(mm.isMatch("/.dot", "**/.dot*"));
            assert(mm.isMatch("/.dot", "**/[.]dot"));
            assert(mm.isMatch("/.dot", "/[.]dot"));
            assert(mm.isMatch("a/.dot", "**/.[d]ot"));
            assert(mm.isMatch("a/.dot", "*/.[d]ot"));
            assert(mm.isMatch("a/.dot", "*/.dot*"));
            assert(mm.isMatch("a/.dot", "*/[.]dot"));
            assert(mm.isMatch("a/b/.dot", "**/.[d]ot"));
            assert(mm.isMatch("a/b/.dot", "**/.dot*"));
            assert(mm.isMatch("a/b/.dot", "**/[.]dot"));
            assert(mm.isMatch("a/b/.dot", ".dot", { matchBase: true }));
            assert(mm.isMatch("a/b/.dot", "[.]dot", { matchBase: true }));
        });
    });

    describe("multiple directories", () => {
        it("should not match a dot when the dot is not explicitly defined", () => {
            assert(!mm.isMatch(".dot", "**/*dot"));
            assert(!mm.isMatch(".dot", "**/?dot"));
            assert(!mm.isMatch(".dot", "*/*dot"));
            assert(!mm.isMatch(".dot", "*/?dot"));
            assert(!mm.isMatch(".dot", "/*dot"));
            assert(!mm.isMatch(".dot", "/?dot"));
            assert(!mm.isMatch("/.dot", "**/*dot"));
            assert(!mm.isMatch("/.dot", "**/?dot"));
            assert(!mm.isMatch("/.dot", "*/*dot"));
            assert(!mm.isMatch("/.dot", "*/?dot"));
            assert(!mm.isMatch("/.dot", "/*dot"));
            assert(!mm.isMatch("/.dot", "/?dot"));
            assert(!mm.isMatch("a/.dot", "*/*dot"));
            assert(!mm.isMatch("a/.dot", "*/?dot"));
            assert(!mm.isMatch("a/b/.dot", "**/*dot"));
            assert(!mm.isMatch("a/b/.dot", "**/?dot"));

            // related https://github.com/jonschlinkert/micromatch/issues/63
            assert(!mm.isMatch("/aaa/bbb/.git", "/aaa/bbb/**"));
            assert(!mm.isMatch("aaa/bbb/.git", "aaa/bbb/**"));
            assert(!mm.isMatch("/aaa/bbb/ccc/.git", "/aaa/bbb/**"));
        });
    });

    describe("options.dot", () => {
        it("should match dotfiles when `options.dot` is true", () => {
            assert(mm.isMatch(".dotfile.js", ".*.js", { dot: true }));
            assert(mm.isMatch(".dot", "*dot", { dot: true }));
            assert(mm.isMatch(".dot", "?dot", { dot: true }));
            assert(mm.isMatch(".dot", "[.]dot", { dot: true }));
            assert(mm.isMatch("/a/b/.dot", "**/*dot", { dot: true }));
            assert(mm.isMatch("/a/b/.dot", "**/.[d]ot", { dot: true }));
            assert(mm.isMatch("/a/b/.dot", "**/?dot", { dot: true }));
            assert(mm.isMatch("/a/b/.dot", "**/[.]dot", { dot: false }));
            assert(mm.isMatch("/a/b/.dot", "**/[.]dot", { dot: true }));
            assert(mm.isMatch("a/b/.dot", "**/*dot", { dot: true }));
            assert(mm.isMatch("a/b/.dot", "**/.[d]ot", { dot: true }));
            assert(mm.isMatch("a/b/.dot", "**/?dot", { dot: true }));
            assert(mm.isMatch("a/b/.dot", "**/[.]dot", { dot: false }));
            assert(mm.isMatch("a/b/.dot", "**/[.]dot", { dot: true }));
        });

        it("should match dotfiles when `.dot` and `.matchBase` both defined", () => {
            assert(mm.isMatch("a/b/.dot", "*dot", { dot: true, matchBase: true }));
            assert(mm.isMatch("a/b/.dot", "[.]dot", { dot: true, matchBase: true }));
            assert(mm.isMatch("a/b/.dot", "[.]dot", { dot: false, matchBase: true }));
            assert(mm.isMatch("a/b/.dot", "?dot", { dot: true, matchBase: true }));
        });

        it("should work when the path has leading `./`", () => {
            assert(!mm.isMatch("./b/.c", "**"));
            assert(mm.isMatch("./b/.c", "**", { dot: true }));
            assert(mm.isMatch("./b/.c", "**", { dot: true, matchBase: true }));
        });

        it("should not match dotfiles when `options.dot` is false", () => {
            assert(!mm.isMatch("a/b/.dot", "**/*dot", { dot: false }));
            assert(!mm.isMatch("a/b/.dot", "**/?dot", { dot: false }));
        });

        it("should not match dotfiles when `.dot` is false and `.matchBase` is true", () => {
            assert(!mm.isMatch("a/b/.dot", "*dot", { dot: false, matchBase: true }));
            assert(!mm.isMatch("a/b/.dot", "?dot", { dot: false, matchBase: true }));
        });

        it("should not match dotfiles when `.dot` is not defined and a dot is not in the glob pattern", () => {
            assert(!mm.isMatch("a/b/.dot", "*dot", { matchBase: true }));
            assert(!mm.isMatch("a/b/.dot", "?dot", { matchBase: true }));
            assert(!mm.isMatch("a/b/.dot", "**/*dot"));
            assert(!mm.isMatch("a/b/.dot", "**/?dot"));
        });
    });
});
