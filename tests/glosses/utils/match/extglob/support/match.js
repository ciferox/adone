const {
    is,
    util
} = adone;

const compare = function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
};

const { match: { extglob: matcher } } = util;

export default function match(fixtures, pattern, expected, options, msg) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    if (is.string(options)) {
        msg = options;
        options = {};
    }

    msg = msg ? (`${pattern} ${msg}`) : pattern;

    const actual = matcher.match(util.arrify(fixtures), pattern, options);
    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, msg);
}

match.match = function (fixtures, pattern, expected, options, msg) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    if (is.string(options)) {
        msg = options;
        options = {};
    }

    msg = msg ? (`${pattern} ${msg}`) : pattern;

    const actual = matcher.match(util.arrify(fixtures), pattern, options);
    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, msg);
};

match.isMatch = function (fixture, pattern, options) {
    return matcher.isMatch(fixture, pattern, options);
};

match.contains = function (fixture, pattern, options) {
    return matcher.contains(fixture, pattern, options);
};

match.makeRe = function (pattern, options) {
    return matcher.makeRe(pattern, options);
};

