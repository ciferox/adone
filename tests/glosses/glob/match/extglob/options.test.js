import matcher from "./support/match";
const { glob: { match: { extglob } } } = adone;

describe("glob", "match", "extglob", "options", () => {
    describe("options.nonull", () => {
        it("should return the pattern when no matches are found", () => {
            matcher.match(["ax"], "a?(b*)", []);
            matcher.match(["ax"], "a?(b*)", ["a?(b*)"], { nonull: true });
            matcher.match(["az"], "a?(b*)", ["a?(b*)"], { nonull: true });
            matcher.match(["ag"], "a?(b*)", ["a?(b*)"], { nonull: true });
        });
    });

    describe("options.failglob", () => {
        it("should throw an error when no matches are found", (cb) => {
            try {
                extglob.match(["ax"], "a?(b*)", { failglob: true });
                return cb(new Error("expected an error"));
            } catch (err) {
                assert(/no matches/.test(err.message));
            }
            cb();
        });
    });

    describe("options.strict", () => {
        it("should throw an error when an opening brace is missing", (cb) => {
            assert(!extglob.isMatch("foo", "a)"));
            try {
                assert(!extglob.isMatch("foo", "a)", { strict: true }));
                return cb(new Error("expected an error"));
            } catch (err) {
                assert(/missing/.test(err.message));
            }
            cb();
        });
    });
});
