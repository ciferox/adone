const {
    is,
    util: { iconv }
} = adone;

const {
    getDecoder,
    getEncoder
} = iconv;

const detectEncoding = (buf, defaultEncoding = "utf-16le") => {
    let enc = defaultEncoding;

    if (buf.length >= 2) {
        // Check BOM.
        if (buf[0] === 0xFE && buf[1] === 0xFF) { // UTF-16BE BOM
            enc = "utf-16be";
        } else if (buf[0] === 0xFF && buf[1] === 0xFE) { // UTF-16LE BOM
            enc = "utf-16le";
        } else {
            // No BOM found. Try to deduce encoding from initial content.
            // Most of the time, the content has ASCII chars (U+00**), but the opposite (U+**00) is uncommon.
            // So, we count ASCII as if it was LE or BE, and decide from that.
            let asciiCharsLE = 0;
            let asciiCharsBE = 0; // Counts of chars in both positions
            const _len = Math.min(buf.length - (buf.length % 2), 64); // Len is always even.

            for (let i = 0; i < _len; i += 2) {
                if (buf[i] === 0 && buf[i + 1] !== 0) {
                    asciiCharsBE++;
                }
                if (buf[i] !== 0 && buf[i + 1] === 0) {
                    asciiCharsLE++;
                }
            }

            if (asciiCharsBE > asciiCharsLE) {
                enc = "utf-16be";
            } else if (asciiCharsBE < asciiCharsLE) {
                enc = "utf-16le";
            }
        }
    }

    return enc;
};

// == UTF-16 codec =============================================================
// Decoder chooses automatically from UTF-16LE and UTF-16BE using BOM and space-based heuristic.
// Defaults to UTF-16LE, as it's prevalent and default in Node.
// http://en.wikipedia.org/wiki/UTF-16 and http://encoding.spec.whatwg.org/#utf-16le
// Decoder default can be changed: iconv.decode(buf, 'utf16', {defaultEncoding: 'utf-16be'});
// Encoder uses UTF-16LE and prepends BOM (which can be overridden with addBOM: false).

class Utf16Encoder {
    constructor(options = {}) {
        if (is.undefined(options.addBOM)) {
            options.addBOM = true;
        }
        this.encoder = getEncoder("utf-16le", options);
    }

    write(str) {
        return this.encoder.write(str);
    }

    end() {
        return this.encoder.end();
    }
}

class Utf16Decoder {
    constructor(options = {}, codec) {
        this.decoder = null;
        this.initialBytes = [];
        this.initialBytesLen = 0;

        this.options = options;
        this.iconv = codec.iconv;
    }

    write(buf) {
        if (!this.decoder) {
            // Codec is not chosen yet. Accumulate initial bytes.
            this.initialBytes.push(buf);
            this.initialBytesLen += buf.length;

            if (this.initialBytesLen < 16) { // We need more bytes to use space heuristic (see below)
                return "";
            }

            // We have enough bytes -> detect endianness.
            buf = Buffer.concat(this.initialBytes);
            const encoding = detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = getDecoder(encoding, this.options);
            this.initialBytes.length = this.initialBytesLen = 0;
        }

        return this.decoder.write(buf);
    }

    end() {
        if (!this.decoder) {
            const buf = Buffer.concat(this.initialBytes);
            const encoding = detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = getDecoder(encoding, this.options);

            const res = this.decoder.write(buf);
            const trail = this.decoder.end();

            return trail ? (res + trail) : res;
        }
        return this.decoder.end();
    }
}

export default class Utf16Codec {
    constructor(codecOptions, iconv) {
        this.iconv = iconv;
    }
}

Utf16Codec.prototype.encoder = Utf16Encoder;
Utf16Codec.prototype.decoder = Utf16Decoder;
