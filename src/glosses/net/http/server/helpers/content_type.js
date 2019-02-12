const {
    error,
    is,
    util
} = adone;

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
        throw new error.InvalidArgumentException("invalid parameter value");
    }

    return `"${str.replace(QUOTE_REGEXP, "\\$1")}"`;
};

export const format = (obj) => {
    if (!is.object(obj)) {
        throw new error.InvalidArgumentException("argument obj is required");
    }

    const { parameters, type } = obj;

    if (!type || !TYPE_REGEXP.test(type)) {
        throw new error.InvalidArgumentException("invalid type");
    }

    let string = type;

    // append parameters
    if (parameters && is.object(parameters)) {
        let param;
        const params = util.keys(parameters).sort();

        for (let i = 0; i < params.length; i++) {
            param = params[i];

            if (!TOKEN_REGEXP.test(param)) {
                throw new error.InvalidArgumentException("invalid parameter name");
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
    let header;

    if (is.function(obj.getHeader)) {
        // res-like
        header = obj.getHeader("content-type");
    } else if (is.object(obj.headers)) {
        // req-like
        header = obj.headers["content-type"];
    }
    if (!is.string(header)) {
        throw new error.IllegalStateException("content-type header is missing from object");
    }
    return header;
};

export const parse = (string) => {
    if (!string) {
        throw new error.InvalidArgumentException("argument string is required");
    }

    const header = is.object(string)
        ? getContentType(string)
        : string;

    if (!is.string(header)) {
        throw new TypeError("argument string is required to be a string");
    }

    let index = header.indexOf(";");
    const type = index !== -1 ? header.substr(0, index).trim() : header.trim();

    if (!TYPE_REGEXP.test(type)) {
        throw new error.IllegalStateException("invalid media type");
    }

    const obj = new ContentType(type.toLowerCase());

    if (index !== -1) {
        PARAM_REGEXP.lastIndex = index;

        let key;
        let value;
        let match;
        while ((match = PARAM_REGEXP.exec(header))) {
            if (match.index !== index) {
                throw new error.IllegalStateException("invalid parameter format");
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

        if (index !== header.length) {
            throw new error.IllegalStateException("invalid parameter format");
        }
    }

    return obj;
};
