const { is, net: { ssh: { Channel } }, std } = adone;
const crypto = std.crypto;
const Socket = std.net.Socket;
const dnsLookup = std.dns.lookup;
const HASHES = crypto.getHashes();
const { stream } = adone.net.ssh;
const { SSH2Stream, SFTPStream, util } = stream;
const BUGS = stream.const.BUGS;
const ALGORITHMS = stream.const.ALGORITHMS;
const parseKey = util.parseKey;
const decryptKey = util.decryptKey;
const genPublicKey = util.genPublicKey;

import agentQuery from "./agent";
import SFTPWrapper from "./sftp_wrapper";

const MAX_CHANNEL = Math.pow(2, 32) - 1;
const RE_OPENSSH = /^OpenSSH_(?:(?![0-4])\d)|(?:\d{2,})/;

const nextChannel = (self) => {
    // get the next available channel number

    // optimized path
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
    // ask the server to open a channel for some purpose
    // (e.g. session (sftp, exec, shell), or forwarding a TCP connection
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
    sshstream.once(`CHANNEL_OPEN_CONFIRMATION:${localChan}`, onSuccess)
        .once(`CHANNEL_OPEN_FAILURE:${localChan}`, onFailure)
        .once(`CHANNEL_CLOSE:${localChan}`, onFailure);

    if (type === "session") {
        ret = sshstream.session(localChan, initWindow, maxPacket);
    } else if (type === "direct-tcpip") {
        ret = sshstream.directTcpip(localChan, initWindow, maxPacket, opts);
    } else if (type === "direct-streamlocal@openssh.com") {
        ret = sshstream.openssh_directStreamLocal(localChan, initWindow, maxPacket, opts);
    }

    return ret;

    function onSuccess(info) {
        sshstream.removeListener(`CHANNEL_OPEN_FAILURE:${localChan}`, onFailure);
        sshstream.removeListener(`CHANNEL_CLOSE:${localChan}`, onFailure);

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
        cb(undefined, new Channel(chaninfo, self));
    }

    function onFailure(info) {
        sshstream.removeListener(`CHANNEL_OPEN_CONFIRMATION:${localChan}`, onSuccess);
        sshstream.removeListener(`CHANNEL_OPEN_FAILURE:${localChan}`, onFailure);
        sshstream.removeListener(`CHANNEL_CLOSE:${localChan}`, onFailure);

        delete self._channels[localChan];

        let err;
        if (info instanceof Error) {
            err = info;
        } else if (typeof info === "object" && info !== null) {
            err = new Error(`(SSH) Channel open failure: ${info.description}`);
            err.reason = info.reason;
            err.lang = info.lang;
        } else {
            err = new Error("(SSH) Channel open failure: " +
                "server closed channel unexpectedly"
            );
            err.reason = err.lang = "";
        }
        cb(err);
    }
};

const reqX11 = (chan, screen, cb) => {
    // asks server to start sending us X11 connections
    const cfg = {
        single: false,
        protocol: "MIT-MAGIC-COOKIE-1",
        cookie: crypto.randomBytes(16).toString("hex"),
        screen: (is.number(screen) ? screen : 0)
    };

    if (is.function(screen)) {
        cb = screen;
    } else if (typeof screen === "object") {
        if (is.boolean(screen.single)) {
            cfg.single = screen.single;
        }
        if (is.number(screen.screen)) {
            cfg.screen = screen.screen;
        }
    }

    const wantReply = (is.function(cb));

    if (chan.outgoing.state !== "open") {
        wantReply && cb(new Error("Channel is not open"));
        return true;
    }

    if (wantReply) {
        chan._callbacks.push((hadErr) => {
            if (hadErr) {
                return cb(hadErr !== true ? hadErr : new Error("Unable to request X11"));
            }

            chan._hasX11 = true;
            ++chan._client._acceptX11;
            chan.once("close", () => {
                if (chan._client._acceptX11) {
                    --chan._client._acceptX11;
                }
            });

            cb();
        });
    }

    return chan._client._sshstream.x11Forward(chan.outgoing.id, cfg, wantReply);
};

const reqPty = (chan, opts, cb) => {
    let rows = 24;
    let cols = 80;
    let width = 640;
    let height = 480;
    let term = "vt100";

    if (is.function(opts)) {
        cb = opts;
    } else if (typeof opts === "object") {
        if (is.number(opts.rows)) {
            rows = opts.rows;
        }
        if (is.number(opts.cols)) {
            cols = opts.cols;
        }
        if (is.number(opts.width)) {
            width = opts.width;
        }
        if (is.number(opts.height)) {
            height = opts.height;
        }
        if (is.string(opts.term)) {
            term = opts.term;
        }
    }

    const wantReply = is.function(cb);

    if (chan.outgoing.state !== "open") {
        wantReply && cb(new Error("Channel is not open"));
        return true;
    }

    if (wantReply) {
        chan._callbacks.push((hadErr) => {
            if (hadErr) {
                return cb(hadErr !== true ? hadErr : new Error("Unable to request a pseudo-terminal"));
            }
            cb();
        });
    }

    return chan._client._sshstream.pty(chan.outgoing.id,
        rows, cols, height, width, term, null, wantReply
    );
};

const reqAgentFwd = (chan, cb) => {
    const wantReply = is.function(cb);

    if (chan.outgoing.state !== "open") {
        wantReply && cb(new Error("Channel is not open"));
        return true;
    } else if (chan._client._agentFwdEnabled) {
        wantReply && cb(false);
        return true;
    }

    chan._client._agentFwdEnabled = true;

    chan._callbacks.push((hadErr) => {
        if (hadErr) {
            chan._client._agentFwdEnabled = false;
            wantReply && cb(hadErr !== true ? hadErr : new Error("Unable to request agent forwarding"));
            return;
        }

        wantReply && cb();
    });

    return chan._client._sshstream.openssh_agentForward(chan.outgoing.id, true);
};

const reqShell = (chan, cb) => {
    if (chan.outgoing.state !== "open") {
        cb(new Error("Channel is not open"));
        return true;
    }
    chan._callbacks.push((hadErr) => {
        if (hadErr) {
            return cb(hadErr !== true ? hadErr : new Error("Unable to open shell"));
        }
        chan.subtype = "shell";
        cb(undefined, chan);
    });

    return chan._client._sshstream.shell(chan.outgoing.id, true);
};

const reqExec = (chan, cmd, opts, cb) => {
    if (chan.outgoing.state !== "open") {
        cb(new Error("Channel is not open"));
        return true;
    }
    chan._callbacks.push((hadErr) => {
        if (hadErr) {
            return cb(hadErr !== true ? hadErr : new Error("Unable to exec"));
        }
        chan.subtype = "exec";
        chan.allowHalfOpen = (opts.allowHalfOpen !== false);
        cb(undefined, chan);
    });

    return chan._client._sshstream.exec(chan.outgoing.id, cmd, true);
};

const reqEnv = (chan, env) => {
    if (chan.outgoing.state !== "open") {
        return true;
    }
    let ret = true;
    const keys = Object.keys(env || {});
    let key;
    let val;

    for (let i = 0, len = keys.length; i < len; ++i) {
        key = keys[i];
        val = env[key];
        ret = chan._client._sshstream.env(chan.outgoing.id, key, val, false);
    }

    return ret;
};

const reqSubsystem = (chan, name, cb) => {
    if (chan.outgoing.state !== "open") {
        cb(new Error("Channel is not open"));
        return true;
    }
    chan._callbacks.push((hadErr) => {
        if (hadErr) {
            return cb(hadErr !== true ? hadErr : new Error(`Unable to start subsystem: ${name}`));
        }
        chan.subtype = "subsystem";
        cb(undefined, chan);
    });

    return chan._client._sshstream.subsystem(chan.outgoing.id, name, true);
};

function onCHANNEL_OPEN(self, info) {
    // the server is trying to open a channel with us, this is usually when
    // we asked the server to forward us connections on some port and now they
    // are asking us to accept/deny an incoming connection on their side

    let localChan = false;
    let reason;

    function accept() {
        const chaninfo = {
            type: info.type,
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
        const stream = new Channel(chaninfo, self);

        self._sshstream.channelOpenConfirm(info.sender,
            localChan,
            Channel.MAX_WINDOW,
            Channel.PACKET_SIZE
        );
        return stream;
    }

    function reject() {
        if (reason === undefined) {
            if (localChan === false) {
                reason = stream.const.CHANNEL_OPEN_FAILURE.RESOURCE_SHORTAGE;
            } else {
                reason = stream.const.CHANNEL_OPEN_FAILURE.CONNECT_FAILED;
            }
        }

        self._sshstream.channelOpenFail(info.sender, reason, "", "");
    }

    if (info.type === "forwarded-tcpip" ||
        info.type === "x11" ||
        info.type === "auth-agent@openssh.com") {
        // check for conditions for automatic rejection
        let rejectConn = ((info.type === "forwarded-tcpip" &&
            self._forwarding[`${info.data.destIP
            }:${
            info.data.destPort}`] === undefined) ||
            (info.type === "x11" && self._acceptX11 === 0) ||
            (info.type === "auth-agent@openssh.com" &&
                !self._agentFwdEnabled));
        if (!rejectConn) {
            localChan = nextChannel(self);

            if (localChan === false) {
                self.config.debug("DEBUG: Client: Automatic rejection of incoming channel open: no channels available");
                rejectConn = true;
            } else {
                self._channels[localChan] = true;
            }
        } else {
            reason = stream.const.CHANNEL_OPEN_FAILURE.ADMINISTRATIVELY_PROHIBITED;
            self.config.debug(`DEBUG: Client: Automatic rejection of incoming channel open: unexpected channel open for: ${info.type}`);
        }

        // TODO: automatic rejection after some timeout?

        if (rejectConn) {
            reject();
        }

        if (localChan !== false) {
            if (info.type === "forwarded-tcpip") {
                if (info.data.destPort === 0) {
                    info.data.destPort = self._forwarding[`${info.data.destIP
                        }:${
                        info.data.destPort}`];
                }
                self.emit("tcp connection", info.data, accept, reject);
            } else if (info.type === "x11") {
                self.emit("x11", info.data, accept, reject);
            } else {
                agentQuery(self.config.agent, accept, reject);
            }
        }
    } else {
        // automatically reject any unsupported channel open requests
        self.config.debug(`DEBUG: Client: Automatic rejection of incoming channel open: unsupported type: ${info.type}`);
        reason = stream.const.CHANNEL_OPEN_FAILURE.UNKNOWN_CHANNEL_TYPE;
        reject();
    }
}

function trySign(sig, key) {
    try {
        return sig.sign(key);
    } catch (err) {
        return err;
    }
}

export default class Client extends adone.EventEmitter {
    constructor() {
        super();

        this.config = {
            host: undefined,
            port: undefined,
            forceIPv4: undefined,
            forceIPv6: undefined,
            keepaliveCountMax: undefined,
            keepaliveInterval: undefined,
            readyTimeout: undefined,

            username: undefined,
            password: undefined,
            privateKey: undefined,
            publicKey: undefined,
            tryKeyboard: undefined,
            agent: undefined,
            allowAgentFwd: undefined,

            hostHashAlgo: undefined,
            hostHashCb: undefined,
            strictVendor: undefined,
            debug: undefined
        };

        this._readyTimeout = undefined;
        this._channels = undefined;
        this._callbacks = undefined;
        this._forwarding = undefined;
        this._acceptX11 = undefined;
        this._agentFwdEnabled = undefined;
        this._curChan = undefined;
        this._remoteVer = undefined;

        this._sshstream = undefined;
        this._sock = undefined;
        this._resetKA = undefined;
    }

    connect(options) {
        this.config.hostname = options.hostname || "localhost";
        this.config.port = options.port || 22;
        this.config.forceIPv4 = options.forceIPv4 || false;
        this.config.forceIPv6 = options.forceIPv6 || false;
        this.config.keepaliveCountMax = (is.number(options.keepaliveCountMax) && options.keepaliveCountMax >= 0 ? options.keepaliveCountMax : 3);
        this.config.keepaliveInterval = (is.number(options.keepaliveInterval) && options.keepaliveInterval > 0 ? options.keepaliveInterval : 0);
        this.config.readyTimeout = (is.number(options.readyTimeout) && options.readyTimeout >= 0 ? options.readyTimeout : 20000);

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
        let i;
        if (typeof options.algorithms === "object" && options.algorithms !== null) {
            let algosSupported;
            let algoList;

            algoList = options.algorithms.kex;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_KEX;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported key exchange algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.kex = algoList;
            }

            algoList = options.algorithms.cipher;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_CIPHER;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported cipher algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.cipher = algoList;
            }

            algoList = options.algorithms.serverHostKey;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_SERVER_HOST_KEY;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported server host key algorithm: ${
                            algoList[i]}`);
                    }
                }
                algorithms.serverHostKey = algoList;
            }

            algoList = options.algorithms.hmac;
            if (is.array(algoList) && algoList.length > 0) {
                algosSupported = ALGORITHMS.SUPPORTED_HMAC;
                for (i = 0; i < algoList.length; ++i) {
                    if (algosSupported.indexOf(algoList[i]) === -1) {
                        throw new Error(`Unsupported HMAC algorithm: ${algoList[i]}`);
                    }
                }
                algorithms.hmac = algoList;
            }

            algoList = options.algorithms.compress;
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
        if (algorithms.compress === undefined) {
            if (options.compress) {
                algorithms.compress = ["zlib@openssh.com", "zlib"];
                if (options.compress !== "force") {
                    algorithms.compress.push("none");
                }
            } else if (options.compress === false) {
                algorithms.compress = ["none"];
            }
        }

        this.config.username = options.username || options.user;
        this.config.password = (is.string(options.password) ? options.password : undefined);
        this.config.privateKey = (is.string(options.privateKey) || Buffer.isBuffer(options.privateKey) ? options.privateKey : undefined);
        this.config.publicKey = undefined;
        this.config.localHostname = (is.string(options.localHostname) && options.localHostname.length ? options.localHostname : undefined);
        this.config.localUsername = (is.string(options.localUsername) && options.localUsername.length ? options.localUsername : undefined);
        this.config.tryKeyboard = (options.tryKeyboard === true);
        this.config.agent = (is.string(options.agent) && options.agent.length ? options.agent : undefined);
        this.config.allowAgentFwd = (options.agentForward === true && this.config.agent !== undefined);

        this.config.strictVendor = (is.boolean(options.strictVendor) ? options.strictVendor : true);

        const debug = this.config.debug = (is.function(options.debug) ? options.debug : adone.noop);

        if (!is.string(this.config.username)) {
            throw new Error("Invalid username");
        }

        if (options.agentForward === true && !this.config.allowAgentFwd) {
            throw new Error("You must set a valid agent path to allow agent forwarding");
        }

        let callbacks = this._callbacks = [];
        this._channels = {};
        this._forwarding = {};
        this._acceptX11 = 0;
        this._agentFwdEnabled = false;
        this._curChan = -1;
        this._remoteVer = undefined;

        if (this.config.privateKey) {
            const privKeyInfo = parseKey(this.config.privateKey);
            if (privKeyInfo instanceof Error) {
                throw new Error(`Cannot parse privateKey: ${privKeyInfo.message}`);
            }
            if (!privKeyInfo.private) {
                throw new Error("privateKey value does not contain a (valid) private key");
            }
            if (privKeyInfo.encryption) {
                if (!is.string(typeof options.passphrase)) {
                    throw new Error("Encrypted private key detected, but no passphrase given");
                }
                decryptKey(privKeyInfo, options.passphrase);
            }
            this.config.privateKey = privKeyInfo;
            this.config.publicKey = genPublicKey(privKeyInfo);
        }

        const stream = this._sshstream = new SSH2Stream({
            algorithms,
            debug: (debug === adone.noop ? undefined : debug)
        });
        const sock = this._sock = (options.sock || new Socket());

        // drain stderr if we are connection hopping using an exec stream
        if (this._sock.stderr) {
            this._sock.stderr.resume();
        }

        // keepalive-related
        const kainterval = this.config.keepaliveInterval;
        const kacountmax = this.config.keepaliveCountMax;
        let kacount = 0;
        let katimer;

        const self = this;

        function sendKA() {
            if (++kacount > kacountmax) {
                clearInterval(katimer);
                if (sock.readable) {
                    const err = new Error("Keepalive timeout");
                    err.level = "client-timeout";
                    self.emit("error", err);
                    sock.destroy();
                }
                return;
            }
            if (sock.writable) {
                // append dummy callback to keep correct callback order
                callbacks.push(resetKA);
                stream.ping();
            } else {
                clearInterval(katimer);
            }
        }

        function resetKA() {
            if (kainterval > 0) {
                kacount = 0;
                clearInterval(katimer);
                if (sock.writable) {
                    katimer = setInterval(sendKA, kainterval);
                }
            }
        }
        this._resetKA = resetKA;

        stream.on("USERAUTH_BANNER", (msg) => {
            this.emit("banner", msg);
        });

        sock.on("connect", () => {
            debug("DEBUG: Client: Connected");
            this.emit("connect");
            if (!options.sock) {
                stream.pipe(sock).pipe(stream);
            }
        }).on("timeout", () => {
            this.emit("timeout");
        }).on("error", (err) => {
            clearTimeout(this._readyTimeout);
            err.level = "client-socket";
            this.emit("error", err);
        }).on("end", () => {
            stream.unpipe(sock);
            clearTimeout(this._readyTimeout);
            clearInterval(katimer);
            this.emit("end");
        }).on("close", () => {
            stream.unpipe(sock);
            clearTimeout(this._readyTimeout);
            clearInterval(katimer);
            this.emit("close");

            // notify outstanding channel requests of disconnection ...
            const callbacks_ = callbacks;
            const err = new Error("No response from server");
            callbacks = this._callbacks = [];
            for (i = 0; i < callbacks_.length; ++i) {
                callbacks_[i](err);
            }

            // simulate error for any channels waiting to be opened. this is safe
            // against successfully opened channels because the success and failure
            // event handlers are automatically removed when a success/failure response
            // is received
            const chanNos = Object.keys(this._channels);
            this._channels = {};
            for (i = 0; i < chanNos.length; ++i) {
                stream.emit(`CHANNEL_OPEN_FAILURE:${chanNos[i]}`, err);
                // emitting CHANNEL_CLOSE should be safe too and should help for any
                // special channels which might otherwise keep the process alive, such
                // as agent forwarding channels which have open unix sockets ...
                stream.emit(`CHANNEL_CLOSE:${chanNos[i]}`);
            }
        });
        stream.on("drain", () => {
            this.emit("drain");
        }).once("header", (header) => {
            this._remoteVer = header.versions.software;
            if (header.greeting) {
                this.emit("greeting", header.greeting);
            }
        }).on("continue", () => {
            this.emit("continue");
        }).on("error", (err) => {
            err.level = "protocol";
            this.emit("error", err);
        });

        if (is.function(options.hostVerifier)) {
            if (HASHES.indexOf(options.hostHash) === -1) {
                throw new Error(`Invalid host hash algorithm: ${options.hostHash}`);
            }
            const hashCb = options.hostVerifier;
            const hasher = crypto.createHash(options.hostHash);
            stream.once("fingerprint", (key, verify) => {
                hasher.update(key);
                const ret = hashCb(hasher.digest("hex"), verify);
                if (ret !== undefined) {
                    verify(ret);
                }
            });
        }

        // begin authentication handling =============================================
        let auths = ["none"];
        let curAuth;
        let agentKeys;
        let agentKeyPos = 0;
        if (this.config.password !== undefined) {
            auths.push("password");
        }
        if (this.config.publicKey !== undefined) {
            auths.push("publickey");
        }
        if (this.config.agent !== undefined) {
            auths.push("agent");
        }
        if (this.config.tryKeyboard) {
            auths.push("keyboard-interactive");
        }
        if (this.config.publicKey !== undefined &&
            this.config.localHostname !== undefined &&
            this.config.localUsername !== undefined) {
            auths.push("hostbased");
        }

        function tryNextAuth() {
            function hostbasedCb(buf, cb) {
                let algo;
                switch (self.config.privateKey.fulltype) {
                    case "ssh-rsa":
                        algo = "RSA-SHA1";
                        break;
                    case "ssh-dss":
                        algo = "DSA-SHA1";
                        break;
                    case "ecdsa-sha2-nistp256":
                        algo = "sha256";
                        break;
                    case "ecdsa-sha2-nistp384":
                        algo = "sha384";
                        break;
                    case "ecdsa-sha2-nistp521":
                        algo = "sha512";
                        break;
                }
                let signature = crypto.createSign(algo);
                signature.update(buf);
                signature = trySign(signature, self.config.privateKey.privateOrig);
                if (signature instanceof Error) {
                    signature.message = `Error while signing data with privateKey: ${
                        signature.message}`;
                    signature.level = "client-authentication";
                    self.emit("error", signature);
                    return tryNextAuth();
                }

                cb(signature);
            }

            // TODO: better shutdown
            if (!auths.length) {
                stream.removeListener("USERAUTH_FAILURE", onUSERAUTH_FAILURE);
                stream.removeListener("USERAUTH_PK_OK", onUSERAUTH_PK_OK);
                const err = new Error("All configured authentication methods failed");
                err.level = "client-authentication";
                self.emit("error", err);
                if (stream.writable) {
                    self.end();
                }
                return;
            }

            curAuth = auths.shift();
            switch (curAuth) {
                case "password":
                    stream.authPassword(self.config.username, self.config.password);
                    break;
                case "publickey":
                    stream.authPK(self.config.username, self.config.publicKey);
                    stream.once("USERAUTH_PK_OK", onUSERAUTH_PK_OK);
                    break;
                case "hostbased":
                    stream.authHostbased(self.config.username,
                        self.config.publicKey,
                        self.config.localHostname,
                        self.config.localUsername,
                        hostbasedCb
                    );
                    break;
                case "agent":
                    agentQuery(self.config.agent, (err, keys) => {
                        if (err) {
                            err.level = "agent";
                            self.emit("error", err);
                            agentKeys = undefined;
                            return tryNextAuth();
                        } else if (keys.length === 0) {
                            debug("DEBUG: Agent: No keys stored in agent");
                            agentKeys = undefined;
                            return tryNextAuth();
                        }

                        agentKeys = keys;
                        agentKeyPos = 0;

                        stream.authPK(self.config.username, keys[0]);
                        stream.once("USERAUTH_PK_OK", onUSERAUTH_PK_OK);
                    });
                    break;
                case "keyboard-interactive":
                    stream.authKeyboard(self.config.username);
                    stream.on("USERAUTH_INFO_REQUEST", onUSERAUTH_INFO_REQUEST);
                    break;
                case "none":
                    stream.authNone(self.config.username);
                    break;
            }
        }

        function tryNextAgentKey() {
            if (curAuth === "agent") {
                if (agentKeyPos >= agentKeys.length) {
                    return;
                }
                if (++agentKeyPos >= agentKeys.length) {
                    debug("DEBUG: Agent: No more keys left to try");
                    debug("DEBUG: Client: agent auth failed");
                    agentKeys = undefined;
                    tryNextAuth();
                } else {
                    debug(`DEBUG: Agent: Trying key #${agentKeyPos + 1}`);
                    stream.authPK(self.config.username, agentKeys[agentKeyPos]);
                    stream.once("USERAUTH_PK_OK", onUSERAUTH_PK_OK);
                }
            }
        }

        function onUSERAUTH_INFO_REQUEST(name, instructions, lang, prompts) {
            const nprompts = (is.array(prompts) ? prompts.length : 0);
            if (nprompts === 0) {
                debug("DEBUG: Client: Sending automatic USERAUTH_INFO_RESPONSE");
                return stream.authInfoRes();
            }
            // we sent a keyboard-interactive user authentication request and now the
            // server is sending us the prompts we need to present to the user
            self.emit("keyboard-interactive",
                name,
                instructions,
                lang,
                prompts,
                (answers) => {
                    stream.authInfoRes(answers);
                }
            );
        }

        function onUSERAUTH_PK_OK() {
            if (curAuth === "agent") {
                const agentKey = agentKeys[agentKeyPos];
                const keyLen = agentKey.readUInt32BE(0, true);
                const pubKeyFullType = agentKey.toString("ascii", 4, 4 + keyLen);
                const pubKeyType = pubKeyFullType.slice(4);
                // Check that we support the key type first
                switch (pubKeyFullType) {
                    case "ssh-rsa":
                    case "ssh-dss":
                    case "ecdsa-sha2-nistp256":
                    case "ecdsa-sha2-nistp384":
                    case "ecdsa-sha2-nistp521":
                        break;
                    default:
                        debug(`DEBUG: Agent: Skipping unsupported key type: ${
                            pubKeyFullType}`);
                        return tryNextAgentKey();
                }
                stream.authPK(self.config.username,
                    agentKey,
                    (buf, cb) => {
                        agentQuery(self.config.agent, agentKey, pubKeyType, buf,
                            (err, signed) => {
                                if (err) {
                                    err.level = "agent";
                                    self.emit("error", err);
                                } else {
                                    const sigFullTypeLen = signed.readUInt32BE(0, true);
                                    if (4 + sigFullTypeLen + 4 < signed.length) {
                                        const sigFullType = signed.toString("ascii", 4, 4 + sigFullTypeLen);
                                        if (sigFullType !== pubKeyFullType) {
                                            err = new Error("Agent key/signature type mismatch");
                                            err.level = "agent";
                                            self.emit("error", err);
                                        } else {
                                            // skip algoLen + algo + sigLen
                                            return cb(signed.slice(4 + sigFullTypeLen + 4));
                                        }
                                    }
                                }

                                tryNextAgentKey();
                            }
                        );
                    }
                );
            } else if (curAuth === "publickey") {
                stream.authPK(self.config.username,
                    self.config.publicKey,
                    (buf, cb) => {
                        let algo;
                        switch (self.config.privateKey.fulltype) {
                            case "ssh-rsa":
                                algo = "RSA-SHA1";
                                break;
                            case "ssh-dss":
                                algo = "DSA-SHA1";
                                break;
                            case "ecdsa-sha2-nistp256":
                                algo = "sha256";
                                break;
                            case "ecdsa-sha2-nistp384":
                                algo = "sha384";
                                break;
                            case "ecdsa-sha2-nistp521":
                                algo = "sha512";
                                break;
                        }
                        let signature = crypto.createSign(algo);
                        signature.update(buf);
                        signature = trySign(signature, self.config.privateKey.privateOrig);
                        if (signature instanceof Error) {
                            signature.message = `Error while signing data with privateKey: ${
                                signature.message}`;
                            signature.level = "client-authentication";
                            self.emit("error", signature);
                            return tryNextAuth();
                        }
                        cb(signature);
                    });
            }
        }

        function onUSERAUTH_FAILURE(authsLeft, partial) {
            stream.removeListener("USERAUTH_PK_OK", onUSERAUTH_PK_OK);
            stream.removeListener("USERAUTH_INFO_REQUEST", onUSERAUTH_INFO_REQUEST);
            if (curAuth === "agent") {
                debug(`DEBUG: Client: Agent key #${agentKeyPos + 1} failed`);
                return tryNextAgentKey();
            } else {
                debug(`DEBUG: Client: ${curAuth} auth failed`);
            }

            tryNextAuth();
        }
        stream.once("USERAUTH_SUCCESS", () => {
            auths = undefined;
            stream.removeListener("USERAUTH_FAILURE", onUSERAUTH_FAILURE);
            stream.removeListener("USERAUTH_INFO_REQUEST", onUSERAUTH_INFO_REQUEST);
            /*if (self.config.agent && self._agentKeys)
                self._agentKeys = undefined;*/

            // start keepalive mechanism
            resetKA();

            clearTimeout(self._readyTimeout);

            self.emit("ready");
        }).on("USERAUTH_FAILURE", onUSERAUTH_FAILURE);
        // end authentication handling ===============================================

        // handle initial handshake completion
        stream.once("ready", () => {
            stream.service("ssh-userauth");
            stream.once("SERVICE_ACCEPT", (svcName) => {
                if (svcName === "ssh-userauth") {
                    tryNextAuth();
                }
            });
        });

        // handle incoming requests from server, typically a forwarded TCP or X11
        // connection
        stream.on("CHANNEL_OPEN", (info) => {
            onCHANNEL_OPEN(self, info);
        });

        // handle responses for tcpip-forward and other global requests
        stream.on("REQUEST_SUCCESS", (data) => {
            if (callbacks.length) {
                callbacks.shift()(false, data);
            }
        }).on("REQUEST_FAILURE", () => {
            if (callbacks.length) {
                callbacks.shift()(true);
            }
        });

        stream.on("GLOBAL_REQUEST", (name, wantReply, data) => {
            // auto-reject all global requests, this can be especially useful if the
            // server is sending us dummy keepalive global requests
            if (wantReply) {
                stream.requestFailure();
            }
        });

        if (!options.sock) {
            let host = this.config.hostname;
            const forceIPv4 = this.config.forceIPv4;
            const forceIPv6 = this.config.forceIPv6;

            debug(`DEBUG: Client: Trying ${
                host
                } on port ${
                this.config.port
                } ...`
            );

            function doConnect() {
                startTimeout();
                self._sock.connect(self.config.port, host);
                self._sock.setNoDelay(true);
                self._sock.setMaxListeners(0);
                self._sock.setTimeout(is.number(options.timeout) ? options.timeout : 0);
            }

            if ((!forceIPv4 && !forceIPv6) || (forceIPv4 && forceIPv6)) {
                doConnect();
            } else {
                dnsLookup(host, (forceIPv4 ? 4 : 6), (err, address, family) => {
                    if (err) {
                        const error = new Error(`Error while looking up ${
                            forceIPv4 ? "IPv4" : "IPv6"
                            } address for host ${
                            host
                            }: ${err}`);
                        clearTimeout(self._readyTimeout);
                        error.level = "client-dns";
                        self.emit("error", error);
                        self.emit("close");
                        return;
                    }
                    host = address;
                    doConnect();
                });
            }
        } else {
            startTimeout();
            stream.pipe(sock).pipe(stream);
        }

        function startTimeout() {
            if (self.config.readyTimeout > 0) {
                self._readyTimeout = setTimeout(() => {
                    const err = new Error("Timed out while waiting for handshake");
                    err.level = "client-timeout";
                    self.emit("error", err);
                    sock.destroy();
                }, self.config.readyTimeout);
            }
        }
    }

    end() {
        if (this._sock &&
            this._sock.writable &&
            this._sshstream &&
            this._sshstream.writable) {
            return this._sshstream.disconnect();
        }
        return false;
    }

    destroy() {
        this._sock && this._sock.destroy();
    }

    exec(cmd, opts, cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }

        const self = this;
        const extraOpts = {
            allowHalfOpen: (opts.allowHalfOpen !== false)
        };

        return openChannel(this, "session", extraOpts, (err, chan) => {
            if (err) {
                return cb(err);
            }

            const todo = [];

            function reqCb(err) {
                if (err) {
                    chan.close();
                    return cb(err);
                }
                if (todo.length) {
                    todo.shift()();
                }
            }

            if (self.config.allowAgentFwd === true ||
                (opts &&
                    opts.agentForward === true &&
                    self.config.agent !== undefined)) {
                todo.push(() => {
                    reqAgentFwd(chan, reqCb);
                });
            }

            if (typeof opts === "object") {
                if (typeof opts.env === "object") {
                    reqEnv(chan, opts.env);
                }
                if (typeof opts.pty === "object" || opts.pty === true) {
                    todo.push(() => {
                        reqPty(chan, opts.pty, reqCb);
                    });
                }
                if (typeof opts.x11 === "object" || opts.x11 === "number" || opts.x11 === true) {
                    todo.push(() => {
                        reqX11(chan, opts.x11, reqCb);
                    });
                }
            }

            todo.push(() => {
                reqExec(chan, cmd, opts, cb);
            });
            todo.shift()();
        });
    }

    shell(wndopts, opts, cb) {
        if (!this._sock || !this._sock.writable || !this._sshstream || !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        // start an interactive terminal/shell session
        const self = this;

        if (is.function(wndopts)) {
            cb = wndopts;
            wndopts = opts = undefined;
        } else if (is.function(opts)) {
            cb = opts;
            opts = undefined;
        }
        if (wndopts && wndopts.x11 !== undefined) {
            opts = wndopts;
            wndopts = undefined;
        }

        return openChannel(this, "session", (err, chan) => {
            if (err) {
                return cb(err);
            }

            const todo = [];

            function reqCb(err) {
                if (err) {
                    chan.close();
                    return cb(err);
                }
                if (todo.length) {
                    todo.shift()();
                }
            }

            if (self.config.allowAgentFwd === true ||
                (opts &&
                    opts.agentForward === true &&
                    self.config.agent !== undefined)) {
                todo.push(() => {
                    reqAgentFwd(chan, reqCb);
                });
            }

            if (wndopts !== false) {
                todo.push(() => {
                    reqPty(chan, wndopts, reqCb);
                });
            }

            if (typeof opts === "object") {
                if (typeof opts.x11 === "object" || opts.x11 === "number" || opts.x11 === true) {
                    todo.push(() => {
                        reqX11(chan, opts.x11, reqCb);
                    });
                }
            }

            todo.push(() => {
                reqShell(chan, cb);
            });
            todo.shift()();
        });
    }

    subsys(name, cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        return openChannel(this, "session", (err, chan) => {
            if (err) {
                return cb(err);
            }

            reqSubsystem(chan, name, (err, stream) => {
                if (err) {
                    return cb(err);
                }

                cb(undefined, stream);
            });
        });
    }

    sftp(cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        const self = this;

        // start an SFTP session
        return openChannel(this, "session", (err, chan) => {
            if (err) {
                return cb(err);
            }

            reqSubsystem(chan, "sftp", (err, stream) => {
                if (err) {
                    return cb(err);
                }

                const serverIdentRaw = self._sshstream._state.incoming.identRaw;
                const cfg = {
                    debug: self.config.debug
                };
                const sftp = new SFTPStream(cfg, serverIdentRaw);

                function onError(err) {
                    sftp.removeListener("ready", onReady);
                    stream.removeListener("exit", onExit);
                    cb(err);
                }

                function onReady() {
                    sftp.removeListener("error", onError);
                    stream.removeListener("exit", onExit);
                    cb(undefined, new SFTPWrapper(sftp));
                }

                function onExit(code, signal) {
                    sftp.removeListener("ready", onReady);
                    sftp.removeListener("error", onError);
                    let msg;
                    if (is.number(code)) {
                        msg = `Received exit code ${code} while establishing SFTP session`;
                    } else {
                        msg = `Received signal ${signal} while establishing SFTP session`;
                    }
                    const err = new Error(msg);
                    err.code = code;
                    err.signal = signal;
                    cb(err);
                }

                sftp.once("error", onError)
                    .once("ready", onReady)
                    .once("close", () => {
                        stream.end();
                    });

                // OpenSSH server sends an exit-status if there was a problem spinning up
                // an sftp server child process, so we listen for that here in order to
                // properly raise an error.
                stream.once("exit", onExit);

                sftp.pipe(stream).pipe(sftp);
            });
        });
    }

    forwardIn(bindAddr, bindPort, cb) {
        if (!this._sock || !this._sock.writable || !this._sshstream || !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        // send a request for the server to start forwarding TCP connections to us
        // on a particular address and port

        const self = this;
        const wantReply = is.function(cb);

        if (wantReply) {
            this._callbacks.push((hadErr, data) => {
                if (hadErr) {
                    return cb(hadErr !== true ? hadErr : new Error(`Unable to bind to ${bindAddr}:${bindPort}`));
                }

                let realPort = bindPort;
                if (bindPort === 0 && data && data.length >= 4) {
                    realPort = data.readUInt32BE(0, true);
                    if (!(self._sshstream.remoteBugs & BUGS.DYN_RPORT_BUG)) {
                        bindPort = realPort;
                    }
                }

                self._forwarding[`${bindAddr}:${bindPort}`] = realPort;

                cb(undefined, realPort);
            });
        }

        return this._sshstream.tcpipForward(bindAddr, bindPort, wantReply);
    }

    unforwardIn(bindAddr, bindPort, cb) {
        if (!this._sock || !this._sock.writable || !this._sshstream || !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        // send a request to stop forwarding us new connections for a particular
        // address and port

        const self = this;
        const wantReply = is.function(cb);

        if (wantReply) {
            this._callbacks.push((hadErr) => {
                if (hadErr) {
                    return cb(hadErr !== true ? hadErr : new Error(`Unable to unbind from ${bindAddr}:${bindPort}`));
                }

                delete self._forwarding[`${bindAddr}:${bindPort}`];

                cb();
            });
        }

        return this._sshstream.cancelTcpipForward(bindAddr, bindPort, wantReply);
    }

    forwardOut(srcIP, srcPort, dstIP, dstPort, cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        // send a request to forward a TCP connection to the server

        const cfg = {
            srcIP,
            srcPort,
            dstIP,
            dstPort
        };

        return openChannel(this, "direct-tcpip", cfg, cb);
    }

    openssh_noMoreSessions(cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        const wantReply = is.function(cb);

        if (!this.config.strictVendor ||
            (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
            if (wantReply) {
                this._callbacks.push((hadErr) => {
                    if (hadErr) {
                        return cb(hadErr !== true ? hadErr : new Error("Unable to disable future sessions"));
                    }

                    cb();
                });
            }

            return this._sshstream.openssh_noMoreSessions(wantReply);
        } else if (wantReply) {
            process.nextTick(() => {
                cb(new Error("strictVendor enabled and server is not OpenSSH or compatible version"));
            });
        }

        return true;
    }

    openssh_forwardInStreamLocal(socketPath, cb) {
        if (!this._sock || !this._sock.writable || !this._sshstream || !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        const wantReply = is.function(cb);

        if (!this.config.strictVendor ||
            (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
            if (wantReply) {
                this._callbacks.push((hadErr) => {
                    if (hadErr) {
                        return cb(hadErr !== true ? hadErr : new Error(`Unable to bind to ${socketPath}`));
                    }

                    cb();
                });
            }

            return this._sshstream.openssh_streamLocalForward(socketPath, wantReply);
        } else if (wantReply) {
            process.nextTick(() => {
                cb(new Error("strictVendor enabled and server is not OpenSSH or compatible version"));
            });
        }

        return true;
    }

    openssh_unforwardInStreamLocal(socketPath, cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        const wantReply = is.function(cb);

        if (!this.config.strictVendor ||
            (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
            if (wantReply) {
                this._callbacks.push((hadErr) => {
                    if (hadErr) {
                        return cb(hadErr !== true ? hadErr : new Error(`Unable to unbind on ${socketPath}`));
                    }

                    cb();
                });
            }

            return this._sshstream.openssh_cancelStreamLocalForward(socketPath, wantReply);
        } else if (wantReply) {
            process.nextTick(() => {
                cb(new Error("strictVendor enabled and server is not OpenSSH or compatible version"));
            });
        }

        return true;
    }

    openssh_forwardOutStreamLocal(socketPath, cb) {
        if (!this._sock ||
            !this._sock.writable ||
            !this._sshstream ||
            !this._sshstream.writable) {
            throw new Error("Not connected");
        }

        if (!this.config.strictVendor ||
            (this.config.strictVendor && RE_OPENSSH.test(this._remoteVer))) {
            const cfg = {
                socketPath
            };
            return openChannel(this, "direct-streamlocal@openssh.com", cfg, cb);
        } else {
            process.nextTick(() => {
                cb(new Error("strictVendor enabled and server is not OpenSSH or compatible version"));
            });
        }

        return true;
    }
}
// expose useful SFTPStream constants for sftp server usage
Client.SFTP_STATUS_CODE = SFTPStream.STATUS_CODE;
Client.SFTP_OPEN_MODE = SFTPStream.OPEN_MODE;
