import nm from "./support/match";

const path = require("path");

describe("glob", "match", "minimal", ".match method", () => {
    describe("posix paths", () => {
        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            nm.matcher(fixtures, "(a/b)", ["a/b"]);
            nm.matcher(fixtures, "a/b", ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a/a", "a/b", "a/c"];
            nm.matcher(fixtures, "a/(a|c)", ["a/a", "a/c"]);
            nm.matcher(fixtures, "a/(a|b|c)", ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a/a", "a/b", "a/c", "a/x/y", "a/x"];
            nm.matcher(fixtures, "a/[b-c]", ["a/b", "a/c"]);
            nm.matcher(fixtures, "a/[a-z]", ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            nm.matcher(fixtures, "!*/*", []);
            nm.matcher(fixtures, "!*/b", ["a/a", "a/c", "b/a", "b/c"]);
            nm.matcher(fixtures, "!a/*", ["b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, "!a/b", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, "!a/(b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, "!a/(*)", ["b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, "!(*/b)", ["a/a", "a/c", "b/a", "b/c"]);
            nm.matcher(fixtures, "!(a/b)", ["a/a", "a/c", "b/a", "b/b", "b/c"]);
        });
    });

    describe("posix paths (array of patterns)", () => {
        it("should return an array of matches for a literal string", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            nm.matcher(fixtures, ["(a/b)"], ["a/b"]);
            nm.matcher(fixtures, ["a/b"], ["a/b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a/a", "a/b", "a/c"];
            nm.matcher(fixtures, ["a/(a|c)"], ["a/a", "a/c"]);
            nm.matcher(fixtures, ["a/(a|b|c)"], ["a/a", "a/b", "a/c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a/a", "a/b", "a/c", "a/x/y", "a/x"];
            nm.matcher(fixtures, ["a/[b-c]"], ["a/b", "a/c"]);
            nm.matcher(fixtures, ["a/[a-z]"], ["a/a", "a/b", "a/c", "a/x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
            nm.matcher(fixtures, ["!*/*"], []);
            nm.matcher(fixtures, ["!*/*"], []);
            nm.matcher(fixtures, ["!*/b"], ["a/a", "a/c", "b/a", "b/c"]);
            nm.matcher(fixtures, ["!a/*"], ["b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, ["!a/b"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, ["!a/(b)"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, ["!a/(*)"], ["b/a", "b/b", "b/c"]);
            nm.matcher(fixtures, ["!(*/b)"], ["a/a", "a/c", "b/a", "b/c"]);
            nm.matcher(fixtures, ["!(a/b)"], ["a/a", "a/c", "b/a", "b/b", "b/c"]);
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
            nm.matcher(fixtures, "(a/b)", ["a\\b"]);
            nm.matcher(fixtures, "a/b", ["a\\b"]);
        });

        it("should support regex logical or", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c"];
            nm.matcher(fixtures, "a/(a|c)", ["a\\a", "a\\c"]);
            nm.matcher(fixtures, "a/(a|b|c)", ["a\\a", "a\\b", "a\\c"]);
        });

        it("should support regex ranges", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "a\\x\\y", "a\\x"];
            nm.matcher(fixtures, "a/[b-c]", ["a\\b", "a\\c"]);
            nm.matcher(fixtures, "a/[a-z]", ["a\\a", "a\\b", "a\\c", "a\\x"]);
        });

        it("should support negation patterns", () => {
            const fixtures = ["a\\a", "a\\b", "a\\c", "b\\a", "b\\b", "b\\c"];
            nm.matcher(fixtures, "!*/*", []);
            nm.matcher(fixtures, "!*/b", ["a\\a", "a\\c", "b\\a", "b\\c"]);
            nm.matcher(fixtures, "!a/*", ["b\\a", "b\\b", "b\\c"]);
            nm.matcher(fixtures, "!a/b", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            nm.matcher(fixtures, "!a/(b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            nm.matcher(fixtures, "!a/(*)", ["b\\a", "b\\b", "b\\c"]);
            nm.matcher(fixtures, "!(*/b)", ["a\\a", "a\\c", "b\\a", "b\\c"]);
            nm.matcher(fixtures, "!(a/b)", ["a\\a", "a\\c", "b\\a", "b\\b", "b\\c"]);
            path.sep = sep;
        });
    });
});
