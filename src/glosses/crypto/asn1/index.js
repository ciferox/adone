const { lazify } = adone;

export const ber = lazify({
    Reader: "./ber/reader",
    Writer: "./ber/writer"
}, null, require);

lazify({
    type: "./types"
}, exports, require);
