const {
    is,
    util
} = adone;
const { match: _match } = util;

import compare from "./compare";
const bash = require("bash-match");
const minimatch = require("minimatch");

export default function match(fixtures, patterns, expected, options) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    const actual = _match(util.arrify(fixtures), patterns, options);
    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, patterns);
}

match.match = function (fixtures, pattern, expected, options) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    const actual = _match.match(util.arrify(fixtures), pattern, options);
    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, pattern);
};

match.matcher = function (fixtures, patterns, expected, options) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    const fn = _match.matcher(patterns, options);
    fixtures = util.arrify(fixtures);
    const actual = [];
    fixtures.forEach((file) => {
        if (fn(file)) {
            actual.push(file);
        }
    });

    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, patterns);
};

match.isMatch = function (...args) {
    return _match.isMatch.apply(null, args);
};

match.makeRe = function (...args) {
    return _match.makeRe.apply(null, args);
};

match.braces = function (...args) {
    return _match.braces.apply(null, args);
};

match.create = function (...args) {
    return _match.create.apply(null, args);
};

match.not = function (fixtures, patterns, expected, options) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    const actual = _match.not(fixtures, patterns, options);
    expected.sort(compare);
    actual.sort(compare);

    assert.deepEqual(actual, expected, patterns);
};

minimatch.isMatch = function (file, pattern, options) {
    return minimatch(file, pattern, options);
};

const minimatchMatch = minimatch.match;
minimatch.match = function (files, pattern, options) {
    return minimatchMatch(util.arrify(files), pattern, options);
};

minimatch.braces = function (pattern, options) {
    return minimatch.braceExpand(pattern, options);
};

match.minimatch = minimatch;

bash.makeRe = function () {};

match.bash = bash;
