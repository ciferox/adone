import adone from "adone";
const { is, util } = adone;

const simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;

const quoteCount = (string) => {
    let count = 0;
    let index = 0;

    while ((index = string.indexOf('"', index)) !== -1) {
        count++;
        index++;
    }

    return count;
};

const splitMediaTypes = (accept) => {
    const accepts = accept.split(",");

    let j = 0;
    for (let i = 1; i < accepts.length; i++) {
        if (quoteCount(accepts[j]) % 2 === 0) {
            accepts[++j] = accepts[i];
        } else {
            accepts[j] += `,${accepts[i]}`;
        }
    }

    // trim accepts
    accepts.length = j + 1;

    return accepts;
};

const splitParameters = (str) => {
    const parameters = str.split(";");

    let j = 0;
    for (let i = 1; i < parameters.length; i++) {
        if (quoteCount(parameters[j]) % 2 === 0) {
            parameters[++j] = parameters[i];
        } else {
            parameters[j] += `;${parameters[i]}`;
        }
    }

    // trim parameters
    parameters.length = j + 1;

    for (let i = 0; i < parameters.length; i++) {
        parameters[i] = parameters[i].trim();
    }

    return parameters;
};

const splitKeyValuePair = (str) => {
    const index = str.indexOf("=");
    let key;
    let val;

    if (index === -1) {
        key = str;
    } else {
        key = str.substr(0, index);
        val = str.substr(index + 1);
    }

    return [key, val];
};

// Parse a media type from the Accept header.
const parseMediaType = (str, i) => {
    const match = simpleMediaTypeRegExp.exec(str);
    if (!match) {
        return null;
    }

    const params = {};
    let q = 1;
    const [, type, subtype] = match;

    if (match[3]) {
        const kvps = splitParameters(match[3]).map(splitKeyValuePair);

        for (let j = 0; j < kvps.length; j++) {
            const pair = kvps[j];
            const key = pair[0].toLowerCase();
            const val = pair[1];

            // get the value, unwrapping quotes
            const value = val && val[0] === '"' && val[val.length - 1] === '"' ? val.substr(1, val.length - 2) : val;

            if (key === "q") {
                q = parseFloat(value);
                break;
            }

            // store parameter
            params[key] = value;
        }
    }

    return { type, subtype, params, q, i };
};

// Parse the Accept header.
const parseAccept = (accept) => {
    const accepts = splitMediaTypes(accept);

    let j = 0;
    for (let i = 0; i < accepts.length; i++) {
        const mediaType = parseMediaType(accepts[i].trim(), i);

        if (mediaType) {
            accepts[j++] = mediaType;
        }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
};

// Get the specificity of the media type.
const specify = (type, spec, index) => {
    const p = parseMediaType(type);
    let s = 0;

    if (!p) {
        return null;
    }

    if (spec.type.toLowerCase() === p.type.toLowerCase()) {
        s |= 4;
    } else if (spec.type !== "*") {
        return null;
    }

    if (spec.subtype.toLowerCase() === p.subtype.toLowerCase()) {
        s |= 2;
    } else if (spec.subtype !== "*") {
        return null;
    }

    const keys = util.keys(spec.params);
    if (keys.length > 0) {
        if (keys.every((k) => {
            return spec.params[k] === "*" || (spec.params[k] || "").toLowerCase() === (p.params[k] || "").toLowerCase();
        })) {
            s |= 1;
        } else {
            return null;
        }
    }

    return { i: index, o: spec.i, q: spec.q, s };
};

// Get the priority of a media type.
const getMediaTypePriority = (type, accepted, index) => {
    let priority = { o: -1, q: 0, s: 0 };

    for (let i = 0; i < accepted.length; i++) {
        const spec = specify(type, accepted[i], index);

        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
            priority = spec;
        }
    }

    return priority;
};

const compareSpecs = (a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;

const getFullType = (spec) => `${spec.type}/${spec.subtype}`;

const isQuality = (spec) => spec.q > 0;

// Get the preferred media types from an Accept header.
const preferredMediaTypes = (accept, provided) => {
    // RFC 2616 sec 14.2: no header = */*
    const accepts = parseAccept(is.undefined(accept) ? "*/*" : accept || "");

    if (!provided) {
        // sorted list of all types
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullType);
    }

    const priorities = provided.map((type, index) => getMediaTypePriority(type, accepts, index));

    // sorted list of accepted types
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
};

export default preferredMediaTypes;
