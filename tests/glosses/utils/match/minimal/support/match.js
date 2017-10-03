const bash = require("bash-match");
const minimatch = require("minimatch");

const { is, util } = adone;

const { util: { match: { minimal: matcher } } } = adone;

const compare = function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
};

export default function match(fixtures, patterns, expected, options) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    const actual = matcher(util.arrify(fixtures), patterns, options);
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

    const actual = matcher.match(util.arrify(fixtures), pattern, options);
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

    const fn = matcher.matcher(patterns, options);
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

match.isMatch = function () {
    return matcher.isMatch.apply(null, arguments);
};

match.makeRe = function () {
    return matcher.makeRe.apply(null, arguments);
};

match.create = function () {
    return matcher.create.apply(null, arguments);
};

match.not = function () {
    return matcher.not.apply(null, arguments);
};

/**
 * Decorate methods onto bash for parity with micromatch
 */

bash.makeRe = function () { };

match.bash = bash;


/**
 * Decorate methods onto minimatch for parity with micromatch
 */
minimatch.isMatch = function (file, pattern, options) {
    return minimatch(file, pattern, options);
};

const mmmatch = minimatch.match;
minimatch.match = function (files, pattern, options) {
    return mmmatch(util.arrify(files), pattern, options);
};

const mmmakeRe = minimatch.makeRe;
minimatch.makeRe = function (pattern, options) {
    return mmmakeRe(pattern, options);
};

minimatch.braces = function (pattern, options) {
    return minimatch.braceExpand(pattern, options);
};

match.minimatch = minimatch;
