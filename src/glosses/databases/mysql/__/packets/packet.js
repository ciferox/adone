const {
    x,
    is,
    math: { Long },
    database: { mysql },
    noop
} = adone;

const {
    c
} = mysql;

const __ = adone.private(mysql);

const minus = "-".charCodeAt(0);
const plus = "+".charCodeAt(0);

// TODO: handle E notation
const dot = ".".charCodeAt(0);
const exponent = "e".charCodeAt(0);
const exponentCapital = "E".charCodeAt(0);

const INVALID_DATE = new Date(NaN);
// DATE, DATETIME and TIMESTAMP

const pad = "000000000000";
const leftPad = (num, value) => {
    const s = value.toString();
    // if we don't need to pad
    if (s.length >= num) {
        return s;
    }
    return (pad + s).slice(-num);
};


export default class Packet {
    constructor(id, buffer, start, end) {
        // hot path, enable checks when testing only
        // if (!Buffer.isBuffer(buffer) || typeof start == 'undefined' || typeof end == 'undefined')
        //  throw new Error('invalid packet');
        this.sequenceId = id;
        this.numPackets = 1;
        this.buffer = buffer;
        this.start = start;
        this.offset = start + 4;
        this.end = end;
    }

    reset() {
        this.offset = this.start + 4;
    }

    length() {
        return this.end - this.start;
    }

    slice() {
        return this.buffer.slice(this.start, this.end);
    }

    dump() {
        adone.debug(
            [this.buffer.asciiSlice(this.start, this.end)],
            this.buffer.slice(this.start, this.end),
            this.length(),
            this.sequenceId
        );
    }

    haveMoreData() {
        return this.end > this.offset;
    }

    skip(num) {
        this.offset += num;
    }

    readInt8() {
        return this.buffer[this.offset++];
    }

    readInt16() {
        this.offset += 2;
        return this.buffer.readUInt16LE(this.offset - 2, true);
    }

    readInt24() {
        return this.readInt16() + (this.readInt8() << 16);
    }

    readInt32() {
        this.offset += 4;
        return this.buffer.readUInt32LE(this.offset - 4, true);
    }

    readSInt8() {
        return this.buffer.readInt8(this.offset++, true);
    }

    readSInt16() {
        this.offset += 2;
        return this.buffer.readInt16LE(this.offset - 2, true);
    }

    readSInt32() {
        this.offset += 4;
        return this.buffer.readInt32LE(this.offset - 4, true);
    }

    readInt64JSNumber() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const l = new Long(word0, word1, true);
        return l.toNumber();
    }

    readSInt64JSNumber() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        if (!(word1 & 0x80000000)) {
            return word0 + 0x100000000 * word1;
        }
        const l = new Long(word0, word1, false);
        return l.toNumber();
    }

    readInt64String() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, true);
        return res.toString();
    }

    readSInt64String() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, false);
        return res.toString();
    }

    readInt64() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, true);
        const resNumber = res.toNumber();
        const resString = res.toString();
        return resNumber.toString() === resString ? resNumber : resString;
    }

    readSInt64() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, false);
        const resNumber = res.toNumber();
        const resString = res.toString();
        return resNumber.toString() === resString ? resNumber : resString;
    }

    isEOF() {
        return this.buffer[this.offset] === 0xfe && this.length() < 13;
    }

    eofStatusFlags() {
        return this.buffer.readInt16LE(this.offset + 3);
    }

    eofWarningCount() {
        return this.buffer.readInt16LE(this.offset + 1);
    }

    readLengthCodedNumber(bigNumberStrings, signed) {
        const byte1 = this.buffer[this.offset++];
        if (byte1 < 251) {
            return byte1;
        }
        return this.readLengthCodedNumberExt(byte1, bigNumberStrings, signed);
    }

    readLengthCodedNumberSigned(bigNumberStrings) {
        return this.readLengthCodedNumber(bigNumberStrings, true);
    }

    readLengthCodedNumberExt(tag, bigNumberStrings, signed) {
        if (tag === 0xfb) {
            return null;
        }

        if (tag === 0xfc) {
            return this.readInt8() + (this.readInt8() << 8);
        }

        if (tag === 0xfd) {
            return this.readInt8() + (this.readInt8() << 8) + (this.readInt8() << 16);
        }

        if (tag === 0xfe) {
            // TODO: check version
            // Up to MySQL 3.22, 0xfe was followed by a 4-byte integer.
            const word0 = this.readInt32();
            const word1 = this.readInt32();
            if (word1 === 0) {
                return word0; // don't convert to float if possible
            }

            if (word1 < 2097152) { // max exact float point int, 2^52 / 2^32
                return word1 * 0x100000000 + word0;
            }

            let res = new Long(word0, word1, !signed); // Long need unsigned

            const resNumber = res.toNumber();
            const resString = res.toString();

            res = resNumber.toString() === resString ? resNumber : resString;

            return bigNumberStrings ? resString : res;
        }

        adone.trace();
        throw new x.IllegalState(`Should not reach here: ${tag}`);
    }

    readFloat() {
        const res = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return res;
    }

    readDouble() {
        const res = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return res;
    }

    readBuffer(len = this.end - this.offset) {
        this.offset += len;
        return this.buffer.slice(this.offset - len, this.offset);
    }

    readDateTime() {
        const length = this.readInt8();
        if (length === 0xfb) {
            return null;
        }
        let y = 0;
        let m = 0;
        let d = 0;
        let H = 0;
        let M = 0;
        let S = 0;
        let ms = 0;
        if (length > 3) {
            y = this.readInt16();
            m = this.readInt8();
            d = this.readInt8();

        }
        if (length > 6) {
            H = this.readInt8();
            M = this.readInt8();
            S = this.readInt8();
        }
        if (length > 10) {
            ms = this.readInt32() / 1000;
        }
        if (y + m + d + H + M + S + ms === 0) {
            return INVALID_DATE;
        }
        return new Date(y, m - 1, d, H, M, S, ms);
    }

    readDateTimeString(decimals) {
        const length = this.readInt8();
        let y = 0;
        let m = 0;
        let d = 0;
        let H = 0;
        let M = 0;
        let S = 0;
        let ms = 0;
        let str;
        if (length > 3) {
            y = this.readInt16();
            m = this.readInt8();
            d = this.readInt8();
            str = [leftPad(4, y), leftPad(2, m), leftPad(2, d)].join("-");
        }
        if (length > 6) {
            H = this.readInt8();
            M = this.readInt8();
            S = this.readInt8();
            str += ` ${[leftPad(2, H), leftPad(2, M), leftPad(2, S)].join(":")}`;
        }
        if (length > 10) {
            ms = this.readInt32();
            str += ".";

            if (decimals) {
                ms = leftPad(6, ms);

                if (ms.length > decimals) {
                    ms = ms.substring(0, decimals); // rounding is done at the MySQL side, only 0 are here
                }
            }

            str += ms;
        }
        return str;
    }


    // TIME - value as a string, Can be negative
    readTimeString(convertTtoMs) {
        const length = this.readInt8();
        if (length === 0) {
            return 0;
        }

        const sign = this.readInt8() ? -1 : 1; // 'isNegative' flag byte
        let d = 0;
        let H = 0;
        let M = 0;
        let S = 0;
        let ms = 0;
        if (length > 6) {
            d = this.readInt32();
            H = this.readInt8();
            M = this.readInt8();
            S = this.readInt8();
        }
        if (length > 10) {
            ms = this.readInt32();
        }

        if (convertTtoMs) {
            H += d * 24;
            M += H * 60;
            S += M * 60;
            ms += S * 1000;
            ms *= sign;
            return ms;
        }
        const t = `${d ? (d * 24) + H : H}:${leftPad(2, M)}:${leftPad(2, S)}${ms ? `.${ms}` : ""}`;

        if (sign === -1) {
            return `-${t}`;
        }
        return t;
    }

    readLengthCodedString(encoding) {
        const len = this.readLengthCodedNumber();
        // TODO: check manually first byte here to avoid polymorphic return type?
        if (is.null(len)) {
            return null;
        }
        this.offset += len;

        // TODO: Use characterSetCode to get proper encoding
        return __.stringParser.decode(this.buffer.slice(this.offset - len, this.offset), encoding);
    }

    readLengthCodedBuffer() {
        const len = this.readLengthCodedNumber();
        if (is.null(len)) {
            return null;
        }
        return this.readBuffer(len);
    }

    readNullTerminatedString(encoding) {
        const start = this.offset;
        let end = this.offset;
        while (this.buffer[end]) {
            end = end + 1; // TODO: handle OOB check
        }
        this.offset = end + 1;
        return __.stringParser.decode(this.buffer.slice(start, end), encoding);
    }

    // TODO reuse?
    readString(len = this.end - this.offset, encoding) {
        this.offset += len;
        return __.stringParser.decode(this.buffer.slice(this.offset - len, this.offset), encoding);
    }

    // todo: rethink?
    parseInt(len, supportBigNumbers) {
        if (is.null(len)) {
            return null;
        }

        if (len >= 14 && !supportBigNumbers) {
            const s = this.buffer.toString("ascii", this.offset, this.offset + len);
            this.offset += len;
            return Number(s);
        }

        let result = 0;
        const start = this.offset;
        const end = this.offset + len;
        let sign = 1;
        if (len === 0) {
            return 0; // TODO: assert? exception?
        }

        if (this.buffer[this.offset] === minus) {
            this.offset++;
            sign = -1;
        }

        // max precise int is 9007199254740992
        let str;
        const numDigits = end - this.offset;
        if (supportBigNumbers) {
            if (numDigits >= 15) {
                str = this.readString(end - this.offset, "binary");
                result = parseInt(str, 10);
                if (result.toString() === str) {
                    return sign * result;
                }
                return sign === -1 ? `-${str}` : str;

            } else if (numDigits > 16) {
                str = this.readString(end - this.offset);
                return sign === -1 ? `-${str}` : str;
            }
        }

        if (this.buffer[this.offset] === plus) {
            this.offset++; // just ignore
        }
        while (this.offset < end) {
            result *= 10;
            result += this.buffer[this.offset] - 48;
            this.offset++;
        }
        const num = result * sign;
        if (!supportBigNumbers) {
            return num;
        }
        str = this.buffer.toString("ascii", start, end);
        if (num.toString() === str) {
            return num;
        }
        return str;

    }

    // note that if value of inputNumberAsString is bigger than MAX_SAFE_INTEGER
    // ( or smaller than MIN_SAFE_INTEGER ) the parseIntNoBigCheck result might be
    // different from what you would get from Number(inputNumberAsString)
    // String(parseIntNoBigCheck) <> String(Number(inputNumberAsString)) <> inputNumberAsString
    parseIntNoBigCheck(len) {
        if (is.null(len)) {
            return null;
        }
        let result = 0;
        const end = this.offset + len;
        let sign = 1;
        if (len === 0) {
            return 0; // TODO: assert? exception?
        }

        if (this.buffer[this.offset] === minus) {
            this.offset++;
            sign = -1;
        }
        if (this.buffer[this.offset] === plus) {
            this.offset++; // just ignore
        }
        while (this.offset < end) {
            result *= 10;
            result += this.buffer[this.offset] - 48;
            this.offset++;
        }
        return result * sign;
    }

    parseGeometryValue() {
        const buffer = this.readLengthCodedBuffer();

        if (is.null(buffer) || !buffer.length) {
            return null;
        }

        let offset = 4;

        const parseGeometry = () => {
            let result = null;
            const byteOrder = buffer.readUInt8(offset);
            offset += 1;
            const wkbType = byteOrder ? buffer.readUInt32LE(offset) :
                buffer.readUInt32BE(offset);
            offset += 4;
            switch (wkbType) {
                case 1: { // WKBPoint
                    const x = byteOrder
                        ? buffer.readDoubleLE(offset)
                        : buffer.readDoubleBE(offset);
                    offset += 8;
                    const y = byteOrder ? buffer.readDoubleLE(offset) :
                        buffer.readDoubleBE(offset);
                    offset += 8;
                    result = { x, y };
                    break;
                }
                case 2: { // WKBLineString
                    const numPoints = byteOrder ? buffer.readUInt32LE(offset) :
                        buffer.readUInt32BE(offset);
                    offset += 4;
                    result = [];
                    for (let i = numPoints; i > 0; i--) {
                        const x = byteOrder
                            ? buffer.readDoubleLE(offset)
                            : buffer.readDoubleBE(offset);
                        offset += 8;
                        const y = byteOrder
                            ? buffer.readDoubleLE(offset)
                            : buffer.readDoubleBE(offset);
                        offset += 8;
                        result.push({ x, y });
                    }
                    break;
                }
                case 3: { // WKBPolygon
                    const numRings = byteOrder
                        ? buffer.readUInt32LE(offset)
                        : buffer.readUInt32BE(offset);
                    offset += 4;
                    result = [];
                    for (let i = numRings; i > 0; i--) {
                        const numPoints = byteOrder
                            ? buffer.readUInt32LE(offset)
                            : buffer.readUInt32BE(offset);
                        offset += 4;
                        const line = [];
                        for (let j = numPoints; j > 0; j--) {
                            const x = byteOrder
                                ? buffer.readDoubleLE(offset)
                                : buffer.readDoubleBE(offset);
                            offset += 8;
                            const y = byteOrder
                                ? buffer.readDoubleLE(offset)
                                : buffer.readDoubleBE(offset);
                            offset += 8;
                            line.push({ x, y });
                        }
                        result.push(line);
                    }
                    break;
                }
                case 4: // WKBMultiPoint
                case 5: // WKBMultiLineString
                case 6: // WKBMultiPolygon
                case 7: { // WKBGeometryCollection
                    const num = byteOrder
                        ? buffer.readUInt32LE(offset)
                        : buffer.readUInt32BE(offset);
                    offset += 4;
                    result = [];
                    for (let i = num; i > 0; i--) {
                        result.push(parseGeometry());
                    }
                    break;
                }
            }
            return result;
        };
        return parseGeometry();
    }

    parseDate() {
        const strLen = this.readLengthCodedNumber();
        if (is.null(strLen)) {
            return null;
        }

        if (strLen !== 10) {
            // we expect only YYYY-MM-DD here.
            // if for some reason it's not the case return invalid date
            return new Date(NaN);
        }
        const y = this.parseInt(4);
        this.offset++; // -
        const m = this.parseInt(2);
        this.offset++; // -
        const d = this.parseInt(2);
        return new Date(y, m - 1, d);
    }

    parseDateTime() {
        const str = this.readLengthCodedString("binary");
        if (is.null(str)) {
            return null;
        }
        return new Date(str);
    }

    parseFloat(len) {
        if (is.null(len)) {
            return null;
        }

        let result = 0;
        const end = this.offset + len;
        let factor = 1;
        let pastDot = false;
        let charCode = 0;
        if (len === 0) {
            return 0; // TODO: assert? exception?
        }

        if (this.buffer[this.offset] === minus) {
            this.offset++;
            factor = -1;
        }

        if (this.buffer[this.offset] === plus) {
            this.offset++; // just ignore
        }

        while (this.offset < end) {
            charCode = this.buffer[this.offset];
            if (charCode === dot) {
                pastDot = true;
                this.offset++;
            } else if (charCode === exponent || charCode === exponentCapital) {
                this.offset++;
                const exponentValue = this.parseInt(end - this.offset);
                return (result / factor) * Math.pow(10, exponentValue);
            } else {
                result *= 10;
                result += this.buffer[this.offset] - 48;
                this.offset++;
                if (pastDot) {
                    factor = factor * 10;
                }
            }
        }
        return result / factor;
    }

    parseLengthCodedIntNoBigCheck() {
        return this.parseIntNoBigCheck(this.readLengthCodedNumber());
    }

    parseLengthCodedInt(supportBigNumbers) {
        return this.parseInt(this.readLengthCodedNumber(), supportBigNumbers);
    }

    parseLengthCodedIntString() {
        return this.readLengthCodedString("binary");
    }

    parseLengthCodedFloat() {
        return this.parseFloat(this.readLengthCodedNumber());
    }

    peekByte() {
        return this.buffer[this.offset];
    }

    // OxFE is often used as "Alt" flag - not ok, not error.
    // For example, it's first byte of AuthSwitchRequest
    isAlt() {
        return this.peekByte() === 0xfe;
    }

    isError() {
        return this.peekByte() === 0xff;
    }

    asError(encoding) {
        this.reset();

        this.readInt8(); // field count
        const errorCode = this.readInt16();
        let sqlState = "";
        if (this.buffer[this.offset] === 0x23) {
            this.skip(1);
            sqlState = this.readBuffer(5).toString();
        }
        const message = this.readString(undefined, encoding);
        const err = new x.Exception(message);
        err.code = c.error[errorCode];
        err.errno = errorCode;
        err.sqlState = sqlState;
        return err;
    }

    writeInt32(n) {
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
    }

    writeInt24(n) {
        this.writeInt8(n & 0xff);
        this.writeInt16(n >> 8);
    }

    writeInt16(n) {
        this.buffer.writeUInt16LE(n, this.offset);
        this.offset += 2;
    }

    writeInt8(n) {
        this.buffer.writeUInt8(n, this.offset);
        this.offset++;
    }

    writeBuffer(b) {
        b.copy(this.buffer, this.offset);
        this.offset += b.length;
    }

    writeNull() {
        this.buffer[this.offset] = 0xfb;
        this.offset++;
    }

    // TODO: refactor following three?
    writeNullTerminatedString(s, encoding) {
        const buf = __.stringParser.encode(s, encoding);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
        this.writeInt8(0);
    }

    writeString(s, encoding) {
        if (is.null(s)) {
            this.writeInt8(0xfb);
            return;
        }

        if (s.length === 0) {
            return;
        }

        const buf = __.stringParser.encode(s, encoding);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
    }

    writeLengthCodedString(s, encoding) {
        const buf = __.stringParser.encode(s, encoding);
        this.writeLengthCodedNumber(buf.length);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
    }

    writeLengthCodedBuffer(b) {
        this.writeLengthCodedNumber(b.length);
        b.copy(this.buffer, this.offset);
        this.offset += b.length;
    }

    writeLengthCodedNumber(n) {
        if (n < 0xfb) {
            return this.writeInt8(n);
        }

        if (n < 0xffff) {
            this.writeInt8(0xfc);
            return this.writeInt16(n);
        }

        if (n < 0xffffff) {
            this.writeInt8(0xfd);
            return this.writeInt24(n);
        }

        if (is.null(n)) {
            return this.writeInt8(0xfb);
        }

        // TODO: check that n is out of int precision
        this.writeInt8(0xfe);
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
        this.buffer.writeUInt32LE(n >> 32, this.offset);
        this.offset += 4;
        return this.offset;
    }

    writeHeader(sequenceId) {
        const offset = this.offset;
        this.offset = 0;
        this.writeInt24(this.buffer.length - 4);
        this.writeInt8(sequenceId);
        this.offset = offset;
    }

    clone() {
        return new Packet(this.sequenceId, this.buffer, this.start, this.end);
    }

    type() {
        if (this.isEOF()) {
            return "EOF";
        }

        if (this.isError()) {
            return "Error";
        }

        if (this.buffer[this.offset] === 0) {
            return "maybeOK"; // could be other packet types as well
        }

        return "";
    }

    static lengthCodedNumberLength(n) {
        if (n < 0xfb) {
            return 1;
        }

        if (n < 0xffff) {
            return 3;
        }

        if (n < 0xffffff) {
            return 5;
        }

        return 9;
    }

    static lengthCodedStringLength(str, encoding) {
        const buf = __.stringParser.encode(str, encoding);
        const slen = buf.length;
        return Packet.lengthCodedNumberLength(slen) + slen;
    }

    static mockBuffer() {
        const res = Buffer.alloc(0);
        for (const op in Buffer.prototype) {
            if (is.function(res[op])) {
                res[op] = noop;
            }
        }
        return res;
    }
}
