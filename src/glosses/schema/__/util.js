const { is, error } = adone;

export const copy = (o, to) => {
    to = to || {};
    for (const key in o) {
        to[key] = o[key];
    }
    return to;
};

export const ucs2length = (str) => adone.std.punycode.ucs2.decode(str).length;

export const checkDataType = (dataType, data, negate) => {
    const EQUAL = negate ? " !== " : " === ";
    const AND = negate ? " || " : " && ";
    const OK = negate ? "!" : "";
    const NOT = negate ? "" : "!";
    switch (dataType) {
        case "null": {
            return `${data + EQUAL}null`;
        }
        case "array": {
            return `${OK}Array.isArray(${data})`;
        }
        case "object": {
            return `(${OK}${data}${AND}typeof ${data}${EQUAL}"object"${AND}${NOT}Array.isArray(${data}))`;
        }
        case "integer": {
            return `(typeof ${data}${EQUAL}"number"${AND}${NOT}(${data} % 1)${AND}${data}${EQUAL}${data})`;
        }
        default: {
            return `typeof ${data}${EQUAL}"${dataType}"`;
        }
    }
};

export const toHash = (arr) => {
    const hash = {};
    for (let i = 0; i < arr.length; i++) {
        hash[arr[i]] = true;
    }
    return hash;
};

export const checkDataTypes = (dataTypes, data) => {
    switch (dataTypes.length) {
        case 1: {
            return checkDataType(dataTypes[0], data, true);
        }
        default: {
            let code = "";
            const types = toHash(dataTypes);
            if (types.array && types.object) {
                code = types.null ? "(" : `(!${data} || `;
                code += `typeof ${data} !== "object")`;
                delete types.null;
                delete types.array;
                delete types.object;
            }
            if (types.number) {
                delete types.integer;
            }
            for (const t in types) {
                code += (code ? " && " : "") + checkDataType(t, data, true);
            }

            return code;
        }
    }
};

const COERCE_TO_TYPES = toHash(["string", "number", "integer", "boolean", "null"]);

export const coerceToTypes = (optionCoerceTypes, dataTypes) => {
    if (is.array(dataTypes)) {
        const types = [];
        for (let i = 0; i < dataTypes.length; i++) {
            const t = dataTypes[i];
            if (COERCE_TO_TYPES[t]) {
                types[types.length] = t;
            } else if (optionCoerceTypes === "array" && t === "array") {
                types[types.length] = t;
            }
        }
        if (types.length) {
            return types;
        }
    } else if (COERCE_TO_TYPES[dataTypes]) {
        return [dataTypes];
    } else if (optionCoerceTypes === "array" && dataTypes === "array") {
        return ["array"];
    }
};

const IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;

const SINGLE_QUOTE = /'|\\/g;

export const escapeQuotes = (str) => {
    return str.replace(SINGLE_QUOTE, "\\$&")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\f/g, "\\f")
        .replace(/\t/g, "\\t");
};


export const getProperty = (key) => {
    return is.number(key)
        ? `[${key}]`
        : IDENTIFIER.test(key)
            ? `.${key}`
            : `['${escapeQuotes(key)}']`;
};


export const varOccurences = (str, dataVar) => {
    dataVar += "[^0-9]";
    const matches = str.match(new RegExp(dataVar, "g"));
    return matches ? matches.length : 0;
};


export const varReplace = (str, dataVar, expr) => {
    dataVar += "([^0-9])";
    expr = expr.replace(/\$/g, "$$$$");
    return str.replace(new RegExp(dataVar, "g"), `${expr}$1`);
};


const EMPTY_ELSE = /else\s*{\s*}/g;
const EMPTY_IF_NO_ELSE = /if\s*\([^)]+\)\s*\{\s*\}(?!\s*else)/g;
const EMPTY_IF_WITH_ELSE = /if\s*\(([^)]+)\)\s*\{\s*\}\s*else(?!\s*if)/g;

export const cleanUpCode = (out) => {
    return out
        .replace(EMPTY_ELSE, "")
        .replace(EMPTY_IF_NO_ELSE, "")
        .replace(EMPTY_IF_WITH_ELSE, "if (!($1))");
};


const ERRORS_REGEXP = /[^v.]errors/g;
const REMOVE_ERRORS = /var errors = 0;|var vErrors = null;|validate.errors = vErrors;/g;
const REMOVE_ERRORS_ASYNC = /var errors = 0;|var vErrors = null;/g;
const RETURN_VALID = "return errors === 0;";
const RETURN_TRUE = "validate.errors = null; return true;";
const RETURN_ASYNC = /if \(errors === 0\) return data;\s*else throw new ValidationError\(vErrors\);/;
const RETURN_DATA_ASYNC = "return data;";
const ROOTDATA_REGEXP = /[^A-Za-z_$]rootData[^A-Za-z0-9_$]/g;
const REMOVE_ROOTDATA = /if \(rootData === undefined\) rootData = data;/;

export const finalCleanUpCode = (out, async) => {
    let matches = out.match(ERRORS_REGEXP);
    if (matches && matches.length === 2) {
        out = async
            ? out.replace(REMOVE_ERRORS_ASYNC, "").replace(RETURN_ASYNC, RETURN_DATA_ASYNC)
            : out.replace(REMOVE_ERRORS, "").replace(RETURN_VALID, RETURN_TRUE);
    }

    matches = out.match(ROOTDATA_REGEXP);
    if (!matches || matches.length !== 3) {
        return out;
    }
    return out.replace(REMOVE_ROOTDATA, "");
};

export const schemaHasRules = (schema, rules) => {
    if (is.boolean(schema)) {
        return !schema;
    }
    for (const key in schema) {
        if (rules[key]) {
            return true;
        }
    }
};

export const schemaHasRulesExcept = (schema, rules, exceptKeyword) => {
    if (is.boolean(schema)) {
        return !schema && exceptKeyword !== "not";
    }
    for (const key in schema) {
        if (key !== exceptKeyword && rules[key]) {
            return true;
        }
    }
};

export const toQuotedString = (str) => `'${escapeQuotes(str)}'`;

export const joinPaths = (a, b) => {
    if (a === '""') {
        return b;
    }
    return (`${a} + ${b}`).replace(/' \+ '/g, "");
};

export const getPathExpr = (currentPath, expr, jsonPointers, isNumber) => {
    const path = jsonPointers // false by default
        ? `'/' + ${expr}${isNumber ? "" : ".replace(/~/g, '~0').replace(/\\//g, '~1')"}`
        : (isNumber ? `'[' + ${expr} + ']'` : `'[\\'' + ${expr} + '\\']'`);
    return joinPaths(currentPath, path);
};

export const unescapeJsonPointer = (str) => str.replace(/~1/g, "/").replace(/~0/g, "~");

export const unescapeFragment = (str) => unescapeJsonPointer(decodeURIComponent(str));

export const escapeJsonPointer = (str) => str.replace(/~/g, "~0").replace(/\//g, "~1");

export const escapeFragment = (str) => encodeURIComponent(escapeJsonPointer(str));

const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
export const getData = ($data, lvl, paths) => {
    if ($data === "") {
        return "rootData";
    }
    let jsonPointer;
    let data;
    if ($data[0] === "/") {
        if (!JSON_POINTER.test($data)) {
            throw new error.Exception(`Invalid JSON-pointer: ${$data}`);
        }
        jsonPointer = $data;
        data = "rootData";
    } else {
        const matches = $data.match(RELATIVE_JSON_POINTER);
        if (!matches) {
            throw new error.Exception(`Invalid JSON-pointer: ${$data}`);
        }
        const up = Number(matches[1]);
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
            if (up >= lvl) {
                throw new error.IllegalStateException(`Cannot access property/index ${up} levels up, current level is ${lvl}`);
            }
            return paths[lvl - up];
        }

        if (up > lvl) {
            throw new error.IllegalStateException(`Cannot access data ${up} levels up, current level is ${lvl}`);
        }
        data = `data${(lvl - up) || ""}`;
        if (!jsonPointer) {
            return data;
        }
    }

    let expr = data;
    const segments = jsonPointer.split("/");
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment) {
            data += getProperty(unescapeJsonPointer(segment));
            expr += ` && ${data}`;
        }
    }
    return expr;
};

export const getPath = (currentPath, prop, jsonPointers) => {
    const path = jsonPointers // false by default
        ? toQuotedString(`/${escapeJsonPointer(prop)}`)
        : toQuotedString(getProperty(prop));
    return joinPaths(currentPath, path);
};
