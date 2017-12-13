const {
    is,
    x,
    event: { EventEmitter },
    net: { proxy: { shadowsocks } },
    util: { memcpy },
    std: { stream }
} = adone;

class SSocket extends stream.Duplex {
    constructor(socket, writable) {
        super();
        this._realSocket = socket;
        this._writableStream = writable;
        this._readableStream = null;
        this._needRead = false;
        // omg
        this.once("finish", () => {
            this._writableStream.end();
        });
        this.once("end", () => {
            this.emit("close", this._hadError);
        });
        this._hadError = false;
        this._realSocket.once("error", (err) => {
            this._hadError = true;
            this.emit("error", err);
            if (this._readableStream) {
                this._readableStream.end();
            } else {
                this.push(null);
            }
            this.end();
        });
        this.destroyed = false;
    }

    setTimeout(ms, cb) {
        return this._realSocket.setTimeout(ms, cb);
    }

    setNoDelay(enable) {
        return this._realSocket.setNoDelay(enable);
    }

    setKeepAlive(setting, ms) {
        return this._realSocket.setKeepAlive(setting, ms);
    }

    unref() {
        this._realSocket.unref();
    }

    ref() {
        this._realSocket.ref();
    }

    destroySoon() {
        if (this.writable) {
            this.end();
        }

        if (this._writableState.finished) {
            this.destroy();
        } else {
            this.once("finish", this.destroy);
        }
        this._realSocket.destroySoon();
    }

    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this._realSocket.destroy();
        if (this._readableStream) {
            this._readableStream.end();
        } else {
            this.push(null);
        }
        this.end();
    }

    _setReadable(readable) {
        this._readableStream = readable;
        this._readableStream.once("end", () => {
            this.push(null);
        });
        if (this._needRead) {
            this._read();
        }
    }

    _write(chunk, encoding, callback) {
        this._writableStream.write(chunk, encoding, callback);
    }

    _read() {
        if (!this._readableStream) {
            this._needRead = true;
            return;
        }
        this._readableStream.once("readable", () => {
            this.push(this._readableStream.read());
        });
    }
}

export class Parser extends EventEmitter {
    constructor(stream, { ivLength }) {
        super();
        this._stream = stream;
        this._listening = false;
        this.__onData = (chunk) => this._onData(chunk);
        this._iv = Buffer.alloc(ivLength);
        this._ivLen = 0;
        this.start();
    }

    _onData(chunk) {
        const k = Math.min(this._iv.length - this._ivLen, chunk.length);
        memcpy.utou(this._iv, this._ivLen, chunk, 0, k);
        this._ivLen += k;
        if (this._iv.length === this._ivLen) {
            this.stop();
            if (k !== chunk.length) {
                this._stream.unshift(chunk.slice(k));
            }
            this.emit("iv", this._iv);
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

export class Client extends EventEmitter {
    constructor({
        proxyHost = "localhost",
        proxyPort = 8388,
        localDNS = true,
        strictLocalDNS = false,
        cipher = "aes-256-cfb",
        password,
        iv = null
    } = {}) {
        if (!(is.string(password) || is.buffer(password)) || password.length === 0) {
            throw new x.InvalidArgument("Password must be a non-empty string/buffer");
        }
        if (!shadowsocks.c.ciphers[cipher]) {
            throw new x.InvalidArgument("Unknown cipher");
        }
        if (!is.null(iv) && (!(is.string(iv) || is.buffer(iv)) || iv.lentgh === 0)) {
            throw new x.InvalidArgument("IV must be a non-empty string/buffer");
        }
        super();
        this._cipher = cipher;
        ({ key: this._keyLength, iv: this._ivLength } = shadowsocks.c.ciphers[cipher]);
        this._cipherKey = adone.crypto.EVPBytesToKey(password, this._keyLength, this._ivLength).key;
        if (iv && iv.length !== this.ivLength) {
            throw new x.InvalidArgument(`Invalid iv length (${iv.length} != ${this.ivLength})`);
        }
        this._iv = iv;
        this._proxyHost = proxyHost;
        this._proxyPort = proxyPort;
        this._localDNS = localDNS;
        this._stringLocalDNS = strictLocalDNS;

        this._hadError = false;
        this._ready = false;
        this._sock = new adone.std.net.Socket();
        this._sock
            .once("connect", () => {
                this._onConnect();
            })
            .once("error", (err) => {
                if (!this._hadError && !this._ready) {
                    this.emit("error", err);
                }
            })
            .once("close", (hadError) => {
                if (!this._ready) {
                    this.emit("error", new x.Exception("Connection reset by peer"));
                    this._hadError = true;
                }
                this.emit("close", this._hadError || hadError);
            });
        this._dstaddr = null;
        this._dstport = null;
        this._parser = null;
    }

    _onConnect() {
        const { _parser: parser, _sock: socket } = this;
        const cipherIV = this._iv || adone.std.crypto.randomBytes(this._ivLength);
        const cipher = adone.std.crypto.createCipheriv(this._cipher, this._cipherKey, cipherIV);
        socket.write(cipherIV);
        cipher.pipe(socket);
        const header = new adone.collection.ByteArray();
        switch (adone.std.net.isIP(this._dstaddr)) {
            case 4: {
                header.writeUInt8(0x01);
                header.write(Buffer.from(new adone.net.ip.IP4(this._dstaddr).toArray()));
                break;
            }
            case 6: {
                header.writeUInt8(0x04);
                header.write(Buffer.from(new adone.net.ip.IP6(this._dstaddr).toByteArray()));
                break;
            }
            default: {
                header.writeUInt8(0x03);
                header.writeUInt8(this._dstaddr.length);
                header.write(this._dstaddr);
            }
        }
        header.writeUInt16BE(this._dstport);
        cipher.write(header.flip().toBuffer());
        this._ready = true;
        const sssocket = new SSocket(socket, cipher);
        this.emit("connect", sssocket);
        parser.once("iv", (decipherIV) => {
            const decipher = adone.std.crypto.createDecipheriv(this._cipher, this._cipherKey, decipherIV);
            socket.pipe(decipher);
            sssocket._setReadable(decipher);
        });
    }

    connect({ host, port }, callback) {
        this._dstaddr = host;
        this._dstport = port;
        if (is.function(callback)) {
            this.once("connect", callback);
        }
        if (this._parser) {
            this._parser.stop();
        }
        this._hadError = this._ready = false;
        this._parser = new Parser(this._sock, { ivLength: this._ivLength });
        if (this._localDNS && adone.std.net.isIP(this._dstaddr) === 0) {
            adone.std.dns.lookup(this._dstaddr, (err, addr) => {
                if (err && this._stringLocalDNS) {
                    this._hadError = true;
                    this.emit("error", err);
                    this.emit("close", true);
                    return;
                }
                if (addr) {
                    this._dstaddr = addr;
                }
                this._sock.connect(this._proxyPort, this._proxyHost);
            });
        } else {
            this._sock.connect(this._proxyPort, this._proxyHost);
        }
        return this;
    }
}
