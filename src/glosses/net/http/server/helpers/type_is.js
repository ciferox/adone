const { is, net: { mime, http: { server: { helper: { mediaTyper } } } } } = adone;

const normalizeType = (value) => {
    const type = mediaTyper.parse(value);
    type.parameters = undefined;
    return mediaTyper.format(type);
};

const tryNormalizeType = (value) => {
    try {
        return normalizeType(value);
    } catch (err) {
        return null;
    }
};

// Check if `expected` mime type matches `actual` mime type with wildcard and +suffix support.
const mimeMatch = (expected, actual) => {
    // invalid type
    if (expected === false) {
        return false;
    }

    // split types
    const actualParts = actual.split("/");
    const expectedParts = expected.split("/");

    // invalid format
    if (actualParts.length !== 2 || expectedParts.length !== 2) {
        return false;
    }

    // validate type
    if (expectedParts[0] !== "*" && expectedParts[0] !== actualParts[0]) {
        return false;
    }

    // validate suffix wildcard
    if (expectedParts[1].startsWith("*+")) {
        return expectedParts[1].length <= actualParts[1].length + 1 &&
            expectedParts[1].substr(1) === actualParts[1].substr(1 - expectedParts[1].length);
    }

    // validate subtype
    if (expectedParts[1] !== "*" && expectedParts[1] !== actualParts[1]) {
        return false;
    }

    return true;
};

// Normalize a mime type. If it's a shorthand, expand it to a valid mime type.
const normalize = (type) => {
    if (!is.string(type)) {
        // invalid type
        return false;
    }

    switch (type) {
        case "urlencoded": {
            return "application/x-www-form-urlencoded";
        }
        case "multipart": {
            return "multipart/*";
        }
    }

    if (type[0] === "+") {
        // "+json" -> "*/*+json" expando
        return `*/*${type}`;
    }

    return type.includes("/") ? type : mime.lookup(type);
};

const typeis = (value, types) => {
    // remove parameters and normalize
    const val = tryNormalizeType(value);
    // no type or invalid
    if (!val) {
        return false;
    }

    // no types, return the content type
    if (types.length === 0) {
        return val;
    }


    for (const type of types) {
        if (mimeMatch(normalize(type), val)) {
            return type[0] === "+" || type.includes("*") ? val : type;
        }
    }

    // no matches
    return false;
};

// Check if a request has a request body.
// A request with a body __must__ either have `transfer-encoding` or `content-length` headers set.
const hasBody = (req) => !is.undefined(req.headers["transfer-encoding"]) || !isNaN(req.headers["content-length"]);

typeis.request = (req, ...types) => {
    // no body
    if (!hasBody(req)) {
        return null;
    }

    if (types.length > 0 && is.array(types[0])) {
        types = types[0];
    }

    // request content type
    const value = req.headers["content-type"];

    return typeis(value, types);
};

export default typeis;
