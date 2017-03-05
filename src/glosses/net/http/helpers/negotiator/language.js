import adone from "adone";
const { is } = adone;

const simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;

// Parse a language from the Accept-Language header.
const parseLanguage = (str, i) => {
    const match = simpleLanguageRegExp.exec(str);
    if (!match) {
        return null;
    }

    const [, prefix, suffix] = match;
    let full = prefix;

    if (suffix) {
        full += `-${suffix}`;
    }

    let q = 1;
    if (match[3]) {
        const params = match[3].split(";");
        for (i = 0; i < params.length; i++) {
            const p = params[i].split("=");
            if (p[0] === "q") {
                q = parseFloat(p[1]);
            }
        }
    }

    return { prefix, suffix, q, i, full };
};

// Parse the Accept-Language header.
const parseAcceptLanguage = (accept) => {
    const accepts = accept.split(",");

    let j = 0;
    for (let i = 0; i < accepts.length; i++) {
        const language = parseLanguage(accepts[i].trim(), i);

        if (language) {
            accepts[j++] = language;
        }
    }

    // trim accepts
    accepts.length = j;

    return accepts;
};

// Get the specificity of the language.
const specify = (language, spec, index) => {
    const p = parseLanguage(language);
    if (!p) {
        return null;
    }
    let s = 0;
    if (spec.full.toLowerCase() === p.full.toLowerCase()) {
        s |= 4;
    } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
        s |= 2;
    } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
        s |= 1;
    } else if (spec.full !== "*") {
        return null;
    }

    return { i: index, o: spec.i, q: spec.q, s };
};

// Get the priority of a language.
const getLanguagePriority = (language, accepted, index) => {
    let priority = { o: -1, q: 0, s: 0 };

    for (let i = 0; i < accepted.length; i++) {
        const spec = specify(language, accepted[i], index);

        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
            priority = spec;
        }
    }

    return priority;
};

const compareSpecs = (a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0;

const getFullLanguage = (spec) => spec.full;

const isQuality = (spec) => spec.q > 0;

// Get the preferred languages from an Accept-Language header.
const preferredLanguages = (accept, provided) => {
    // RFC 2616 sec 14.4: no header = *
    const accepts = parseAcceptLanguage(is.undefined(accept) ? "*" : accept || "");

    if (!provided) {
        // sorted list of all languages
        return accepts
            .filter(isQuality)
            .sort(compareSpecs)
            .map(getFullLanguage);
    }

    const priorities = provided.map((type, index) => getLanguagePriority(type, accepts, index));

    // sorted list of accepted languages
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
};

export default preferredLanguages;
