const { is } = adone;

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

let sprintfFormat = null;
let sprintfParse = null;

const sprintf = function (key) {
    // `arguments` is not an array, but should be fine for this call
    return sprintfFormat(sprintfParse(key), arguments);
};

sprintfFormat = (parseTree, argv) => {
    let cursor = 1;
    const treeLength = parseTree.length;
    let arg;
    let output = "";
    let i;
    let k;
    let match;
    let pad;
    let padCharacter;
    let padLength;
    let isPositive;
    let sign;
    for (i = 0; i < treeLength; i++) {
        if (is.string(parseTree[i])) {
            output += parseTree[i];
        } else if (is.array(parseTree[i])) {
            match = parseTree[i]; // convenience purposes only
            if (match[2]) { // keyword argument
                arg = argv[cursor];
                for (k = 0; k < match[2].length; k++) {
                    if (!arg.hasOwnProperty(match[2][k])) {
                        throw new Error(`Property ${match[2][k]} does not exist`);
                    }
                    arg = arg[match[2][k]];
                }
            } else if (match[1]) { // positional argument (explicit)
                arg = argv[match[1]];
            } else { // positional argument (implicit)
                arg = argv[cursor++];
            }

            if (re.notType.test(match[8]) && re.notPrimitive.test(match[8]) && arg instanceof Function) {
                arg = arg();
            }

            if (re.numericArg.test(match[8]) && (!is.number(arg) && isNaN(arg))) {
                throw new TypeError(sprintf("[sprintf] expecting number but found %T", arg));
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
                    arg = match[7] ? String(Number(arg.toPrecision(match[7]))) : parseFloat(arg);
                    break;
                case "o":
                    arg = (parseInt(arg, 10) >>> 0).toString(8);
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
                    arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
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
                    arg = (parseInt(arg, 10) >>> 0).toString(16);
                    break;
                case "X":
                    arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase();
                    break;
            }
            if (re.json.test(match[8])) {
                output += arg;
            } else {
                if (re.number.test(match[8]) && (!isPositive || match[3])) {
                    sign = isPositive ? "+" : "-";
                    arg = arg.toString().replace(re.sign, "");
                } else {
                    sign = "";
                }
                padCharacter = match[4] ? match[4] === "0" ? "0" : match[4].charAt(1) : " ";
                padLength = match[6] - (sign + arg).length;
                pad = match[6] ? (padLength > 0 ? padCharacter.repeat(padLength) : "") : "";
                output += match[5] ? sign + arg + pad : (padCharacter === "0" ? sign + pad + arg : pad + sign + arg);
            }
        }
    }
    return output;
};

const sprintfCache = Object.create(null);

sprintfParse = (fmt) => {
    if (sprintfCache[fmt]) {
        return sprintfCache[fmt];
    }

    let _fmt = fmt;
    let match;
    const parseTree = [];
    let argNames = 0;
    while (_fmt) {
        if (!is.null(match = re.text.exec(_fmt))) {
            parseTree.push(match[0]);
        } else if (!is.null(match = re.modulo.exec(_fmt))) {
            parseTree.push("%");
        } else if (!is.null(match = re.placeholder.exec(_fmt))) {
            if (match[2]) {
                argNames |= 1;
                const fieldList = [];
                let replacementField = match[2];
                let fieldMatch = [];
                if (!is.null(fieldMatch = re.key.exec(replacementField))) {
                    fieldList.push(fieldMatch[1]);
                    while ((replacementField = replacementField.substring(fieldMatch[0].length)) !== "") {
                        if (!is.null(fieldMatch = re.keyAccess.exec(replacementField))) {
                            fieldList.push(fieldMatch[1]);
                        } else if (!is.null(fieldMatch = re.indexAccess.exec(replacementField))) {
                            fieldList.push(fieldMatch[1]);
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
            parseTree.push(match);
        } else {
            throw new SyntaxError("[sprintf] unexpected placeholder");
        }
        _fmt = _fmt.substring(match[0].length);
    }
    return sprintfCache[fmt] = parseTree;
};

export default sprintf;
