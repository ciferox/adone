const {
    js: { esutils: { code } }
} = adone;

const isStrictModeReservedWordES6 = function (id) {
    switch (id) {
        case "implements":
        case "interface":
        case "package":
        case "private":
        case "protected":
        case "public":
        case "static":
        case "let":
            return true;
        default:
            return false;
    }
};

const isKeywordES6 = function (id, strict) {
    if (strict && isStrictModeReservedWordES6(id)) {
        return true;
    }

    switch (id.length) {
        case 2:
            return (id === "if") || (id === "in") || (id === "do");
        case 3:
            return (id === "var") || (id === "for") || (id === "new") || (id === "try");
        case 4:
            return (id === "this") || (id === "else") || (id === "case") ||
                (id === "void") || (id === "with") || (id === "enum");
        case 5:
            return (id === "while") || (id === "break") || (id === "catch") ||
                (id === "throw") || (id === "const") || (id === "yield") ||
                (id === "class") || (id === "super");
        case 6:
            return (id === "return") || (id === "typeof") || (id === "delete") ||
                (id === "switch") || (id === "export") || (id === "import");
        case 7:
            return (id === "default") || (id === "finally") || (id === "extends");
        case 8:
            return (id === "function") || (id === "continue") || (id === "debugger");
        case 10:
            return (id === "instanceof");
        default:
            return false;
    }
};

const isKeywordES5 = function (id, strict) {
    // yield should not be treated as keyword under non-strict mode.
    if (!strict && id === "yield") {
        return false;
    }
    return isKeywordES6(id, strict);
};

const isReservedWordES5 = function (id, strict) {
    return id === "null" || id === "true" || id === "false" || isKeywordES5(id, strict);
};

const isReservedWordES6 = function (id, strict) {
    return id === "null" || id === "true" || id === "false" || isKeywordES6(id, strict);
};

const isRestrictedWord = function (id) {
    return id === "eval" || id === "arguments";
};

const isIdentifierNameES5 = function (id) {
    let i; let iz; let ch;

    if (id.length === 0) {
        return false;
    }

    ch = id.charCodeAt(0);
    if (!code.isIdentifierStartES5(ch)) {
        return false;
    }

    for (i = 1, iz = id.length; i < iz; ++i) {
        ch = id.charCodeAt(i);
        if (!code.isIdentifierPartES5(ch)) {
            return false;
        }
    }
    return true;
};

const decodeUtf16 = function (lead, trail) {
    return (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
};

const isIdentifierNameES6 = function (id) {
    let i; let iz; let ch; let lowCh; let check;

    if (id.length === 0) {
        return false;
    }

    check = code.isIdentifierStartES6;
    for (i = 0, iz = id.length; i < iz; ++i) {
        ch = id.charCodeAt(i);
        if (ch >= 0xD800 && ch <= 0xDBFF) {
            ++i;
            if (i >= iz) {
                return false;
            }
            lowCh = id.charCodeAt(i);
            if (!(lowCh >= 0xDC00 && lowCh <= 0xDFFF)) {
                return false;
            }
            ch = decodeUtf16(ch, lowCh);
        }
        if (!check(ch)) {
            return false;
        }
        check = code.isIdentifierPartES6;
    }
    return true;
};

const isIdentifierES5 = function (id, strict) {
    return isIdentifierNameES5(id) && !isReservedWordES5(id, strict);
};

const isIdentifierES6 = function (id, strict) {
    return isIdentifierNameES6(id) && !isReservedWordES6(id, strict);
};

export default {
    isKeywordES5,
    isKeywordES6,
    isReservedWordES5,
    isReservedWordES6,
    isRestrictedWord,
    isIdentifierNameES5,
    isIdentifierNameES6,
    isIdentifierES5,
    isIdentifierES6
};
