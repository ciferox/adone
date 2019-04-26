import match from "./support/match";
const { is } = adone;

// ported from http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob1a.sub
describe("glob", "match", "extglob", "bash extglob1a tests", () => {
    const startLine = 11;
    const tests = [
        ["a", "a*!(x)", true],
        ["ab", "a*!(x)", true],
        ["ba", "a*!(x)", false],
        ["ax", "a*!(x)", true],
        ["a", "a!(x)", true],
        ["ab", "a!(x)", true],
        ["ba", "a!(x)", false],
        ["ax", "a!(x)", false],
        ["a", "a*?(x)", true],
        ["ab", "a*?(x)", true],
        ["ba", "a*?(x)", false],
        ["ax", "a*?(x)", true],
        ["a", "a?(x)", true],
        ["ab", "a?(x)", false],
        ["ba", "a?(x)", false],
        ["ax", "a?(x)", true]
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
