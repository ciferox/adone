const { is } = adone;

class Event {
    constructor(type, target) {
        this.target = target;
        this.type = type;
    }
}

class MessageEvent extends Event {
    constructor(data, target) {
        super("message", target);

        this.data = data;
    }
}

class CloseEvent extends Event {
    constructor(code, reason, target) {
        super("close", target);

        this.wasClean = is.undefined(code) || code === 1000 || (code >= 3000 && code <= 4999);
        this.reason = reason;
        this.code = code;
    }
}

class OpenEvent extends Event {
    constructor(target) {
        super("open", target);
    }
}

const EventTarget = {
    addEventListener(method, listener) {
        if (!is.function(listener)) {
            return;
        }

        const onMessage = (data) => {
            listener.call(this, new MessageEvent(data, this));
        };

        const onClose = (code, message) => {
            listener.call(this, new CloseEvent(code, message, this));
        };

        const onError = (event) => {
            event.type = "error";
            event.target = this;
            listener.call(this, event);
        };

        const onOpen = () => {
            listener.call(this, new OpenEvent(this));
        };

        if (method === "message") {
            onMessage._listener = listener;
            this.on(method, onMessage);
        } else if (method === "close") {
            onClose._listener = listener;
            this.on(method, onClose);
        } else if (method === "error") {
            onError._listener = listener;
            this.on(method, onError);
        } else if (method === "open") {
            onOpen._listener = listener;
            this.on(method, onOpen);
        } else {
            this.on(method, listener);
        }
    },

    removeEventListener(method, listener) {
        const listeners = this.listeners(method);

        for (let i = 0; i < listeners.length; i++) {
            if (listeners[i] === listener || listeners[i]._listener === listener) {
                this.removeListener(method, listeners[i]);
            }
        }
    }
};

const protocolVersions = [8, 13];
const closeTimeout = 30 * 1000; // Allow 30 seconds to terminate the connection cleanly.

export default class Client extends adone.event.EventEmitter {
    constructor(address, protocols, options) {
        super();

        if (!protocols) {
            protocols = [];
        } else if (is.string(protocols)) {
            protocols = [protocols];
        } else if (!is.array(protocols)) {
            options = protocols;
            protocols = [];
        }

        this.readyState = Client.CONNECTING;
        this.bytesReceived = 0;
        this.extensions = {};
        this.protocol = "";

        this._binaryType = adone.net.ws.constants.BINARY_TYPES[0];
        this._finalize = this.finalize.bind(this);
        this._finalizeCalled = false;
        this._closeMessage = null;
        this._closeTimer = null;
        this._closeCode = null;
        this._receiver = null;
        this._sender = null;
        this._socket = null;

        if (is.array(address)) {
            this.protocolVersion = options.protocolVersion;
            this.extensions = options.extensions || {};
            this._maxPayload = options.maxPayload;
            this.protocol = options.protocol;

            this._isServer = true;

            this.setSocket(address[0], address[1]);
        } else {
            options = Object.assign({
                protocolVersion: protocolVersions[1],
                protocol: protocols.join(","),
                perMessageDeflate: true,
                handshakeTimeout: null,
                localAddress: null,
                headers: null,
                family: null,
                origin: null,
                agent: null,
                host: null,

                //
                // SSL options.
                //
                checkServerIdentity: null,
                rejectUnauthorized: null,
                passphrase: null,
                ciphers: null,
                ecdhCurve: null,
                cert: null,
                key: null,
                pfx: null,
                ca: null
            }, options);

            if (!protocolVersions.includes(options.protocolVersion)) {
                throw new Error(`Unsupported protocol version: ${options.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`);
            }

            this.protocolVersion = options.protocolVersion;
            this._isServer = false;
            this.url = address;

            const serverUrl = adone.std.url.parse(address);
            const isUnixSocket = serverUrl.protocol === "ws+unix:";

            if (!serverUrl.host && (!isUnixSocket || !serverUrl.path)) {
                throw new Error("invalid url");
            }

            const isSecure = serverUrl.protocol === "wss:" || serverUrl.protocol === "https:";
            const key = adone.std.crypto.randomBytes(16).toString("base64");
            const httpObj = isSecure ? adone.std.https : adone.std.http;

            //
            // Prepare extensions.
            //
            const extensionsOffer = {};
            let perMessageDeflate;

            if (options.perMessageDeflate) {
                perMessageDeflate = new adone.net.ws.PerMessageDeflate(options.perMessageDeflate !== true ? options.perMessageDeflate : {}, false);
                extensionsOffer[adone.net.ws.PerMessageDeflate.extensionName] = perMessageDeflate.offer();
            }

            const requestOptions = {
                port: serverUrl.port || (isSecure ? 443 : 80),
                host: serverUrl.hostname,
                path: "/",
                headers: {
                    "Sec-WebSocket-Version": options.protocolVersion,
                    "Sec-WebSocket-Key": key,
                    Connection: "Upgrade",
                    Upgrade: "websocket"
                }
            };

            if (options.headers) {
                Object.assign(requestOptions.headers, options.headers);
            }
            if (Object.keys(extensionsOffer).length) {
                requestOptions.headers["Sec-WebSocket-Extensions"] = adone.net.ws.exts.format(extensionsOffer);
            }
            if (options.protocol) {
                requestOptions.headers["Sec-WebSocket-Protocol"] = options.protocol;
            }
            if (options.origin) {
                if (options.protocolVersion < 13) {
                    requestOptions.headers["Sec-WebSocket-Origin"] = options.origin;
                } else {
                    requestOptions.headers.Origin = options.origin;
                }
            }
            if (options.host) {
                requestOptions.headers.Host = options.host;
            }
            if (serverUrl.auth) {
                requestOptions.auth = serverUrl.auth;
            }

            if (options.localAddress) {
                requestOptions.localAddress = options.localAddress;
            }
            if (options.family) {
                requestOptions.family = options.family;
            }

            if (isUnixSocket) {
                const parts = serverUrl.path.split(":");

                requestOptions.socketPath = parts[0];
                requestOptions.path = parts[1];
            } else if (serverUrl.path) {
                //
                // Make sure that path starts with `/`.
                //
                if (serverUrl.path.charAt(0) !== "/") {
                    requestOptions.path = `/${serverUrl.path}`;
                } else {
                    requestOptions.path = serverUrl.path;
                }
            }

            let agent = options.agent;

            //
            // A custom agent is required for these options.
            //
            if (
                is.exist(options.rejectUnauthorized) ||
                options.checkServerIdentity ||
                options.passphrase ||
                options.ciphers ||
                options.ecdhCurve ||
                options.cert ||
                options.key ||
                options.pfx ||
                options.ca
            ) {
                if (options.passphrase) {
                    requestOptions.passphrase = options.passphrase;
                }
                if (options.ciphers) {
                    requestOptions.ciphers = options.ciphers;
                }
                if (options.ecdhCurve) {
                    requestOptions.ecdhCurve = options.ecdhCurve;
                }
                if (options.cert) {
                    requestOptions.cert = options.cert;
                }
                if (options.key) {
                    requestOptions.key = options.key;
                }
                if (options.pfx) {
                    requestOptions.pfx = options.pfx;
                }
                if (options.ca) {
                    requestOptions.ca = options.ca;
                }
                if (options.checkServerIdentity) {
                    requestOptions.checkServerIdentity = options.checkServerIdentity;
                }
                if (is.exist(options.rejectUnauthorized)) {
                    requestOptions.rejectUnauthorized = options.rejectUnauthorized;
                }

                if (!agent) {
                    agent = new httpObj.Agent(requestOptions);
                }
            }

            if (agent) {
                requestOptions.agent = agent;
            }

            this._req = httpObj.get(requestOptions);
            if (options.handshakeTimeout) {
                this._req.setTimeout(options.handshakeTimeout, () => {
                    this._req.abort();
                    this.emit("error", new Error("Opening handshake has timed out"));
                    this.finalize(true);
                });
            }

            this._req.once("error", (error) => {
                if (this._req.aborted) {
                    return;
                }

                this._req = null;
                this.emit("error", error);
                this.finalize(true);
            });

            this._req.on("response", (res) => {
                if (!this.emit("unexpected-response", this._req, res)) {
                    this._req.abort();
                    this.emit("error", new Error(`Unexpected server response (${res.statusCode})`));
                    this.finalize(true);
                }
            });

            this._req.on("upgrade", (res, socket, head) => {
                this.emit("headers", res.headers, res);

                //
                // The user may have closed the connection from a listener of the `headers`
                // event.
                //
                if (this.readyState !== Client.CONNECTING) {
                    return;
                }

                this._req = null;

                const digest = adone.std.crypto.createHash("sha1")
                    .update(key + adone.net.ws.constants.GUID, "binary")
                    .digest("base64");

                if (res.headers["sec-websocket-accept"] !== digest) {
                    socket.destroy();
                    this.emit("error", new Error("invalid server key"));
                    return this.finalize(true);
                }

                const serverProt = res.headers["sec-websocket-protocol"];
                const protList = (options.protocol || "").split(/, */);
                let protError;

                if (!options.protocol && serverProt) {
                    protError = "Server sent a subprotocol even though none requested";
                } else if (options.protocol && !serverProt) {
                    protError = "Server sent no subprotocol even though requested";
                } else if (serverProt && !protList.includes(serverProt)) {
                    protError = "Server responded with an invalid protocol";
                }

                if (protError) {
                    socket.destroy();
                    this.emit("error", new Error(protError));
                    return this.finalize(true);
                }

                if (serverProt) {
                    this.protocol = serverProt;
                }

                const serverExtensions = adone.net.ws.exts.parse(res.headers["sec-websocket-extensions"]);

                if (perMessageDeflate && serverExtensions[adone.net.ws.PerMessageDeflate.extensionName]) {
                    try {
                        perMessageDeflate.accept(serverExtensions[adone.net.ws.PerMessageDeflate.extensionName]);
                    } catch (err) {
                        socket.destroy();
                        this.emit("error", new Error("Invalid extension parameter"));
                        return this.finalize(true);
                    }

                    this.extensions[adone.net.ws.PerMessageDeflate.extensionName] = perMessageDeflate;
                }

                this.setSocket(socket, head);
            });

        }
    }

    get CONNECTING() {
        return Client.CONNECTING;
    }
    get CLOSING() {
        return Client.CLOSING;
    }
    get CLOSED() {
        return Client.CLOSED;
    }
    get OPEN() {
        return Client.OPEN;
    }

    get bufferedAmount() {
        let amount = 0;

        if (this._socket) {
            amount = this._socket.bufferSize + this._sender._bufferedBytes;
        }
        return amount;
    }

    get binaryType() {
        return this._binaryType;
    }

    set binaryType(type) {
        if (!adone.net.ws.constants.BINARY_TYPES.includes(type)) {
            return;
        }

        this._binaryType = type;

        //
        // Allow to change `binaryType` on the fly.
        //
        if (this._receiver) {
            this._receiver._binaryType = type;
        }
    }

    setSocket(socket, head) {
        socket.setTimeout(0);
        socket.setNoDelay();

        this._receiver = new adone.net.ws.Receiver(this.extensions, this._maxPayload, this.binaryType);
        this._sender = new adone.net.ws.Sender(socket, this.extensions);
        this._socket = socket;

        // socket cleanup handlers
        socket.on("close", this._finalize);
        socket.on("error", this._finalize);
        socket.on("end", this._finalize);

        // ensure that the head is added to the receiver
        if (head.length > 0) {
            socket.unshift(head);
        }

        // subsequent packets are pushed to the receiver
        socket.on("data", (data) => {
            this.bytesReceived += data.length;
            this._receiver.add(data);
        });

        // receiver event handlers
        this._receiver.onmessage = (data) => this.emit("message", data);
        this._receiver.onping = (data) => {
            this.pong(data, !this._isServer, true);
            this.emit("ping", data);
        };
        this._receiver.onpong = (data) => this.emit("pong", data);
        this._receiver.onclose = (code, reason) => {
            this._closeMessage = reason;
            this._closeCode = code;
            this.close(code, reason);
        };
        this._receiver.onerror = (error, code) => {
            // close the connection when the receiver reports a HyBi error code
            this.close(code, "");
            this.emit("error", error);
        };

        this.readyState = Client.OPEN;
        this.emit("open");
    }

    finalize(error) {
        if (this._finalizeCalled) {
            return;
        }

        this.readyState = Client.CLOSING;
        this._finalizeCalled = true;

        clearTimeout(this._closeTimer);
        this._closeTimer = null;

        //
        // If the connection was closed abnormally (with an error), or if the close
        // control frame was malformed or not received then the close code must be
        // 1006.
        //
        if (error) {
            this._closeCode = 1006;
        }

        if (this._socket) {
            this._socket.removeListener("error", this._finalize);
            this._socket.removeListener("close", this._finalize);
            this._socket.removeListener("end", this._finalize);
            this._socket.on("error", function onerror() {
                this.destroy();
            });

            if (!error) {
                this._socket.end();
            } else {
                this._socket.destroy();
            }

            this._receiver.cleanup(() => this.emitClose());

            this._receiver = null;
            this._sender = null;
            this._socket = null;
        } else {
            this.emitClose();
        }
    }

    emitClose() {
        this.readyState = Client.CLOSED;
        this.emit("close", this._closeCode || 1006, this._closeMessage || "");

        if (this.extensions[adone.net.ws.PerMessageDeflate.extensionName]) {
            this.extensions[adone.net.ws.PerMessageDeflate.extensionName].cleanup();
        }

        this.extensions = null;

        this.removeAllListeners();
        this.on("error", adone.noop); // Catch all errors after this.
    }

    pause() {
        if (this.readyState !== Client.OPEN) {
            throw new Error("not opened");
        }

        this._socket.pause();
    }

    resume() {
        if (this.readyState !== Client.OPEN) {
            throw new Error("not opened");
        }

        this._socket.resume();
    }

    close(code, data) {
        if (this.readyState === Client.CLOSED) {
            return;
        }
        if (this.readyState === Client.CONNECTING) {
            if (this._req && !this._req.aborted) {
                this._req.abort();
                this.emit("error", new Error("Closed before the connection is established"));
                this.finalize(true);
            }
            return;
        }

        if (this.readyState === Client.CLOSING) {
            if (this._closeCode && this._socket) {
                this._socket.end();
            }
            return;
        }

        this.readyState = Client.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
            if (err) {
                this.emit("error", err);
            }

            if (this._socket) {
                if (this._closeCode) {
                    this._socket.end();
                }
                //
                // Ensure that the connection is cleaned up even when the closing
                // handshake fails.
                //
                clearTimeout(this._closeTimer);
                this._closeTimer = setTimeout(this._finalize, closeTimeout, true);
            }
        });
    }

    ping(data, mask, failSilently) {
        if (this.readyState !== Client.OPEN) {
            if (failSilently) {
                return;
            }
            throw new Error("not opened");
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.ping(data || adone.emptyBuffer, mask);
    }

    pong(data, mask, failSilently) {
        if (this.readyState !== Client.OPEN) {
            if (failSilently) {
                return;
            }
            throw new Error("not opened");
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.pong(data || adone.emptyBuffer, mask);
    }

    send(data, options, cb) {
        if (is.function(options)) {
            cb = options;
            options = {};
        }

        if (this.readyState !== Client.OPEN) {
            if (cb) {
                return cb(new Error("not opened"));
            }
            throw new Error("not opened");
        }

        if (is.number(data)) {
            data = data.toString();
        }

        const opts = Object.assign({
            binary: !is.string(data),
            mask: !this._isServer,
            compress: true,
            fin: true
        }, options);

        if (!this.extensions[adone.net.ws.PerMessageDeflate.extensionName]) {
            opts.compress = false;
        }
        this._sender.send(data || adone.emptyBuffer, opts, cb);
    }

    terminate() {
        if (this.readyState === Client.CLOSED) {
            return;
        }
        if (this.readyState === Client.CONNECTING) {
            if (this._req && !this._req.aborted) {
                this._req.abort();
                this.emit("error", new Error("Closed before the connection is established"));
                this.finalize(true);
            }
            return;
        }

        this.finalize(true);
    }
}

Client.CONNECTING = 0;
Client.OPEN = 1;
Client.CLOSING = 2;
Client.CLOSED = 3;

//
// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
//
["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(Client.prototype, `on${method}`, {
        get() {
            const listeners = this.listeners(method);
            for (let i = 0; i < listeners.length; i++) {
                if (listeners[i]._listener) {
                    return listeners[i]._listener;
                }
            }
        },
        set(listener) {
            const listeners = this.listeners(method);
            for (let i = 0; i < listeners.length; i++) {
                //
                // Remove only the listeners added via `addEventListener`.
                //
                if (listeners[i]._listener) {
                    this.removeListener(method, listeners[i]);
                }
            }
            this.addEventListener(method, listener);
        }
    });
});

Client.prototype.addEventListener = EventTarget.addEventListener;
Client.prototype.removeEventListener = EventTarget.removeEventListener;
