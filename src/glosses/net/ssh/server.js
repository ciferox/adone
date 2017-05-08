const { is, net: { ssh: { Channel } } } = adone;
const net = adone.std.net;
const listenerCount = adone.EventEmitter.listenerCount;

import KeepaliveManager from "./keepalivemgr";

const { SSH2Stream, SFTPStream, util } = adone.net.ssh;
const parseKey = util.parseKey;
const genPublicKey = util.genPublicKey;
const decryptKey = util.decryptKey;
const DISCONNECT_REASON = adone.net.ssh.c.DISCONNECT_REASON;
const CHANNEL_OPEN_FAILURE = adone.net.ssh.c.CHANNEL_OPEN_FAILURE;
const ALGORITHMS = adone.net.ssh.c.ALGORITHMS;

const MAX_CHANNEL = Math.pow(2, 32) - 1;
const MAX_PENDING_AUTHS = 10;

let kaMgr;

class Session extends adone.EventEmitter {
    constructor(client, info, localChan) {
        super();
        this.subtype = undefined;

        let ending = false;
        const outgoingId = info.sender;
        let channel;

        const chaninfo = {
            type: "session",
            incoming: {
                id: localChan,
                window: Channel.MAX_WINDOW,
                packetSize: Channel.PACKET_SIZE,
                state: "open"
            },
            outgoing: {
                id: info.sender,
                window: info.window,
                packetSize: info.packetSize,
                state: "open"
            }
        };

        const onREQUEST = (info) => {
            let replied = false;
            let accept;
            let reject;

            if (info.wantReply) {
                // "real session" requests will have custom accept behaviors
                if (info.request !== "shell" && info.request !== "exec" && info.request !== "subsystem") {
                    accept = () => {
                        if (replied || ending || channel) {
                            return;
                        }

                        replied = true;

                        return client._sshstream.channelSuccess(outgoingId);
                    };
                }

                reject = () => {
                    if (replied || ending || channel) {
                        return;
                    }

                    replied = true;

                    return client._sshstream.channelFailure(outgoingId);
                };
            }

            if (ending) {
                reject && reject();
                return;
            }

            switch (info.request) {
                // "pre-real session start" requests
                case "env":
                    if (listenerCount(this, "env")) {
                        this.emit("env", accept, reject, {
                            key: info.key,
                            val: info.val
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                case "pty-req":
                    if (listenerCount(this, "pty")) {
                        this.emit("pty", accept, reject, {
                            cols: info.cols,
                            rows: info.rows,
                            width: info.width,
                            height: info.height,
                            term: info.term,
                            modes: info.modes
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                case "window-change":
                    if (listenerCount(this, "window-change")) {
                        this.emit("window-change", accept, reject, {
                            cols: info.cols,
                            rows: info.rows,
                            width: info.width,
                            height: info.height
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                case "x11-req":
                    if (listenerCount(this, "x11")) {
                        this.emit("x11", accept, reject, {
                            single: info.single,
                            protocol: info.protocol,
                            cookie: info.cookie,
                            screen: info.screen
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                // "post-real session start" requests
                case "signal":
                    if (listenerCount(this, "signal")) {
                        this.emit("signal", accept, reject, {
                            name: info.signal
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                // XXX: is `auth-agent-req@openssh.com` really "post-real session start"?
                case "auth-agent-req@openssh.com":
                    if (listenerCount(this, "auth-agent")) {
                        this.emit("auth-agent", accept, reject);
                    } else {
                        reject && reject();
                    }
                    break;
                // "real session start" requests
                case "shell":
                    if (listenerCount(this, "shell")) {
                        accept = () => {
                            if (replied || ending || channel) {
                                return;
                            }

                            replied = true;

                            if (info.wantReply) {
                                client._sshstream.channelSuccess(outgoingId);
                            }

                            channel = new Channel(chaninfo, client, {
                                server: true
                            });

                            channel.subtype = this.subtype = info.request;

                            return channel;
                        };

                        this.emit("shell", accept, reject);
                    } else {
                        reject && reject();
                    }
                    break;
                case "exec":
                    if (listenerCount(this, "exec")) {
                        accept = () => {
                            if (replied || ending || channel) {
                                return;
                            }

                            replied = true;

                            if (info.wantReply) {
                                client._sshstream.channelSuccess(outgoingId);
                            }

                            channel = new Channel(chaninfo, client, {
                                server: true
                            });

                            channel.subtype = this.subtype = info.request;

                            return channel;
                        };

                        this.emit("exec", accept, reject, {
                            command: info.command
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                case "subsystem":
                    accept = () => {
                        if (replied || ending || channel) {
                            return;
                        }

                        replied = true;

                        if (info.wantReply) {
                            client._sshstream.channelSuccess(outgoingId);
                        }

                        channel = new Channel(chaninfo, client, {
                            server: true
                        });

                        channel.subtype = this.subtype = (`${info.request}:${info.subsystem}`);

                        if (info.subsystem === "sftp") {
                            const sftp = new SFTPStream({
                                server: true,
                                debug: client._sshstream.debug
                            });
                            channel.pipe(sftp).pipe(channel);

                            return sftp;
                        }
                        return channel;
                    };

                    if (info.subsystem === "sftp" && listenerCount(this, "sftp")) {
                        this.emit("sftp", accept, reject);
                    } else if (info.subsystem !== "sftp" && listenerCount(this, "subsystem")) {
                        this.emit("subsystem", accept, reject, {
                            name: info.subsystem
                        });
                    } else {
                        reject && reject();
                    }
                    break;
                default:
                    reject && reject();
            }
        };

        const onEOF = () => {
            ending = true;
            this.emit("eof");
            this.emit("end");
        };

        const onCLOSE = () => {
            ending = true;
            this.emit("close");
        };

        client._sshstream
            .on(`CHANNEL_REQUEST:${localChan}`, onREQUEST)
            .once(`CHANNEL_EOF:${localChan}`, onEOF)
            .once(`CHANNEL_CLOSE:${localChan}`, onCLOSE);
    }
}

class AuthContext extends adone.EventEmitter {
    constructor(stream, username, service, method, cb) {
        super();

        this.username = this.user = username;
        this.service = service;
        this.method = method;
        this._initialResponse = false;
        this._finalResponse = false;
        this._multistep = false;
        this._cbfinal = (allowed, methodsLeft, isPartial) => {
            if (!this._finalResponse) {
                this._finalResponse = true;
                cb(this, allowed, methodsLeft, isPartial);
            }
        };
        this._stream = stream;
    }

    accept() {
        this._cleanup && this._cleanup();
        this._initialResponse = true;
        this._cbfinal(true);
    }

    reject(methodsLeft, isPartial) {
        this._cleanup && this._cleanup();
        this._initialResponse = true;
        this._cbfinal(false, methodsLeft, isPartial);
    }
}

const RE_KBINT_SUBMETHODS = /[ \t\r\n]*,[ \t\r\n]*/g;

class KeyboardAuthContext extends AuthContext {
    constructor(stream, username, service, method, submethods, cb) {
        super(stream, username, service, method, cb);
        this._multistep = true;

        this._cb = undefined;
        this._onInfoResponse = (responses) => {
            if (this._cb) {
                const callback = this._cb;
                this._cb = undefined;
                callback(responses);
            }
        };
        this.submethods = submethods.split(RE_KBINT_SUBMETHODS);
        this.on("abort", () => {
            this._cb && this._cb(new Error("Authentication request aborted"));
        });
    }

    _cleanup() {
        this._stream.removeListener("USERAUTH_INFO_RESPONSE", this._onInfoResponse);
    }

    prompt(prompts, title, instructions, cb) {
        if (!is.array(prompts)) {
            prompts = [prompts];
        }

        if (is.function(title)) {
            cb = title;
            title = instructions = undefined;
        } else if (is.function(instructions)) {
            cb = instructions;
            instructions = undefined;
        }

        for (let i = 0; i < prompts.length; ++i) {
            if (is.string(prompts[i])) {
                prompts[i] = {
                    prompt: prompts[i],
                    echo: true
                };
            }
        }

        this._cb = cb;
        this._initialResponse = true;
        this._stream.once("USERAUTH_INFO_RESPONSE", this._onInfoResponse);

        return this._stream.authInfoReq(title, instructions, prompts);
    }
}

class PKAuthContext extends AuthContext {
    constructor(stream, username, service, method, pkInfo, cb) {
        super(stream, username, service, method, cb);

        this.key = {
            algo: pkInfo.keyAlgo,
            data: pkInfo.key
        };
        this.signature = pkInfo.signature;
        let sigAlgo;
        if (this.signature) {
            switch (pkInfo.keyAlgo) {
                case "ssh-rsa":
                    sigAlgo = "RSA-SHA1";
                    break;
                case "ssh-dss":
                    sigAlgo = "DSA-SHA1";
                    break;
                case "ecdsa-sha2-nistp256":
                    sigAlgo = "sha256";
                    break;
                case "ecdsa-sha2-nistp384":
                    sigAlgo = "sha384";
                    break;
                case "ecdsa-sha2-nistp521":
                    sigAlgo = "sha512";
                    break;
            }
        }
        this.sigAlgo = sigAlgo;
        this.blob = pkInfo.blob;
    }

    accept() {
        if (!this.signature) {
            this._initialResponse = true;
            this._stream.authPKOK(this.key.algo, this.key.data);
        } else {
            AuthContext.prototype.accept.call(this);
        }
    }
}

class HostbasedAuthContext extends AuthContext {
    constructor(stream, username, service, method, pkInfo, cb) {
        super(stream, username, service, method, cb);

        this.key = {
            algo: pkInfo.keyAlgo,
            data: pkInfo.key
        };
        this.signature = pkInfo.signature;
        let sigAlgo;
        if (this.signature) {
            switch (pkInfo.keyAlgo) {
                case "ssh-rsa":
                    sigAlgo = "RSA-SHA1";
                    break;
                case "ssh-dss":
                    sigAlgo = "DSA-SHA1";
                    break;
                case "ecdsa-sha2-nistp256":
                    sigAlgo = "sha256";
                    break;
                case "ecdsa-sha2-nistp384":
                    sigAlgo = "sha384";
                    break;
                case "ecdsa-sha2-nistp521":
                    sigAlgo = "sha512";
                    break;
            }
        }
        this.sigAlgo = sigAlgo;
        this.blob = pkInfo.blob;
        this.localHostname = pkInfo.localHostname;
        this.localUsername = pkInfo.localUsername;
    }
}

class PwdAuthContext extends AuthContext {
    constructor(stream, username, service, method, password, cb) {
        super(stream, username, service, method, cb);

        this.password = password;
    }
}

const nextChannel = (self) => {
    // get the next available channel number

    // fast path
    if (self._curChan < MAX_CHANNEL) {
        return ++self._curChan;
    }

    // slower lookup path
    for (let i = 0, channels = self._channels; i < MAX_CHANNEL; ++i) {
        if (!channels[i]) {
            return i;
        }
    }

    return false;
};

const openChannel = (self, type, opts, cb) => {
    // ask the client to open a channel for some purpose
    // (e.g. a forwarded TCP connection)
    const localChan = nextChannel(self);
    const initWindow = Channel.MAX_WINDOW;
    const maxPacket = Channel.PACKET_SIZE;
    let ret = true;

    if (localChan === false) {
        return cb(new Error("No free channels available"));
    }

    if (is.function(opts)) {
        cb = opts;
        opts = {};
    }

    self._channels[localChan] = true;

    const sshstream = self._sshstream;
    sshstream.once(`CHANNEL_OPEN_CONFIRMATION:${localChan}`, (info) => {
        sshstream.removeAllListeners(`CHANNEL_OPEN_FAILURE:${localChan}`);

        const chaninfo = {
            type,
            incoming: {
                id: localChan,
                window: initWindow,
                packetSize: maxPacket,
                state: "open"
            },
            outgoing: {
                id: info.sender,
                window: info.window,
                packetSize: info.packetSize,
                state: "open"
            }
        };
        cb(undefined, new Channel(chaninfo, self, {
            server: true
        }));
    }).once(`CHANNEL_OPEN_FAILURE:${localChan}`, (info) => {
        sshstream.removeAllListeners(`CHANNEL_OPEN_CONFIRMATION:${localChan}`);

        delete self._channels[localChan];

        const err = new Error(`(SSH) Channel open failure: ${info.reason} ${info.description}`);
        err.reason = info.reason;
        err.lang = info.lang;
        cb(err);
    });

    if (type === "forwarded-tcpip") {
        ret = sshstream.forwardedTcpip(localChan, initWindow, maxPacket, opts);
    } else if (type === "x11") {
        ret = sshstream.x11(localChan, initWindow, maxPacket, opts);
    } else if (type === "forwarded-streamlocal@openssh.com") {
        ret = sshstream.openssh_forwardedStreamLocal(localChan,
            initWindow,
            maxPacket,
            opts);
    }

    return ret;
};

class Client extends adone.EventEmitter {
    constructor(stream, socket) {
        super();

        this._sshstream = stream;
        const channels = this._channels = {};
        this._curChan = -1;
        this._sock = socket;
        this.noMoreSessions = false;
        this.authenticated = false;

        stream.on("end", () => {
            this.emit("end");
        }).on("close", (hasErr) => {
            this.emit("close", hasErr);
        }).on("error", (err) => {
            this.emit("error", err);
        }).on("drain", () => {
            this.emit("drain");
        }).on("continue", () => {
            this.emit("continue");
        });

        let exchanges = 0;
        let acceptedAuthSvc = false;
        let pendingAuths = [];
        let authCtx;
        let onAuthDecide = null;
        const onUSERAUTH_REQUEST = (username, service, method, methodData) => {
            if (exchanges === 0 ||
                (authCtx &&
                    (authCtx.username !== username || authCtx.service !== service))
                // TODO: support hostbased auth
                ||
                (method !== "password" &&
                    method !== "publickey" &&
                    method !== "hostbased" &&
                    method !== "keyboard-interactive" &&
                    method !== "none") ||
                pendingAuths.length === MAX_PENDING_AUTHS) {
                return stream.disconnect(DISCONNECT_REASON.PROTOCOL_ERROR);
            } else if (service !== "ssh-connection") {
                return stream.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            }

            // XXX: this really shouldn"t be reaching into private state ...
            stream._state.authMethod = method;

            let ctx;
            if (method === "keyboard-interactive") {
                ctx = new KeyboardAuthContext(stream, username, service, method, methodData, onAuthDecide);
            } else if (method === "publickey") {
                ctx = new PKAuthContext(stream, username, service, method, methodData, onAuthDecide);
            } else if (method === "hostbased") {
                ctx = new HostbasedAuthContext(stream, username, service, method, methodData, onAuthDecide);
            } else if (method === "password") {
                ctx = new PwdAuthContext(stream, username, service, method, methodData, onAuthDecide);
            } else if (method === "none") {
                ctx = new AuthContext(stream, username, service, method, onAuthDecide);
            }

            if (authCtx) {
                if (!authCtx._initialResponse) {
                    return pendingAuths.push(ctx);
                } else if (authCtx._multistep && !this._finalResponse) {
                    // RFC 4252 says to silently abort the current auth request if a new
                    // auth request comes in before the final response from an auth method
                    // that requires additional request/response exchanges -- this means
                    // keyboard-interactive for now ...
                    authCtx._cleanup && authCtx._cleanup();
                    authCtx.emit("abort");
                }
            }

            authCtx = ctx;

            if (listenerCount(this, "authentication")) {
                this.emit("authentication", authCtx);
            } else {
                authCtx.reject();
            }
        };

        // begin service/auth-related ================================================
        stream.on("SERVICE_REQUEST", (service) => {
            if (exchanges === 0 || acceptedAuthSvc || this.authenticated || service !== "ssh-userauth") {
                return stream.disconnect(DISCONNECT_REASON.SERVICE_NOT_AVAILABLE);
            }

            acceptedAuthSvc = true;
            stream.serviceAccept(service);
        }).on("USERAUTH_REQUEST", onUSERAUTH_REQUEST);

        onAuthDecide = (ctx, allowed, methodsLeft, isPartial) => {
            if (authCtx === ctx && !this.authenticated) {
                if (allowed) {
                    stream.removeListener("USERAUTH_REQUEST", onUSERAUTH_REQUEST);
                    authCtx = undefined;
                    this.authenticated = true;
                    stream.authSuccess();
                    pendingAuths = [];
                    this.emit("ready");
                } else {
                    stream.authFailure(methodsLeft, isPartial);
                    if (pendingAuths.length) {
                        authCtx = pendingAuths.pop();
                        if (listenerCount(this, "authentication")) {
                            this.emit("authentication", authCtx);
                        } else {
                            authCtx.reject();
                        }
                    }
                }
            }
        };
        // end service/auth-related ==================================================

        const unsentGlobalRequestsReplies = [];

        const sendReplies = () => {
            let reply;
            while (unsentGlobalRequestsReplies.length > 0 &&
                unsentGlobalRequestsReplies[0].type) {
                reply = unsentGlobalRequestsReplies.shift();
                if (reply.type === "SUCCESS") {
                    stream.requestSuccess(reply.buf);
                }
                if (reply.type === "FAILURE") {
                    stream.requestFailure();
                }
            }
        };

        stream.on("GLOBAL_REQUEST", (name, wantReply, data) => {
            const reply = {
                type: null,
                buf: null
            };

            const setReply = (type, buf) => {
                reply.type = type;
                reply.buf = buf;
                sendReplies();
            };

            if (wantReply) {
                unsentGlobalRequestsReplies.push(reply);
            }

            if ((name === "tcpip-forward" ||
                name === "cancel-tcpip-forward" ||
                name === "no-more-sessions@openssh.com" ||
                name === "streamlocal-forward@openssh.com" ||
                name === "cancel-streamlocal-forward@openssh.com") &&
                listenerCount(this, "request") &&
                this.authenticated) {
                let accept;
                let reject;

                if (wantReply) {
                    let replied = false;
                    accept = (chosenPort) => {
                        if (replied) {
                            return;
                        }
                        replied = true;
                        let bufPort;
                        if (name === "tcpip-forward" && data.bindPort === 0 && is.number(chosenPort)) {
                            bufPort = Buffer.allocUnsafe(4);
                            bufPort.writeUInt32BE(chosenPort, 0, true);
                        }
                        setReply("SUCCESS", bufPort);
                    };
                    reject = () => {
                        if (replied) {
                            return;
                        }
                        replied = true;
                        setReply("FAILURE");
                    };
                }

                if (name === "no-more-sessions@openssh.com") {
                    this.noMoreSessions = true;
                    accept && accept();
                    return;
                }

                this.emit("request", accept, reject, name, data);
            } else if (wantReply) {
                setReply("FAILURE");
            }
        });

        stream.on("CHANNEL_OPEN", (info) => {
            // do early reject in some cases to prevent wasteful channel allocation
            if ((info.type === "session" && this.noMoreSessions) || !this.authenticated) {
                const reasonCode = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
                return stream.channelOpenFail(info.sender, reasonCode);
            }

            const localChan = nextChannel(this);
            let accept;
            let replied = false;
            if (localChan === false) {
                // auto-reject due to no channels available
                return stream.channelOpenFail(info.sender,
                    CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE);
            }

            // be optimistic, reserve channel to prevent another request from trying to
            // take the same channel
            channels[localChan] = true;

            const reject = () => {
                if (replied) {
                    return;
                }

                replied = true;

                delete channels[localChan];

                const reasonCode = CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
                return stream.channelOpenFail(info.sender, reasonCode);
            };

            switch (info.type) {
                case "session":
                    if (listenerCount(this, "session")) {
                        accept = () => {
                            if (replied) {
                                return;
                            }

                            replied = true;

                            stream.channelOpenConfirm(info.sender,
                                localChan,
                                Channel.MAX_WINDOW,
                                Channel.PACKET_SIZE);

                            return new Session(this, info, localChan);
                        };

                        this.emit("session", accept, reject);
                    } else {
                        reject();
                    }
                    break;
                case "direct-tcpip":
                    if (listenerCount(this, "tcpip")) {
                        accept = () => {
                            if (replied) {
                                return;
                            }

                            replied = true;

                            stream.channelOpenConfirm(info.sender,
                                localChan,
                                Channel.MAX_WINDOW,
                                Channel.PACKET_SIZE);

                            const chaninfo = {
                                type: undefined,
                                incoming: {
                                    id: localChan,
                                    window: Channel.MAX_WINDOW,
                                    packetSize: Channel.PACKET_SIZE,
                                    state: "open"
                                },
                                outgoing: {
                                    id: info.sender,
                                    window: info.window,
                                    packetSize: info.packetSize,
                                    state: "open"
                                }
                            };

                            return new Channel(chaninfo, this);
                        };

                        this.emit("tcpip", accept, reject, info.data);
                    } else {
                        reject();
                    }
                    break;
                case "direct-streamlocal@openssh.com":
                    if (listenerCount(this, "openssh.streamlocal")) {
                        accept = () => {
                            if (replied) {
                                return;
                            }

                            replied = true;

                            stream.channelOpenConfirm(info.sender,
                                localChan,
                                Channel.MAX_WINDOW,
                                Channel.PACKET_SIZE);

                            const chaninfo = {
                                type: undefined,
                                incoming: {
                                    id: localChan,
                                    window: Channel.MAX_WINDOW,
                                    packetSize: Channel.PACKET_SIZE,
                                    state: "open"
                                },
                                outgoing: {
                                    id: info.sender,
                                    window: info.window,
                                    packetSize: info.packetSize,
                                    state: "open"
                                }
                            };

                            return new Channel(chaninfo, this);
                        };

                        this.emit("openssh.streamlocal", accept, reject, info.data);
                    } else {
                        reject();
                    }
                    break;
                default:
                    // auto-reject unsupported channel types
                    reject();
            }
        });

        stream.on("NEWKEYS", () => {
            if (++exchanges > 1) {
                this.emit("rekey");
            }
        });

        if (kaMgr) {
            this.once("ready", () => {
                kaMgr.add(stream);
            });
        }
    }

    end() {
        return this._sshstream.disconnect(DISCONNECT_REASON.BY_APPLICATION);
    }

    x11(originAddr, originPort, cb) {
        const opts = {
            originAddr,
            originPort
        };
        return openChannel(this, "x11", opts, cb);
    }

    forwardOut(boundAddr, boundPort, remoteAddr,
        remotePort, cb) {
        const opts = {
            boundAddr,
            boundPort,
            remoteAddr,
            remotePort
        };
        return openChannel(this, "forwarded-tcpip", opts, cb);
    }

    openssh_forwardOutStreamLocal(socketPath, cb) {
        const opts = {
            socketPath
        };
        return openChannel(this, "forwarded-streamlocal@openssh.com", opts, cb);
    }

    rekey(cb) {
        const stream = this._sshstream;
        let ret = true;
        let error;

        try {
            ret = stream.rekey();
        } catch (ex) {
            error = ex;
        }

        // TODO: re-throw error if no callback?

        if (is.function(cb)) {
            if (error) {
                process.nextTick(() => {
                    cb(error);
                });
            } else {
                this.once("rekey", cb);
            }
        }

        return ret;
    }
}

export default class Server extends adone.EventEmitter {
    constructor(cfg, listener) {
        super();

        const hostKeys = {
            "ssh-rsa": null,
            "ssh-dss": null,
            "ecdsa-sha2-nistp256": null,
            "ecdsa-sha2-nistp384": null,
            "ecdsa-sha2-nistp521": null
        };

        const hostKeys_ = cfg.hostKeys;
        if (!is.array(hostKeys_)) {
            throw new Error("hostKeys must be an array");
        }

        let i;
        for (i = 0; i < hostKeys_.length; ++i) {
            let privateKey;
            if (Buffer.isBuffer(hostKeys_[i]) || is.string(hostKeys_[i])) {
                privateKey = parseKey(hostKeys_[i]);
            } else {
                privateKey = parseKey(hostKeys_[i].key);
            }
            if (privateKey instanceof Error) {
                throw new Error(`Cannot parse privateKey: ${privateKey.message}`);
            }
            if (!privateKey.private) {
                throw new Error("privateKey value contains an invalid private key");
            }
            if (hostKeys[privateKey.fulltype]) {
                continue;
            }
            if (privateKey.encryption) {
                if (!is.string(hostKeys_[i].passphrase)) {
                    throw new Error("Missing passphrase for encrypted private key");
                }
                decryptKey(privateKey, hostKeys_[i].passphrase);
            }
            hostKeys[privateKey.fulltype] = {
                privateKey,
                publicKey: genPublicKey(privateKey)
            };
        }

        const algorithms = {
            kex: undefined,
            kexBuf: undefined,
            cipher: undefined,
            cipherBuf: undefined,
            serverHostKey: undefined,
            serverHostKeyBuf: undefined,
            hmac: undefined,
            hmacBuf: undefined,
            compress: undefined,
            compressBuf: undefined
        };
        if (is.plainObject(cfg.algorithms) && cfg.algorithms !== null) {
            let algosSupported;
            let algoList;

            algoList = cfg.algorithms.kex;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_KEX;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported key exchange algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.kex = algoList;
            }

            algoList = cfg.algorithms.cipher;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_CIPHER;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported cipher algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.cipher = algoList;
            }

            algoList = cfg.algorithms.serverHostKey;
            let copied = false;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_SERVER_HOST_KEY;
                for (i = algoList.length - 1; i >= 0; --i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported server host key algorithm: ${algoList[i]}`);
                    }
                    if (!hostKeys[algoList[i]]) {
                        // Silently discard for now
                        if (!copied) {
                            algoList = algoList.slice();
                            copied = true;
                        }
                        algoList.splice(i, 1);
                    }
                }
                if (algoList.length > 0) {
                    algorithms.serverHostKey = algoList;
                }
            }

            algoList = cfg.algorithms.hmac;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_HMAC;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported HMAC algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.hmac = algoList;
            }

            algoList = cfg.algorithms.compress;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_COMPRESS;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported compression algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.compress = algoList;
            }
        }

        // Make sure we at least have some kind of valid list of support key
        // formats
        if (is.undefined(algorithms.serverHostKey)) {
            const hostKeyAlgos = Object.keys(hostKeys);
            for (i = hostKeyAlgos.length - 1; i >= 0; --i) {
                if (!hostKeys[hostKeyAlgos[i]]) {
                    hostKeyAlgos.splice(i, 1);
                }
            }
            algorithms.serverHostKey = hostKeyAlgos;
        }

        if (!kaMgr &&
            Server.KEEPALIVE_INTERVAL > 0 &&
            Server.KEEPALIVE_CLIENT_INTERVAL > 0 &&
            Server.KEEPALIVE_CLIENT_COUNT_MAX >= 0) {
            kaMgr = new KeepaliveManager(Server.KEEPALIVE_INTERVAL,
                Server.KEEPALIVE_CLIENT_INTERVAL,
                Server.KEEPALIVE_CLIENT_COUNT_MAX);
        }

        if (is.function(listener)) {
            this.on("connection", listener);
        }

        const streamcfg = {
            algorithms,
            hostKeys,
            server: true
        };
        let keys;
        let len;
        for (i = 0, keys = Object.keys(cfg), len = keys.length; i < len; ++i) {
            const key = keys[i];
            if (key === "privateKey" ||
                key === "publicKey" ||
                key === "passphrase" ||
                key === "algorithms" ||
                key === "hostKeys" ||
                key === "server") {
                continue;
            }
            streamcfg[key] = cfg[key];
        }

        const oldDebug = streamcfg.debug;
        const cfgKeys = Object.keys(streamcfg);

        this._srv = new net.Server((socket) => {
            let sshstream = null;
            if (this._connections >= this.maxConnections) {
                socket.destroy();
                return;
            }
            ++this._connections;
            socket.once("close", (hadErr) => {
                --this._connections;

                // since joyent/node#993bb93e0a, we have to "read past EOF" in order to
                // get an `end` event on streams. thankfully adding this does not
                // negatively affect node versions pre-joyent/node#993bb93e0a.
                sshstream.read();
            }).on("error", (err) => {
                sshstream.reset();
                sshstream.emit("error", err);
            });

            let conncfg = streamcfg;

            // prepend debug output with a unique identifier in case there are multiple
            // clients connected at the same time
            if (oldDebug) {
                conncfg = {};
                for (let i = 0, key; i < cfgKeys.length; ++i) {
                    key = cfgKeys[i];
                    conncfg[key] = streamcfg[key];
                }
                const debugPrefix = `[${process.hrtime().join(".")}] `;
                conncfg.debug = function (msg) {
                    oldDebug(debugPrefix + msg);
                };
            }

            sshstream = new SSH2Stream(conncfg);
            const client = new Client(sshstream, socket);

            socket.pipe(sshstream).pipe(socket);

            // silence pre-header errors
            client.on("error", adone.noop);

            sshstream.once("header", (header) => {
                if (sshstream._readableState.ended) {
                    // already disconnected internally in SSH2Stream due to incompatible
                    // protocol version
                    return;
                } else if (!listenerCount(this, "connection")) {
                    // auto reject
                    return sshstream.disconnect(DISCONNECT_REASON.BY_APPLICATION);
                }

                client.removeListener("error", adone.noop);

                this.emit("connection",
                    client, {
                        ip: socket.remoteAddress,
                        header
                    });
            });
        }).on("error", (err) => {
            this.emit("error", err);
        }).on("listening", () => {
            this.emit("listening");
        }).on("close", () => {
            this.emit("close");
        });
        this._connections = 0;
        this.maxConnections = Infinity;
    }

    listen(...args) {
        this._srv.listen.apply(this._srv, args);
        return this;
    }

    address() {
        return this._srv.address();
    }

    getConnections(cb) {
        this._srv.getConnections(cb);
    }

    close(cb) {
        this._srv.close(cb);
        return this;
    }

    ref() {
        this._srv.ref();
    }

    unref() {
        this._srv.unref();
    }

    static createServer(cfg, listener) {
        return new Server(cfg, listener);
    }
}
Server.KEEPALIVE_INTERVAL = 1000;
Server.KEEPALIVE_CLIENT_INTERVAL = 15000;
Server.KEEPALIVE_CLIENT_COUNT_MAX = 3;
