const {
    assertion: { AssertionError }
} = adone;

/**
 * ### .expectTypes(obj, types)
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

const flag = require("./flag");
const type = require("type-detect");

module.exports = function expectTypes(obj, types) {
    let flagMsg = flag(obj, "message");
    const ssfi = flag(obj, "ssfi");

    flagMsg = flagMsg ? `${flagMsg}: ` : "";

    obj = flag(obj, "object");
    types = types.map((t) => {
        return t.toLowerCase();
    });
    types.sort();

    // Transforms ['lorem', 'ipsum'] into 'a lorem, or an ipsum'
    const str = types.map((t, index) => {
        const art = ~["a", "e", "i", "o", "u"].indexOf(t.charAt(0)) ? "an" : "a";
        const or = types.length > 1 && index === types.length - 1 ? "or " : "";
        return `${or + art} ${t}`;
    }).join(", ");

    const objType = type(obj).toLowerCase();

    if (!types.some((expected) => {
        return objType === expected;
    })) {
        throw new AssertionError(
            `${flagMsg}object tested must be ${str}, but ${objType} given`,
            undefined,
            ssfi
        );
    }
};
