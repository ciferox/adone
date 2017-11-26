const { is } = adone;

//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
const tokenChars = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
    0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
    0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
];

/**
 * Adds an offer to the map of extension offers or a parameter to the map of
 * parameters.
 *
 * @param {Object} dest The map of extension offers or parameters
 * @param {String} name The extension or parameter name
 * @param {(Object|Boolean|String)} elem The extension parameters or the
 *     parameter value
 * @private
 */
const push = (dest, name, elem) => {
    if (Object.prototype.hasOwnProperty.call(dest, name)) {
        dest[name].push(elem);
    } else {
        dest[name] = [elem];
    }
};

/**
 * Parses the `Sec-WebSocket-Extensions` header into an object.
 *
 * @param {String} header The field value of the header
 * @return {Object} The parsed object
 * @public
 */
export const parse = (header) => {
    const offers = {};

    if (is.undefined(header) || header === "") {
        return offers;
    }

    let params = {};
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let end = -1;
    let i;
    for (i = 0; i < header.length; i++) {
        const code = header.charCodeAt(i);

        if (is.undefined(extensionName)) {
            if (end === -1 && tokenChars[code] === 1) {
                if (start === -1) {
                    start = i;
                }
            } else if (code === 0x20/* ' ' */ || code === 0x09/* '\t' */) {
                if (end === -1 && start !== -1) {
                    end = i;
                }
            } else if (code === 0x3b/* ';' */ || code === 0x2c/* ',' */) {
                if (start === -1) {
                    throw new Error(`unexpected character at index ${i}`);
                }

                if (end === -1) {
                    end = i;
                }
                const name = header.slice(start, end);
                if (code === 0x2c) {
                    push(offers, name, params);
                    params = {};
                } else {
                    extensionName = name;
                }

                start = end = -1;
            } else {
                throw new Error(`unexpected character at index ${i}`);
            }
        } else if (is.undefined(paramName)) {
            if (end === -1 && tokenChars[code] === 1) {
                if (start === -1) {
                    start = i;
                }
            } else if (code === 0x20 || code === 0x09) {
                if (end === -1 && start !== -1) {
                    end = i;
                }
            } else if (code === 0x3b || code === 0x2c) {
                if (start === -1) {
                    throw new Error(`unexpected character at index ${i}`);
                }

                if (end === -1) {
                    end = i;
                }
                push(params, header.slice(start, end), true);
                if (code === 0x2c) {
                    push(offers, extensionName, params);
                    params = {};
                    extensionName = undefined;
                }

                start = end = -1;
            } else if (code === 0x3d/* '=' */ && start !== -1 && end === -1) {
                paramName = header.slice(start, i);
                start = end = -1;
            } else {
                throw new Error(`unexpected character at index ${i}`);
            }
        } else {
            //
            // The value of a quoted-string after unescaping must conform to the
            // token ABNF, so only token characters are valid.
            // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
            //
            if (isEscaping) {
                if (tokenChars[code] !== 1) {
                    throw new Error(`unexpected character at index ${i}`);
                }
                if (start === -1) {
                    start = i;
                } else if (!mustUnescape) {
                    mustUnescape = true;
                }
                isEscaping = false;
            } else if (inQuotes) {
                if (tokenChars[code] === 1) {
                    if (start === -1) {
                        start = i;
                    }
                } else if (code === 0x22/* '"' */ && start !== -1) {
                    inQuotes = false;
                    end = i;
                } else if (code === 0x5c/* '\' */) {
                    isEscaping = true;
                } else {
                    throw new Error(`unexpected character at index ${i}`);
                }
            } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
                inQuotes = true;
            } else if (end === -1 && tokenChars[code] === 1) {
                if (start === -1) {
                    start = i;
                }
            } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
                if (end === -1) {
                    end = i;
                }
            } else if (code === 0x3b || code === 0x2c) {
                if (start === -1) {
                    throw new Error(`unexpected character at index ${i}`);
                }

                if (end === -1) {
                    end = i;
                }
                let value = header.slice(start, end);
                if (mustUnescape) {
                    value = value.replace(/\\/g, "");
                    mustUnescape = false;
                }
                push(params, paramName, value);
                if (code === 0x2c) {
                    push(offers, extensionName, params);
                    params = {};
                    extensionName = undefined;
                }

                paramName = undefined;
                start = end = -1;
            } else {
                throw new Error(`unexpected character at index ${i}`);
            }
        }
    }

    if (start === -1 || inQuotes) {
        throw new Error("unexpected end of input");
    }

    if (end === -1) {
        end = i;
    }
    const token = header.slice(start, end);
    if (is.undefined(extensionName)) {
        push(offers, token, {});
    } else {
        if (is.undefined(paramName)) {
            push(params, token, true);
        } else if (mustUnescape) {
            push(params, paramName, token.replace(/\\/g, ""));
        } else {
            push(params, paramName, token);
        }
        push(offers, extensionName, params);
    }

    return offers;
};

/**
 * Serializes a parsed `Sec-WebSocket-Extensions` header to a string.
 *
 * @param {Object} value The object to format
 * @return {String} A string representing the given value
 * @public
 */
export const format = (value) => {
    return Object.keys(value).map((token) => {
        let paramsList = value[token];
        if (!is.array(paramsList)) {
            paramsList = [paramsList];
        }
        return paramsList.map((params) => {
            return [token].concat(Object.keys(params).map((k) => {
                let p = params[k];
                if (!is.array(p)) {
                    p = [p];
                }
                return p.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })).join("; ");
        }).join(", ");
    }).join(", ");
};
