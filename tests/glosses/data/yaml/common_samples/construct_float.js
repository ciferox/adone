const {
    assert,
    is
} = adone;

const expected = {
    canonical: 685230.15,
    exponential: 685230.15,
    fixed: 685230.15,
    sexagesimal: 685230.15,
    "negative infinity": Number.NEGATIVE_INFINITY,
    "not a number": NaN
};

const testHandler = (actual) => {
    assert(is.object(actual));
    assert.strictEqual(Object.keys(actual).sort().join(","), Object.keys(expected).sort().join(","));

    assert.strictEqual(actual.canonical, expected.canonical);
    assert.strictEqual(actual.exponential, expected.exponential);
    assert.strictEqual(actual.fixed, expected.fixed);
    assert.strictEqual(actual.sexagesimal, expected.sexagesimal);
    assert.strictEqual(actual["negative infinity"], expected["negative infinity"]);

    assert(Number.isNaN(actual["not a number"]));
};

testHandler.expected = expected;

module.exports = testHandler;
