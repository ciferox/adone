const {
    is
} = adone;

/**
 * Gets an issuer or subject attribute from its name, type, or short name.
 *
 * @param obj the issuer or subject object.
 * @param options a short name string or an object with:
 *          shortName the short name for the attribute.
 *          name the name for the attribute.
 *          type the type for the attribute.
 *
 * @return the attribute.
 */
export default function getAttribute(obj, options) {
    if (is.string(options)) {
        options = { shortName: options };
    }

    let rval = null;
    let attr;
    for (let i = 0; is.null(rval) && i < obj.attributes.length; ++i) {
        attr = obj.attributes[i];
        if (options.type && options.type === attr.type) {
            rval = attr;
        } else if (options.name && options.name === attr.name) {
            rval = attr;
        } else if (options.shortName && options.shortName === attr.shortName) {
            rval = attr;
        }
    }
    return rval;
}
