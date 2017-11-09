const { is, net: { mail: { __ } } } = adone;

/**
 * Checks if a value is plaintext string (uses only printable 7bit chars)
 *
 * @param {String} value String to be tested
 * @returns {Boolean} true if it is a plaintext string
 */
export const isPlainText = (value) => {
    if (!is.string(value) || /[\x00-\x08\x0b\x0c\x0e-\x1f\u0080-\uFFFF]/.test(value)) {
        return false;
    }
    return true;

};

const b64encode = (x) => adone.data.base64.encode(x, { buffer: false });

/**
 * Checks if a multi line string containes lines longer than the selected value.
 *
 * Useful when detecting if a mail message needs any processing at all –
 * if only plaintext characters are used and lines are short, then there is
 * no need to encode the values in any way. If the value is plaintext but has
 * longer lines then allowed, then use format=flowed
 *
 * @param {Number} lineLength Max line length to check for
 * @returns {Boolean} Returns true if there is at least one line longer than lineLength chars
 */
export const hasLongerLines = (str, lineLength) => {
    if (str.length > 128 * 1024) {
        // do not test strings longer than 128kB
        return true;
    }
    return new RegExp(`^.{${lineLength + 1},}`, "m").test(str);
};

/**
 * Splits a mime encoded string. Needed for dividing mime words into smaller chunks
 *
 * @param {String} str Mime encoded string to be split up
 * @param {Number} maxlen Maximum length of characters for one part (minimum 12)
 * @return {Array} Split string
 */
export const splitMimeEncodedString = (str, maxlen) => {
    let curLine;
    let match;
    let chr;
    let done;
    const lines = [];

    // require at least 12 symbols to fit possible 4 octet UTF-8 sequences
    maxlen = Math.max(maxlen || 0, 12);

    while (str.length) {
        curLine = str.substr(0, maxlen);

        // move incomplete escaped char back to main
        if ((match = curLine.match(/\=[0-9A-F]?$/i))) {
            curLine = curLine.substr(0, match.index);
        }

        done = false;
        while (!done) {
            done = true;
            // check if not middle of a unicode char sequence
            if ((match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i))) {
                chr = parseInt(match[1], 16);
                // invalid sequence, move one char back anc recheck
                if (chr < 0xC2 && chr > 0x7F) {
                    curLine = curLine.substr(0, curLine.length - 3);
                    done = false;
                }
            }
        }

        if (curLine.length) {
            lines.push(curLine);
        }
        str = str.substr(curLine.length);
    }

    return lines;
};

/**
 * Encodes a string or an Buffer to an UTF-8 MIME Word (rfc2047)
 *
 * @param {String|Buffer} data String to be encoded
 * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
 * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
 * @return {String} Single or several mime words joined together
 */
export const encodeWord = (data, mimeWordEncoding, maxLength) => {
    mimeWordEncoding = (mimeWordEncoding || "Q")
        .toString()
        .toUpperCase()
        .trim()
        .charAt(0);
    maxLength = maxLength || 0;

    let encodedStr;
    const toCharset = "UTF-8";

    if (maxLength && maxLength > 7 + toCharset.length) {
        maxLength -= (7 + toCharset.length);
    }

    if (mimeWordEncoding === "Q") {
        // https://tools.ietf.org/html/rfc2047#section-5 rule (3)
        encodedStr = __.qp.encode(data).replace(/[^a-z0-9!*+\-\/=]/ig, (chr) => {
            const ord = chr
                .charCodeAt(0)
                .toString(16)
                .toUpperCase();
            if (chr === " ") {
                return "_";
            }
            return `=${ord.length === 1 ? `0${ord}` : ord}`;

        });
    } else if (mimeWordEncoding === "B") {
        encodedStr = is.string(data) ? data : b64encode(data);
        maxLength = maxLength ? Math.max(3, (maxLength - maxLength % 4) / 4 * 3) : 0;
    }

    if (maxLength && (mimeWordEncoding !== "B" ? encodedStr : b64encode(data)).length > maxLength) {
        if (mimeWordEncoding === "Q") {
            encodedStr = splitMimeEncodedString(encodedStr, maxLength).join(`?= =?${toCharset}?${mimeWordEncoding}?`);
        } else {
            // RFC2047 6.3 (2) states that encoded-word must include an integral number of characters, so no chopping unicode sequences
            const parts = [];
            let lpart = "";
            for (let i = 0, len = encodedStr.length; i < len; i++) {
                const chr = encodedStr.charAt(i);
                // check if we can add this character to the existing string
                // without breaking byte length limit
                if (Buffer.byteLength(lpart + chr) <= maxLength || i === 0) {
                    lpart += chr;
                } else {
                    // we hit the length limit, so push the existing string and start over
                    parts.push(b64encode(lpart));
                    lpart = chr;
                }
            }
            if (lpart) {
                parts.push(b64encode(lpart));
            }

            if (parts.length > 1) {
                encodedStr = parts.join(`?= =?${toCharset}?${mimeWordEncoding}?`);
            } else {
                encodedStr = parts.join("");
            }
        }
    } else if (mimeWordEncoding === "B") {
        encodedStr = b64encode(data);
    }

    return `=?${toCharset}?${mimeWordEncoding}?${encodedStr}${encodedStr.substr(-2) === "?=" ? "" : "?="}`;
};

/**
 * Finds word sequences with non ascii text and converts these to mime words
 *
 * @param {String} value String to be encoded
 * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
 * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
 * @return {String} String with possible mime words
 */
export const encodeWords = (value, mimeWordEncoding, maxLength) => {
    maxLength = maxLength || 0;

    // find first word with a non-printable ascii in it
    const firstMatch = value.match(/(?:^|\s)([^\s]*[\u0080-\uFFFF])/);
    if (!firstMatch) {
        return value;
    }

    // find the last word with a non-printable ascii in it
    const lastMatch = value.match(/([\u0080-\uFFFF][^\s]*)[^\u0080-\uFFFF]*$/);
    if (!lastMatch) {
        // should not happen
        return value;
    }

    const startIndex = firstMatch.index + (firstMatch[0].match(/[^\s]/) || {
        index: 0
    }).index;
    const endIndex = lastMatch.index + (lastMatch[1] || "").length;

    let encodedValue = startIndex ? value.substr(0, startIndex) : "";
    encodedValue += encodeWord(value.substring(startIndex, endIndex), mimeWordEncoding || "Q", maxLength);
    encodedValue += endIndex < value.length ? value.substr(endIndex) : "";
    return encodedValue;
};

export const encodeURICharComponent = (chr) => {
    let res = "";
    let ord = chr
        .charCodeAt(0)
        .toString(16)
        .toUpperCase();

    if (ord.length % 2) {
        ord = `0${ord}`;
    }

    if (ord.length > 2) {
        for (let i = 0, len = ord.length / 2; i < len; i++) {
            res += `%${ord.substr(i, 2)}`;
        }
    } else {
        res += `%${ord}`;
    }

    return res;
};

export const safeEncodeURIComponent = (str) => {
    str = (str || "").toString();

    try {
        // might throw if we try to encode invalid sequences, eg. partial emoji
        str = encodeURIComponent(str);
    } catch (E) {
        // should never run
        return str.replace(/[^\x00-\x1F *'()<>@,;:\\"\[\]?=\u007F-\uFFFF]+/g, "");
    }

    // ensure chars that are not handled by encodeURICompent are converted as well
    return str.replace(/[\x00-\x1F *'()<>@,;:\\"\[\]?=\u007F-\uFFFF]/g, (chr) => encodeURICharComponent(chr));
};

/**
 * Encodes a string or an Buffer to an UTF-8 Parameter Value Continuation encoding (rfc2231)
 * Useful for splitting long parameter values.
 *
 * For example
 *      title="unicode string"
 * becomes
 *     title*0*=utf-8''unicode
 *     title*1*=%20string
 *
 * @param {String|Buffer} data String to be encoded
 * @param {Number} [maxLength=50] Max length for generated chunks
 * @param {String} [fromCharset='UTF-8'] Source sharacter set
 * @return {Array} A list of encoded keys and headers
 */
export const buildHeaderParam = (key, data, maxLength) => {
    const list = [];
    let encodedStr = is.string(data) ? data : (data || "").toString();
    let encodedStrArr;
    let chr;
    let ord;
    let line;
    let startPos = 0;
    let i;
    let len;

    maxLength = maxLength || 50;

    // process ascii only text
    if (isPlainText(data)) {

        // check if conversion is even needed
        if (encodedStr.length <= maxLength) {
            return [{
                key,
                value: encodedStr
            }];
        }

        encodedStr = encodedStr.replace(new RegExp(`.{${maxLength}}`, "g"), (str) => {
            list.push({
                line: str
            });
            return "";
        });

        if (encodedStr) {
            list.push({
                line: encodedStr
            });
        }

    } else {

        if (/[\uD800-\uDBFF]/.test(encodedStr)) {
            // string containts surrogate pairs, so normalize it to an array of bytes
            encodedStrArr = [];
            for (i = 0, len = encodedStr.length; i < len; i++) {
                chr = encodedStr.charAt(i);
                ord = chr.charCodeAt(0);
                if (ord >= 0xD800 && ord <= 0xDBFF && i < len - 1) {
                    chr += encodedStr.charAt(i + 1);
                    encodedStrArr.push(chr);
                    i++;
                } else {
                    encodedStrArr.push(chr);
                }
            }
            encodedStr = encodedStrArr;
        }

        // first line includes the charset and language info and needs to be encoded
        // even if it does not contain any unicode characters
        line = "utf-8''";
        let encoded = true;
        startPos = 0;

        // process text with unicode or special chars
        for (i = 0, len = encodedStr.length; i < len; i++) {

            chr = encodedStr[i];

            if (encoded) {
                chr = safeEncodeURIComponent(chr);
            } else {
                // try to urlencode current char
                chr = chr === " " ? chr : safeEncodeURIComponent(chr);
                // By default it is not required to encode a line, the need
                // only appears when the string contains unicode or special chars
                // in this case we start processing the line over and encode all chars
                if (chr !== encodedStr[i]) {
                    // Check if it is even possible to add the encoded char to the line
                    // If not, there is no reason to use this line, just push it to the list
                    // and start a new line with the char that needs encoding
                    if ((safeEncodeURIComponent(line) + chr).length >= maxLength) {
                        list.push({
                            line,
                            encoded
                        });
                        line = "";
                        startPos = i - 1;
                    } else {
                        encoded = true;
                        i = startPos;
                        line = "";
                        continue;
                    }
                }
            }

            // if the line is already too long, push it to the list and start a new one
            if ((line + chr).length >= maxLength) {
                list.push({
                    line,
                    encoded
                });
                line = chr = encodedStr[i] === " " ? " " : safeEncodeURIComponent(encodedStr[i]);
                if (chr === encodedStr[i]) {
                    encoded = false;
                    startPos = i - 1;
                } else {
                    encoded = true;
                }
            } else {
                line += chr;
            }
        }

        if (line) {
            list.push({
                line,
                encoded
            });
        }
    }

    return list.map((item, i) => ({
        // encoded lines: {name}*{part}*
        // unencoded lines: {name}*{part}
        // if any line needs to be encoded then the first line (part==0) is always encoded
        key: `${key}*${i}${item.encoded ? "*" : ""}`,
        value: item.line
    }));
};

/**
 * Joins parsed header value together as 'value; param1=value1; param2=value2'
 * PS: We are following RFC 822 for the list of special characters that we need to keep in quotes.
 *      Refer: https://www.w3.org/Protocols/rfc1341/4_Content-Type.html
 * @param {Object} structured Parsed header value
 * @return {String} joined header value
 */
export const buildHeaderValue = (structured) => {
    const paramsArray = [];

    Object.keys(structured.params || {}).forEach((param) => {
        // filename might include unicode characters so it is a special case
        // other values probably do not
        const value = structured.params[param];
        if (!isPlainText(value) || value.length >= 75) {
            buildHeaderParam(param, value, 50).forEach((encodedParam) => {
                if (!/[\s"\\;:\/=\(\),<>@\[\]\?]|^[\-']|'$/.test(encodedParam.value) || encodedParam.key.substr(-1) === "*") {
                    paramsArray.push(`${encodedParam.key}=${encodedParam.value}`);
                } else {
                    paramsArray.push(`${encodedParam.key}=${JSON.stringify(encodedParam.value)}`);
                }
            });
        } else if (/[\s'"\\;:\/=\(\),<>@\[\]\?]|^\-/.test(value)) {
            paramsArray.push(`${param}=${JSON.stringify(value)}`);
        } else {
            paramsArray.push(`${param}=${value}`);
        }
    });

    return structured.value + (paramsArray.length ? `; ${paramsArray.join("; ")}` : "");
};

/**
 * Parses a header value with key=value arguments into a structured
 * object.
 *
 *   parseHeaderValue('content-type: text/plain; CHARSET='UTF-8'') ->
 *   {
 *     'value': 'text/plain',
 *     'params': {
 *       'charset': 'UTF-8'
 *     }
 *   }
 *
 * @param {String} str Header value
 * @return {Object} Header value as a parsed structure
 */
export const parseHeaderValue = (str) => {
    const response = {
        value: false,
        params: {}
    };
    let key = false;
    let value = "";
    let type = "value";
    let quote = false;
    let escaped = false;
    let chr;

    for (let i = 0, len = str.length; i < len; i++) {
        chr = str.charAt(i);
        if (type === "key") {
            if (chr === "=") {
                key = value.trim().toLowerCase();
                type = "value";
                value = "";
                continue;
            }
            value += chr;
        } else {
            if (escaped) {
                value += chr;
            } else if (chr === "\\") {
                escaped = true;
                continue;
            } else if (quote && chr === quote) {
                quote = false;
            } else if (!quote && chr === '"') {
                quote = chr;
            } else if (!quote && chr === ";") {
                if (key === false) {
                    response.value = value.trim();
                } else {
                    response.params[key] = value.trim();
                }
                type = "key";
                value = "";
            } else {
                value += chr;
            }
            escaped = false;

        }
    }

    if (type === "value") {
        if (key === false) {
            response.value = value.trim();
        } else {
            response.params[key] = value.trim();
        }
    } else if (value.trim()) {
        response.params[value.trim().toLowerCase()] = "";
    }

    // handle parameter value continuations
    // https://tools.ietf.org/html/rfc2231#section-3

    // preprocess values
    Object.keys(response.params).forEach((key) => {
        let actualKey;
        let nr;
        let match;
        let value;
        if ((match = key.match(/(\*(\d+)|\*(\d+)\*|\*)$/))) {
            actualKey = key.substr(0, match.index);
            nr = Number(match[2] || match[3]) || 0;

            if (!response.params[actualKey] || !is.object(response.params[actualKey])) {
                response.params[actualKey] = {
                    charset: false,
                    values: []
                };
            }

            value = response.params[key];

            if (nr === 0 && match[0].substr(-1) === "*" && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
                response.params[actualKey].charset = match[1] || "iso-8859-1";
                value = match[2];
            }

            response.params[actualKey].values[nr] = value;

            // remove the old reference
            delete response.params[key];
        }
    });

    // concatenate split rfc2231 strings and convert encoded strings to mime encoded words
    Object.keys(response.params).forEach((key) => {
        let value;
        if (response.params[key] && is.array(response.params[key].values)) {
            value = response.params[key].values.map((val) => val || "").join("");

            if (response.params[key].charset) {
                // convert "%AB" to "=?charset?Q?=AB?="
                response.params[key] = `=?${response.params[key].charset}?Q?${
                // fix invalidly encoded chars
                value.replace(/[=\?_\s]/g,
                    (s) => {
                        const c = s.charCodeAt(0).toString(16);
                        if (s === " ") {
                            return "_";
                        }
                        return `%${ c.length < 2 ? "0" : ""  }${c}`;

                    }
                ).
                // change from urlencoding to percent encoding
                replace(/%/g, "=")}?=`;
            } else {
                response.params[key] = value;
            }
        }
    });

    return response;
};

/**
 * Returns file extension for a content type string. If no suitable extensions
 * are found, 'bin' is used as the default extension
 *
 * @param {String} mimeType Content type to be checked for
 * @return {String} File extension
 */
export const detectExtension = (mimeType) => __.mimeTypes.detectExtension(mimeType);

/**
 * Returns content type for a file extension. If no suitable content types
 * are found, 'application/octet-stream' is used as the default content type
 *
 * @param {String} extension Extension to be checked for
 * @return {String} File extension
 */
export const detectMimeType = (extension) => __.mimeTypes.detectMimeType(extension);

/**
 * Folds long lines, useful for folding header lines (afterSpace=false) and
 * flowed text (afterSpace=true)
 *
 * @param {String} str String to be folded
 * @param {Number} [lineLength=76] Maximum length of a line
 * @param {Boolean} afterSpace If true, leave a space in th end of a line
 * @return {String} String with folded lines
 */
export const foldLines = (str, lineLength, afterSpace) => {
    str = (str || "").toString();
    lineLength = lineLength || 76;

    let pos = 0;
    const len = str.length;
    let result = "";
    let line;
    let match;

    while (pos < len) {
        line = str.substr(pos, lineLength);
        if (line.length < lineLength) {
            result += line;
            break;
        }
        if ((match = line.match(/^[^\n\r]*(\r?\n|\r)/))) {
            line = match[0];
            result += line;
            pos += line.length;
            continue;
        } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || "").length : 0) < line.length) {
            line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || "").length : 0)));
        } else if ((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))) {
            line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
        }

        result += line;
        pos += line.length;
        if (pos < len) {
            result += "\r\n";
        }
    }

    return result;
};
