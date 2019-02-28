/**
 * ### .isNaN(value)
 *
 * Checks if the given value is NaN or not.
 *
 *     utils.isNaN(NaN); // true
 *
 * @param {Value} The value which has to be checked if it is NaN
 * @name isNaN
 * @api private
 */

const isNaN = function (value) {
    // Refer http://www.ecma-international.org/ecma-262/6.0/#sec-isnan-number
    // section's NOTE.
    // eslint-disable-next-line no-self-compare
    return value !== value;
};

// If ECMAScript 6's Number.isNaN is present, prefer that.
// eslint-disable-next-line adone/no-number-methods
module.exports = Number.isNaN || isNaN;
