import mm from "./support/match";
const path = require("path");

describe("util", "match", ".matcher()", () => {
    describe("errors", () => {
        it("should throw an error when arguments are invalid", () => {
            assert.throws(() => {
                mm.matcher(null);
            });

            assert.throws(() => {
                mm.matcher();
            });

            assert.throws(() => {
                mm.matcher(() => { });
            });
        });
    });

    describe("posix paths", () => {
        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm.matcher(fixtures, "(a/b)", ["a/b"]);
            mm.matcher(fixtures, "a/b", ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a/a", "a/b", "a/c"];
            mm.matcher(fixtures, "a/(a|c)", ["a/a", "a/c"]);
            mm.matcher(fixtures, "a/(a|b|c)", ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a/a", "a/b", "a/c", "a/x/y", "a/x"];
            mm.matcher(fixtures, "a/[b-c]", ["a/b", "a/c"]);
            mm.matcher(fixtures, "a/[a-z]", ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm.matcher(fixtures, "!*/*", []);
            mm.matcher(fixtures, "!*/b", ["a/a", "a/c", "b/a", "b/c"]);
            mm.matcher(fixtures, "!a/*", ["b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, "!a/b", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, "!a/(b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, "!a/(*)", ["b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, "!(*/b)", ["a/a", "a/c", "b/a", "b/c"]);
            mm.matcher(fixtures, "!(a/b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
        });
    });

    describe("posix paths (array of patterns)", () => {
        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm.matcher(fixtures, ["(a/b)"], ["a/b"]);
            mm.matcher(fixtures, ["a/b"], ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a/a", "a/b", "a/c"];
            mm.matcher(fixtures, ["a/(a|c)"], ["a/a", "a/c"]);
            mm.matcher(fixtures, ["a/(a|b|c)"], ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a/a", "a/b", "a/c", "a/x/y", "a/x"];
            mm.matcher(fixtures, ["a/[b-c]"], ["a/b", "a/c"]);
            mm.matcher(fixtures, ["a/[a-z]"], ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm.matcher(fixtures, ["!*/*"], []);
            mm.matcher(fixtures, ["!*/*"], []);
            mm.matcher(fixtures, ["!*/b"], ["a/a", "a/c", "b/a", "b/c"]);
            mm.matcher(fixtures, ["!a/*"], ["b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, ["!a/b"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, ["!a/(b)"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, ["!a/(*)"], ["b/a", "b/b", "b/c"]);
            mm.matcher(fixtures, ["!(*/b)"], ["a/a", "a/c", "b/a", "b/c"]);
            mm.matcher(fixtures, ["!(a/b)"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
        });
    });

    describe("windows paths", () => {
        const sep = path.sep;
        beforeEach(() => {
            path.sep = "\\";
        });

        afterEach(() => {
            path.sep = sep;
        });

        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "b\\a", "b\\b", "b\\c"];
            mm.matcher(fixtures, "(a/b)", ["a\\b"]);
            mm.matcher(fixtures, "a/b", ["a\\b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c"];
            mm.matcher(fixtures, "a/(a|c)", ["a\\a", "a\\c"]);
            mm.matcher(fixtures, "a/(a|b|c)", ["a\\a", "a\\b", "a\\c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "a\\x\\y", "a\\x"];
            mm.matcher(fixtures, "a/[b-c]", ["a\\b", "a\\c"]);
            mm.matcher(fixtures, "a/[a-z]", ["a\\a", "a\\b", "a\\c", "a\\x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "b\\a", "b\\b", "b\\c"];
            mm.matcher(fixtures, "!*/*", []);
            mm.matcher(fixtures, "!*/b", ["a\\a", "a\\c", "b\\a", "b\\c"]);
            mm.matcher(fixtures, "!a/*", ["b\\a", "b\\b", "b\\c"]);
            mm.matcher(fixtures, "!a/b", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            mm.matcher(fixtures, "!a/(b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            mm.matcher(fixtures, "!a/(*)", ["b\\a", "b\\b", "b\\c"]);
            mm.matcher(fixtures, "!(*/b)", ["a\\a", "a\\c", "b\\a", "b\\c"]);
            mm.matcher(fixtures, "!(a/b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            path.sep = sep;
        });
    });
});
