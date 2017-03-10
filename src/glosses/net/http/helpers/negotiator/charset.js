
const { is } = adone;

const simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;

// Parse a charset from the Accept-Charset header
const parseCharset = (str, i) => {
    const match = simpleCharsetRegExp.exec(str);
    if (!match) {
        return null;
    }

    const charset = match[1];
    let q = 1;
    if (match[2]) {
        const params = match[2].split(";");
        for (i = 0; i < params.length; i++) {
            const p = params[i].trim().split("=");
            if (p[0] === "q") {
                q = parseFloat(p[1]);
                break;
            }
        }
    }

    return { charset, q, i };
};

// Parse the Accept-Charset header.
const parseAcceptCharset = (accept) => {
    const accepts = accept.split(",");

    let j = 0;

    for (let i = 0; i < accepts.length; i++) {
        const charset = parseCharset(accepts[i].trim(), i);

        if (charset) {
            accepts[j++] = charset;
        }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
};

// Get the specificity of the charset.
const specify = (charset, spec, index) => {
    let s = 0;
    if (spec.charset.toLowerCase() === charset.toLowerCase()) {
        s |= 1;
    } else if (spec.charset !== "*") {
        return null;
    }

    return { i: index, o: spec.i, q: spec.q, s };
};

// Get the priority of a charset.
const getCharsetPriority = (charset, accepted, index) => {
    let priority = { o: -1, q: 0, s: 0 };

    for (let i = 0; i < accepted.length; i++) {
        const spec = specify(charset, accepted[i], index);

        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
            priority = spec;
        }
    }

    return priority;
};

const compareSpecs = (a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;

const getFullCharset = (spec) => spec.charset;

const isQuality = (spec) => spec.q > 0;

// Get the preferred charsets from an Accept-Charset header.
const preferredCharsets = (accept, provided) => {
    // RFC 2616 sec 14.2: no header = *
    const accepts = parseAcceptCharset(is.undefined(accept) ? "*" : accept || "");

    if (!provided) {
        // sorted list of all charsets
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullCharset);
    }

    const priorities = provided.map((type, index) => getCharsetPriority(type, accepts, index));

    // sorted list of accepted charsets
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
};

export default preferredCharsets;
