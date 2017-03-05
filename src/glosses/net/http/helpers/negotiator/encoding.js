const simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;

// Parse an encoding from the Accept-Encoding header.
const parseEncoding = (str, i) => {
    const match = simpleEncodingRegExp.exec(str);
    if (!match) {
        return null;
    }

    const encoding = match[1];
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

    return { encoding, q, i };
};

// Get the specificity of the encoding.
const specify = (encoding, spec, index) => {
    let s = 0;
    if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
        s |= 1;
    } else if (spec.encoding !== "*") {
        return null;
    }

    return { i: index, o: spec.i, q: spec.q, s };
};

// Parse the Accept-Encoding header.
const parseAcceptEncoding = (accept) => {
    const accepts = accept.split(",");
    let hasIdentity = false;
    let minQuality = 1;

    let i;
    let j;

    for (i = 0, j = 0; i < accepts.length; i++) {
        const encoding = parseEncoding(accepts[i].trim(), i);

        if (encoding) {
            accepts[j++] = encoding;
            hasIdentity = hasIdentity || specify("identity", encoding);
            minQuality = Math.min(minQuality, encoding.q || 1);
        }
    }

    if (!hasIdentity) {
        // If identity doesn't explicitly appear in the accept-encoding header,
        // it's added to the list of acceptable encoding with the lowest q
        accepts[j++] = { encoding: "identity", q: minQuality, i };
    }

    // trim accepts
    accepts.length = j;

    return accepts;
};

// Get the priority of an encoding.
const getEncodingPriority = (encoding, accepted, index) => {
    let priority = { o: -1, q: 0, s: 0 };

    for (let i = 0; i < accepted.length; i++) {
        const spec = specify(encoding, accepted[i], index);

        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
            priority = spec;
        }
    }

    return priority;
};

const compareSpecs = (a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;

const getFullEncoding = (spec) => spec.encoding;

const isQuality = (spec) => spec.q > 0;

// Get the preferred encodings from an Accept-Encoding header.
const preferredEncodings = (accept, provided) => {
    const accepts = parseAcceptEncoding(accept || "");

    if (!provided) {
        // sorted list of all encodings
        return accepts
            .filter(isQuality)
            .sort(compareSpecs)
            .map(getFullEncoding);
    }

    const priorities = provided.map((type, index) => getEncodingPriority(type, accepts, index));

    // sorted list of accepted encodings
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
};



export default preferredEncodings;
