/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getEnumerableProperties
 * @api public
 */

export default function getEnumerableProperties(object) {
    const result = [];
    for (const name in object) {
        result.push(name);
    }
    return result;
}
