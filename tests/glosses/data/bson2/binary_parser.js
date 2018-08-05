/**
 * Binary Parser.
 * Jonas Raoni Soares Silva
 * http://jsfromhell.com/classes/binary-parser [v1.0]
 */
const chr = String.fromCharCode;

const maxBits = [];
for (let i = 0; i < 64; i++) {
    maxBits[i] = Math.pow(2, i);
}

export default class BinaryParser {
    constructor(bigEndian, allowExceptions) {

        this.bigEndian = bigEndian;
        this.allowExceptions = allowExceptions;
    }

    static warn(msg) {
        if (this.allowExceptions) {
            throw new Error(msg);
        }

        return 1;
    }

    static decodeFloat(data, precisionBits, exponentBits) {
        const b = new this.Buffer(this.bigEndian, data);

        b.checkBuffer(precisionBits + exponentBits + 1);

        let bias = maxBits[exponentBits - 1] - 1,
            signal = b.readBits(precisionBits + exponentBits, 1),
            exponent = b.readBits(precisionBits, exponentBits),
            significand = 0,
            divisor = 2,
            curByte = b.buffer.length + (-precisionBits >> 3) - 1;

        do {
            for (
                var byteValue = b.buffer[++curByte], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
                (mask >>= 1);
                byteValue & mask && (significand += 1 / divisor), divisor *= 2
            ) { }
        } while ((precisionBits -= startBit));

        return exponent === (bias << 1) + 1
            ? significand
                ? NaN
                : signal
                    ? -Infinity
                    : Number(Infinity)
            : (1 + signal * -2) *
            (exponent || significand
                ? !exponent
                    ? Math.pow(2, -bias + 1) * significand
                    : Math.pow(2, exponent - bias) * (1 + significand)
                : 0);
    }

    static decodeInt(data, bits, signed, forceBigEndian) {
        let b = new this.Buffer(this.bigEndian || forceBigEndian, data),
            x = b.readBits(0, bits),
            max = maxBits[bits]; //max = Math.pow( 2, bits );

        return signed && x >= max / 2 ? x - max : x;
    }

    static encodeFloat(data, precisionBits, exponentBits) {
        let bias = maxBits[exponentBits - 1] - 1,
            minExp = -bias + 1,
            maxExp = bias,
            minUnnormExp = minExp - precisionBits,
            n = parseFloat(data),
            status = isNaN(n) || n === -Infinity || n === Number(Infinity) ? n : 0,
            exp = 0,
            len = 2 * bias + 1 + precisionBits + 3,
            bin = new Array(len),
            signal = (n = status !== 0 ? 0 : n) < 0,
            intPart = Math.floor((n = Math.abs(n))),
            floatPart = n - intPart,
            lastBit,
            rounded,
            result,
            i,
            j;

        for (i = len; i; bin[--i] = 0) { }

        for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2)) { }

        for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0) && --floatPart) { }

        for (i = -1; ++i < len && !bin[i];) { }

        if (
            bin[
            (lastBit =
                precisionBits -
                1 +
                (i =
                    (exp = bias + 1 - i) >= minExp && exp <= maxExp
                        ? i + 1
                        : bias + 1 - (exp = minExp - 1))) + 1
            ]
        ) {
            if (!(rounded = bin[lastBit])) {
                for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]) { }
            }

            for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0)) { }
        }

        for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];) { }

        if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
            ++i;
        } else if (exp < minExp) {
            exp !== bias + 1 - len && exp < minUnnormExp && this.warn("encodeFloat::float underflow");
            i = bias + 1 - (exp = minExp - 1);
        }

        if (intPart || status !== 0) {
            this.warn(intPart ? "encodeFloat::float overflow" : `encodeFloat::${status}`);
            exp = maxExp + 1;
            i = bias + 2;

            if (status === -Infinity) {
                signal = 1;
            } else if (isNaN(status)) {
                bin[i] = 1;
            }
        }

        for (
            n = Math.abs(exp + bias), j = exponentBits + 1, result = "";
            --j;
            result = n % 2 + result, n = n >>= 1
        ) { }

        let r;
        for (
            n = 0,
            j = 0,
            i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join(""))
                .length,
            r = [];
            i;
            j = (j + 1) % 8
        ) {
            n += (1 << j) * result.charAt(--i);
            if (j === 7) {
                r[r.length] = String.fromCharCode(n);
                n = 0;
            }
        }

        r[r.length] = n ? String.fromCharCode(n) : "";

        return (this.bigEndian ? r.reverse() : r).join("");
    }

    static encodeInt(data, bits, signed, forceBigEndian) {
        const max = maxBits[bits];

        if (data >= max || data < -(max / 2)) {
            this.warn("encodeInt::overflow");
            data = 0;
        }

        if (data < 0) {
            data += max;
        }

        for (
            var r = [];
            data;
            r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256)
        ) { }

        for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0") { }

        return (this.bigEndian || forceBigEndian ? r.reverse() : r).join("");
    }

    static toSmall(data) {
        return this.decodeInt(data, 8, true);
    }

    static fromSmall(data) {
        return this.encodeInt(data, 8, true);
    }

    static toByte(data) {
        return this.decodeInt(data, 8, false);
    }

    static fromByte(data) {
        return this.encodeInt(data, 8, false);
    }

    static toShort(data) {
        return this.decodeInt(data, 16, true);
    }

    static fromShort(data) {
        return this.encodeInt(data, 16, true);
    }

    static toWord(data) {
        return this.decodeInt(data, 16, false);
    }

    static fromWord(data) {
        return this.encodeInt(data, 16, false);
    }

    static toInt(data) {
        return this.decodeInt(data, 32, true);
    }

    static fromInt(data) {
        return this.encodeInt(data, 32, true);
    }

    static toLong(data) {
        return this.decodeInt(data, 64, true);
    }

    static fromLong(data) {
        return this.encodeInt(data, 64, true);
    }

    static toDWord(data) {
        return this.decodeInt(data, 32, false);
    }

    static fromDWord(data) {
        return this.encodeInt(data, 32, false);
    }

    static toQWord(data) {
        return this.decodeInt(data, 64, true);
    }

    static fromQWord(data) {
        return this.encodeInt(data, 64, true);
    }

    static toFloat(data) {
        return this.decodeFloat(data, 23, 8);
    }

    static fromFloat(data) {
        return this.encodeFloat(data, 23, 8);
    }

    static toDouble(data) {
        return this.decodeFloat(data, 52, 11);
    }

    static fromDouble(data) {
        return this.encodeFloat(data, 52, 11);
    }

    // Factor out the encode so it can be shared by add_header and push_int32
    static encode_int32(number, asArray) {
        let a, b, c, d, unsigned;
        unsigned = number < 0 ? number + 0x100000000 : number;
        a = Math.floor(unsigned / 0xffffff);
        unsigned &= 0xffffff;
        b = Math.floor(unsigned / 0xffff);
        unsigned &= 0xffff;
        c = Math.floor(unsigned / 0xff);
        unsigned &= 0xff;
        d = Math.floor(unsigned);
        return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
    }

    static encode_int64(number) {
        let a, b, c, d, e, f, g, h, unsigned;
        unsigned = number < 0 ? number + 0x10000000000000000 : number;
        a = Math.floor(unsigned / 0xffffffffffffff);
        unsigned &= 0xffffffffffffff;
        b = Math.floor(unsigned / 0xffffffffffff);
        unsigned &= 0xffffffffffff;
        c = Math.floor(unsigned / 0xffffffffff);
        unsigned &= 0xffffffffff;
        d = Math.floor(unsigned / 0xffffffff);
        unsigned &= 0xffffffff;
        e = Math.floor(unsigned / 0xffffff);
        unsigned &= 0xffffff;
        f = Math.floor(unsigned / 0xffff);
        unsigned &= 0xffff;
        g = Math.floor(unsigned / 0xff);
        unsigned &= 0xff;
        h = Math.floor(unsigned);
        return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
    }

    /**
     * UTF8 methods
     */

    // Take a raw binary string and return a utf8 string
    static decode_utf8(binaryStr) {
        let len = binaryStr.length,
            decoded = "",
            i = 0,
            c = 0,
            c2 = 0,
            c3;

        while (i < len) {
            c = binaryStr.charCodeAt(i);
            if (c < 128) {
                decoded += String.fromCharCode(c);
                i++;
            } else if (c > 191 && c < 224) {
                c2 = binaryStr.charCodeAt(i + 1);
                decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = binaryStr.charCodeAt(i + 1);
                c3 = binaryStr.charCodeAt(i + 2);
                decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }

        return decoded;
    }

    // Encode a cstring
    static encode_cstring(s) {
        return unescape(encodeURIComponent(s)) + BinaryParser.fromByte(0);
    }

    // Take a utf8 string and return a binary string
    static encode_utf8(s) {
        let a = "",
            c;

        for (let n = 0, len = s.length; n < len; n++) {
            c = s.charCodeAt(n);

            if (c < 128) {
                a += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                a += String.fromCharCode((c >> 6) | 192);
                a += String.fromCharCode((c & 63) | 128);
            } else {
                a += String.fromCharCode((c >> 12) | 224);
                a += String.fromCharCode(((c >> 6) & 63) | 128);
                a += String.fromCharCode((c & 63) | 128);
            }
        }

        return a;
    }

    static hprint(s) {
        let number;

        for (let i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(16)}` : s.charCodeAt(i).toString(16);
                process.stdout.write(`${number} `);
            } else {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(16)}` : s.charCodeAt(i).toString(16);
                process.stdout.write(`${number} `);
            }
        }

        process.stdout.write("\n\n");
    }

    static ilprint(s) {
        let number;

        for (let i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(10)}` : s.charCodeAt(i).toString(10);

                require("util").debug(`${number} : `);
            } else {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(10)}` : s.charCodeAt(i).toString(10);
                require("util").debug(`${number} : ${s.charAt(i)}`);
            }
        }
    }

    static hlprint(s) {
        let number;

        for (let i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(16)}` : s.charCodeAt(i).toString(16);
                require("util").debug(`${number} : `);
            } else {
                number =
                    s.charCodeAt(i) <= 15 ? `0${s.charCodeAt(i).toString(16)}` : s.charCodeAt(i).toString(16);
                require("util").debug(`${number} : ${s.charAt(i)}`);
            }
        }
    }
}

/**
 * BinaryParser buffer constructor.
 */
class BinaryParserBuffer {
    constructor(bigEndian, buffer) {
        this.bigEndian = bigEndian || 0;
        this.buffer = [];
        this.setBuffer(buffer);
    }

    setBuffer(data) {
        let l, i, b;

        if (data) {
            i = l = data.length;
            b = this.buffer = new Array(l);
            for (; i; b[l - i] = data.charCodeAt(--i)) { }
            this.bigEndian && b.reverse();
        }
    }

    hasNeededBits(neededBits) {
        return this.buffer.length >= -(-neededBits >> 3);
    }

    checkBuffer(neededBits) {
        if (!this.hasNeededBits(neededBits)) {
            throw new Error("checkBuffer::missing bytes");
        }
    }

    readBits(start, length) {
        //shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)

        function shl(a, b) {
            for (
                ;
                b--;
                a =
                ((a %= 0x7fffffff + 1) & 0x40000000) === 0x40000000
                    ? a * 2
                    : (a - 0x40000000) * 2 + 0x7fffffff + 1
            ) { }
            return a;
        }

        if (start < 0 || length <= 0) {
            return 0;
        }

        this.checkBuffer(start + length);

        let offsetLeft,
            offsetRight = start % 8,
            curByte = this.buffer.length - (start >> 3) - 1,
            lastByte = this.buffer.length + (-(start + length) >> 3),
            diff = curByte - lastByte,
            sum =
                ((this.buffer[curByte] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1)) +
                (diff && (offsetLeft = (start + length) % 8)
                    ? (this.buffer[lastByte++] & ((1 << offsetLeft) - 1)) << ((diff-- << 3) - offsetRight)
                    : 0);

        for (; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight)) { }

        return sum;
    }
}

BinaryParser.Buffer = BinaryParserBuffer;

