/**
 * ### .getOwnEnumerablePropertySymbols(object)
 *
 * This allows the retrieval of directly-owned enumerable property symbols of an
 * object. This function is necessary because Object.getOwnPropertySymbols
 * returns both enumerable and non-enumerable property symbols.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getOwnEnumerablePropertySymbols
 * @api public
 */

module.exports = function getOwnEnumerablePropertySymbols(obj) {
    // eslint-disable-next-line adone/no-typeof
    if (typeof Object.getOwnPropertySymbols !== "function") {
        return [];
    }

    return Object.getOwnPropertySymbols(obj).filter((sym) => {
        return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
    });
};
