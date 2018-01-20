const { is } = adone;
const { REP, CMD, ATYP } = adone.net.proxy.socks.consts;

const STATE_VERSION = 0;
const STATE_METHOD = 1;
const STATE_REP_STATUS = 2;
const STATE_REP_RSV = 3;
const STATE_REP_ATYP = 4;
const STATE_REP_BNDADDR = 5;
const STATE_REP_BNDADDR_VARLEN = 6;
const STATE_REP_BNDPORT = 7;

const ERRORS = {};
const ERROR_UNKNOWN = ["unknown error", "EUNKNOWN"];
ERRORS[REP.GENFAIL] = ["general SOCKS server failure", "EGENFAIL"];
ERRORS[REP.DISALLOW] = ["connection not allowed by ruleset", "EACCES"];
ERRORS[REP.NETUNREACH] = ["network is unreachable", "ENETUNREACH"];
ERRORS[REP.HOSTUNREACH] = ["host is unreachable", "EHOSTUNREACH"];
ERRORS[REP.CONNREFUSED] = ["connection refused", "ECONNREFUSED"];
ERRORS[REP.TTLEXPIRED] = ["ttl expired", "ETTLEXPIRED"];
ERRORS[REP.CMDUNSUPP] = ["command not supported", "ECMDNOSUPPORT"];
ERRORS[REP.ATYPUNSUPP] = ["address type not supported", "EATYPNOSUPPORT"];

export class Parser extends adone.event.Emitter {
    constructor(stream) {
        super();
        this._stream = stream;
        this._listening = false;
        this.__onData = (chunk) => {
            this._onData(chunk);
        };

        this._state = STATE_VERSION;
        this._atyp = 0;
        this._bndaddr = undefined;
        this._bndaddrp = 0;
        this._bndport = undefined;

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
                +----+--------+
                |VER | METHOD |
                +----+--------+
                | 1  |   1    |
                +----+--------+
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
                        state = STATE_REP_STATUS;
                    } else {
                        ++state;
                    }
                    break;
                case STATE_METHOD: {
                    const method = chunk[i];
                    ++i;
                    this.stop();
                    this._state = STATE_VERSION;
                    if (i < len) {
                        this._stream.unshift(chunk.slice(i));
                    }
                    this.emit("method", method);
                    return;
                }
                // =======================================================================
                /*
                +----+-----+-------+------+----------+----------+
                |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
                +----+-----+-------+------+----------+----------+
                | 1  |  1  | X'00' |  1   | Variable |    2     |
                +----+-----+-------+------+----------+----------+

                Where:

                    o  VER    protocol version: X'05'
                    o  REP    Reply field:
                    o  X'00' succeeded
                    o  X'01' general SOCKS server failure
                    o  X'02' connection not allowed by ruleset
                    o  X'03' Network unreachable
                    o  X'04' Host unreachable
                    o  X'05' Connection refused
                    o  X'06' TTL expired
                    o  X'07' Command not supported
                    o  X'08' Address type not supported
                    o  X'09' to X'FF' unassigned
                    o  RSV    RESERVED
                    o  ATYP   address type of following address
                    o  IP V4 address: X'01'
                    o  DOMAINNAME: X'03'
                    o  IP V6 address: X'04'
                    o  BND.ADDR       server bound address
                    o  BND.PORT       server bound port in network octet order
                */
                case STATE_REP_STATUS: {
                    const status = chunk[i];
                    if (status !== REP.SUCCESS) {
                        const errinfo = ERRORS[status] || ERROR_UNKNOWN;
                        const err = new Error(errinfo[0]);
                        err.code = errinfo[1];

                        this.stop();
                        this.emit("error", err);
                        return;
                    }
                    ++i;
                    ++state;
                    break;
                }
                case STATE_REP_RSV:
                    ++i;
                    ++state;
                    break;
                case STATE_REP_ATYP: {
                    const atyp = chunk[i];
                    state = STATE_REP_BNDADDR;
                    if (atyp === ATYP.IPv4) {
                        this._bndaddr = Buffer.allocUnsafe(4);
                    } else if (atyp === ATYP.IPv6) {
                        this._bndaddr = Buffer.allocUnsafe(16);
                    } else if (atyp === ATYP.NAME) {
                        state = STATE_REP_BNDADDR_VARLEN;
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
                case STATE_REP_BNDADDR:
                    left = this._bndaddr.length - this._bndaddrp;
                    chunkLeft = len - i;
                    minLen = (left < chunkLeft ? left : chunkLeft);
                    chunk.copy(this._bndaddr,
                        this._bndaddrp,
                        i,
                        i + minLen);
                    this._bndaddrp += minLen;
                    i += minLen;
                    if (this._bndaddrp === this._bndaddr.length) {
                        state = STATE_REP_BNDPORT;
                    }
                    break;
                case STATE_REP_BNDADDR_VARLEN:
                    this._bndaddr = Buffer.allocUnsafe(chunk[i]);
                    state = STATE_REP_BNDADDR;
                    ++i;
                    break;
                case STATE_REP_BNDPORT:
                    if (is.undefined(this._bndport)) {
                        this._bndport = chunk[i];
                    } else {
                        this._bndport <<= 8;
                        this._bndport += chunk[i];
                        ++i;

                        this.stop();
                        if (i < len) {
                            this._stream.unshift(chunk.slice(i));
                        }

                        if (this._atyp === ATYP.IPv4) {
                            this._bndaddr = Array.prototype.join.call(this._bndaddr, ".");
                        } else if (this._atyp === ATYP.IPv6) {
                            let ipv6str = "";
                            const addr = this._bndaddr;
                            for (let b = 0; b < 16; ++b) {
                                if (b % 2 === 0 && b > 0) {
                                    ipv6str += ":";
                                }
                                ipv6str += addr[b].toString(16);
                            }
                            this._bndaddr = ipv6str;
                        } else {
                            this._bndaddr = this._bndaddr.toString();
                        }

                        this.emit("reply", {
                            bndAddr: this._bndaddr,
                            bndPort: this._bndport
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

export default class Client extends adone.event.Emitter {
    constructor(options = {}) {
        super();

        this._hadError = false;
        this._ready = false;
        this._sock = new adone.std.net.Socket();
        this._sock.on("connect", () => {
            this._onConnect();
        }).on("error", (err) => {
            if (!this._hadError && !this._ready) {
                this._hadError = true;
                this.emit("error", err);
            }
        }).on("close", (err) => {
            this.emit("close", this._hadError || err);
        });

        this._parser = undefined;

        this._proxyAddr = options.proxyHost;
        this._proxyport = options.proxyPort;

        if (!is.string(this._proxyAddr)) {
            this._proxyAddr = "localhost";
        } else if (!is.number(this._proxyport)) {
            this._proxyport = 1080;
        }

        this._dstaddr = undefined;
        this._dstport = undefined;
        this._localDNS = (options && is.boolean(options.localDNS) ? options.localDNS : true);
        this._strictLocalDNS = (options && is.boolean(options.strictLocalDNS) ? options.strictLocalDNS : true);
        this._auths = [];
        if (options && is.array(options.auths)) {
            for (let i = 0, len = options.auths.length; i < len; ++i) {
                this.useAuth(options.auths[i]);
            }
        }
    }

    _onConnect() {
        const parser = this._parser;
        const socket = this._sock;
        const auths = this._auths;
        let alen = auths.length;
        const authsbuf = Buffer.allocUnsafe(2 + alen);
        authsbuf[0] = 0x05;
        authsbuf[1] = alen;
        for (let a = 0, p = 2; a < alen; ++a, ++p) {
            authsbuf[p] = auths[a].METHOD;
        }
        socket.write(authsbuf);

        parser.on("method", (method) => {
            alen = auths.length;
            for (let i = 0; i < alen; ++i) {
                if (auths[i].METHOD === method) {
                    auths[i].client(socket, (result) => {
                        if (result === true) {
                            parser.authed = true;
                            parser.start();
                            this._sendRequest();
                        } else {
                            this._hadError = true;
                            if (adone.std.util.isError(result)) {
                                this.emit("error", result);
                            } else {
                                const err = new Error("Authentication failed");
                                err.code = "EAUTHFAILED";
                                this.emit("error", err);
                            }
                            socket.end();
                        }
                    });
                    this._sock.resume();
                    return;
                }
            }

            const err = new Error("Authentication method mismatch");
            err.code = "EAUTHNOTSUPPORT";
            this._hadError = true;
            this.emit("error", err);
            socket.end();
        }).on("error", (err) => {
            this._hadError = true;
            this.emit("error", err);
            if (socket.writable) {
                socket.end();
            }
        }).on("reply", () => {
            this._ready = true;
            this.emit("connect", this._sock);
            this._sock.resume();
        });
    }

    _sendRequest() {
        const iptype = adone.std.net.isIP(this._dstaddr);

        const addrlen = (iptype === 0 ? Buffer.byteLength(this._dstaddr) : (iptype === 4 ? 4 : 16));
        const reqbuf = Buffer.allocUnsafe(6 + (iptype === 0 ? 1 : 0) + addrlen);
        let p;
        reqbuf[0] = 0x05;
        reqbuf[1] = CMD.CONNECT;
        reqbuf[2] = 0x00;
        if (iptype > 0) {
            const addrbytes = adone.net.proxy.socks.ipbytes(this._dstaddr);
            reqbuf[3] = (iptype === 4 ? ATYP.IPv4 : ATYP.IPv6);
            p = 4;
            for (let i = 0; i < addrlen; ++i, ++p) {
                reqbuf[p] = addrbytes[i];
            }
        } else {
            reqbuf[3] = ATYP.NAME;
            reqbuf[4] = addrlen;
            reqbuf.write(this._dstaddr, 5, addrlen);
            p = 5 + addrlen;
        }
        reqbuf.writeUInt16BE(this._dstport, p, true);

        this._sock.write(reqbuf);
    }

    useAuth(auth) {
        if (!is.object(auth) || !is.function(auth.client) || auth.client.length !== 2) {
            throw new Error("Invalid authentication handler");
        } else if (this._auths.length >= 255) {
            throw new Error("Too many authentication handlers (limited to 255).");
        }

        this._auths.push(auth);

        return this;
    }

    connect(options, cb) {
        if (this._auths.length === 0) {
            throw new Error("Missing client authentication method(s)");
        }

        const [port, host] = adone.net.util.normalizeAddr(options.port, options.host);

        if (is.function(cb)) {
            this.once("connect", cb);
        }

        this._dstaddr = host;
        this._dstport = port;

        if (is.boolean(options.localDNS)) {
            this._localDNS = options.localDNS;
        }
        if (is.boolean(options.strictLocalDNS)) {
            this._strictLocalDNS = options.strictLocalDNS;
        }
        if (is.string(options.proxyHost)) {
            this._proxyhost = options.proxyHost;
        }
        if (is.string(options.proxyPort)) {
            this._proxyport = options.proxyPort;
        }

        if (this._parser) {
            this._parser.stop();
        }
        this._parser = new Parser(this._sock);

        this._hadError = this._ready = false;

        const realOptions = {
            host: this._proxyhost,
            port: this._proxyport,
            localAddress: options.localAddress // TODO: remove?
        };

        if (adone.std.net.isIP(this._dstaddr) === 0 && this._localDNS) {
            adone.std.dns.lookup(this._dstaddr, (err, addr) => {
                if (err && this._strictLocalDNS) {
                    this._hadError = true;
                    this.emit("error", err);
                    this.emit("close", true);
                    return;
                }
                if (addr) {
                    this._dstaddr = addr;
                }
                this._sock.connect(realOptions);
            });
        } else {
            this._sock.connect(realOptions);
        }

        return this;
    }
}
