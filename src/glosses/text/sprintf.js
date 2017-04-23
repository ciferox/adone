const re = {
    notString: /[^s]/,
    notBool: /[^t]/,
    notType: /[^T]/,
    notPrimitive: /[^v]/,
    number: /[diefg]/,
    numericArg: /[bcdiefguxX]/,
    json: /[j]/,
    notJson: /[^j]/,
    text: /^[^\x25]+/,
    modulo: /^\x25{2}/,
    placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
    key: /^([a-z_][a-z_\d]*)/i,
    keyAccess: /^\.([a-z_][a-z_\d]*)/i,
    indexAccess: /^\[(\d+)\]/,
    sign: /^[\+\-]/
};

/**
 * helpers
 */
const getType = (variable) => {
    if (typeof variable === "number") {
        return "number";
    } else if (typeof variable === "string") {
        return "string";
    }
    return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();

};

const preformattedPadding = {
    0: ["", "0", "00", "000", "0000", "00000", "000000", "0000000"],
    " ": ["", " ", "  ", "   ", "    ", "     ", "      ", "       "],
    _: ["", "_", "__", "___", "____", "_____", "______", "_______"]
};
const strRepeat = (input, multiplier) => {
    if (multiplier >= 0 && multiplier <= 7 && preformattedPadding[input]) {
        return preformattedPadding[input][multiplier];
    }
    return Array(multiplier + 1).join(input);
};


const sprintf = (...args) => {
    const key = args[0];
    const cache = sprintf.cache;
    if (!(cache[key] && cache.hasOwnProperty(key))) {
        cache[key] = sprintf.parse(key);
    }
    return sprintf.format.call(null, cache[key], args);
};

sprintf.cache = {};

sprintf.format = (parseTree, argv) => {
    let cursor = 1;
    const treeLength = parseTree.length;
    let nodeType = "";
    let arg;
    const output = [];
    let i;
    let k;
    let match;
    let pad;
    let padCharacter;
    let padLength;
    let isPositive = true;
    let sign = "";
    for (i = 0; i < treeLength; i++) {
        nodeType = getType(parseTree[i]);
        if (nodeType === "string") {
            output[output.length] = parseTree[i];
        } else if (nodeType === "array") {
            match = parseTree[i]; // convenience purposes only
            if (match[2]) { // keyword argument
                arg = argv[cursor];
                for (k = 0; k < match[2].length; k++) {
                    if (!arg.hasOwnProperty(match[2][k])) {
                        throw new Error(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
                    }
                    arg = arg[match[2][k]];
                }
            } else if (match[1]) { // positional argument (explicit)
                arg = argv[match[1]];
            } else { // positional argument (implicit)
                arg = argv[cursor++];
            }

            if (re.notType.test(match[8]) && re.notPrimitive.test(match[8]) && getType(arg) === "function") {
                arg = arg();
            }

            if (re.numericArg.test(match[8]) && (getType(arg) !== "number" && isNaN(arg))) {
                throw new TypeError(sprintf("[sprintf] expecting number but found %s", getType(arg)));
            }

            if (re.number.test(match[8])) {
                isPositive = arg >= 0;
            }

            switch (match[8]) {
                case "b":
                    arg = parseInt(arg, 10).toString(2);
                    break;
                case "c":
                    arg = String.fromCharCode(parseInt(arg, 10));
                    break;
                case "d":
                case "i":
                    arg = parseInt(arg, 10);
                    break;
                case "j":
                    arg = JSON.stringify(arg, null, match[6] ? parseInt(match[6]) : 0);
                    break;
                case "e":
                    arg = match[7] ? parseFloat(arg).toExponential(match[7]) : parseFloat(arg).toExponential();
                    break;
                case "f":
                    arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg);
                    break;
                case "g":
                    arg = match[7] ? parseFloat(arg).toPrecision(match[7]) : parseFloat(arg);
                    break;
                case "o":
                    arg = arg.toString(8);
                    break;
                case "s":
                    arg = String(arg);
                    arg = (match[7] ? arg.substring(0, match[7]) : arg);
                    break;
                case "t":
                    arg = String(Boolean(arg));
                    arg = (match[7] ? arg.substring(0, match[7]) : arg);
                    break;
                case "T":
                    arg = getType(arg);
                    arg = (match[7] ? arg.substring(0, match[7]) : arg);
                    break;
                case "u":
                    arg = parseInt(arg, 10) >>> 0;
                    break;
                case "v":
                    arg = arg.valueOf();
                    arg = (match[7] ? arg.substring(0, match[7]) : arg);
                    break;
                case "x":
                    arg = parseInt(arg, 10).toString(16);
                    break;
                case "X":
                    arg = parseInt(arg, 10).toString(16).toUpperCase();
                    break;
            }
            if (re.json.test(match[8])) {
                output[output.length] = arg;
            } else {
                if (re.number.test(match[8]) && (!isPositive || match[3])) {
                    sign = isPositive ? "+" : "-";
                    arg = arg.toString().replace(re.sign, "");
                } else {
                    sign = "";
                }
                padCharacter = match[4] ? match[4] === "0" ? "0" : match[4].charAt(1) : " ";
                padLength = match[6] - (sign + arg).length;
                pad = match[6] ? (padLength > 0 ? strRepeat(padCharacter, padLength) : "") : "";
                output[output.length] = match[5] ? sign + arg + pad : (padCharacter === "0" ? sign + pad + arg : pad + sign + arg);
            }
        }
    }
    return output.join("");
};

sprintf.parse = function (fmt) {
    let _fmt = fmt;
    let match = [];
    const parseTree = [];
    let argNames = 0;
    while (_fmt) {
        if ((match = re.text.exec(_fmt)) !== null) {
            parseTree[parseTree.length] = match[0];
        } else if ((match = re.modulo.exec(_fmt)) !== null) {
            parseTree[parseTree.length] = "%";
        } else if ((match = re.placeholder.exec(_fmt)) !== null) {
            if (match[2]) {
                argNames |= 1;
                const fieldList = [];
                let replacementField = match[2];
                let fieldMatch = [];
                if ((fieldMatch = re.key.exec(replacementField)) !== null) {
                    fieldList[fieldList.length] = fieldMatch[1];
                    while ((replacementField = replacementField.substring(fieldMatch[0].length)) !== "") {
                        if ((fieldMatch = re.keyAccess.exec(replacementField)) !== null) {
                            fieldList[fieldList.length] = fieldMatch[1];
                        } else if ((fieldMatch = re.indexAccess.exec(replacementField)) !== null) {
                            fieldList[fieldList.length] = fieldMatch[1];
                        } else {
                            throw new SyntaxError("[sprintf] failed to parse named argument key");
                        }
                    }
                } else {
                    throw new SyntaxError("[sprintf] failed to parse named argument key");
                }
                match[2] = fieldList;
            } else {
                argNames |= 2;
            }
            if (argNames === 3) {
                throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");
            }
            parseTree[parseTree.length] = match;
        } else {
            throw new SyntaxError("[sprintf] unexpected placeholder");
        }
        _fmt = _fmt.substring(match[0].length);
    }
    return parseTree;
};

export default sprintf;
