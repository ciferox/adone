const { is, data } = adone;

const singleEscapes = {
    "\"": "\\\"",
    "'": "\\'",
    "\\": "\\\\",
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
};
const regexSingleEscape = /["'\\\b\f\n\r\t]/;

const regexDigit = /[0-9]/;
const regexWhitelist = /[ !#-&\(-\[\]-~]/;

export default function jsesc(argument, options) {
    let oldIndent = "";
    let indent;
    const increaseIndentation = function () {
        oldIndent = indent;
        ++options.indentLevel;
        indent = options.indent.repeat(options.indentLevel);
    };
    // Handle options
    const defaults = {
        escapeEverything: false,
        minimal: false,
        isScriptContext: false,
        quotes: "single",
        wrap: false,
        es6: false,
        json: false,
        compact: true,
        lowercaseHex: false,
        numbers: "decimal",
        indent: "\t",
        indentLevel: 0,
        __inline1__: false,
        __inline2__: false
    };
    const json = options && options.json;
    if (json) {
        defaults.quotes = "double";
        defaults.wrap = true;
    }
    options = adone.o(defaults, options);
    if (options.quotes !== "single" && options.quotes !== "double") {
        options.quotes = "single";
    }
    const quote = options.quotes === "double" ? '"' : "'";
    const compact = options.compact;
    const lowercaseHex = options.lowercaseHex;
    indent = options.indent.repeat(options.indentLevel);
    const inline1 = options.__inline1__;
    const inline2 = options.__inline2__;
    const newLine = compact ? "" : "\n";
    let isEmpty = true;
    const useBinNumbers = options.numbers === "binary";
    const useOctNumbers = options.numbers === "octal";
    const useDecNumbers = options.numbers === "decimal";
    const useHexNumbers = options.numbers === "hexadecimal";

    if (json && argument && is.function(argument.toJSON)) {
        argument = argument.toJSON();
    }

    if (!is.string(argument)) {
        if (is.map(argument)) {
            if (argument.size === 0) {
                return "new Map()";
            }
            if (!compact) {
                options.__inline1__ = true;
                options.__inline2__ = false;
            }
            return `new Map(${jsesc(Array.from(argument), options)})`;
        }
        if (is.set(argument)) {
            if (argument.size === 0) {
                return "new Set()";
            }
            return `new Set(${jsesc(Array.from(argument), options)})`;
        }
        if (is.buffer(argument)) {
            if (argument.length === 0) {
                return "Buffer.alloc(0)";
            }
            return `Buffer.from(${jsesc(Array.from(argument), options)})`;
        }
        if (is.array(argument)) {
            const result = [];
            options.wrap = true;
            if (inline1) {
                options.__inline1__ = false;
                options.__inline2__ = true;
            }
            if (!inline2) {
                increaseIndentation();
            }
            for (let i = 0, n = argument.length; i < n; ++i) {
                isEmpty = false;
                if (inline2) {
                    options.__inline2__ = false;
                }
                result.push((compact || inline2 ? "" : indent) + jsesc(argument[i], options));
            }
            if (isEmpty) {
                return "[]";
            }
            if (inline2) {
                return `[${result.join(", ")}]`;
            }
            return `[${newLine}${result.join(`,${newLine}`)}${newLine}${compact ? "" : oldIndent}]`;
        } else if (is.number(argument)) {
            if (json) {
                // Some number values (e.g. `Infinity`) cannot be represented in JSON.
                return data.json.encode(argument);
            }
            if (useDecNumbers) {
                return String(argument);
            }
            if (useHexNumbers) {
                let hexadecimal = argument.toString(16);
                if (!lowercaseHex) {
                    hexadecimal = hexadecimal.toUpperCase();
                }
                return `0x${hexadecimal}`;
            }
            if (useBinNumbers) {
                return `0b${argument.toString(2)}`;
            }
            if (useOctNumbers) {
                // return `0o${argument.toString(8)}`;
                return `0o${argument.toString(8)}`;
            }
        } else if (Object.prototype.toString.call(argument) !== "[object Object]") {
            if (json) {
                // For some values (e.g. `undefined`, `function` objects),
                // `JSON.stringify(value)` returns `undefined` (which isn’t valid
                // JSON) instead of `'null'`.
                return JSON.stringify(argument) || "null";
            }
            return String(argument);
        } else { // it’s an object
            const result = [];
            options.wrap = true;
            increaseIndentation();
            for (const key in argument) {
                if (Object.hasOwnProperty.call(argument, key)) {
                    isEmpty = false;
                    const ekey = jsesc(key, options);
                    const evalue = jsesc(argument[key], options);
                    if (compact) {
                        result.push(`${ekey}:${evalue}`);
                    } else {
                        result.push(`${indent}${ekey}: ${evalue}`);
                    }
                }
            }
            if (isEmpty) {
                return "{}";
            }
            return `{${newLine}${result.join(`,${newLine}`)}${newLine}${compact ? "" : oldIndent}}`;
        }
    }

    const string = argument;
    // Loop over each code unit in the string and escape it
    let index = -1;
    const length = string.length;
    let result = "";
    while (++index < length) {
        const character = string.charAt(index);
        if (options.es6) {
            const first = string.charCodeAt(index);
            if ( // check if it’s the start of a surrogate pair
                first >= 0xD800 && first <= 0xDBFF && // high surrogate
                length > index + 1 // there is a next code unit
            ) {
                const second = string.charCodeAt(index + 1);
                if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
                    // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                    const codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                    let hexadecimal = codePoint.toString(16);
                    if (!lowercaseHex) {
                        hexadecimal = hexadecimal.toUpperCase();
                    }
                    result += `\\u{${hexadecimal}}`;
                    ++index;
                    continue;
                }
            }
        }
        if (!options.escapeEverything) {
            if (regexWhitelist.test(character)) {
                // It’s a printable ASCII character that is not `"`, `'` or `\`,
                // so don’t escape it.
                result = `${result}${character}`;
                continue;
            }
            if (character === '"') {
                result += quote === character ? '\\"' : character;
                continue;
            }
            if (character === "'") {
                result += quote === character ? "\\'" : character;
                continue;
            }
        }
        if (character === "\0" && !json && !regexDigit.test(string.charAt(index + 1))) {
            result += "\\0";
            continue;
        }
        if (regexSingleEscape.test(character)) {
            // no need for a `hasOwnProperty` check here
            result += singleEscapes[character];
            continue;
        }
        const charCode = character.charCodeAt(0);
        if (options.minimal && charCode !== 0x2028 && charCode !== 0x2029) {
            result += character;
            continue;
        }
        let hexadecimal = charCode.toString(16);
        if (!lowercaseHex) {
            hexadecimal = hexadecimal.toUpperCase();
        }
        const longhand = hexadecimal.length > 2 || json;
        const escaped = `\\${longhand ? "u" : "x"}${(`0000${hexadecimal}`).slice(longhand ? -4 : -2)}`;
        result += escaped;
        continue;
    }
    if (options.wrap) {
        result = quote + result + quote;
    }
    if (options.isScriptContext) {
        // https://mathiasbynens.be/notes/etago
        return result.replace(/<\/(script|style)/gi, "<\\/$1").replace(/<!--/g, json ? "\\u003C!--" : "\\x3C!--");
    }
    return result;
}
