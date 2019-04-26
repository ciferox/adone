import mm from "./support/match";

const path = require("path");

describe("glob", "match", ".match()", () => {
    describe("errors", () => {
        it("should throw an error when pattern is not a string", () => {
            assert.throws(() => {
                require("../").match([], []);
            });
        });
    });

    describe("posix paths", () => {
        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm(fixtures, "(a/b)", ["a/b"]);
            mm(fixtures, "a/b", ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a/a", "a/b", "a/c"];
            mm(fixtures, "a/(a|c)", ["a/a", "a/c"]);
            mm(fixtures, "a/(a|b|c)", ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a/a", "a/b", "a/c", "a/x/y", "a/x"];
            mm(fixtures, "a/[b-c]", ["a/b", "a/c"]);
            mm(fixtures, "a/[a-z]", ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            mm(fixtures, "!*/*", []);
            mm(fixtures, "!*/b", ["a/a", "a/c", "b/a", "b/c"]);
            mm(fixtures, "!a/*", ["b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/b", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/(b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/(*)", ["b/a", "b/b", "b/c"]);
            mm(fixtures, "!(*/b)", ["a/a", "a/c", "b/a", "b/c"]);
            mm(fixtures, "!(a/b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
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
            mm(fixtures, "(a/b)", ["a\\b"], { unixify: false });
            mm(fixtures, "(a/b)", ["a/b"]);
            mm(fixtures, "a/b", ["a\\b"], { unixify: false });
            mm(fixtures, "a/b", ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c"];
            mm(fixtures, "a/(a|c)", ["a\\a", "a\\c"], { unixify: false });
            mm(fixtures, "a/(a|c)", ["a/a", "a/c"]);
            mm(fixtures, "a/(a|b|c)", ["a\\a", "a\\b", "a\\c"], { unixify: false });
            mm(fixtures, "a/(a|b|c)", ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "a\\x\\y", "a\\x"];
            mm(fixtures, "a/[b-c]", ["a\\b", "a\\c"], { unixify: false });
            mm(fixtures, "a/[b-c]", ["a/b", "a/c"]);
            mm(fixtures, "a/[a-z]", ["a\\a", "a\\b", "a\\c", "a\\x"], { unixify: false });
            mm(fixtures, "a/[a-z]", ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "b\\a", "b\\b", "b\\c"];
            mm(fixtures, "!*/*", []);
            mm(fixtures, "!*/b", ["a\\a", "a\\c", "b\\a", "b\\c"], { unixify: false });
            mm(fixtures, "!*/b", ["a/a", "a/c", "b/a", "b/c"]);
            mm(fixtures, "!a/*", ["b\\a", "b\\b", "b\\c"], { unixify: false });
            mm(fixtures, "!a/*", ["b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/b", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"], { unixify: false });
            mm(fixtures, "!a/b", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/(b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"], { unixify: false });
            mm(fixtures, "!a/(b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            mm(fixtures, "!a/(*)", ["b\\a", "b\\b", "b\\c"], { unixify: false });
            mm(fixtures, "!a/(*)", ["b/a", "b/b", "b/c"]);
            mm(fixtures, "!(*/b)", ["a\\a", "a\\c", "b\\a", "b\\c"], { unixify: false });
            mm(fixtures, "!(*/b)", ["a/a", "a/c", "b/a", "b/c"]);
            mm(fixtures, "!(a/b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"], { unixify: false });
            mm(fixtures, "!(a/b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
        });
    });
});
