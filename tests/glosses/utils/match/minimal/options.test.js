import nm from "./support/match";

const path = require("path");
const sep = path.sep;

describe("util", "match", "minimal", "options", () => {
    beforeEach(() => {
        path.sep = "\\";
    });

    afterEach(() => {
        path.sep = sep;
    });

    describe("options.ignore", () => {
        const negations = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c", "a/d", "a/e"];
        const globs = ["a", ".a/a", "a/a", "a/a/a", ".a/a/a", "a/a/a/a", ".a/a/a/a", "a/a/a/a/a", "a/a/b", "a/b", "a/b/c", "a/c", "a/x", "b", "b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "x/y", "z/z", "z/z/z"];

        it("should filter out ignored patterns", () => {
            const opts = { ignore: ["a/**"] };

            nm(globs, "*", ["a", "b"], opts);
            nm(globs, "*", ["b"], { ignore: "**/a" });
            nm(globs, "*/*", ["x/y", "z/z"], opts);
            nm(globs, "*/*/*", ["b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "z/z/z"], opts);
            nm(globs, "*/*/*/*", [], opts);
            nm(globs, "*/*/*/*/*", [], opts);
            nm(globs, "a/*", [], opts);
            nm(globs, "**/*/x", ["x/x/x"], opts);

            nm(negations, "!b/a", ["b/b", "b/c"], opts);
            nm(negations, "!b/(a)", ["b/b", "b/c"], opts);
            nm(negations, "!(b/(a))", ["b/b", "b/c"], opts);
            nm(negations, "!(b/a)", ["b/b", "b/c"], opts);

            nm(negations, "**", negations, "nothing is ignored");
            nm(negations, "**", ["a/c", "a/d", "a/e", "b/c"], { ignore: ["*/b", "*/a"] });
            nm(negations, "**", [], { ignore: ["**"] });
        });

        it("should work with dotfiles", () => {
            nm(globs, "*", ["a", "b"], { ignore: "a/**", dot: true });
            nm(globs, "*", ["b"], { ignore: "**/a", dot: true });
            nm(globs, "*/*", [".a/a", "x/y", "z/z"], { ignore: "a/**", dot: true });
            nm(globs, "*/*/*", [".a/a/a", "b/b/b", "b/b/c", "c/c/c", "e/f/g", "h/i/a", "x/x/x", "z/z/z"], { ignore: "a/**", dot: true });
            nm(globs, "*/*/*/*", [".a/a/a/a"], { ignore: "a/**", dot: true });
            nm(globs, "*/*/*/*/*", [], { ignore: "a/**", dot: true });
            nm(globs, "a/*", [], { ignore: "a/**", dot: true });
            nm(globs, "**/*/x", ["x/x/x"], { ignore: "a/**", dot: true });
        });

        it('should "un-ignore" values when a negation pattern is passed', () => {
            nm(negations, "**", ["a/d"], { ignore: ["**", "!*/d"] });
            nm(negations, "**", ["a/a", "b/a"], { ignore: ["**", "!*/a"] });
        });
    });

    describe("options.matchBase", () => {
        it("should match the basename of file paths when `options.matchBase` is true", () => {
            nm(["a/b/c/d.md"], "*.md", [], "should not match multiple levels");
            nm(["a/b/c/foo.md"], "*.md", [], "should not match multiple levels");
            nm(["ab", "acb", "acb/", "acb/d/e", "x/y/acb", "x/y/acb/d"], "a?b", ["acb", "acb/"], "should not match multiple levels");
            nm(["a/b/c/d.md"], "*.md", ["a/b/c/d.md"], { matchBase: true });
            nm(["a/b/c/foo.md"], "*.md", ["a/b/c/foo.md"], { matchBase: true });
            nm(["x/y/acb", "acb/", "acb/d/e", "x/y/acb/d"], "a?b", ["x/y/acb", "acb/"], { matchBase: true });
        });

        it("should support `options.basename` as an alternative to `matchBase`", () => {
            nm(["a/b/c/d.md"], "*.md", [], "should not match multiple levels");
            nm(["a/b/c/foo.md"], "*.md", [], "should not match multiple levels");
            nm(["ab", "acb", "acb/", "acb/d/e", "x/y/acb", "x/y/acb/d"], "a?b", ["acb", "acb/"], "should not match multiple levels");
            nm(["a/b/c/d.md"], "*.md", ["a/b/c/d.md"], { basename: true });
            nm(["a/b/c/foo.md"], "*.md", ["a/b/c/foo.md"], { basename: true });
            nm(["x/y/acb", "acb/", "acb/d/e", "x/y/acb/d"], "a?b", ["x/y/acb", "acb/"], { basename: true });
        });
    });

    describe("options.flags", () => {
        it("should be case-sensitive by default", () => {
            nm(["a/b/d/e.md"], "a/b/D/*.md", [], "should not match a dirname");
            nm(["a/b/c/e.md"], "A/b/*/E.md", [], "should not match a basename");
            nm(["a/b/c/e.md"], "A/b/C/*.MD", [], "should not match a file extension");
        });

        it("should not be case-sensitive when `i` is set on `options.flags`", () => {
            nm(["a/b/d/e.md"], "a/b/D/*.md", ["a/b/d/e.md"], { flags: "i" });
            nm(["a/b/c/e.md"], "A/b/*/E.md", ["a/b/c/e.md"], { flags: "i" });
            nm(["a/b/c/e.md"], "A/b/C/*.MD", ["a/b/c/e.md"], { flags: "i" });
        });
    });

    describe("options.nocase", () => {
        it("should not be case-sensitive when `options.nocase` is true", () => {
            nm(["a/b/c/e.md"], "A/b/*/E.md", ["a/b/c/e.md"], { nocase: true });
            nm(["a/b/c/e.md"], "A/b/C/*.MD", ["a/b/c/e.md"], { nocase: true });
            nm(["a/b/c/e.md"], "A/b/C/*.md", ["a/b/c/e.md"], { nocase: true });
            nm(["a/b/d/e.md"], "a/b/D/*.md", ["a/b/d/e.md"], { nocase: true });
        });

        it("should not double-set `i` when both `nocase` and the `i` flag are set", () => {
            const opts = { nocase: true, flags: "i" };
            nm(["a/b/d/e.md"], "a/b/D/*.md", opts, ["a/b/d/e.md"]);
            nm(["a/b/c/e.md"], "A/b/*/E.md", opts, ["a/b/c/e.md"]);
            nm(["a/b/c/e.md"], "A/b/C/*.MD", opts, ["a/b/c/e.md"]);
        });
    });

    describe("options.nodupes", () => {
        beforeEach(() => {
            path.sep = "\\";
        });
        afterEach(() => {
            path.sep = sep;
        });

        it("should remove duplicate elements from the result array:", () => {
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "/a/b/c", ["/a/b/c"], {});
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "\\a\\b\\c", ["/a/b/c"], {});
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "/a/b/c", ["/a/b/c"], { nodupes: true });
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "\\a\\b\\c", ["/a/b/c"], { nodupes: true });
        });

        it("should not remove duplicates", () => {
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "/a/b/c", ["/a/b/c", "/a/b/c"], { nodupes: false });
            nm(["abc", "/a/b/c", "\\a\\b\\c"], "\\a\\b\\c", ["/a/b/c"], { nodupes: false });
        });
    });

    describe("options.noglobstar", () => {
        it("should regard double stars as single stars", () => {
            const fixtures = ["a", "a/b", "a/b/c", "a/b/c/d"];
            nm(fixtures, "a/**", ["a/b", "a/b/c", "a/b/c/d"]);
            nm(fixtures, "a/**", ["a/b"], { noglobstar: true });
            nm(fixtures, "a/*", ["a/b"], { noglobstar: true });
            nm(fixtures, "a/*", ["a/b"]);
        });
    });

    describe("options.unescape", () => {
        it("should remove backslashes in glob patterns:", () => {
            const fixtures = ["abc", "/a/b/c", "\\a\\b\\c"];
            nm(fixtures, "\\a\\b\\c", ["/a/b/c"]);
            nm(fixtures, "\\a\\b\\c", { unescape: true }, ["/a/b/c"]);
            nm(fixtures, "\\a\\b\\c", { unescape: true, nodupes: false }, ["/a/b/c"]);
        });
    });

    describe("options.nonull", () => {
        it("should return the pattern when no matches are found", () => {
            nm(["a/b/c/e.md"], "foo/*.md", ["foo/*.md"], { nonull: true });
            nm(["a/b/c/e.md"], "bar/*.js", ["bar/*.js"], { nonull: true });
        });
    });

    describe("options.nonegate", () => {
        it("should support the `nonegate` option:", () => {
            nm(["a/a/a", "a/b/a", "b/b/a", "c/c/a", "c/c/b"], "!**/a", ["c/c/b"]);
            nm(["a.md", "!a.md", "a.txt"], "!*.md", ["!a.md"], { nonegate: true });
            nm(["!a/a/a", "a/b/a", "b/b/a", "!c/c/a"], "!**/a", ["!a/a/a", "!c/c/a"], { nonegate: true });
            nm(["!*.md", ".dotfile.txt", "a/b/.dotfile"], "!*.md", ["!*.md"], { nonegate: true });
        });
    });

    describe("options.unixify", () => {
        it("should unixify file paths", () => {
            nm(["a\\b\\c.md"], "**/*.md", ["a/b/c.md"], { unixify: true });
        });

        it("should unixify absolute paths", () => {
            nm(["E:\\a\\b\\c.md"], "E:/**/*.md", ["E:/a/b/c.md"], { unixify: true });
        });
    });

    describe("options.dot", () => {
        describe("when `dot` or `dotfile` is NOT true:", () => {
            it("should not match dotfiles by default:", () => {
                nm([".dotfile"], "*", []);
                nm([".dotfile"], "**", []);
                nm(["a/b/c/.dotfile.md"], "*.md", []);
                nm(["a/b", "a/.b", ".a/b", ".a/.b"], "**", ["a/b"]);
                nm(["a/b/c/.dotfile"], "*.*", []);

                // https://github.com/isaacs/minimatch/issues/30
                nm(["foo/bar.js"], "**/foo/**", ["foo/bar.js"]);
                nm(["./foo/bar.js"], "./**/foo/**", ["foo/bar.js"]);
                nm(["./foo/bar.js"], "**/foo/**", ["foo/bar.js"]);
            });

            it("should match dotfiles when a leading dot is defined in the path:", () => {
                nm(["a/b/c/.dotfile.md"], "**/.*", ["a/b/c/.dotfile.md"]);
                nm(["a/b/c/.dotfile.md"], "**/.*.md", ["a/b/c/.dotfile.md"]);
            });

            it("should use negation patterns on dotfiles:", () => {
                nm([".b.c/"], "!*.*", [".b.c/"]);
                nm([".b.c/"], "!*.*", [], { dot: true });
                nm([".a", ".b", "c", "c.md"], "!.*", ["c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!.*", { dot: true }, ["c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!.b", [".a", "c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!.b", { dot: true }, [".a", "c", "c.md"]);
            });
        });

        describe("when `dot` or `dotfile` is true:", () => {
            it("should match dotfiles when there is a leading dot:", () => {
                const opts = { dot: true };

                nm([".dotfile"], "*", opts, [".dotfile"]);
                nm([".dotfile"], "**", opts, [".dotfile"]);
                nm(["a/b", "a/.b", ".a/b", ".a/.b"], "**", opts, ["a/b", "a/.b", ".a/b", ".a/.b"]);
                nm([".dotfile"], ".dotfile", opts, [".dotfile"]);
                nm([".dotfile.md"], ".*.md", opts, [".dotfile.md"]);
            });

            it("should match dotfiles when there is not a leading dot:", () => {
                const opts = { dot: true };
                nm([".dotfile"], "*.*", opts, [".dotfile"]);
                nm([".a", ".b", "c", "c.md"], "*.*", opts, [".a", ".b", "c.md"]);
                nm([".dotfile"], "*.md", opts, []);
                nm([".verb.txt"], "*.md", opts, []);
                nm(["a/b/c/.dotfile"], "*.md", opts, []);
                nm(["a/b/c/.dotfile.md"], "*.md", opts, []);
                nm(["a/b/c/.verb.md"], "**/*.md", opts, ["a/b/c/.verb.md"]);
                nm(["foo.md"], "*.md", opts, ["foo.md"]);
            });

            it("should use negation patterns on dotfiles:", () => {
                nm([".a", ".b", "c", "c.md"], "!.*", ["c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!(.*)", ["c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!(.*)*", ["c", "c.md"]);
                nm([".a", ".b", "c", "c.md"], "!*.*", [".a", ".b", "c"]);
            });

            it("should match dotfiles when `options.dot` is true:", () => {
                nm(["a/./b", "a/../b", "a/c/b", "a/.d/b"], "a/.*/b", ["a/../b", "a/./b", "a/.d/b"], { dot: true });
                nm(["a/./b", "a/../b", "a/c/b", "a/.d/b"], "a/.*/b", ["a/../b", "a/./b", "a/.d/b"], { dot: false });
                nm(["a/./b", "a/../b", "a/c/b", "a/.d/b"], "a/*/b", ["a/c/b", "a/.d/b"], { dot: true });
                nm([".dotfile"], "*.*", [".dotfile"], { dot: true });
                nm([".dotfile"], "*.md", [], { dot: true });
                nm([".dotfile"], ".dotfile", [".dotfile"], { dot: true });
                nm([".dotfile.md"], ".*.md", [".dotfile.md"], { dot: true });
                nm([".verb.txt"], "*.md", [], { dot: true });
                nm([".verb.txt"], "*.md", [], { dot: true });
                nm(["a/b/c/.dotfile"], "*.md", [], { dot: true });
                nm(["a/b/c/.dotfile.md"], "**/*.md", ["a/b/c/.dotfile.md"], { dot: true });
                nm(["a/b/c/.dotfile.md"], "**/.*", ["a/b/c/.dotfile.md"]);
                nm(["a/b/c/.dotfile.md"], "**/.*.md", ["a/b/c/.dotfile.md"]);
                nm(["a/b/c/.dotfile.md"], "*.md", []);
                nm(["a/b/c/.dotfile.md"], "*.md", [], { dot: true });
                nm(["a/b/c/.verb.md"], "**/*.md", ["a/b/c/.verb.md"], { dot: true });
                nm(["d.md"], "*.md", ["d.md"], { dot: true });
            });
        });
    });

    describe("windows", () => {
        it("should unixify file paths", () => {
            nm(["a\\b\\c.md"], "**/*.md", ["a/b/c.md"]);
        });

        it("should unixify absolute paths", () => {
            nm(["E:\\a\\b\\c.md"], "E:/**/*.md", ["E:/a/b/c.md"]);
        });
    });

    describe("normalize", () => {
        it("should normalize leading `./`", () => {
            const fixtures = ["a.md", "a/b/c.md", "a/b/d.md", "./a/b/c.md", "./b/c.md", ".\\a\\b\\c.md"];
            nm(fixtures, "**/*.md", ["a.md", "a/b/c.md", "a/b/d.md", "b/c.md"]);
        });

        it("should match leading `./`", () => {
            const fixtures = ["a.md", "a/b.md", "./a.md", "./a/b.md", "a/b/c.md", "./a/b/c.md", ".\\a\\b\\c.md", "a\\b\\c.md"];
            nm(fixtures, "**/*.md", ["a.md", "a/b.md", "a/b/c.md"]);
            nm(fixtures, "*.md", ["a.md"]);
            nm(fixtures, "*/*.md", ["a/b.md"]);
            nm(fixtures, "./**/*.md", ["a.md", "a/b.md", "a/b/c.md"]);
            nm(fixtures, "./*.md", ["a.md"]);
            nm(fixtures, "./*/*.md", ["a/b.md"]);
            nm(["./a"], "a", ["a"]);
        });
    });
});
