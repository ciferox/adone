/*!
 * getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

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

export default function getProperties(object) {
    const result = Object.getOwnPropertyNames(object);

    function addProperty(property) {
        if (result.indexOf(property) === -1) {
            result.push(property);
        }
    }

    let proto = Object.getPrototypeOf(object);
    while (proto !== null) {
        Object.getOwnPropertyNames(proto).forEach(addProperty);
        proto = Object.getPrototypeOf(proto);
    }

    return result;
}