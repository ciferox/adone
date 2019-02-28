const flag = require("./flag");

/**
 * ### .test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name test
 */

module.exports = function test(obj, args) {
    const negate = flag(obj, "negate");
    const expr = args[0];
    return negate ? !expr : expr;
};
