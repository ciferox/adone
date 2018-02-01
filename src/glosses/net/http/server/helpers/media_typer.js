const { is, exception } = adone;

/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" /
 *                          "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always
 *                              ; specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always
 *                              ; specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const SUBTYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
const TYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const TYPE_REGEXP = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;

export const format = (obj) => {
    if (!obj || !is.object(obj)) {
        throw new exception.InvalidArgument("argument obj is required");
    }

    const { subtype, suffix, type } = obj;

    if (!type || !TYPE_NAME_REGEXP.test(type)) {
        throw new exception.InvalidArgument("invalid type");
    }

    if (!subtype || !SUBTYPE_NAME_REGEXP.test(subtype)) {
        throw new exception.InvalidArgument("invalid subtype");
    }

    // format as type/subtype
    let string = `${type}/${subtype}`;

    if (suffix) {
        if (!TYPE_NAME_REGEXP.test(suffix)) {
            throw new exception.InvalidArgument("invalid suffix");
        }

        string += `+${suffix}`;
    }

    return string;
};

class MediaType {
    constructor(type, subtype, suffix) {
        this.type = type;
        this.subtype = subtype;
        this.suffix = suffix;
        this.parameters = Object.create(null);
    }
}


export const parse = (string) => {
    if (!string) {
        throw new exception.InvalidArgument("argument string is required");
    }

    if (!is.string(string)) {
        throw new exception.InvalidArgument("argument string is required to be a string");
    }

    const k = string.indexOf(";");

    if (k !== -1) {
        string = string.slice(0, k);
    }

    const match = TYPE_REGEXP.exec(string.toLowerCase());

    if (!match) {
        throw new exception.InvalidArgument("invalid media type");
    }

    const type = match[1];
    let subtype = match[2];
    let suffix;

    // suffix after last +
    const index = subtype.lastIndexOf("+");
    if (index !== -1) {
        suffix = subtype.substr(index + 1);
        subtype = subtype.substr(0, index);
    }

    return new MediaType(type, subtype, suffix);
};
