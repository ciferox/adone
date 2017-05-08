const { EventEmitter, util: { memcpy }, x, is, net: { proxy: { shadowsocks } } } = adone;

export class Parser extends EventEmitter {
    constructor(stream, { ivLength, getDecipher }) {
        super();
        this._stream = stream;
        this._listening = false;
        this._state = Parser.STATE_IV;
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
        let len = chunk.length;
        if (this._decipher) {
            chunk = this._decipher.update(chunk);
        }
        while (i < len) {
            switch (this._state) {
                case Parser.STATE_IV: {
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
                            len = chunk.length;
                            i = 0;
                        }
                        this._state = Parser.STATE_HEADER_TYPE;
                    }
                    break;
                }
                case Parser.STATE_HEADER_TYPE: {
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
                            this._address = Buffer.alloc(16);
                            break;
                        }
                        default: {
                            // unknown address type
                            this.stop();
                            this._state = Parser.STATE_ERROR;
                            this.emit("error", new x.IllegalState(`Unknown request type: ${type & 0x0F}`));
                            return;
                        }
                    }
                    this._state = Parser.STATE_HEADER_ADDRESS;
                    break;
                }
                case Parser.STATE_HEADER_ADDRESS: {
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
                        this._state = Parser.STATE_HEADER_PORT;
                    }
                    break;
                }
                case Parser.STATE_HEADER_PORT: {
                    // 2 byte big-endian unsigned int
                    if (is.null(this._port)) {
                        this._port = chunk[i++] << 8;
                        if (i === chunk.length) {
                            // no more data
                            break;
                        }
                    }
                    this._port |= chunk[i++];
                    this.stop();
                    this._state = Parser.STATE_DONE;
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
                return adone.net.address.IP6.fromUnsignedByteArray(address).address;
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

Parser.STATE_IV = 0;
Parser.STATE_HEADER_TYPE = 1;
Parser.STATE_HEADER_ADDRESS = 2;
Parser.STATE_HEADER_PORT = 3;
Parser.STATE_DONE = 4;
Parser.STATE_ERROR = 10;

export class Server extends EventEmitter {
    constructor(options, callback) {
        super();
        if (is.function(options)) {
            [options, callback] = [{}, options];
            this.on("connection", callback);
        } else if (is.function(callback)) {
            this.on("connection", callback);
        }
        const {
            password = null,
            cipher = "aes-256-cfb",
            iv = null,
            timeout = 30000
        } = options;
        if (!(is.string(password) || is.buffer(password)) || password.length === 0) {
            throw new x.InvalidArgument("Password must be a non-empty string/buffer");
        }
        if (!shadowsocks.c.ciphers[cipher]) {
            throw new x.InvalidArgument("Unknown cipher");
        }
        if (!is.null(iv) && (!(is.string(iv) || is.buffer(iv)) || iv.lentgh === 0)) {
            throw new x.InvalidArgument("IV must be a non-empty string/buffer");
        }

        this._cipher = cipher;
        ({ key: this._keyLength, iv: this._ivLength } = shadowsocks.c.ciphers[cipher]);
        this.cipherKey = adone.crypto.EVPBytesToKey(password, this._keyLength, this._ivLength).key;
        if (iv && iv.length !== this._ivLength) {
            throw new x.InvalidArgument(`Invalid iv length (${iv.length} != ${this._ivLength})`);
        }
        this._iv = iv;
        this._server = new adone.std.net.Server((socket) => {
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
            ivLength: this._ivLength,
            getDecipher: (decipherIV) => {
                decipher = adone.std.crypto.createDecipheriv(this._cipher, this.cipherKey, decipherIV);
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
                    const cipherIV = this._iv || adone.std.crypto.randomBytes(16);
                    cipher = adone.std.crypto.createCipheriv(this._cipher, this.cipherKey, cipherIV);
                    socket.write(cipherIV);
                    return { socket, cipher, decipher, head };
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
                            const cipherIV = this._iv || adone.std.crypto.randomBytes(16);
                            cipher = adone.std.crypto.createCipheriv(this._cipher, this.cipherKey, cipherIV);
                            socket.write(cipherIV);
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
        return this._server.listen(...args);
    }

    address() {
        return this._server.address();
    }

    close(callback) {
        return this._server.close(callback);
    }
}
