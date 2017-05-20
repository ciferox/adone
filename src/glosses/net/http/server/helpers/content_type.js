
const { x, is, util } = adone;

const PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
const TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
const TOKEN_REGEXP = /^[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+$/;

// RegExp to match quoted-pair in RFC 7230 sec 3.2.6
// quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
// obs-text    = %x80-FF
const QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;

// RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
const QUOTE_REGEXP = /([\\"])/g;

// RegExp to match type in RFC 7231 sec 3.1.1.1
// media-type = type "/" subtype
// type       = token
// subtype    = token
const TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

const quoteString = (val) => {
    const str = String(val);

    // no need to quote tokens
    if (TOKEN_REGEXP.test(str)) {
        return str;
    }

    if (str.length > 0 && !TEXT_REGEXP.test(str)) {
        throw new x.InvalidArgument("invalid parameter value");
    }

    return `"${str.replace(QUOTE_REGEXP, "\\$1")}"`;
};

export const format = (obj) => {
    if (!is.object(obj)) {
        throw new x.InvalidArgument("argument obj is required");
    }

    const { parameters, type } = obj;

    if (!type || !TYPE_REGEXP.test(type)) {
        throw new x.InvalidArgument("invalid type");
    }

    let string = type;

    // append parameters
    if (parameters && is.object(parameters)) {
        let param;
        const params = util.keys(parameters).sort();

        for (let i = 0; i < params.length; i++) {
            param = params[i];

            if (!TOKEN_REGEXP.test(param)) {
                throw new x.InvalidArgument("invalid parameter name");
            }

            string += `; ${param}=${quoteString(parameters[param])}`;
        }
    }

    return string;
};

class ContentType {
    constructor(type) {
        this.type = type;
        this.parameters = {};
    }
}

// Get content-type from req/res objects.
const getContentType = (obj) => {
    if (is.function(obj.getHeader)) {
        // res-like
        return obj.getHeader("content-type");
    }

    if (is.object(obj.headers)) {
        // req-like
        return obj.headers["content-type"];
    }
};

export const parse = (string) => {
    if (!string) {
        throw new x.InvalidArgument("argument string is required");
    }

    if (is.object(string)) {
        // support req/res-like objects as argument
        string = getContentType(string);

        if (!is.string(string)) {
            throw new x.IllegalState("content-type header is missing from object");
        }
    }

    if (!is.string(string)) {
        throw new x.InvalidArgument("argument string is required to be a string");
    }

    let index = string.indexOf(";");
    const type = index !== -1 ? string.substr(0, index).trim() : string.trim();

    if (!TYPE_REGEXP.test(type)) {
        throw new x.IllegalState("invalid media type");
    }

    const obj = new ContentType(type.toLowerCase());

    PARAM_REGEXP.lastIndex = index;

    let key;
    let value;
    let match;
    while ((match = PARAM_REGEXP.exec(string))) {
        if (match.index !== index) {
            throw new x.IllegalState("invalid parameter format");
        }

        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];

        if (value[0] === '"') {
            // remove quotes and escapes
            value = value.substr(1, value.length - 2).replace(QESC_REGEXP, "$1");
        }

        obj.parameters[key] = value;
    }

    if (index !== -1 && index !== string.length) {
        throw new x.IllegalState("invalid parameter format");
    }

    return obj;
};
