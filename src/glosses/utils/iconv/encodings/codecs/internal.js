// Node.js internal encodings.
const { std: { string_decoder: { StringDecoder } } } = adone;

class InternalDecoderCesu8 {
    constructor(options, codec) {
        this.acc = 0;
        this.contBytes = 0;
        this.accBytes = 0;
        this.defaultCharUnicode = codec.defaultCharUnicode;
    }

    write(buf) {
        let { acc, contBytes, accBytes } = this;
        let res = "";
        for (let i = 0; i < buf.length; i++) {
            const curByte = buf[i];
            if ((curByte & 0xC0) !== 0x80) {  // Leading byte
                if (contBytes > 0) {  // Previous code is invalid
                    res += this.defaultCharUnicode;
                    contBytes = 0;
                }

                if (curByte < 0x80) {  // Single-byte code
                    res += String.fromCharCode(curByte);
                } else if (curByte < 0xE0) {  // Two-byte code
                    acc = curByte & 0x1F;
                    contBytes = 1; accBytes = 1;
                } else if (curByte < 0xF0) {  // Three-byte code
                    acc = curByte & 0x0F;
                    contBytes = 2; accBytes = 1;
                } else {  // Four or more are not supported for CESU-8.
                    res += this.defaultCharUnicode;
                }
            } else {  // Continuation byte
                if (contBytes > 0) {  // We're waiting for it.
                    acc = (acc << 6) | (curByte & 0x3f);
                    contBytes--; accBytes++;
                    if (contBytes === 0) {
                        // Check for overlong encoding, but support Modified UTF-8 (encoding NULL as C0 80)
                        if (accBytes === 2 && acc < 0x80 && acc > 0) {
                            res += this.defaultCharUnicode;
                        } else if (accBytes === 3 && acc < 0x800) {
                            res += this.defaultCharUnicode;
                        } else {  //  // Actually add character.
                            res += String.fromCharCode(acc);
                        }
                    }
                } else {  // Unexpected continuation byte
                    res += this.defaultCharUnicode;
                }
            }
        }
        this.acc = acc;
        this.contBytes = contBytes;
        this.accBytes = accBytes;
        return res;
    }

    end() {
        let res = 0;
        if (this.contBytes > 0) {
            res += this.defaultCharUnicode;
        }
        return res;
    }
}

class InternalEncoderCesu8 {
    write(str) {
        const buf = Buffer.alloc(str.length * 3);
        let bufIdx = 0;
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            // Naive implementation, but it works because CESU-8 is especially easy
            // to convert from UTF-16 (which all JS strings are encoded in).
            if (charCode < 0x80) {
                buf[bufIdx++] = charCode;
            } else if (charCode < 0x800) {
                buf[bufIdx++] = 0xC0 + (charCode >>> 6);
                buf[bufIdx++] = 0x80 + (charCode & 0x3f);
            } else {  // charCode will always be < 0x10000 in javascript.
                buf[bufIdx++] = 0xE0 + (charCode >>> 12);
                buf[bufIdx++] = 0x80 + ((charCode >>> 6) & 0x3f);
                buf[bufIdx++] = 0x80 + (charCode & 0x3f);
            }
        }
        return buf.slice(0, bufIdx);
    }

    end() {

    }
}

class InternalEncoderBase64 {
    constructor() {
        this.prevStr = "";
    }

    write(str) {
        str = this.prevStr + str;
        const completeQuads = str.length - (str.length % 4);
        this.prevStr = str.slice(completeQuads);
        str = str.slice(0, completeQuads);

        return Buffer.from(str, "base64");
    }

    end() {
        return Buffer.from(this.prevStr, "base64");
    }
}

class InternalDecoder extends StringDecoder {
    constructor(options, codec) {
        super(codec.enc);
    }
}

class InternalEncoder {
    constructor(options, codec) {
        this.enc = codec.enc;
    }

    write(str) {
        return Buffer.from(str, this.enc);
    }

    end() {

    }
}

export default class InternalCodec {
    constructor(codecOptions, iconv) {
        this.enc = codecOptions.encodingName;
        this.bomAware = codecOptions.bomAware;

        if (this.enc === "base64") {
            this.encoder = InternalEncoderBase64;
        } else if (this.enc === "cesu8") {
            this.enc = "utf8";  // Use utf8 for decoding.
            this.encoder = InternalEncoderCesu8;

            // Add decoder for versions of Node not supporting CESU-8
            if (Buffer.from("eda080", "hex").toString().length === 3) {
                this.decoder = InternalDecoderCesu8;
                this.defaultCharUnicode = iconv.defaultCharUnicode;
            }
        }
    }
}

InternalCodec.prototype.encoder = InternalEncoder;
InternalCodec.prototype.decoder = InternalDecoder;
