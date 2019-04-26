import match from "./support/match";

const { is } = adone;

// ported from http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob3.tests
describe("glob", "match", "extglob", "bash extglob3 tests", () => {
    const startLine = 11;
    const tests = [
        ["ab/../", "@(ab|+([^/]))/..?(/)", true],
        ["ab/../", "+([^/])/..?(/)", true],
        ["ab/../", "@(ab|?b)/..?(/)", true],
        ["ab/../", "+([^/])/../", true],
        ["ab/../", "+([!/])/..?(/)", true],
        ["ab/../", "@(ab|+([!/]))/..?(/)", true],
        ["ab/../", "+([!/])/../", true],
        ["ab/../", "+([!/])/..?(/)", true],
        ["ab/../", "+([!/])/..@(/)", true],
        ["ab/../", "+(ab)/..?(/)", true],
        ["ab/../", "[!/][!/]/../", true],
        ["ab/../", "@(ab|?b)/..?(/)", true],
        ["ab/../", "[^/][^/]/../", true],
        ["ab/../", "?b/..?(/)", true],
        ["ab/../", "+(?b)/..?(/)", true],
        ["ab/../", "+(?b|?b)/..?(/)", true],
        ["ab/../", "@(?b|?b)/..?(/)", true],
        ["ab/../", "@(a?|?b)/..?(/)", true],
        ["ab/../", "?(ab)/..?(/)", true],
        ["ab/../", "?(ab|??)/..?(/)", true],
        ["ab/../", "@(??)/..?(/)", true],
        ["ab/../", "@(??|a*)/..?(/)", true],
        ["ab/../", "@(a*)/..?(/)", true],
        ["ab/../", "+(??)/..?(/)", true],
        ["ab/../", "+(??|a*)/..?(/)", true],
        ["ab/../", "+(a*)/..?(/)", true],
        ["x", "@(x)", true]
    ];

    tests.forEach((test, i) => {
        if (!is.array(test)) {
            return;
        }
        const fixture = test[0];
        const pattern = test[1];
        const expected = test[2];
        const msg = `should ${expected ? "" : "not "}match ${pattern}`;

        it(`${startLine + i} ${msg}`, () => {
            assert.equal(match.isMatch(fixture, pattern), expected, msg);
        });
    });
});
