// UTF-7 codec, according to https://tools.ietf.org/html/rfc2152
// See also below a UTF-7-IMAP codec, according to http://tools.ietf.org/html/rfc3501#section-5.1.3

export const unicode11utf7 = "utf7"; // Alias UNICODE-1-1-UTF-7

const nonDirectChars = /[^A-Za-z0-9'(),-./:? \n\r\t]+/g;

class Utf7Encoder {
    constructor(options, codec) {
        this.iconv = codec.iconv;
    }

    write(str) {
        // Naive implementation.
        // Non-direct chars are encoded as "+<base64>-"; single "+" char is encoded as "+-".
        return Buffer.from(str.replace(nonDirectChars, (chunk) => {
            if (chunk === "+") {
                return "+-";
            }
            return `+${this.iconv.encode(chunk, "utf16-be").toString("base64").replace(/=+$/, "")}-`;
        }));
    }

    end() {

    }
}

const base64Regex = /[A-Za-z0-9/+]/;
const base64Chars = [];
for (let i = 0; i < 256; i++) {
    base64Chars[i] = base64Regex.test(String.fromCharCode(i));
}

const plusChar = "+".charCodeAt(0);
const minusChar = "-".charCodeAt(0);

class Utf7Decoder {
    constructor(options, codec) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = "";
    }

    write(buf) {
        let res = "";
        let lastI = 0;
        let { inBase64, base64Accum } = this;

        // The decoder is more involved as we must handle chunks in stream.
        for (let i = 0; i < buf.length; i++) {
            if (!inBase64) { // We're in direct mode.
                // Write direct chars until '+'
                if (buf[i] === plusChar) {
                    res += this.iconv.decode(buf.slice(lastI, i), "ascii"); // Write direct chars.
                    lastI = i + 1;
                    inBase64 = true;
                }
            } else { // We decode base64.
                if (!base64Chars[buf[i]]) { // Base64 ended.
                    if (i === lastI && buf[i] === minusChar) { // "+-" -> "+"
                        res += "+";
                    } else {
                        const b64str = base64Accum + buf.slice(lastI, i).toString();
                        res += this.iconv.decode(Buffer.from(b64str, "base64"), "utf16-be");
                    }

                    if (buf[i] !== minusChar) { // Minus is absorbed after base64.
                        i--;
                    }

                    lastI = i + 1;
                    inBase64 = false;
                    base64Accum = "";
                }
            }
        }

        if (!inBase64) {
            res += this.iconv.decode(buf.slice(lastI), "ascii"); // Write direct chars.
        } else {
            let b64str = base64Accum + buf.slice(lastI).toString();

            const canBeDecoded = b64str.length - (b64str.length % 8); // Minimal chunk: 2 quads -> 2x3 bytes -> 3 chars.
            base64Accum = b64str.slice(canBeDecoded); // The rest will be decoded in future.
            b64str = b64str.slice(0, canBeDecoded);

            res += this.iconv.decode(Buffer.from(b64str, "base64"), "utf16-be");
        }

        this.inBase64 = inBase64;
        this.base64Accum = base64Accum;

        return res;
    }

    end() {
        let res = "";
        if (this.inBase64 && this.base64Accum.length > 0) {
            res = this.iconv.decode(Buffer.from(this.base64Accum, "base64"), "utf16-be");
        }

        this.inBase64 = false;
        this.base64Accum = "";
        return res;
    }
}


export default class Utf7Codec {
    constructor(codecOptions, iconv) {
        this.iconv = iconv;
    }
}

Utf7Codec.prototype.encoder = Utf7Encoder;
Utf7Codec.prototype.decoder = Utf7Decoder;
Utf7Codec.prototype.bomAware = true;
