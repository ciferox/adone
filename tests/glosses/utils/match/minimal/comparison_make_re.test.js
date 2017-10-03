import nm from "./support/match";
import fixtures from "./_fixtures";
import patterns from "./_patterns";

const isWindows = require("is-windows");

describe("util", "match", "minimal", "comparison", ".makeRe", () => {
    if (isWindows()) {
        // these tests use bash to test for bash parity. since bash does not work on most versions of windows, these tests are skipped on windows
        return;
    }

    patterns.forEach((pattern) => {
        // if (pattern !== 'a/b/c/**/*.js') return;

        fixtures.forEach((fixture) => {
            // if (fixture !== 'a/b/c/z.js') return;

            it(`should match ${fixture} with ${pattern}`, function () {
                const mmRes = nm.minimatch.makeRe(pattern).test(fixture);
                const nmRes = nm.makeRe(pattern).test(fixture);
                let actual = nmRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker
                    if (nmRes === nm.minimatch(fixture, pattern) || /^\?/.test(pattern)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = nmRes === nm.bash.isMatch(fixture, pattern);
                    } else {
                        this.skip();
                        return;
                    }
                }

                assert(actual, `${fixture} ${pattern}`);
            });

            it(`should match ${fixture} with ${pattern} and {dot: true}`, function () {
                const mmRes = nm.minimatch.makeRe(pattern, { dot: true }).test(fixture);
                const nmRes = nm.makeRe(pattern, { dot: true }).test(fixture);
                let actual = nmRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker
                    if (nmRes === nm.minimatch(fixture, pattern, { dot: true })) {
                        actual = true;
                    } else if (/^\?/.test(pattern) || /^\.\//.test(fixture)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = nmRes === nm.bash.isMatch(fixture, pattern, { dot: true });
                    } else {
                        this.skip();
                        return;
                    }
                }

                assert(actual, `${fixture} ${pattern}`);
            });

            it(`should match ${fixture} with ${pattern} and {nonegate: true}`, function () {
                const mmRes = nm.minimatch.makeRe(pattern, { nonegate: true }).test(fixture);
                const nmRes = nm.makeRe(pattern, { nonegate: true }).test(fixture);
                let actual = nmRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker
                    if (nmRes === nm.minimatch(fixture, pattern, { nonegate: true })) {
                        actual = true;
                    } else if (/^\?/.test(pattern) || /^!/.test(fixture)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = nmRes === nm.bash.isMatch(fixture, pattern, { nonegate: true });
                    } else {
                        this.skip();
                        return;
                    }
                }

                assert(actual, `${fixture} ${pattern}`);
            });
        });
    });
});
