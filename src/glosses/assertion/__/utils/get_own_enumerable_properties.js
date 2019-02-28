/**
 * !
 * Module dependencies
 */

const getOwnEnumerablePropertySymbols = require("./get_own_enumerable_property_symbols");

/**
 * ### .getOwnEnumerableProperties(object)
 *
 * This allows the retrieval of directly-owned enumerable property names and
 * symbols of an object. This function is necessary because Object.keys only
 * returns enumerable property names, not enumerable property symbols.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getOwnEnumerableProperties
 * @api public
 */

module.exports = function getOwnEnumerableProperties(obj) {
    return Object.keys(obj).concat(getOwnEnumerablePropertySymbols(obj));
};
