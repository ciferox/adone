/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
    const result = Object.getOwnPropertyNames(object);

    const addProperty = function (property) {
        if (result.indexOf(property) === -1) {
            result.push(property);
        }
    }

    let proto = Object.getPrototypeOf(object);
    // eslint-disable-next-line adone/no-null-comp
    while (proto !== null) {
        Object.getOwnPropertyNames(proto).forEach(addProperty);
        proto = Object.getPrototypeOf(proto);
    }

    return result;
};
