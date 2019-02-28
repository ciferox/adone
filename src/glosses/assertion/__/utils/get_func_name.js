const {
    is
} = adone;

/**
 * ### .getFuncName(constructorFn)
 *
 * Returns the name of a function.
 * When a non-function instance is passed, returns `null`.
 * This also includes a polyfill function if `aFunc.name` is not defined.
 *
 * @name getFuncName
 * @param {Function} funct
 * @namespace Utils
 * @api public
 */

const toString = Function.prototype.toString;
const functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\s\(\/]+)/;
export default function (aFunc) {
    if (!is.function(aFunc)) {
        return null;
    }

    let name = "";
    if (is.undefined(Function.prototype.name) && is.undefined(aFunc.name)) {
        // Here we run a polyfill if Function does not support the `name` property and if aFunc.name is not defined
        const match = toString.call(aFunc).match(functionNameMatch);
        if (match) {
            name = match[1];
        }
    } else {
        // If we've got a `name` property we just use it
        name = aFunc.name;
    }

    return name;
}
