import adone from "adone";
const { is } = adone;

// From Mozilla Developper Network
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
const escapeControlMap = { "\r": "\\r", "\n": "\\n", "\t": "\\t", "\x7f": "\\x7f" };
const escapeHtmlMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
const escape = {
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
    // Only escape & < > so this is suited for content outside tags
    html: (str) => str.replace(/[&<>]/g, (match) => escapeHtmlMap[match]),
    // Escape & < > " so this is suited for content inside a double-quoted attribute
    htmlAttr: (str) => str.replace(/[&<>"]/g, (match) => escapeHtmlMap[match]),
    // Escape all html special characters & < > " '
    htmlSpecialChars: (str) => str.replace(/[&<>"']/g, (match) => escapeHtmlMap[match])
};

const regexp = {
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

const text = {
    ansi: {
        color: {
            reset: "\x1b[0m",
            bold: "\x1b[1m",
            dim: "\x1b[2m",
            italic: "\x1b[3m",
            underline: "\x1b[4m",
            inverse: "\x1b[7m",
            defaultColor: "\x1b[39m",
            black: "\x1b[30m",
            red: "\x1b[31m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
            white: "\x1b[37m",
            brightBlack: "\x1b[90m",
            brightRed: "\x1b[91m",
            brightGreen: "\x1b[92m",
            brightYellow: "\x1b[93m",
            brightBlue: "\x1b[94m",
            brightMagenta: "\x1b[95m",
            brightCyan: "\x1b[96m",
            brightWhite: "\x1b[97m"
        },
        escapeCodesRegexp: () => /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g,
        stripEscapeCodes: (str) => (is.string(str) ? str.replace(text.ansi.escapeCodesRegexp(), "") : str)
    },
    escapeStringRegexp(str) {
        if (typeof str !== "string") {
            throw new TypeError("Expected a string");
        }

        return str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    },
    unicode: {
        // Get the length of an unicode string
        length: (str) => {
            return adone.std.punycode.ucs2.decode(str).length;
        },
        // Return an array of chars
        toArray: (str) => {
            return adone.std.punycode.ucs2.decode(str).map((code) => {
                return adone.std.punycode.ucs2.encode([code]);
            });
        },
        // Returns: 0: single char, 1: leading surrogate -1: trailing surrogate
        surrogatePair: (char) => {
            const code = char.charCodeAt(0);
            if (code < 0xd800 || code >= 0xe000) {
                return 0;
            } else if (code < 0xdc00) {
                return 1;
            }
            return -1;
        },
        // Check if a character is a full-width char or not
        isFullWidthCodePoint: (code) => {
            // Code points are derived from:
            // http://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
            if (code >= 0x1100 && (
                code <= 0x115f || // Hangul Jamo
                code === 0x2329 || // LEFT-POINTING ANGLE BRACKET
                code === 0x232a || // RIGHT-POINTING ANGLE BRACKET
                // CJK Radicals Supplement .. Enclosed CJK Letters and Months
                (code >= 0x2e80 && code <= 0x3247 && code !== 0x303f) ||
                // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
                code >= 0x3250 && code <= 0x4dbf ||
                // CJK Unified Ideographs .. Yi Radicals
                code >= 0x4e00 && code <= 0xa4c6 ||
                // Hangul Jamo Extended-A
                code >= 0xa960 && code <= 0xa97c ||
                // Hangul Syllables
                code >= 0xac00 && code <= 0xd7a3 ||
                // CJK Compatibility Ideographs
                code >= 0xf900 && code <= 0xfaff ||
                // Vertical Forms
                code >= 0xfe10 && code <= 0xfe19 ||
                // CJK Compatibility Forms .. Small Form Variants
                code >= 0xfe30 && code <= 0xfe6b ||
                // Halfwidth and Fullwidth Forms
                code >= 0xff01 && code <= 0xff60 ||
                code >= 0xffe0 && code <= 0xffe6 ||
                // Kana Supplement
                code >= 0x1b000 && code <= 0x1b001 ||
                // Enclosed Ideographic Supplement
                code >= 0x1f200 && code <= 0x1f251 ||
                // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
                code >= 0x20000 && code <= 0x3fffd)) {
                return true;
            }
            return false;
        },
        isFullWidth: (char) => {
            const code = char.codePointAt(0);
            return text.unicode.isFullWidthCodePoint(code);
        },
        // Convert normal ASCII chars to their full-width counterpart
        toFullWidth: (str) => {
            return adone.std.punycode.ucs2.encode(
                adone.std.punycode.ucs2.decode(str).map((code) => {
                    if (code >= 33 && code <= 126) {
                        return 0xff00 + code - 0x20;
                    }
                    return code;
                })
            );
        }
    },
    escape,
    regexp,
    // Transform alphanum separated by underscore or minus to camel case
    toCamelCase: (str) => {
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
    },
    // Transform camel case to alphanum separated by minus
    camelCaseToDashed: (str) => {
        if (!str || !is.string(str)) {
            return "";
        }
        return str.replace(/^([A-Z])|([A-Z])/g, (match, firstLetter, letter) => {
            if (firstLetter) {
                return firstLetter.toLowerCase();
            }
            return `-${letter.toLowerCase()}`;
        });
    },
    endLineRegExp: /\r\n|\r|\n/,
    // Returns array of separated lines with line endings
    splitLines: (str) => {
        const lines = [];
        let match;
        let line;
        while ((match = text.endLineRegExp.exec(str))) {
            line = str.slice(0, match.index) + match[0];
            str = str.slice(line.length);
            lines.push(line);
        }
        lines.push(str);
        return lines;
    },
    regExpIndexOf: (str, regex, index) => {
        index = index || 0;
        const offset = str.slice(index).search(regex);
        return (offset >= 0) ? (index + offset) : offset;
    },
    regExpLastIndexOf: (str, regex, index) => {
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
    },
    /**
     * Return a random alphanumerical string of length len
     * There is a very small probability (less than 1/1,000,000) for the length to be less than len
     * (il the base64 conversion yields too many pluses and slashes) but
     * that"s not an issue here
     * The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
     * See http://en.wikipedia.org/wiki/Birthday_problem
     */
    random: (len) => {
        return adone.std.crypto.randomBytes(Math.ceil(Math.max(8, len * 2))).toString("base64").replace(/[+\/]/g, "").slice(0, len);
    },
    detectNewline(str) {
        const newlines = (str.match(/(?:\r?\n)/g) || []);

        if (newlines.length === 0) {
            return null;
        }

        const crlf = newlines.filter((el) => el === "\r\n").length;

        const lf = newlines.length - crlf;

        return crlf > lf ? "\r\n" : "\n";
    },
    wordwrap: (str, stop, { join = true, mode = "soft" } = {}) => {
        let lines = str.split("\n");
        if (lines.length > 1) {
            lines = lines.map((x) => text.wordwrap(x, stop, { mode }));
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
    },
    // the Levenshtein distance between two strings.
    stringDistance: (strA, strB, memo) => {
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
                    text.stringDistance(strA.slice(0, -1), strB, memo) + 1,
                    text.stringDistance(strA, strB.slice(0, -1), memo) + 1,
                    text.stringDistance(strA.slice(0, -1), strB.slice(0, -1), memo) +
                    (strA.slice(-1) === strB.slice(-1) ? 0 : 1)
                );
            }
        }

        return memo[strA.length][strB.length];
    },
    capitalize: (str) => {
        if (!is.string(str)) {
            throw new adone.x.InvalidArgument("Must be a string");
        }
        if (str === "") {
            return str;
        }
        return `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`;
    },
    width: (str) => {
        if (typeof str !== "string" || str.length === 0) {
            return 0;
        }

        let width = 0;

        str = text.ansi.stripEscapeCodes(str);

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

            if (text.unicode.isFullWidthCodePoint(code)) {
                width += 2;
            } else {
                width++;
            }
        }

        return width;
    }
};

adone.lazify({
    spinner: "./spinners",
    figure: "./figures",
    table: "./table",
    pretty: () => {
        return adone.lazify({
            json: "./pretties/json"
        }, null, require);
    }
}, text, require);

export default text;
