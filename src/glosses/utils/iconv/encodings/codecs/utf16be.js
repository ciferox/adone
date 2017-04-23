class Utf16BEEncoder {
    write(str) {
        const buf = Buffer.from(str, "ucs2");
        for (let i = 0; i < buf.length; i += 2) {
            const tmp = buf[i];
            buf[i] = buf[i + 1];
            buf[i + 1] = tmp;
        }
        return buf;
    }

    end() {

    }
}

class Utf16BEDecoder {
    constructor() {
        this.overflowByte = -1;
    }

    write(buf) {
        if (buf.length === 0) {
            return "";
        }

        const buf2 = Buffer.alloc(buf.length + 1);
        let i = 0;
        let j = 0;

        if (this.overflowByte !== -1) {
            buf2[0] = buf[0];
            buf2[1] = this.overflowByte;
            [i, j] = [1, 2];
        }

        for (; i < buf.length - 1; i += 2, j += 2) {
            buf2[j] = buf[i + 1];
            buf2[j + 1] = buf[i];
        }

        this.overflowByte = i === buf.length - 1 ? buf[buf.length - 1] : -1;

        return buf2.slice(0, j).toString("ucs2");
    }

    end() {

    }
}

export default class Utf16BECodec {

}

Utf16BECodec.prototype.encoder = Utf16BEEncoder;
Utf16BECodec.prototype.decoder = Utf16BEDecoder;
Utf16BECodec.prototype.bomAware = true;
