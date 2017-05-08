const { is } = adone;
const { REP, CMD, ATYP } = adone.net.proxy.socks.consts;

const STATE_VERSION = 0;
const STATE_NMETHODS = 1;
const STATE_METHODS = 2;
const STATE_REQ_CMD = 3;
const STATE_REQ_RSV = 4;
const STATE_REQ_ATYP = 5;
const STATE_REQ_DSTADDR = 6;
const STATE_REQ_DSTADDR_VARLEN = 7;
const STATE_REQ_DSTPORT = 8;

const BUF_AUTH_NO_ACCEPT = new Buffer([0x05, 0xFF]);
const BUF_REP_INTR_SUCCESS = new Buffer([0x05,
    REP.SUCCESS,
    0x00,
    0x01,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00]);
const BUF_REP_DISALLOW = new Buffer([0x05, REP.DISALLOW]);
const BUF_REP_CMDUNSUPP = new Buffer([0x05, REP.CMDUNSUPP]);

export class Parser extends adone.EventEmitter {
    constructor(stream) {
        super();

        this._stream = stream;
        this._listening = false;
        this.__onData = (chunk) => {
            this._onData(chunk);
        };

        this._state = STATE_VERSION;
        this._methods = undefined;
        this._methodsp = 0;
        this._cmd = 0;
        this._atyp = 0;
        this._dstaddr = undefined;
        this._dstaddrp = 0;
        this._dstport = undefined;

        this.authed = false;

        this.start();
    }

    _onData(chunk) {
        let state = this._state;
        let i = 0;
        const len = chunk.length;
        let left;
        let chunkLeft;
        let minLen;

        while (i < len) {
            switch (state) {
                /*
                +----+----------+----------+
                |VER | NMETHODS | METHODS  |
                +----+----------+----------+
                | 1  |    1     | 1 to 255 |
                +----+----------+----------+
                */
                case STATE_VERSION:
                    if (chunk[i] !== 0x05) {
                        this.emit("error",
                            new Error(`Incompatible SOCKS protocol version: ${
                                chunk[i]}`));
                        return;
                    }
                    ++i;
                    if (this.authed) {
                        state = STATE_REQ_CMD;
                    } else {
                        ++state;
                    }
                    break;
                case STATE_NMETHODS: {
                    const nmethods = chunk[i];
                    if (nmethods === 0) {
                        this.emit("error", new Error("Unexpected empty methods list"));
                        return;
                    }
                    ++i;
                    ++state;
                    this._methods = new Buffer(nmethods);
                    this._methodsp = 0;
                    break;
                }
                case STATE_METHODS:
                    left = this._methods.length - this._methodsp;
                    chunkLeft = len - i;
                    minLen = (left < chunkLeft ? left : chunkLeft);
                    chunk.copy(this._methods,
                        this._methodsp,
                        i,
                        i + minLen);
                    this._methodsp += minLen;
                    i += minLen;
                    if (this._methodsp === this._methods.length) {
                        this.stop();
                        this._state = STATE_VERSION;
                        if (i < len) {
                            this._stream.unshift(chunk.slice(i));
                        }
                        const methods = this._methods;
                        this._methods = undefined;
                        this.emit("methods", methods);
                        return;
                    }
                    break;
                // =======================================================================
                /*
                +----+-----+-------+------+----------+----------+
                |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
                +----+-----+-------+------+----------+----------+
                | 1  |  1  | X'00' |  1   | Variable |    2     |
                +----+-----+-------+------+----------+----------+

                Where:

                        o  VER    protocol version: X'05'
                        o  CMD
                        o  CONNECT X'01'
                        o  BIND X'02'
                        o  UDP ASSOCIATE X'03'
                        o  RSV    RESERVED
                        o  ATYP   address type of following address
                        o  IP V4 address: X'01'
                        o  DOMAINNAME: X'03'
                        o  IP V6 address: X'04'
                        o  DST.ADDR       desired destination address
                        o  DST.PORT desired destination port in network octet
                        order
                */
                case STATE_REQ_CMD: {
                    const cmd = chunk[i];
                    if (cmd === CMD.CONNECT) {
                        this._cmd = "connect";
                    } else if (cmd === CMD.BIND) {
                        this._cmd = "bind";
                    } else if (cmd === CMD.UDP) {
                        this._cmd = "udp";
                    } else {
                        this.stop();
                        this.emit("error", new Error(`Invalid request command: ${cmd}`));
                        return;
                    }
                    ++i;
                    ++state;
                    break;
                }
                case STATE_REQ_RSV:
                    ++i;
                    ++state;
                    break;
                case STATE_REQ_ATYP: {
                    const atyp = chunk[i];
                    state = STATE_REQ_DSTADDR;
                    if (atyp === ATYP.IPv4) {
                        this._dstaddr = new Buffer(4);
                    } else if (atyp === ATYP.IPv6) {
                        this._dstaddr = new Buffer(16);
                    } else if (atyp === ATYP.NAME) {
                        state = STATE_REQ_DSTADDR_VARLEN;
                    } else {
                        this.stop();
                        this.emit("error",
                            new Error(`Invalid request address type: ${atyp}`));
                        return;
                    }
                    this._atyp = atyp;
                    ++i;
                    break;
                }
                case STATE_REQ_DSTADDR:
                    left = this._dstaddr.length - this._dstaddrp;
                    chunkLeft = len - i;
                    minLen = (left < chunkLeft ? left : chunkLeft);
                    chunk.copy(this._dstaddr,
                        this._dstaddrp,
                        i,
                        i + minLen);
                    this._dstaddrp += minLen;
                    i += minLen;
                    if (this._dstaddrp === this._dstaddr.length) {
                        state = STATE_REQ_DSTPORT;
                    }
                    break;
                case STATE_REQ_DSTADDR_VARLEN:
                    this._dstaddr = new Buffer(chunk[i]);
                    state = STATE_REQ_DSTADDR;
                    ++i;
                    break;
                case STATE_REQ_DSTPORT:
                    if (this._dstport === undefined) {
                        this._dstport = chunk[i];
                    } else {
                        this._dstport <<= 8;
                        this._dstport += chunk[i];
                        ++i;

                        this.stop();
                        if (i < len) {
                            this._stream.unshift(chunk.slice(i));
                        }

                        if (this._atyp === ATYP.IPv4) {
                            this._dstaddr = Array.prototype.join.call(this._dstaddr, ".");
                        } else if (this._atyp === ATYP.IPv6) {
                            let ipv6str = "";
                            const addr = this._dstaddr;
                            for (let b = 0; b < 16; ++b) {
                                if (b % 2 === 0 && b > 0) {
                                    ipv6str += ":";
                                }
                                ipv6str += (addr[b] < 16 ? "0" : "") + addr[b].toString(16);
                            }
                            this._dstaddr = ipv6str;
                        } else {
                            this._dstaddr = this._dstaddr.toString();
                        }

                        this.emit("request", {
                            cmd: this._cmd,
                            srcAddr: undefined,
                            srcPort: undefined,
                            dstAddr: this._dstaddr,
                            dstPort: this._dstport
                        });
                        return;
                    }
                    ++i;
                    break;
                // ===================================================================
            }
        }

        this._state = state;
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

const handleProxyError = (socket, err) => {
    if (socket.writable) {
        const errbuf = new Buffer([0x05, REP.GENFAIL]);
        if (err.code) {
            switch (err.code) {
                case "ENOENT":
                case "ENOTFOUND":
                case "ETIMEDOUT":
                case "EHOSTUNREACH":
                    errbuf[1] = REP.HOSTUNREACH;
                    break;
                case "ENETUNREACH":
                    errbuf[1] = REP.NETUNREACH;
                    break;
                case "ECONNREFUSED":
                    errbuf[1] = REP.CONNREFUSED;
                    break;
            }
        }
        socket.end(errbuf);
    }
};

const proxySocket = (socket, req) => {
    adone.std.dns.lookup(req.dstAddr, (err, dstIP) => {
        if (err) {
            handleProxyError(socket, err);
            return;
        }

        const dstSock = new adone.std.net.Socket();
        let connected = false;

        const onError = (err) => {
            if (!connected) {
                handleProxyError(socket, err);
            }
        };

        dstSock.setKeepAlive(false);
        dstSock.on("error", onError)
            .on("connect", () => {
                connected = true;
                if (socket.writable) {
                    const localbytes = adone.net.proxy.socks.ipbytes(dstSock.localAddress || "127.0.0.1");
                    const len = localbytes.length;
                    const bufrep = new Buffer(6 + len);
                    let p = 4;
                    bufrep[0] = 0x05;
                    bufrep[1] = REP.SUCCESS;
                    bufrep[2] = 0x00;
                    bufrep[3] = (len === 4 ? ATYP.IPv4 : ATYP.IPv6);
                    for (let i = 0; i < len; ++i, ++p) {
                        bufrep[p] = localbytes[i];
                    }
                    bufrep.writeUInt16BE(dstSock.localPort, p, true);

                    socket.write(bufrep);
                    socket.pipe(dstSock).pipe(socket);
                    socket.resume();
                } else if (dstSock.writable) {
                    dstSock.end();
                }
            })
            .connect(req.dstPort, dstIP);
        socket.dstSock = dstSock;
    });
};

export default class Server extends adone.EventEmitter {
    constructor(options = {}, listener) {
        super();
        if (is.function(options)) {
            [options, listener] = [{}, options];
            this.on("connection", listener);
        } else if (is.function(listener)) {
            this.on("connection", listener);
        }

        this._sockets = [];

        this.server = new adone.std.net.Server((socket) => {
            if (this._connections >= this.maxConnections) {
                socket.destroy();
                return;
            }
            ++this._connections;
            socket.once("close", (/*err*/) => {
                --this._connections;
            });
            this._onConnection(socket);
        }).on("error", (err) => {
            this.emit("error", err);
        }).on("listening", () => {
            this.emit("listening");
        }).on("close", () => {
            this.emit("close");
        });
        this._auths = [];
        if (is.array(options.auths)) {
            for (let i = 0, len = options.auths.length; i < len; ++i) {
                this.useAuth(options.auths[i]);
            }
        }

        this._connections = 0;
        this.maxConnections = Infinity;
    }

    _onConnection(socket) {
        const parser = new Parser(socket);
        parser.on("error", (/*err*/) => {
            if (socket.writable) {
                socket.end();
            }
        }).on("methods", (methods) => {
            const auths = this._auths;
            for (let a = 0, alen = auths.length; a < alen; ++a) {
                for (let m = 0, mlen = methods.length; m < mlen; ++m) {
                    if (methods[m] === auths[a].METHOD) {
                        auths[a].server(socket, (result) => {
                            if (result === true) {
                                parser.authed = true;
                                parser.start();
                            } else {
                                socket.end();
                            }
                        });
                        socket.write(new Buffer([0x05, auths[a].METHOD]));
                        socket.resume();
                        return;
                    }
                }
            }
            socket.end(BUF_AUTH_NO_ACCEPT);
        }).on("request", (reqInfo) => {
            if (reqInfo.cmd !== "connect") {
                return socket.end(BUF_REP_CMDUNSUPP);
            }

            reqInfo.srcAddr = socket.remoteAddress;
            reqInfo.srcPort = socket.remotePort;

            let handled = false;

            const accept = (intercept) => {
                if (handled) {
                    return;
                }
                handled = true;
                if (socket.writable) {
                    if (intercept) {
                        socket.write(BUF_REP_INTR_SUCCESS);
                        socket.removeListener("error", adone.noop);
                        return socket;
                    }
                    proxySocket(socket, reqInfo);
                }
            };

            const deny = () => {
                if (handled) {
                    return;
                }
                handled = true;
                if (socket.writable) {
                    socket.end(BUF_REP_DISALLOW);
                }
            };

            if (this.listenerCount("connection") > 0) {
                this.emit("connection", reqInfo, accept, deny);
                return;
            }

            proxySocket(socket, reqInfo);
        });

        const onClose = () => {
            if (socket.dstSock && socket.dstSock.writable) {
                socket.dstSock.end();
            }
            socket.dstSock = undefined;
        };

        socket.on("error", adone.noop)
            .on("end", onClose)
            .on("close", onClose);
    }

    useAuth(auth) {
        if (!is.object(auth) || !is.function(auth.server) || auth.server.length !== 2) {
            throw new Error("Invalid authentication handler");
        } else if (this._auths.length >= 255) {
            throw new Error("Too many authentication handlers (limited to 255).");
        }

        this._auths.push(auth);

        return this;
    }

    listen(...args) {
        this.server.listen.apply(this.server, args);
        return this;
    }

    address() {
        return this.server.address();
    }

    getConnections(cb) {
        this.server.getConnections(cb);
    }

    close(cb) {
        this.server.close(cb);
        return this;
    }

    ref() {
        this.server.ref();
    }

    unref() {
        this.server.unref();
    }
}
