
const { is, net: { mimeType, http: { server: { helper: { Negotiator } } } } } = adone;

const extToMime = (type) => type.includes("/") ? type : mimeType.lookup(type);

const isValidMime = (type) => is.string(type);

export default class Accepts {
    constructor(req) {
        this.headers = req.headers;
        this.negotiator = new Negotiator(req);
    }

    // Check if the given `type(s)` is acceptable, returning
    // the best match when true, otherwise `undefined`, in which
    // case you should respond with 406 "Not Acceptable".
    types(...types) {
        // no types, return all requested types
        if (types.length === 0) {
            return this.negotiator.mediaTypes();
        }

        if (is.array(types[0])) {
            types = types[0];
        }

        if (!this.headers.accept) {
            return types[0];
        }
        const mimes = types.map(extToMime);
        const accepts = this.negotiator.mediaTypes(mimes.filter(isValidMime));
        const first = accepts[0];
        if (!first) {
            return false;
        }
        return types[mimes.indexOf(first)];
    }

    // Return accepted encodings or best fit based on `encodings`.
    // `Accept-Encoding: gzip, deflate` -> ['gzip', 'deflate']
    encodings(...encodings) {
        // no encodings, return all requested encodings
        if (encodings.length === 0) {
            return this.negotiator.encodings();
        }

        if (is.array(encodings[0])) {
            encodings = encodings[0];
        }

        return this.negotiator.encodings(encodings)[0] || false;
    }

    // Return accepted charsets or best fit based on `charsets`.
    // Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5 -> ['utf-8', 'utf-7', 'iso-8859-1']
    charsets(...charsets) {
        // no charsets, return all requested charsets
        if (charsets.length === 0) {
            return this.negotiator.charsets();
        }

        if (is.array(charsets[0])) {
            charsets = charsets[0];
        }

        return this.negotiator.charsets(charsets)[0] || false;
    }

    // Return accepted languages or best fit based on `langs`.
    // Accept-Language: en;q=0.8, es, pt -> ['es', 'pt', 'en']
    languages(...languages) {
        // no languages, return all requested languages
        if (languages.length === 0) {
            return this.negotiator.languages();
        }

        if (is.array(languages[0])) {
            languages = languages[0];
        }

        return this.negotiator.languages(languages)[0] || false;
    }
}
