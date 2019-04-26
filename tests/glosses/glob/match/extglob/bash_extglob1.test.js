import match from "./support/match";
const { is } = adone;

// ported from http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob1.sub
describe("glob", "match", "extglob", "bash extglob1 tests", () => {
    const startLine = 11;
    const tests = [
        ["a.c", "+([[:alpha:].])", true],
        ["a.c", "+([[:alpha:].])+([[:alpha:].])", true],
        ["a.c", "*([[:alpha:].])", true],
        ["a.c", "*([[:alpha:].])*([[:alpha:].])", true],
        ["a.c", "?([[:alpha:].])?([[:alpha:].])?([[:alpha:].])", true],
        ["a.c", "@([[:alpha:].])@([[:alpha:].])@([[:alpha:].])", true],
        [".", "!([[:alpha:].])", false],
        [".", "?([[:alpha:].])", true],
        [".", "@([[:alpha:].])", true],
        [".", "*([[:alpha:].])", true],
        [".", "+([[:alpha:].])", true]
    ];

    tests.forEach((test, i) => {
        if (!is.array(test)) {
            return;
        }
        const fixture = test[0];
        const pattern = test[1];
        const expected = test[2];
        const msg = `"${fixture}" should ${expected ? "" : "not "}match ${pattern}`;

        it(`${startLine + i} ${msg}`, () => {
            assert.equal(match.isMatch(fixture, pattern), expected, msg);
        });
    });
});
