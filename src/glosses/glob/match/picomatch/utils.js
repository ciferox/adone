const {
    is
} = adone;

const path = require("path");
const win32 = process.platform === "win32";
const {
    REGEX_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_GLOBAL,
    REGEX_REMOVE_BACKSLASH
} = require("./constants");

exports.isObject = (val) => !is.null(val) && typeof val === "object" && !is.array(val);
exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
exports.toPosixSlashes = (str) => str.replace(/\\/g, "/");

exports.removeBackslashes = (str) => {
    return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
        return match === "\\" ? "" : match;
    });
};

exports.supportsLookbehinds = () => {
    const segs = process.version.slice(1).split(".");
    if (segs.length === 3 && Number(segs[0]) >= 9 || (Number(segs[0]) === 8 && Number(segs[1]) >= 10)) {
        return true;
    }
    return false;
};

exports.isWindows = (options) => {
    if (options && is.boolean(options.windows)) {
        return options.windows;
    }
    return win32 === true || path.sep === "\\";
};

exports.escapeLast = (input, char, lastIdx) => {
    const idx = input.lastIndexOf(char, lastIdx);
    if (idx === -1) {
        return input; 
    }
    if (input[idx - 1] === "\\") {
        return exports.escapeLast(input, char, idx - 1); 
    }
    return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};
