
const { is, x, util } = adone;

/**
 * RegExp to match *( ";" parameter ) in RFC 2616 sec 3.7
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * SHT           = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 */
const paramRegExp = /; *([!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) *= *("(?:[ !\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u0020-\u007e])*"|[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) */g;
const textRegExp = /^[\u0020-\u007e\u0080-\u00ff]+$/;
const tokenRegExp = /^[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+$/;

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 */
const qescRegExp = /\\([\u0000-\u007f])/g;

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 */
const quoteRegExp = /([\\"])/g;

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
const subtypeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
const typeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const typeRegExp = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;

const qstring = (val) => {
    const str = String(val);

    // no need to quote tokens
    if (tokenRegExp.test(str)) {
        return str;
    }

    if (str.length > 0 && !textRegExp.test(str)) {
        throw new x.InvalidArgument("invalid parameter value");
    }

    return `"${str.replace(quoteRegExp, "\\$1")}"`;
};

export const format = (obj) => {
    if (!obj || !is.object(obj)) {
        throw new x.InvalidArgument("argument obj is required");
    }

    const { parameters, subtype, suffix, type } = obj;

    if (!type || !typeNameRegExp.test(type)) {
        throw new x.InvalidArgument("invalid type");
    }

    if (!subtype || !subtypeNameRegExp.test(subtype)) {
        throw new x.InvalidArgument("invalid subtype");
    }

    // format as type/subtype
    let string = `${type}/${subtype}`;

    if (suffix) {
        if (!typeNameRegExp.test(suffix)) {
            throw new x.InvalidArgument("invalid suffix");
        }

        string += `+${suffix}`;
    }

    // append parameters
    if (parameters && is.object(parameters)) {
        const params = util.keys(parameters).sort();

        for (const param of params) {
            if (!tokenRegExp.test(param)) {
                throw new x.InvalidArgument("invalid parameter name");
            }

            string += `; ${param}=${qstring(parameters[param])}`;
        }
    }

    return string;
};

// Simply "type/subtype+siffx" into parts.
const splitType = (string) => {
    const match = typeRegExp.exec(string.toLowerCase());

    if (!match) {
        throw new x.InvalidArgument("invalid media type");
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

    return { type, subtype, suffix };
};

export const parse = (string) => {
    if (!string) {
        throw new x.InvalidArgument("argument string is required");
    }

    if (!is.string(string)) {
        throw new x.InvalidArgument("argument string is required to be a string");
    }

    let index = string.indexOf(";");
    const type = index !== -1 ? string.substr(0, index) : string;

    paramRegExp.lastIndex = index;

    const obj = splitType(type);

    const params = {};
    let match;
    while ((match = paramRegExp.exec(string))) {
        if (match.index !== index) {
            throw new x.IllegalState("invalid parameter format");
        }

        index += match[0].length;
        const key = match[1].toLowerCase();
        let value = match[2];

        if (value[0] === '"') {
            // remove quotes and escapes
            value = value.substr(1, value.length - 2).replace(qescRegExp, "$1");
        }

        params[key] = value;
    }

    if (index !== -1 && index !== string.length) {
        throw new x.IllegalState("invalid parameter format");
    }

    obj.parameters = params;

    return obj;
};
