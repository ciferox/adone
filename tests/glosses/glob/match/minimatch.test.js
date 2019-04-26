import patterns from "./fixtures/patterns";
import mm from "./support/match";

const { is } = adone;

const path = require("path");
const isWindows = require("is-windows");
const extend = require("extend-shallow");

const compare = (a, b) => a === b ? 0 : a > b ? 1 : -1;

describe("glob", "match", "micromatch", () => {
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
                mm.match(fixtures, pattern, expected, options);
            });
        });
    });

    describe("minimatch parity:", () => {
        describe("backslashes", () => {
            it("should match literal backslashes", () => {
                if (isWindows()) {
                    mm.match(["\\"], "\\", ["/"]);
                } else {
                    mm.match(["\\"], "\\", ["\\"]);
                }
            });
        });

        /**
         * Issues that minimatch fails on but micromatch passes
         */

        describe("minimatch issues (as of 12/7/2016)", () => {
            it("https://github.com/isaacs/minimatch/issues/29", () => {
                assert(mm.isMatch("foo/bar.txt", "foo/**/*.txt"));
                assert(mm.makeRe("foo/**/*.txt").test("foo/bar.txt"));
                assert(!mm.isMatch("n/!(axios)/**", "n/axios/a.js"));
                assert(!mm.makeRe("n/!(axios)/**").test("n/axios/a.js"));
            });

            it("https://github.com/isaacs/minimatch/issues/30", () => {
                assert(mm.isMatch("foo/bar.js", "**/foo/**"));
                assert(mm.isMatch("./foo/bar.js", "./**/foo/**"));
                assert(mm.isMatch("./foo/bar.js", "**/foo/**"));
                assert(mm.isMatch("./foo/bar.txt", "foo/**/*.txt"));
                assert(mm.makeRe("./foo/**/*.txt").test("foo/bar.txt"));
                assert(!mm.isMatch("./foo/!(bar)/**", "foo/bar/a.js"));
                assert(!mm.makeRe("./foo/!(bar)/**").test("foo/bar/a.js"));
            });

            it("https://github.com/isaacs/minimatch/issues/50", () => {
                assert(mm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[ABC\\].txt"));
                assert(!mm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[abc\\].txt"));
                assert(mm.isMatch("foo/bar-[ABC].txt", "foo/**/*-\\[abc\\].txt", { nocase: true }));
            });

            it("https://github.com/isaacs/minimatch/issues/67 (should work consistently with `makeRe` and matcher functions)", () => {
                const re = mm.makeRe("node_modules/foobar/**/*.bar");
                assert(re.test("node_modules/foobar/foo.bar"));
                assert(mm.isMatch("node_modules/foobar/foo.bar", "node_modules/foobar/**/*.bar"));
                mm(["node_modules/foobar/foo.bar"], "node_modules/foobar/**/*.bar", ["node_modules/foobar/foo.bar"]);
            });

            it("https://github.com/isaacs/minimatch/issues/75", () => {
                assert(mm.isMatch("foo/baz.qux.js", "foo/@(baz.qux).js"));
                assert(mm.isMatch("foo/baz.qux.js", "foo/+(baz.qux).js"));
                assert(mm.isMatch("foo/baz.qux.js", "foo/*(baz.qux).js"));
                assert(!mm.isMatch("foo/baz.qux.js", "foo/!(baz.qux).js"));
                assert(!mm.isMatch("foo/bar/baz.qux.js", "foo/*/!(baz.qux).js"));
                assert(!mm.isMatch("foo/bar/bazqux.js", "**/!(bazqux).js"));
                assert(!mm.isMatch("foo/bar/bazqux.js", "foo/**/!(bazqux).js"));
                assert(!mm.isMatch("foo/bar/bazqux.js", "foo/**/!(bazqux)*.js"));
                assert(!mm.isMatch("foo/bar/baz.qux.js", "foo/**/!(baz.qux)*.js"));
                assert(!mm.isMatch("foo/bar/baz.qux.js", "foo/**/!(baz.qux).js"));
                assert(!mm.isMatch("foo.js", "!(foo)*.js"));
                assert(!mm.isMatch("foo.js", "!(foo)*.js"));
                assert(!mm.isMatch("foobar.js", "!(foo)*.js"));
            });

            it("https://github.com/isaacs/minimatch/issues/78", () => {
                const sep = path.sep;
                path.sep = "\\";
                assert(mm.isMatch("a\\b\\c.txt", "a/**/*.txt"));
                assert(mm.isMatch("a/b/c.txt", "a/**/*.txt"));
                path.sep = sep;
            });

            it("https://github.com/isaacs/minimatch/issues/82", () => {
                assert(mm.isMatch("./src/test/a.js", "**/test/**"));
                assert(mm.isMatch("src/test/a.js", "**/test/**"));
            });

            it("https://github.com/isaacs/minimatch/issues/83", () => {
                assert(!mm.makeRe("foo/!(bar)/**").test("foo/bar/a.js"));
                assert(!mm.isMatch("foo/!(bar)/**", "foo/bar/a.js"));
            });
        });
    });
});
