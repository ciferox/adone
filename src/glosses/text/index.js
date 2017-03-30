const { is } = adone;

// From Mozilla Developper Network
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
const escapeControlMap = { "\r": "\\r", "\n": "\\n", "\t": "\\t", "\x7f": "\\x7f" };
const escapeHtmlMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
export const escape = {
    regExpPattern: (str) => str.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1"),
    regExpReplacement: (str) => str.replace(/\$/g, "$$$$"), // This replace any single $ by a double $$
    format: (str) => str.replace(/%/g, "%%"), // This replace any single % by a double %%
    shellArg: (str) => (`'${str.replace(/\'/g, "'\\''")}'`),
    // Escape \r \n \t so they become readable again, escape all ASCII control character as well, using \x syntaxe
    control: (str) => {
        return str.replace(/[\x00-\x1f\x7f]/g, (match) => {
            if (escapeControlMap[match] !== undefined) {
                return escapeControlMap[match];
            }
            let hex = match.charCodeAt(0).toString(16);
            if (hex.length % 2) {
                hex = `0${hex}`;
            }
            return `\\x${hex}`;
        });
    },
    // Escape all html special characters & < > " '
    htmlSpecialChars: (str) => str.replace(/[&<>"']/g, (match) => escapeHtmlMap[match])
};

export const regexp = {
    array2alternatives: (array) => {
        const sorted = array.slice();

        // Sort descending by string length
        sorted.sort((a, b) => (b.length - a.length));

        // Then escape what should be
        for (let i = 0; i < sorted.length; ++i) {
            sorted[i] = escape.regExpPattern(sorted[i]);
        }

        return sorted.join("|");
    }
};

export const ansi = {
    escapeCodesRegexp: () => /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g,
    stripEscapeCodes: (str) => (is.string(str) ? str.replace(ansi.escapeCodesRegexp(), "") : str)
};

export const escapeStringRegexp = (str) => {
    if (typeof str !== "string") {
        throw new TypeError("Expected a string");
    }

    return str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
};

// Transform alphanum separated by underscore or minus to camel case
export const toCamelCase = (str) => {
    if (!str || !is.string(str)) {
        return "";
    }
    return str.replace(/^[\s_-]*([^\s_-]+)|[\s_-]+([^\s_-]?)([^\s_-]*)/g, (match, firstWord, firstLetter, endOfWord) => {
        if (firstWord) {
            return firstWord.toLowerCase();
        }
        if (!firstLetter) {
            return "";
        }
        return firstLetter.toUpperCase() + endOfWord.toLowerCase();
    });
};

// Transform camel case to alphanum separated by minus
export const camelCaseToDashed = (str) => {
    if (!str || !is.string(str)) {
        return "";
    }
    return str.replace(/^([A-Z])|([A-Z])/g, (match, firstLetter, letter) => {
        if (firstLetter) {
            return firstLetter.toLowerCase();
        }
        return `-${letter.toLowerCase()}`;
    });
};

export const endLineRegExp = /\r\n|\r|\n/;

// Returns array of separated lines with line endings
export const splitLines = (str) => {
    const lines = [];
    let match;
    let line;
    while ((match = endLineRegExp.exec(str))) {
        line = str.slice(0, match.index) + match[0];
        str = str.slice(line.length);
        lines.push(line);
    }
    lines.push(str);
    return lines;
};

export const regExpIndexOf = (str, regex, index) => {
    index = index || 0;
    const offset = str.slice(index).search(regex);
    return (offset >= 0) ? (index + offset) : offset;
};

export const regExpLastIndexOf = (str, regex, index) => {
    if (index === 0 || index) {
        str = str.slice(0, Math.max(0, index));
    }
    let i;
    let offset = -1;
    while ((i = str.search(regex)) !== -1) {
        offset += i + 1;
        str = str.slice(i + 1);
    }
    return offset;
};

/**
 * Return a random alphanumerical string of length len
 * There is a very small probability (less than 1/1,000,000) for the length to be less than len
 * (il the base64 conversion yields too many pluses and slashes) but
 * that"s not an issue here
 * The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
 * See http://en.wikipedia.org/wiki/Birthday_problem
 */
export const random = (len) => adone.std.crypto.randomBytes(Math.ceil(Math.max(8, len * 2))).toString("base64").replace(/[+\/]/g, "").slice(0, len);

export const detectNewline = (str) => {
    const newlines = (str.match(/(?:\r?\n)/g) || []);

    if (newlines.length === 0) {
        return null;
    }

    const crlf = newlines.filter((el) => el === "\r\n").length;

    const lf = newlines.length - crlf;

    return crlf > lf ? "\r\n" : "\n";
};

export const wordwrap = (str, stop, { join = true, mode = "soft" } = {}) => {
    let lines = str.split("\n");
    if (lines.length > 1) {
        lines = lines.map((x) => wordwrap(x, stop, { mode }));
    } else {
        const chunks = str.split(mode === "soft" ? /(\S+\s+)/ : /\b/).reduce((res, x) => {
            if (mode === "hard") {
                for (let i = 0; i < x.length; i += stop) {
                    res.push(x.slice(i, i + stop));
                }
            } else {
                res.push(x);
            }
            return res;
        }, []);
        lines = chunks.reduce((lines, rawChunk) => {
            if (rawChunk === "") {
                return lines;
            }
            const chunk = rawChunk.replace(/\t/g, "    ");
            const i = lines.length - 1;
            if (lines[i].length + chunk.length > stop) {
                lines[i] = lines[i].replace(/\s+$/, "");
                if (lines[i] === "") {
                    lines.pop();
                }
                for (const c of chunk.split(/\n/)) {
                    lines.push(c.replace(/^\s+/, ""));
                }
            } else {
                lines[i] += chunk;
            }
            return lines;
        }, [""]);
    }
    if (join) {
        return lines.join("\n");
    }
    return lines;
};

// the Levenshtein distance between two strings.
export const stringDistance = (strA, strB, memo) => {
    if (!memo) {
        // `memo` is a two-dimensional array containing a cache of distances
        // memo[i][j] is the distance between strA.slice(0, i) and
        // strB.slice(0, j).
        memo = [];
        for (let i = 0; i <= strA.length; i++) {
            memo[i] = [];
        }
    }

    if (!memo[strA.length] || !memo[strA.length][strB.length]) {
        if (strA.length === 0 || strB.length === 0) {
            memo[strA.length][strB.length] = Math.max(strA.length, strB.length);
        } else {
            memo[strA.length][strB.length] = Math.min(
                stringDistance(strA.slice(0, -1), strB, memo) + 1,
                stringDistance(strA, strB.slice(0, -1), memo) + 1,
                stringDistance(strA.slice(0, -1), strB.slice(0, -1), memo) +
                (strA.slice(-1) === strB.slice(-1) ? 0 : 1)
            );
        }
    }

    return memo[strA.length][strB.length];
};

export const capitalize = (str) => {
    if (!is.string(str)) {
        throw new adone.x.InvalidArgument("Must be a string");
    }
    if (str === "") {
        return str;
    }
    return `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`;
};

export const width = (str) => {
    if (typeof str !== "string" || str.length === 0) {
        return 0;
    }

    let width = 0;

    str = ansi.stripEscapeCodes(str);

    for (let i = 0; i < str.length; i++) {
        const code = str.codePointAt(i);

        // ignore control characters
        if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
            continue;
        }

        // surrogates
        if (code >= 0x10000) {
            i++;
        }

        if (adone.text.unicode.isFullWidthCodePoint(code)) {
            width += 2;
        } else {
            width++;
        }
    }

    return width;
};

adone.lazify({
    unicode: "./unicode",
    spinner: "./spinners",
    table: "./table",
    pretty: () => adone.lazify({
        json: "./pretties/json",
        table: "./pretties/table"
    }, null, require),
    Fuzzy: "./fuzzy"
}, exports, require);
