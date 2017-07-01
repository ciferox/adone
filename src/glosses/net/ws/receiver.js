const GET_INFO = 0;
const GET_PAYLOAD_LENGTH_16 = 1;
const GET_PAYLOAD_LENGTH_64 = 2;
const GET_MASK = 3;
const GET_DATA = 4;
const INFLATING = 5;

const toBuffer = (fragments, messageLength) => {
    if (fragments.length === 1) {
        return fragments[0];
    }
    if (fragments.length > 1) {
        return adone.util.buffer.concat(fragments, messageLength);
    }
    return adone.emptyBuffer;
};

const toArrayBuffer = (buf) => {
    if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
    }

    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};


export default class Receiver {
    constructor(extensions, maxPayload, binaryType) {
        this._binaryType = binaryType || adone.net.ws.constants.BINARY_TYPES[0];
        this._extensions = extensions || {};
        this._maxPayload = maxPayload | 0;

        this._bufferedBytes = 0;
        this._buffers = [];

        this._compressed = false;
        this._payloadLength = 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._mask = null;
        this._opcode = 0;

        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];

        this._cleanupCallback = null;
        this._hadError = false;
        this._dead = false;
        this._loop = false;

        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.onping = null;
        this.onpong = null;

        this._state = GET_INFO;
    }

    readBuffer(bytes) {
        let offset = 0;
        let dst;
        let l;

        this._bufferedBytes -= bytes;

        if (bytes === this._buffers[0].length) {
            return this._buffers.shift();
        }

        if (bytes < this._buffers[0].length) {
            dst = this._buffers[0].slice(0, bytes);
            this._buffers[0] = this._buffers[0].slice(bytes);
            return dst;
        }

        dst = Buffer.alloc(bytes);

        while (bytes > 0) {
            l = this._buffers[0].length;

            if (bytes >= l) {
                this._buffers[0].copy(dst, offset);
                offset += l;
                this._buffers.shift();
            } else {
                this._buffers[0].copy(dst, offset, 0, bytes);
                this._buffers[0] = this._buffers[0].slice(bytes);
            }

            bytes -= l;
        }

        return dst;
    }

    hasBufferedBytes(n) {
        if (this._bufferedBytes >= n) {
            return true;
        }

        this._loop = false;
        if (this._dead) {
            this.cleanup(this._cleanupCallback);
        }
        return false;
    }

    add(data) {
        if (this._dead) {
            return;
        }

        this._bufferedBytes += data.length;
        this._buffers.push(data);
        this.startLoop();
    }

    startLoop() {
        this._loop = true;

        while (this._loop) {
            switch (this._state) {
                case GET_INFO:
                    this.getInfo();
                    break;
                case GET_PAYLOAD_LENGTH_16:
                    this.getPayloadLength16();
                    break;
                case GET_PAYLOAD_LENGTH_64:
                    this.getPayloadLength64();
                    break;
                case GET_MASK:
                    this.getMask();
                    break;
                case GET_DATA:
                    this.getData();
                    break;
                default: // `INFLATING`
                    this._loop = false;
            }
        }
    }

    getInfo() {
        if (!this.hasBufferedBytes(2)) {
            return;
        }

        const buf = this.readBuffer(2);

        if ((buf[0] & 0x30) !== 0x00) {
            this.error(new Error("RSV2 and RSV3 must be clear"), 1002);
            return;
        }

        const compressed = (buf[0] & 0x40) === 0x40;

        if (compressed && !this._extensions[adone.net.ws.PerMessageDeflate.extensionName]) {
            this.error(new Error("RSV1 must be clear"), 1002);
            return;
        }

        this._fin = (buf[0] & 0x80) === 0x80;
        this._opcode = buf[0] & 0x0f;
        this._payloadLength = buf[1] & 0x7f;

        if (this._opcode === 0x00) {
            if (compressed) {
                this.error(new Error("RSV1 must be clear"), 1002);
                return;
            }

            if (!this._fragmented) {
                this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
                return;
            }
            this._opcode = this._fragmented;

        } else if (this._opcode === 0x01 || this._opcode === 0x02) {
            if (this._fragmented) {
                this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
                return;
            }

            this._compressed = compressed;
        } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
            if (!this._fin) {
                this.error(new Error("FIN must be set"), 1002);
                return;
            }

            if (compressed) {
                this.error(new Error("RSV1 must be clear"), 1002);
                return;
            }

            if (this._payloadLength > 0x7d) {
                this.error(new Error("invalid payload length"), 1002);
                return;
            }
        } else {
            this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
            return;
        }

        if (!this._fin && !this._fragmented) {
            this._fragmented = this._opcode;
        }

        this._masked = (buf[1] & 0x80) === 0x80;

        if (this._payloadLength === 126) {
            this._state = GET_PAYLOAD_LENGTH_16;
        } else if (this._payloadLength === 127) {
            this._state = GET_PAYLOAD_LENGTH_64;
        } else {
            this.haveLength();
        }
    }

    getPayloadLength16() {
        if (!this.hasBufferedBytes(2)) {
            return;
        }

        this._payloadLength = this.readBuffer(2).readUInt16BE(0, true);
        this.haveLength();
    }

    getPayloadLength64() {
        if (!this.hasBufferedBytes(8)) {
            return;
        }

        const buf = this.readBuffer(8);
        const num = buf.readUInt32BE(0, true);

        //
        // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
        // if payload length is greater than this number.
        //
        if (num > Math.pow(2, 53 - 32) - 1) {
            this.error(new Error("max payload size exceeded"), 1009);
            return;
        }

        this._payloadLength = (num * Math.pow(2, 32)) + buf.readUInt32BE(4, true);
        this.haveLength();
    }

    haveLength() {
        if (this._opcode < 0x08 && this.maxPayloadExceeded(this._payloadLength)) {
            return;
        }

        if (this._masked) {
            this._state = GET_MASK;
        } else {
            this._state = GET_DATA;
        }
    }

    getMask() {
        if (!this.hasBufferedBytes(4)) {
            return;
        }

        this._mask = this.readBuffer(4);
        this._state = GET_DATA;
    }

    getData() {
        let data = adone.emptyBuffer;

        if (this._payloadLength) {
            if (!this.hasBufferedBytes(this._payloadLength)) {
                return;
            }

            data = this.readBuffer(this._payloadLength);
            if (this._masked) {
                adone.util.buffer.unmask(data, this._mask);
            }
        }

        if (this._opcode > 0x07) {
            this.controlMessage(data);
        } else if (this._compressed) {
            this._state = INFLATING;
            this.decompress(data);
        } else if (this.pushFragment(data)) {
            this.dataMessage();
        }
    }

    decompress(data) {
        const extension = this._extensions[adone.net.ws.PerMessageDeflate.extensionName];

        extension.decompress(data, this._fin, (err, buf) => {
            if (err) {
                this.error(err, err.closeCode === 1009 ? 1009 : 1007);
                return;
            }

            if (this.pushFragment(buf)) {
                this.dataMessage();
            }
            this.startLoop();
        });
    }

    dataMessage() {
        if (this._fin) {
            const messageLength = this._messageLength;
            const fragments = this._fragments;

            this._totalPayloadLength = 0;
            this._messageLength = 0;
            this._fragmented = 0;
            this._fragments = [];

            if (this._opcode === 2) {
                let data;

                if (this._binaryType === "nodebuffer") {
                    data = toBuffer(fragments, messageLength);
                } else if (this._binaryType === "arraybuffer") {
                    data = toArrayBuffer(toBuffer(fragments, messageLength));
                } else {
                    data = fragments;
                }

                this.onmessage(data);
            } else {
                const buf = toBuffer(fragments, messageLength);

                if (!adone.is.validUTF8(buf)) {
                    this.error(new Error("invalid utf8 sequence"), 1007);
                    return;
                }

                this.onmessage(buf.toString());
            }
        }

        this._state = GET_INFO;
    }

    controlMessage(data) {
        if (this._opcode === 0x08) {
            if (data.length === 0) {
                this.onclose(1000, "");
                this._loop = false;
                this.cleanup(this._cleanupCallback);
            } else if (data.length === 1) {
                this.error(new Error("invalid payload length"), 1002);
            } else {
                const code = data.readUInt16BE(0, true);

                if (!adone.net.ws.errorCodes.isValidErrorCode(code)) {
                    this.error(new Error(`invalid status code: ${code}`), 1002);
                    return;
                }

                const buf = data.slice(2);

                if (!adone.is.validUTF8(buf)) {
                    this.error(new Error("invalid utf8 sequence"), 1007);
                    return;
                }

                this.onclose(code, buf.toString());
                this._loop = false;
                this.cleanup(this._cleanupCallback);
            }

            return;
        }

        if (this._opcode === 0x09) {
            this.onping(data);
        } else {
            this.onpong(data);
        }

        this._state = GET_INFO;
    }

    error(err, code) {
        this.onerror(err, code);
        this._hadError = true;
        this._loop = false;
        this.cleanup(this._cleanupCallback);
    }

    maxPayloadExceeded(length) {
        if (length === 0 || this._maxPayload < 1) {
            return false;
        }

        const fullLength = this._totalPayloadLength + length;

        if (fullLength <= this._maxPayload) {
            this._totalPayloadLength = fullLength;
            return false;
        }

        this.error(new Error("max payload size exceeded"), 1009);
        return true;
    }

    pushFragment(fragment) {
        if (fragment.length === 0) {
            return true;
        }

        const totalLength = this._messageLength + fragment.length;

        if (this._maxPayload < 1 || totalLength <= this._maxPayload) {
            this._messageLength = totalLength;
            this._fragments.push(fragment);
            return true;
        }

        this.error(new Error("max payload size exceeded"), 1009);
        return false;
    }

    cleanup(cb) {
        this._dead = true;

        if (!this._hadError && (this._loop || this._state === INFLATING)) {
            this._cleanupCallback = cb;
        } else {
            this._extensions = null;
            this._fragments = null;
            this._buffers = null;
            this._mask = null;

            this._cleanupCallback = null;
            this.onmessage = null;
            this.onclose = null;
            this.onerror = null;
            this.onping = null;
            this.onpong = null;

            if (cb) {
                cb();
            }
        }
    }
}
