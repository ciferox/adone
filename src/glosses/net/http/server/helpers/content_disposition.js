
const { std: { path: { basename } }, is, x, util } = adone;

// RegExp to match non attr-char, *after* encodeURIComponent (i.e. not including "%")
const ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'()*,/:;<=>?@[\\\]{}\x7f]/g;

const HEX_ESCAPE_REGEXP = /%[0-9A-Fa-f]{2}/;
const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g;

const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g;

// RegExp to match quoted-pair in RFC 2616
const QESC_REGEXP = /\\([\u0000-\u007f])/g;

// RegExp to match chars that must be quoted-pair in RFC 2616
const QUOTE_REGEXP = /([\\"])/g;

/**
 * RegExp for various RFC 2616 grammar
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
 * HT            = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 */
const PARAM_REGEXP = /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g; // eslint-disable-line no-control-regex
const TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/;
const TOKEN_REGEXP = /^[!#$%&'*+.0-9A-Z^_`a-z|~-]+$/;

/**
 * RegExp for various RFC 5987 grammar
 *
 * ext-value     = charset  "'" [ language ] "'" value-chars
 * charset       = "UTF-8" / "ISO-8859-1" / mime-charset
 * mime-charset  = 1*mime-charsetc
 * mime-charsetc = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "%" / "&"
 *               / "+" / "-" / "^" / "_" / "`"
 *               / "{" / "}" / "~"
 * language      = ( 2*3ALPHA [ extlang ] )
 *               / 4ALPHA
 *               / 5*8ALPHA
 * extlang       = *3( "-" 3ALPHA )
 * value-chars   = *( pct-encoded / attr-char )
 * pct-encoded   = "%" HEXDIG HEXDIG
 * attr-char     = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "&" / "+" / "-" / "."
 *               / "^" / "_" / "`" / "|" / "~"
 */
const EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/;

/**
 * RegExp for various RFC 6266 grammar
 *
 * disposition-type = "inline" | "attachment" | disp-ext-type
 * disp-ext-type    = token
 * disposition-parm = filename-parm | disp-ext-parm
 * filename-parm    = "filename" "=" value
 *                  | "filename*" "=" ext-value
 * disp-ext-parm    = token "=" value
 *                  | ext-token "=" ext-value
 * ext-token        = <the characters in token, followed by "*">
 */
const DISPOSITION_TYPE_REGEXP = /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/; // eslint-disable-line no-control-regex

// Quote a string for HTTP.
const qstring = (val) => `"${String(val).replace(QUOTE_REGEXP, "\\$1")}"`;

// Percent decode a single character.
const pdecode = (str, hex) => String.fromCharCode(parseInt(hex, 16));

// Percent encode a single character.
const pencode = (char) => {
    const hex = String(char).charCodeAt(0).toString(16).toUpperCase();
    return hex.length === 1 ? `%0${hex}` : `%${hex}`;
};

// Encode a Unicode string for HTTP (RFC 5987).
const ustring = (val) => `UTF-8''${encodeURIComponent(String(val)).replace(ENCODE_URL_ATTR_CHAR_REGEXP, pencode)}`;

// Get ISO-8859-1 version of string.
// simple Unicode -> ISO-8859-1 transformation
const getlatin1 = (val) => String(val).replace(NON_LATIN1_REGEXP, "?");

// Decode a RFC 6987 field value (gracefully).
const decodefield = (str) => {
    const match = EXT_VALUE_REGEXP.exec(str);

    if (!match) {
        throw new x.InvalidArgument("invalid extended field value");
    }

    const charset = match[1].toLowerCase();
    const encoded = match[2];
    let value;

    // to binary string
    const binary = encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode);

    switch (charset) {
        case "iso-8859-1": {
            value = getlatin1(binary);
            break;
        }
        case "utf-8": {
            value = Buffer.from(binary, "binary").toString("utf8");
            break;
        }
        default: {
            throw new x.NotSupported("unsupported charset in extended field");
        }
    }

    return value;
};

// Format object to Content-Disposition header.
const format = (obj) => {
    const { parameters, type } = obj;

    if (!type || !is.string(type) || !TOKEN_REGEXP.test(type)) {
        throw new x.InvalidArgument("invalid type");
    }

    // start with normalized type
    let string = String(type).toLowerCase();

    // append parameters
    if (parameters && is.object(parameters)) {
        const params = util.keys(parameters).sort();

        for (const param of params) {
            const val = param.substr(-1) === "*" ? ustring(parameters[param]) : qstring(parameters[param]);
            string += `; ${param}=${val}`;
        }
    }

    return string;
};

// Create parameters object from filename and fallback.
const createParams = (filename, fallback = true) => {
    if (is.undefined(filename)) {
        return;
    }

    const params = {};

    if (!is.string(filename)) {
        throw new x.InvalidArgument("filename must be a string");
    }

    if (!is.string(fallback) && !is.boolean(fallback)) {
        throw new x.InvalidArgument("fallback must be a string or boolean");
    }

    if (is.string(fallback) && NON_LATIN1_REGEXP.test(fallback)) {
        throw new x.InvalidArgument("fallback must be ISO-8859-1 string");
    }

    // restrict to file base name
    const name = basename(filename);

    // determine if name is suitable for quoted string
    const isQuotedString = TEXT_REGEXP.test(name);

    // generate fallback name
    const fallbackName = is.string(fallback) ? basename(fallback) : fallback && getlatin1(name);
    const hasFallback = is.string(fallbackName) && fallbackName !== name;

    // set extended filename parameter
    if (hasFallback || !isQuotedString || HEX_ESCAPE_REGEXP.test(name)) {
        params["filename*"] = name;
    }

    // set filename parameter
    if (isQuotedString || hasFallback) {
        params.filename = hasFallback ? fallbackName : name;
    }

    return params;
};

class ContentDisposition {
    constructor(type, parameters) {
        this.type = type;
        this.parameters = parameters;
    }
}


// Create an attachment Content-Disposition header.
const contentDisposition = (filename, options = {}) => {
    const { type = "attachment" } = options;

    const params = createParams(filename, options.fallback);

    return format(new ContentDisposition(type, params));
};

// Parse Content-Disposition header string.
contentDisposition.parse = (string) => {
    if (!string || !is.string(string)) {
        throw new x.InvalidArgument("argument string is required");
    }

    let match = DISPOSITION_TYPE_REGEXP.exec(string);

    if (!match) {
        throw new x.InvalidArgument("invalid type format");
    }

    // normalize type
    let index = match[0].length;
    const type = match[1].toLowerCase();

    let key;
    const names = [];
    const params = {};
    let value;

    // calculate index to start at
    index = PARAM_REGEXP.lastIndex = match[0].substr(-1) === ";" ? index - 1 : index;

    // match parameters
    while ((match = PARAM_REGEXP.exec(string))) {
        if (match.index !== index) {
            throw new x.InvalidArgument("invalid parameter format");
        }

        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];

        if (names.includes(key)) {
            throw new x.InvalidArgument("invalid duplicate parameter");
        }

        names.push(key);

        if (key.indexOf("*") + 1 === key.length) {
            // decode extended value
            key = key.slice(0, -1);
            value = decodefield(value);

            // overwrite existing value
            params[key] = value;
            continue;
        }

        if (is.string(params[key])) {
            continue;
        }

        if (value[0] === '"') {
            // remove quotes and escapes
            value = value.substr(1, value.length - 2).replace(QESC_REGEXP, "$1");
        }

        params[key] = value;
    }

    if (index !== -1 && index !== string.length) {
        throw new x.InvalidArgument("invalid parameter format");
    }

    return new ContentDisposition(type, params);
};

export default contentDisposition;
