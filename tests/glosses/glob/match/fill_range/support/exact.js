const {
    is
} = adone;

const util = require("util");

module.exports = (actual, expected) => {
    assert(is.array(actual));
    const a = util.inspect(actual);
    const b = util.inspect(expected);
    assert.strictEqual(a, b, `${a} !== ${b}`);
};
