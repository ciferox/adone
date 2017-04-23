const { util, lazify } = adone;

const encodings = lazify({
    _internal: "./codecs/internal",
    _dbcs: "./codecs/dbcs",
    _sbcs: "./codecs/sbcs",
    utf7: "./codecs/utf7",
    utf7imap: "./codecs/utf7imap",
    utf16be: "./codecs/utf16be",
    utf16: "./codecs/utf16"
}, exports, require);

// internal
export const utf8 = { type: "_internal", bomAware: true };
export const cesu8 = { type: "_internal", bomAware: true };
export const unicode11utf8 = "utf8";
export const ucs2 = { type: "_internal", bomAware: true };
export const utf16le = "ucs2";
export const binary = { type: "_internal" };
export const base64 = { type: "_internal" };
export const hex = { type: "_internal" };

const data = lazify({
    dbcs: "./data/dbcs",
    sbcs: "./data/sbcs"
}, null, require);

for (const type of ["dbcs", "sbcs"]) {
    for (const [k, v] of util.entries(data[type])) {
        encodings[k] = v;
    }
}
