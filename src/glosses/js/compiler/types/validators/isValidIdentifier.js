const {
    is,
    js: { esutils }
} = adone;

/**
 * Check if the input `name` is a valid identifier name
 * and isn't a reserved word.
 */
export default function isValidIdentifier(name) {
    if (
        !is.string(name) ||
        esutils.keyword.isReservedWordES6(name, true)
    ) {
        return false;
    } else if (name === "await") {
        // invalid in module, valid in script; better be safe (see #4952)
        return false;
    }
    return esutils.keyword.isIdentifierNameES6(name);
}
