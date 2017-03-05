import adone from "adone";

const lazy = adone.lazify({
    charset: "./charset",
    encoding: "./encoding",
    language: "./language",
    mediaType: "./media_type"
}, null, require);

export default class Negotiator {
    constructor(request) {
        this.request = request;
    }

    charset(available) {
        const set = this.charsets(available);
        return set && set[0];
    }

    charsets(available) {
        return lazy.charset(this.request.headers["accept-charset"], available);
    }

    encoding(available) {
        const set = this.encodings(available);
        return set && set[0];
    }

    encodings(available) {
        return lazy.encoding(this.request.headers["accept-encoding"], available);
    }

    language(available) {
        const set = this.languages(available);
        return set && set[0];
    }

    languages(available) {
        return lazy.language(this.request.headers["accept-language"], available);
    }

    mediaType(available) {
        const set = this.mediaTypes(available);
        return set && set[0];
    }

    mediaTypes(available) {
        return lazy.mediaType(this.request.headers.accept, available);
    }
}
