// This file is based directly off of Douglas Crockford's json_parse.js:
// https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js


const { is } = adone;

let at;           // The index of the current character
let lineNumber;   // The current line number
let columnNumber; // The current column number
let ch;           // The current character
const escapee = {
    "'": "'",
    "\"": "\"",
    "\\": "\\",
    "/": "/",
    "\n": "",       // Replace escaped newlines in strings w/ empty string
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t"
};

const ws = [
    " ",
    "\t",
    "\r",
    "\n",
    "\v",
    "\f",
    "\xA0",
    "\uFEFF"
];
let text;

const renderChar = (chr) => {
    return chr === "" ? "EOF" : "'" + chr + "'";
};

const error = (m) => {
    // Call error when something is wrong.
    const error = new SyntaxError();
    // beginning of message suffix to agree with that provided by Gecko - see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
    error.message = m + " at line " + lineNumber + " column " + columnNumber + " of the JSON5 data. Still to read: " + JSON.stringify(text.substring(at - 1, at + 19));
    error.at = at;
    // These two property names have been chosen to agree with the ones in Gecko, the only popular
    // environment which seems to supply this info on JSON.parse
    error.lineNumber = lineNumber;
    error.columnNumber = columnNumber;
    throw error;
};

const next = (c) => {
    // If a c parameter is provided, verify that it matches the current character.

    if (c && c !== ch) {
        error("Expected " + renderChar(c) + " instead of " + renderChar(ch));
    }

    // Get the next character. When there are no more characters,
    // return the empty string.

    ch = text.charAt(at);
    at++;
    columnNumber++;
    if (ch === "\n" || ch === "\r" && peek() !== "\n") {
        lineNumber++;
        columnNumber = 0;
    }
    return ch;
};

const peek = () => {
    // Get the next character without consuming it or assigning it to the ch varaible.
    return text.charAt(at);
};

const decodeIdentifier = () => {
    // Parse an identifier. Normally, reserved words are disallowed here, but we
    // only use this for unquoted object keys, where reserved words are allowed,
    // so we don't check for those here. References:
    // - http://es5.github.com/#x7.6
    // - https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Core_Language_Features#Variables
    // - http://docstore.mik.ua/orelly/webprog/jscript/ch02_07.htm
    // TODO Identifiers can have Unicode "letters" in them; add support for those.

    let key = ch;

    // Identifiers must start with a letter, _ or $.
    if ((ch !== "_" && ch !== "$") &&
        (ch < "a" || ch > "z") &&
        (ch < "A" || ch > "Z")) {
        error("Bad identifier as unquoted key");
    }

    // Subsequent characters can contain digits.
    while (next() && (
        ch === "_" || ch === "$" ||
        (ch >= "a" && ch <= "z") ||
        (ch >= "A" && ch <= "Z") ||
        (ch >= "0" && ch <= "9"))) {
        key += ch;
    }

    return key;
};

const decodeNumber = () => {
    // Parse a number value.
    let number;
    let sign = "";
    let string = "";
    let base = 10;

    if (ch === "-" || ch === "+") {
        sign = ch;
        next(ch);
    }

    // support for Infinity (could tweak to allow other words):
    if (ch === "I") {
        number = decodeWord();
        if (!is.number(number) || isNaN(number)) {
            error("Unexpected word for number");
        }
        return (sign === "-") ? -number : number;
    }

    // support for NaN
    if (ch === "N") {
        number = decodeWord();
        if (!isNaN(number)) {
            error("expected word to be NaN");
        }
        // ignore sign as -NaN also is NaN
        return number;
    }

    if (ch === "0") {
        string += ch;
        next();
        if (ch === "x" || ch === "X") {
            string += ch;
            next();
            base = 16;
        } else if (ch >= "0" && ch <= "9") {
            error("Octal literal");
        }
    }

    switch (base) {
        case 10:
            while (ch >= "0" && ch <= "9") {
                string += ch;
                next();
            }
            if (ch === ".") {
                string += ".";
                while (next() && ch >= "0" && ch <= "9") {
                    string += ch;
                }
            }
            if (ch === "e" || ch === "E") {
                string += ch;
                next();
                if (ch === "-" || ch === "+") {
                    string += ch;
                    next();
                }
                while (ch >= "0" && ch <= "9") {
                    string += ch;
                    next();
                }
            }
            break;
        case 16:
            while (ch >= "0" && ch <= "9" || ch >= "A" && ch <= "F" || ch >= "a" && ch <= "f") {
                string += ch;
                next();
            }
            break;
    }

    if (sign === "-") {
        number = -string;
    } else {
        number = +string;
    }

    if (!isFinite(number)) {
        error("Bad number");
    } else {
        return number;
    }
};

const decodeString = () => {
    // Parse a string value.
    let hex;
    let i;
    let string = "";
    let delim; // double quote or single quote
    let uffff;

    // When parsing for string values, we must look for ' or " and \ characters.

    if (ch === "\"" || ch === "'") {
        delim = ch;
        while (next()) {
            if (ch === delim) {
                next();
                return string;
            } else if (ch === "\\") {
                next();
                if (ch === "u") {
                    uffff = 0;
                    for (i = 0; i < 4; i += 1) {
                        hex = parseInt(next(), 16);
                        if (!isFinite(hex)) {
                            break;
                        }
                        uffff = uffff * 16 + hex;
                    }
                    string += String.fromCharCode(uffff);
                } else if (ch === "\r") {
                    if (peek() === "\n") {
                        next();
                    }
                } else if (is.string(escapee[ch])) {
                    string += escapee[ch];
                } else {
                    break;
                }
            } else if (ch === "\n") {
                // unescaped newlines are invalid; see:
                // https://github.com/json5/json5/issues/24
                // TODO this feels special-cased; are there other
                // invalid unescaped chars?
                break;
            } else {
                string += ch;
            }
        }
    }
    error("Bad string");
};

const inlineComment = () => {
    // Skip an inline comment, assuming this is one. The current character should
    // be the second / character in the // pair that begins this inline comment.
    // To finish the inline comment, we look for a newline or the end of the text.

    if (ch !== "/") {
        error("Not an inline comment");
    }

    do {
        next();
        if (ch === "\n" || ch === "\r") {
            next();
            return;
        }
    } while (ch);
};

const blockComment = () => {

    // Skip a block comment, assuming this is one. The current character should be
    // the * character in the /* pair that begins this block comment.
    // To finish the block comment, we look for an ending */ pair of characters,
    // but we also watch for the end of text before the comment is terminated.

    if (ch !== "*") {
        error("Not a block comment");
    }

    do {
        next();
        while (ch === "*") {
            next("*");
            if (ch === "/") {
                next("/");
                return;
            }
        }
    } while (ch);

    error("Unterminated block comment");
};

const deocdeComment = () => {

    // Skip a comment, whether inline or block-level, assuming this is one.
    // Comments always begin with a / character.

    if (ch !== "/") {
        error("Not a comment");
    }

    next("/");

    if (ch === "/") {
        inlineComment();
    } else if (ch === "*") {
        blockComment();
    } else {
        error("Unrecognized comment");
    }
};

const decodeWhitespace = () => {
    // Skip whitespace and comments.
    // Note that we're detecting comments by only a single / character.
    // This works since regular expressions are not valid JSON(5), but this will
    // break if there are other valid values that begin with a / character!

    while (ch) {
        if (ch === "/") {
            deocdeComment();
        } else if (ws.indexOf(ch) >= 0) {
            next();
        } else {
            return;
        }
    }
};

const decodeWord = () => {
    // true, false, or null.

    switch (ch) {
        case "t":
            next("t");
            next("r");
            next("u");
            next("e");
            return true;
        case "f":
            next("f");
            next("a");
            next("l");
            next("s");
            next("e");
            return false;
        case "n":
            next("n");
            next("u");
            next("l");
            next("l");
            return null;
        case "I":
            next("I");
            next("n");
            next("f");
            next("i");
            next("n");
            next("i");
            next("t");
            next("y");
            return Infinity;
        case "N":
            next("N");
            next("a");
            next("N");
            return NaN;
    }
    error("Unexpected " + renderChar(ch));
};

let decodeValue;

const decodeArray = () => {
    // Parse an array value.

    const array = [];

    if (ch === "[") {
        next("[");
        decodeWhitespace();
        while (ch) {
            if (ch === "]") {
                next("]");
                return array;   // Potentially empty array
            }
            // ES5 allows omitting elements in arrays, e.g. [,] and
            // [,null]. We don't allow this in JSON5.
            if (ch === ",") {
                error("Missing array element");
            } else {
                array.push(decodeValue());
            }
            decodeWhitespace();
            // If there's no comma after this value, this needs to
            // be the end of the array.
            if (ch !== ",") {
                next("]");
                return array;
            }
            next(",");
            decodeWhitespace();
        }
    }
    error("Bad array");
};

const decodeObject = () => {
    // Parse an object value.
    let key;
    const object = {};

    if (ch === "{") {
        next("{");
        decodeWhitespace();
        while (ch) {
            if (ch === "}") {
                next("}");
                return object;   // Potentially empty object
            }

            // Keys can be unquoted. If they are, they need to be
            // valid JS identifiers.
            if (ch === "\"" || ch === "'") {
                key = decodeString();
            } else {
                key = decodeIdentifier();
            }

            decodeWhitespace();
            next(":");
            object[key] = decodeValue();
            decodeWhitespace();
            // If there's no comma after this pair, this needs to be
            // the end of the object.
            if (ch !== ",") {
                next("}");
                return object;
            }
            next(",");
            decodeWhitespace();
        }
    }
    error("Bad object");
};

decodeValue = () => {
    // Parse a JSON value. It could be an object, an array, a string, a number, or a word.
    decodeWhitespace();
    switch (ch) {
        case "{":
            return decodeObject();
        case "[":
            return decodeArray();
        case "\"":
        case "'":
            return decodeString();
        case "-":
        case "+":
        case ".":
            return decodeNumber();
        default:
            return ch >= "0" && ch <= "9" ? decodeNumber() : decodeWord();
    }
};

export default class JSON5 {
    static isWordChar(c) {
        return (c >= "a" && c <= "z") ||
            (c >= "A" && c <= "Z") ||
            (c >= "0" && c <= "9") ||
            c === "_" || c === "$";
    }

    static isWordStart(c) {
        return (c >= "a" && c <= "z") ||
            (c >= "A" && c <= "Z") ||
            c === "_" || c === "$";
    }

    static isWord(key) {
        if (!is.string(key)) {
            return false;
        }
        if (!JSON5.isWordStart(key[0])) {
            return false;
        }
        let i = 1;
        const length = key.length;
        while (i < length) {
            if (!JSON5.isWordChar(key[i])) {
                return false;
            }
            i++;
        }
        return true;
    }

    static encode(obj, replacer, space) {
        if (replacer && (!is.function(replacer) && !is.array(replacer))) {
            throw new Error("Replacer must be a function or an array");
        }
        const getReplacedValueOrUndefined = (holder, key, isTopLevel) => {
            let value = holder[key];

            // Replace the value with its toJSON value first, if possible
            if (value && value.toJSON && is.function(value.toJSON)) {
                value = value.toJSON();
            }

            // If the user-supplied replacer if a function, call it. If it's an array, check objects' string keys for
            // presence in the array (removing the key/value pair from the resulting JSON if the key is missing).
            if (is.function(replacer)) {
                return replacer.call(holder, key, value);
            } else if (replacer) {
                if (isTopLevel || is.array(holder) || replacer.indexOf(key) >= 0) {
                    return value;
                } else {
                    return undefined;
                }
            } else {
                return value;
            }
        };

        const objStack = [];
        const checkForCircular = (obj) => {
            for (let i = 0; i < objStack.length; i++) {
                if (objStack[i] === obj) {
                    throw new TypeError("Converting circular structure to JSON");
                }
            }
        };

        const makeIndent = (str, num, noNewLine) => {
            if (!str) {
                return "";
            }
            // indentation no more than 10 chars
            if (str.length > 10) {
                str = str.substring(0, 10);
            }

            let indent = noNewLine ? "" : "\n";
            for (let i = 0; i < num; i++) {
                indent += str;
            }

            return indent;
        };

        let indentStr;
        if (space) {
            if (is.string(space)) {
                indentStr = space;
            } else if (is.number(space) && space >= 0) {
                indentStr = makeIndent(" ", space, true);
            } else {
                // ignore space parameter
            }
        }

        // Copied from Crokford's implementation of JSON
        // See https://github.com/douglascrockford/JSON-js/blob/e39db4b7e6249f04a195e7dd0840e610cc9e941e/json2.js#L195
        const escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        const meta = { // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        const escapeString = (string) => {

            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can safely slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe escape
            // sequences.
            escapable.lastIndex = 0;
            return escapable.test(string) ? "\"" + string.replace(escapable, (a) => {
                const c = meta[a];
                return is.string(c) ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\"" : "\"" + string + "\"";
        };

        const internalStringify = (holder, key, isTopLevel) => {
            let buffer;
            let res;

            // Replace the value, if necessary
            let objPart = getReplacedValueOrUndefined(holder, key, isTopLevel);

            if (objPart && !is.date(objPart)) {
                // unbox objects
                // don't unbox dates, since will turn it into number
                objPart = objPart.valueOf();
            }
            switch (typeof objPart) {
                case "boolean":
                    return objPart.toString();
                case "number":
                    if (isNaN(objPart) || !isFinite(objPart)) {
                        return "null";
                    }
                    return objPart.toString();
                case "string":
                    return escapeString(objPart.toString());
                case "object":
                    if (objPart === null) {
                        return "null";
                    } else if (is.array(objPart)) {
                        checkForCircular(objPart);
                        buffer = "[";
                        objStack.push(objPart);

                        for (let i = 0; i < objPart.length; i++) {
                            res = internalStringify(objPart, i, false);
                            buffer += makeIndent(indentStr, objStack.length);
                            if (res === null || is.undefined(res)) {
                                buffer += "null";
                            } else {
                                buffer += res;
                            }
                            if (i < objPart.length - 1) {
                                buffer += ",";
                            } else if (indentStr) {
                                buffer += "\n";
                            }
                        }
                        objStack.pop();
                        if (objPart.length) {
                            buffer += makeIndent(indentStr, objStack.length, true);
                        }
                        buffer += "]";
                    } else {
                        checkForCircular(objPart);
                        buffer = "{";
                        let nonEmpty = false;
                        objStack.push(objPart);
                        for (const prop in objPart) {
                            if (objPart.hasOwnProperty(prop)) {
                                const value = internalStringify(objPart, prop, false);
                                isTopLevel = false;
                                if (!is.undefined(value) && value !== null) {
                                    buffer += makeIndent(indentStr, objStack.length);
                                    nonEmpty = true;
                                    key = JSON5.isWord(prop) ? prop : escapeString(prop);
                                    buffer += key + ":" + (indentStr ? " " : "") + value + ",";
                                }
                            }
                        }
                        objStack.pop();
                        if (nonEmpty) {
                            buffer = buffer.substring(0, buffer.length - 1) + makeIndent(indentStr, objStack.length) + "}";
                        } else {
                            buffer = "{}";
                        }
                    }
                    return buffer;
                default:
                    // functions and undefined should be ignored
                    return undefined;
            }
        };

        // special case...when undefined is used inside of
        // a compound object/array, return null.
        // but when top-level, return undefined
        const topLevelHolder = { "": obj };
        if (is.undefined(obj)) {
            return getReplacedValueOrUndefined(topLevelHolder, "", true);
        }
        return internalStringify(topLevelHolder, "", true);
    }

    // Return the json_parse function. It will have access to all of the above functions and variables.
    static decode(source, reviver) {
        text = String(source);
        at = 0;
        lineNumber = 1;
        columnNumber = 1;
        ch = " ";
        const result = decodeValue();
        decodeWhitespace();
        if (ch) {
            error("Syntax error");
        }

        // If there is a reviver function, we recursively walk the new structure,
        // passing each name/value pair to the reviver function for possible
        // transformation, starting with a temporary root object that holds the result
        // in an empty key. If there is not a reviver function, we simply return the
        // result.
        return is.function(reviver) ? (function walk(holder, key) {
            let k;
            let v;
            const value = holder[key];
            if (value && typeof value === "object") {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (!is.undefined(v)) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }({ "": result }, "")) : result;
    }
}
