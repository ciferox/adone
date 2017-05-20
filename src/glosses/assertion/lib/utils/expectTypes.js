/*!
 * expectTypes utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### expectTypes(obj, types)
 *
 * Ensures that the object being tested against is of a valid type.
 *
 *     utils.expectTypes(this, ['array', 'object', 'string']);
 *
 * @param {Mixed} obj constructed Assertion
 * @param {Array} type A list of allowed types for this assertion
 * @namespace Utils
 * @name expectTypes
 * @api public
 */
import AssertionError from "../../assertion_error";

import flag from "./flag";

const vowels = new Set(["a", "e", "i", "o", "u"]);

export default function (obj, types) {
    obj = flag(obj, "object");
    types = types.map((t) => t.toLowerCase());
    types.sort();

    // Transforms ['lorem', 'ipsum'] into 'a lirum, or an ipsum'
    const str = types.map((t, index) => {
        const art = vowels.has(t.charAt(0)) ? "an" : "a";
        const or = types.length > 1 && index === types.length - 1 ? "or " : "";
        return `${or + art} ${t}`;
    }).join(", ");

    const objType = adone.util.typeOf(obj).toLowerCase();

    if (!types.some((expected) => objType === expected)) {
        throw new AssertionError(
            `object tested must be ${str}, but ${objType} given`
        );
    }
}
