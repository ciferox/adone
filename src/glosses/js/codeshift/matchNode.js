const hasOwn =
    Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

/**
 * Checks whether needle is a strict subset of haystack.
 *
 * @param {*} haystack Value to test.
 * @param {*} needle Test function or value to look for in `haystack`.
 * @return {bool}
 */
function matchNode(haystack, needle) {
    if (typeof needle === 'function') {
        return needle(haystack);
    }
    if (isNode(needle) && isNode(haystack)) {
        return Object.keys(needle).every(function (property) {
            return (
                hasOwn(haystack, property) &&
                matchNode(haystack[property], needle[property])
            );
        });
    }
    return haystack === needle;
}

function isNode(value) {
    return typeof value === 'object' && value;
}

module.exports = matchNode;
