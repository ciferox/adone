// Tests JSON5's line counting algorithm's support for the basic varieties of newline that we support -  LF, CR+LF and CR

const { data: { json5 } } = adone;

// Each of these cases should give rise to a parse error with the same coordinates
const cases = {
    LF: "{\u000a    10thing",
    CRLF: "{\u000d\u000a    10thing",
    CR: "{\u000d    10thing"
};

const spec = {
    lineNumber: 2,
    columnNumber: 5
};

describe("data", "json5", "count-newlines", () => {
    Object.keys(cases).forEach((key) => {
        const str = cases[key];
        it(key, () => {
            let err;
            try {
                json5.decode(str);
            } catch (e) {
                err = e;
            }
            assert(err, "Expected JSON5 parsing to fail.");
            assert.equal(err.lineNumber, spec.lineNumber);
            assert.equal(err.columnNumber, spec.columnNumber);
        });
    });
});
