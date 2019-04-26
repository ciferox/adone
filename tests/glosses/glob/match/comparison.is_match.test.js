import mm from "./support/match";

const isWindows = require("is-windows");

import fixtures from "./_fixtures";
import patterns from "./_patterns";

describe("glob", "match", "comparison", ".isMatch", () => {
    if (isWindows()) {
        // these tests use bash to test for bash parity. since bash does not work on most versions of windows, these tests are skipped on windows
        return;
    }

    patterns.forEach((pattern) => {
        // if (pattern.slice(0, 3) !== '!**') return;
        // if (pattern.slice(0, 3) !== '!**') return;

        fixtures.forEach((fixture) => {
            // if (fixture !== '!a/b/c') return;

            it(`should match ${fixture} with ${pattern}`, function () {
                const miRes = mm.isMatch(fixture, pattern);
                const mmRes = mm.minimatch.isMatch(fixture, pattern);
                let actual = miRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker
                    if (miRes === mm.minimatch.makeRe(pattern).test(fixture)) {
                        actual = true;
                    } else if (/^\?/.test(pattern)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = miRes === mm.bash.isMatch(fixture, pattern);
                    } else {
                        this.skip();
                        return;
                    }
                }

                assert(actual, `${fixture} ${pattern}`);
            });

            it(`should match ${fixture} with ${pattern} and {dot: true}`, function () {
                const miRes = mm.isMatch(fixture, pattern, { dot: true });
                const mmRes = mm.minimatch.isMatch(fixture, pattern, { dot: true });
                let actual = miRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker (minimatch is inconsistent with regex and methods)
                    if (miRes === mm.minimatch.makeRe(pattern, { dot: true }).test(fixture)) {
                        actual = true;
                    } else if (/^\?/.test(pattern) || /^\.\//.test(fixture)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = miRes === mm.bash.isMatch(fixture, pattern, { dot: true });
                    } else {
                        this.skip();
                        return;
                    }
                }

                assert(actual, `${fixture} ${pattern}`);
            });

            it(`should match ${fixture} with ${pattern} and {nonegate: true}`, function () {
                const miRes = mm.isMatch(fixture, pattern, { nonegate: true });
                const mmRes = mm.minimatch.isMatch(fixture, pattern, { nonegate: true });
                let actual = miRes === mmRes;

                // minimatch is wrong on these
                if (actual === false) {
                    // tie-breaker
                    if (miRes === mm.minimatch.makeRe(pattern, { nonegate: true }).test(fixture)) {
                        actual = true;
                    } else if (/^\?/.test(pattern) || /^!/.test(fixture)) {
                        actual = true;
                    } else if (!isWindows()) {
                        actual = miRes === mm.bash.isMatch(fixture, pattern);
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
