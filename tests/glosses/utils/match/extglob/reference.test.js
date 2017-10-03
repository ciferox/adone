import matcher from "./support/match";
import negations from "./_negations";

const { is } = adone;

describe("util", "match", "extglob", "running extglob against minimatch tests", () => {
    for (const [fixture, val] of Object.entries(negations)) {
        if (fixture !== "asd.jss.xyz") {
            continue;
        }
        describe(`"${fixture}"`, () => { // eslint-disable-line
            for (const [pattern, expected] of Object.entries(val)) {
                const exp = expected === false ? " not" : "";

                it(`should${exp} match "${pattern}"`, () => { // eslint-disable-line
                    const actual = matcher.isMatch(fixture, pattern);
                    if (is.null(actual)) {
                        return;
                    }
                    assert.equal(actual, expected, `${fixture} => ${pattern}`);
                });
            }
        });
    }
});
