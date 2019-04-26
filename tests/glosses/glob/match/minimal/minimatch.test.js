import patterns from "./fixtures/patterns";
import nm from "./support/match";
const { is } = adone;

const path = require("path");
const isWindows = require("is-windows");
const extend = require("extend-shallow");


const compare = (a, b) => a === b ? 0 : a > b ? 1 : -1;

describe("glob", "match", "minimal", "minimatch", () => {
    /**
 * Minimatch comparison tests
 */

    describe("basic tests", () => {
        patterns.forEach((unit, i) => {
            it(`${i}: ${unit[0]}`, () => {
                if (is.string(unit)) {
                    return;
                }

                // update fixtures list
                if (is.function(unit)) {
                    unit();
                    return;
                }

                const pattern = unit[0];
                const expected = (unit[1] || []).sort(compare);
                const options = extend({}, unit[2]);
                const fixtures = unit[3] || patterns.fixtures;
                nm.match(fixtures, pattern, expected, options);
            });
        });
    });

    describe("minimatch parity:", () => {
        describe("backslashes", () => {
            it("should match literal backslashes", () => {
                if (isWindows()) {
                    nm.match(["\\"], "\\", ["/"]);
                } else {
                    nm.match(["\\"], "\\", ["\\"]);
                }
            });
        });

        /**
         * Issues that minimatch fails on but micromatch passes
         */

        describe("minimatch issues (as of 12/7/2016)", () => {
            it("https://github.com/isaacs/minimatch/issues/29", () => {
                assert(nm.isMatch("foo/bar.txt", "foo/**/*.txt"));
                assert(nm.makeRe("foo/**/*.txt").test("foo/bar.txt"));
            });

            it("https://github.com/isaacs/minimatch/issues/30", () => {
                assert(nm.isMatch("foo/bar.js", "**/foo/**"));
                assert(nm.isMatch("./foo/bar.js", "./**/foo/**"));
                assert(nm.isMatch("./foo/bar.js", "**/foo/**"));
                assert(nm.isMatch("./foo/bar.txt", "foo/**/*.txt"));
                assert(nm.makeRe("./foo/**/*.txt").test("foo/bar.txt"));
            });

            it("https://github.com/isaacs/minimatch/issues/50", () => {
                assert(nm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[ABC\\].txt"));
                assert(!nm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[abc\\].txt"));
                assert(nm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[abc\\].txt", { nocase: true }));
            });

            it("https://github.com/isaacs/minimatch/issues/67 (should work consistently with `makeRe` and matcher functions)", () => {
                const re = nm.makeRe("node_modules/foobar/**/*.bar");
                assert(re.test("node_modules/foobar/foo.bar"));
                assert(nm.isMatch("node_modules/foobar/foo.bar", "node_modules/foobar/**/*.bar"));
                nm(["node_modules/foobar/foo.bar"], "node_modules/foobar/**/*.bar", ["node_modules/foobar/foo.bar"]);
            });

            it("https://github.com/isaacs/minimatch/issues/78", () => {
                const sep = path.sep;
                path.sep = "\\";
                assert(nm.isMatch("a\\b\\c.txt", "a/**/*.txt"));
                assert(nm.isMatch("a/b/c.txt", "a/**/*.txt"));
                path.sep = sep;
            });

            it("https://github.com/isaacs/minimatch/issues/82", () => {
                assert(nm.isMatch("./src/test/a.js", "**/test/**"));
                assert(nm.isMatch("src/test/a.js", "**/test/**"));
            });
        });
    });
});
