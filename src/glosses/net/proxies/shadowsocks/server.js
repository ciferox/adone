const { EventEmitter, util: { memcpy }, x, is } = adone;

const STATE_IV = 0;
const STATE_HEADER_TYPE = 1;
const STATE_HEADER_ADDRESS = 2;
const STATE_HEADER_PORT = 3;

export class Parser extends EventEmitter {
    constructor(stream, { ivLength, getDecipher }) {
        super();
        this._stream = stream;
        this._listening = false;
        this._state = STATE_IV;
        this.__onData = (chunk) => this._onData(chunk);
        this._iv = Buffer.alloc(ivLength);
        this._ivLen = 0;
        this._decipher = null;
        this._getDecipher = getDecipher;

        // header
        this._port = null;
        this._portLen = 0;
        this._address = null;
        this._addressLen = 0;
        this.start();
    }

    _onData(chunk) {
        let i = 0;
        const len = chunk.length;
        if (this._decipher) {
            chunk = this._decipher.update(chunk);
        }
        while (i < len) {
            switch (this._state) {
                case STATE_IV: {
                    const left = this._iv.length - this._ivLen;
                    const chunkLeft = chunk.length - i;
                    const minLength = Math.min(left, chunkLeft);
                    memcpy.utou(this._iv, this._ivLen, chunk, i, i + minLength);
                    this._ivLen += minLength;
                    i += minLength;
                    if (this._ivLen === this._iv.length) {
                        this._decipher = this._getDecipher(this._iv);
                        if (i !== chunk.length) {
                            chunk = this._decipher.update(chunk.slice(i));
                            i = 0;
                        }
                        this._state = STATE_HEADER_TYPE;
                    }
                    break;
                }
                case STATE_HEADER_TYPE: {
                    const type = chunk[i++];
                    this._type = type & 0x0F;
                    switch (this._type) {
                        case 0x01: {
                            // IPv4 address
                            this._address = Buffer.alloc(4);
                            break;
                        }
                        case 0x03: {
                            // variable length string, the first byte of the address is the length
                            break;
                        }
                        case 0x04: {
                            // IPv6 address
                            this._addressLen = Buffer.alloc(16);
                            break;
                        }
                        default: {
                            // unknown address type
                            this.stop();
                            this.emit("error", new x.IllegalState(`Unknown request type: ${type & 0x0F}`));
                            return;
                        }
                    }
                    this._state = STATE_HEADER_ADDRESS;
                    break;
                }
                case STATE_HEADER_ADDRESS: {
                    if (!this._address) {
                        // variable length string, the first byte is the length
                        const len = chunk[i++];
                        this._address = Buffer.alloc(len);
                    }
                    if (i === chunk.length) {
                        // no more data
                        break;
                    }
                    const left = this._address.length - this._addressLen;
                    const chunkLeft = chunk.length - i;
                    const minLength = Math.min(left, chunkLeft);
                    memcpy.utou(this._address, this._addressLen, chunk, i, i + minLength);
                    this._addressLen += minLength;
                    i += minLength;
                    if (this._addressLen === this._address.length) {
                        this._state = STATE_HEADER_PORT;
                    }
                    break;
                }
                case STATE_HEADER_PORT: {
                    // 2 byte big-endian unsigned int
                    this._port = chunk[i++] << 8;
                    if (i === chunk.length) {
                        // no more data
                        break;
                    }
                    this._port |= chunk[i++];
                    this.stop();
                    this.emit("request", {
                        dstAddr: this._addressFromBuffer(this._address),
                        dstPort: this._port,
                        srcAddr: null,
                        srcPort: null
                    }, chunk.slice(i));
                    return;
                }
            }
        }
    }

    _addressFromBuffer(address) {
        switch (this._type) {
            case 0x01: {
                return `${address[0]}.${address[1]}.${address[2]}.${address[3]}`;
            }
            case 0x03: {
                return address.toString();
            }
            case 0x04: {
                return adone.net.address.IP6.fromHex(address.toString("hex")).toString();
            }
        }
    }

    start() {
        if (this._listening) {
            return;
        }
        this._listening = true;
        this._stream.on("data", this.__onData);
        this._stream.resume();
    }

    stop() {
        if (!this._listening) {
            return;
        }
        this._listening = false;
        this._stream.removeListener("data", this.__onData);
        this._stream.pause();
    }
}

const ciphers = {
    "aes-128-cfb": { key: 16, iv: 16 },
    "aes-192-cfb": { key: 24, iv: 16 },
    "aes-256-cfb": { key: 32, iv: 16 },
    "bf-cfb": { key: 16, iv: 8 },
    "camellia-128-cfb": { key: 16, iv: 16 },
    "camellia-192-cfb": { key: 24, iv: 16 },
    "camellia-256-cfb": { key: 32, iv: 16 },
    "cast5-cfb": { key: 16, iv: 8 },
    "des-cfb": { key: 8, iv: 8 },
    "rc2-cfb": { key: 16, iv: 8 },
    "seed-cfb": { key: 16, iv: 16 }
};

export class Server extends EventEmitter {
    constructor({
        password = null,
        cipher = "aes-256-cfb",
        iv = null,
        timeout = 30000
    } = {}) {
        if (!(is.string(password) || is.buffer(password)) || password.length === 0) {
            throw new x.InvalidArgument("Password must be a non-empty string/buffer");
        }
        if (!ciphers[cipher]) {
            throw new x.InvalidArgument("Unknown cipher");
        }
        if (!is.null(iv) && (!(is.string(iv) || is.buffer(iv)) || iv.lentgh === 0)) {
            throw new x.InvalidArgument("IV must be a non-empty string/buffer");
        }
        super();

        this.cipher = cipher;
        ({ key: this.keyLength, iv: this.ivLength } = ciphers[cipher]);
        this.cipherKey = adone.crypto.EVPBytesToKey(password, this.keyLength, this.ivLength).key;
        if (iv && iv.length !== this.ivLength) {
            throw new x.InvalidArgument(`Invalid iv length (${iv.length} != ${this.ivLength})`);
        }
        this.iv = iv;
        this.server = new adone.std.net.Server((socket) => {
            this._onConnection(socket);
        });
        this.timeout = timeout;
    }

    _onConnection(socket) {
        let decipher = null;
        let cipher = null;
        if (this.timeout) {
            socket.setTimeout(this.timeout, () => socket.end());
        }
        const parser = new Parser(socket, {
            ivLength: this.ivLength,
            getDecipher: (iv) => {
                decipher = adone.std.crypto.createDecipheriv(this.cipher, this.cipherKey, iv);
                return decipher;
            }
        });
        parser.on("error", () => {
            if (socket.writable) {
                socket.end();
            }
        }).on("request", (request, head) => {
            request.srcAddr = socket.remoteAddress;
            request.srcPort = socket.remotePort;

            const accept = (intercept) => {
                if (intercept) {
                    const iv = this.iv || adone.std.crypto.randomBytes(16);
                    cipher = adone.std.crypto.createCipheriv(this.cipher, this.cipherKey, iv);
                    socket.write(iv);
                    return { socket, cipher, decipher, head, iv };
                }
                const remoteSocket = adone.std.net.connect(request.dstPort, request.dstAddr);
                if (this.timeout) {
                    remoteSocket.setTimeout(this.timeout, () => remoteSocket.end());
                }
                remoteSocket
                    .once("error", (err) => {
                        this.emit("error-remote", err);
                        if (socket.writable) {
                            socket.end();
                        }
                    })
                    .once("connect", () => {
                        if (socket.writable) {
                            const iv = this.iv || adone.std.crypto.randomBytes(16);
                            cipher = adone.std.crypto.createCipheriv(this.cipher, this.cipherKey, iv);
                            socket.write(iv);
                            remoteSocket.pipe(cipher).pipe(socket).pipe(decipher).pipe(remoteSocket);
                            socket.resume();
                            remoteSocket.write(head);
                        } else if (remoteSocket.writable) {
                            remoteSocket.end();
                        }
                    });
                socket.remoteSocket = remoteSocket;
            };

            const deny = () => {
                if (socket.writable) {
                    socket.end();
                }
            };

            this.emit("connection", request, accept, deny);
        });
        socket
            .once("error", (err) => {
                this.emit("error-local", err);
            })
            .once("close", () => {
                if (socket.remoteSocket && socket.remoteSocket.writable) {
                    socket.remoteSocket.end();
                }
            });
    }

    listen(...args) {
        return this.server.listen(...args);
    }
}
