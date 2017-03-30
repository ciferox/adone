const { data: { yaml }, is } = adone;

const resolveJavascriptRegExp = (data) => {
    if (is.null(data)) {
        return false;
    }
    if (data.length === 0) {
        return false;
    }

    const regexp = data;
    let modifiers = "";

    // if regexp starts with '/' it can have modifiers and must be properly closed
    // `/foo/gim` - modifiers tail can be maximum 3 chars
    if (regexp[0] === "/") {
        const tail = /\/([gim]*)$/.exec(data);
        if (tail) {
            modifiers = tail[1];
        }

        if (modifiers.length > 3) {
            return false;
        }
        // if expression starts with /, is should be properly terminated
        if (regexp[regexp.length - modifiers.length - 1] !== "/") {
            return false;
        }
    }

    return true;
};

const constructJavascriptRegExp = (data) => {
    let regexp = data;
    let modifiers = "";

    // `/foo/gim` - tail can be maximum 4 chars
    if (regexp[0] === "/") {
        const tail = /\/([gim]*)$/.exec(data);
        if (tail) {
            modifiers = tail[1];
        }
        regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
    }

    return new RegExp(regexp, modifiers);
};

const representJavascriptRegExp = (object) => {
    let result = `/${object.source}/`;

    if (object.global) {
        result += "g";
    }
    if (object.multiline) {
        result += "m";
    }
    if (object.ignoreCase) {
        result += "i";
    }

    return result;
};

export default new yaml.type.Type("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve: resolveJavascriptRegExp,
    construct: constructJavascriptRegExp,
    predicate: is.regexp,
    represent: representJavascriptRegExp
});
