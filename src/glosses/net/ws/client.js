const {
    is,
    net: { ws: { Receiver, Sender, constants, PerMessageDeflate } },
    std: { url, crypto, http, https }
} = adone;

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

        this.wasClean = target._closeFrameReceived && target._closeFrameSent;
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

/**
 * Initialize a Client client.
 *
 * @param {String} address The URL to which to connect
 * @param {String[]} protocols The list of subprotocols
 * @param {Object} options Connection options
 * @param {String} options.protocol Value of the `Sec-WebSocket-Protocol` header
 * @param {(Boolean|Object)} options.perMessageDeflate Enable/disable permessage-deflate
 * @param {Number} options.handshakeTimeout Timeout in milliseconds for the handshake request
 * @param {String} options.localAddress Local interface to bind for network connections
 * @param {Number} options.protocolVersion Value of the `Sec-WebSocket-Version` header
 * @param {Object} options.headers An object containing request headers
 * @param {String} options.origin Value of the `Origin` or `Sec-WebSocket-Origin` header
 * @param {http.Agent} options.agent Use the specified Agent
 * @param {String} options.host Value of the `Host` header
 * @param {Number} options.family IP address family to use during hostname lookup (4 or 6).
 * @param {Function} options.checkServerIdentity A function to validate the server hostname
 * @param {Boolean} options.rejectUnauthorized Verify or not the server certificate
 * @param {String} options.passphrase The passphrase for the private key or pfx
 * @param {String} options.ciphers The ciphers to use or exclude
 * @param {String} options.ecdhCurve The curves for ECDH key agreement to use or exclude
 * @param {(String|String[]|Buffer|Buffer[])} options.cert The certificate key
 * @param {(String|String[]|Buffer|Buffer[])} options.key The private key
 * @param {(String|Buffer)} options.pfx The private key, certificate, and CA certs
 * @param {(String|String[]|Buffer|Buffer[])} options.ca Trusted certificates
 * @private
 */
const initAsClient = function (address, protocols, options) {
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

    const serverUrl = url.parse(address);
    const isUnixSocket = serverUrl.protocol === "ws+unix:";

    if (!serverUrl.host && (!isUnixSocket || !serverUrl.path)) {
        throw new Error("Invalid url");
    }

    const isSecure = serverUrl.protocol === "wss:" || serverUrl.protocol === "https:";
    const key = crypto.randomBytes(16).toString("base64");
    const httpObj = isSecure ? https : http;
    let perMessageDeflate;

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
    if (options.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
            options.perMessageDeflate !== true ? options.perMessageDeflate : {},
            false
        );
        requestOptions.headers["Sec-WebSocket-Extensions"] = adone.net.ws.exts.format({
            [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
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
        !is.nil(options.rejectUnauthorized) ||
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
        if (!is.nil(options.rejectUnauthorized)) {
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
            this.finalize(new Error("Opening handshake has timed out"));
        });
    }

    this._req.on("error", (error) => {
        if (this._req.aborted) {
            return;
        }

        this._req = null;
        this.finalize(error);
    });

    this._req.on("response", (res) => {
        if (!this.emit("unexpected-response", this._req, res)) {
            this._req.abort();
            this.finalize(new Error(`Unexpected server response (${res.statusCode})`));
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

        const digest = crypto.createHash("sha1")
            .update(key + constants.GUID, "binary")
            .digest("base64");

        if (res.headers["sec-websocket-accept"] !== digest) {
            socket.destroy();
            return this.finalize(new Error("Invalid server key"));
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
            return this.finalize(new Error(protError));
        }

        if (serverProt) {
            this.protocol = serverProt;
        }

        if (perMessageDeflate) {
            try {
                const serverExtensions = adone.net.ws.exts.parse(
                    res.headers["sec-websocket-extensions"]
                );

                if (serverExtensions[PerMessageDeflate.extensionName]) {
                    perMessageDeflate.accept(
                        serverExtensions[PerMessageDeflate.extensionName]
                    );
                    this.extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
                }
            } catch (err) {
                socket.destroy();
                this.finalize(new Error("Invalid Sec-WebSocket-Extensions header"));
                return;
            }
        }

        this.setSocket(socket, head);
    });
};

/**
 * Initialize a Client server client.
 *
 * @param {http.IncomingMessage} req The request object
 * @param {net.Socket} socket The network socket between the server and client
 * @param {Buffer} head The first packet of the upgraded stream
 * @param {Object} options Client attributes
 * @param {Number} options.protocolVersion The Client protocol version
 * @param {Object} options.extensions The negotiated extensions
 * @param {Number} options.maxPayload The maximum allowed message size
 * @param {String} options.protocol The chosen subprotocol
 * @private
 */
const initAsServerClient = function (socket, head, options) {
    this.protocolVersion = options.protocolVersion;
    this._maxPayload = options.maxPayload;
    this.extensions = options.extensions;
    this.protocol = options.protocol;

    this._isServer = true;

    this.setSocket(socket, head);
};

/**
 * Class representing a Client.
 *
 * @extends EventEmitter
 */
export default class Client extends adone.event.EventEmitter {
    /**
     * Create a new `Client`.
     *
     * @param {String} address The URL to which to connect
     * @param {(String|String[])} protocols The subprotocols
     * @param {Object} options Connection options
     */
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

        this._binaryType = constants.BINARY_TYPES[0];
        this._finalize = this.finalize.bind(this);
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = "";
        this._closeTimer = null;
        this._finalized = false;
        this._closeCode = 1006;
        this._receiver = null;
        this._sender = null;
        this._socket = null;

        if (is.array(address)) {
            initAsServerClient.call(this, address[0], address[1], options);
        } else {
            initAsClient.call(this, address, protocols, options);
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

    /**
     * @type {Number}
     */
    get bufferedAmount() {
        let amount = 0;

        if (this._socket) {
            amount = this._socket.bufferSize + this._sender._bufferedBytes;
        }
        return amount;
    }

    /**
     * This deviates from the WHATWG interface since ws doesn't support the required
     * default "blob" type (instead we define a custom "nodebuffer" type).
     *
     * @type {String}
     */
    get binaryType() {
        return this._binaryType;
    }

    set binaryType(type) {
        if (!constants.BINARY_TYPES.includes(type)) {
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

    /**
     * Set up the socket and the internal resources.
     *
     * @param {net.Socket} socket The network socket between the server and client
     * @param {Buffer} head The first packet of the upgraded stream
     * @private
     */
    setSocket(socket, head) {
        socket.setTimeout(0);
        socket.setNoDelay();

        this._receiver = new Receiver(this.extensions, this._maxPayload, this.binaryType);
        this._sender = new Sender(socket, this.extensions);
        this._socket = socket;

        // socket cleanup handlers
        socket.on("close", this._finalize);
        socket.on("error", this._finalize);
        socket.on("end", this._finalize);

        if (head.length > 0) {
            socket.unshift(head);
        }

        socket.on("data", (data) => {
            this.bytesReceived += data.length;
            this._receiver.add(data);
        });

        this._receiver.onmessage = (data) => this.emit("message", data);
        this._receiver.onping = (data) => {
            this.pong(data, !this._isServer, true);
            this.emit("ping", data);
        };
        this._receiver.onpong = (data) => this.emit("pong", data);
        this._receiver.onclose = (code, reason) => {
            this._closeFrameReceived = true;
            this._closeMessage = reason;
            this._closeCode = code;
            if (!this._finalized) {
                this.close(code, reason);
            }
        };
        this._receiver.onerror = (error, code) => {
            this._closeMessage = "";
            this._closeCode = code;

            //
            // Ensure that the error is emitted even if `Client#finalize()` has
            // already been called.
            //
            this.readyState = Client.CLOSING;
            this.emit("error", error);
            this.finalize(true);
        };

        this.readyState = Client.OPEN;
        this.emit("open");
    }

    /**
     * Clean up and release internal resources.
     *
     * @param {(Boolean|Error)} error Indicates whether or not an error occurred
     * @private
     */
    finalize(error) {
        if (this._finalized) {
            return;
        }

        this.readyState = Client.CLOSING;
        this._finalized = true;

        if (typeof error === "object") {
            this.emit("error", error);
        }
        if (!this._socket) {
            return this.emitClose();
        }

        clearTimeout(this._closeTimer);
        this._closeTimer = null;

        this._socket.removeListener("error", this._finalize);
        this._socket.removeListener("close", this._finalize);
        this._socket.removeListener("end", this._finalize);
        this._socket.on("error", adone.noop);

        if (!error) {
            this._socket.end();
        } else {
            this._socket.destroy();
        }

        this._socket = null;
        this._sender = null;

        this._receiver.cleanup(() => this.emitClose());
        this._receiver = null;
    }

    /**
     * Emit the `close` event.
     *
     * @private
     */
    emitClose() {
        this.readyState = Client.CLOSED;

        this.emit("close", this._closeCode, this._closeMessage);

        if (this.extensions[PerMessageDeflate.extensionName]) {
            this.extensions[PerMessageDeflate.extensionName].cleanup();
        }

        this.extensions = null;

        this.removeAllListeners();
    }

    /**
     * Pause the socket stream.
     *
     * @public
     */
    pause() {
        if (this.readyState !== Client.OPEN) {
            throw new Error("Not opened");
        }

        this._socket.pause();
    }

    /**
     * Resume the socket stream
     *
     * @public
     */
    resume() {
        if (this.readyState !== Client.OPEN) {
            throw new Error("Not opened");
        }

        this._socket.resume();
    }

    /**
     * Start a closing handshake.
     *
     *            +----------+     +-----------+   +----------+
     *     + - - -|ws.close()|---->|close frame|-->|ws.close()|- - - -
     *            +----------+     +-----------+   +----------+       |
     *     |      +----------+     +-----------+         |
     *            |ws.close()|<----|close frame|<--------+            |
     *            +----------+     +-----------+         |
     *  CLOSING         |              +---+             |         CLOSING
     *                  |          +---|fin|<------------+
     *     |            |          |   +---+                          |
     *                  |          |   +---+      +-------------+
     *     |            +----------+-->|fin|----->|ws.finalize()| - - +
     *                             |   +---+      +-------------+
     *     |     +-------------+   |
     *      - - -|ws.finalize()|<--+
     *           +-------------+
     *
     * @param {Number} code Status code explaining why the connection is closing
     * @param {String} data A string explaining why the connection is closing
     * @public
     */
    close(code, data) {
        if (this.readyState === Client.CLOSED) {
            return;
        }
        if (this.readyState === Client.CONNECTING) {
            this._req.abort();
            this.finalize(new Error("Closed before the connection is established"));
            return;
        }

        if (this.readyState === Client.CLOSING) {
            if (this._closeFrameSent && this._closeFrameReceived) {
                this._socket.end();
            }
            return;
        }

        this.readyState = Client.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
            //
            // This error is handled by the `'error'` listener on the socket. We only
            // want to know if the close frame has been sent here.
            //
            if (err) {
                return;
            }

            this._closeFrameSent = true;

            if (!this._finalized) {
                if (this._closeFrameReceived) {
                    this._socket.end();
                }

                //
                // Ensure that the connection is cleaned up even when the closing
                // handshake fails.
                //
                this._closeTimer = setTimeout(this._finalize, closeTimeout, true);
            }
        });
    }

    /**
     * Send a ping message.
     *
     * @param {*} data The message to send
     * @param {Boolean} mask Indicates whether or not to mask `data`
     * @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
     * @public
     */
    ping(data, mask, failSilently) {
        if (this.readyState !== Client.OPEN) {
            if (failSilently) {
                return;
            }
            throw new Error("Not opened");
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.ping(data || adone.EMPTY_BUFFER, mask);
    }

    /**
     * Send a pong message.
     *
     * @param {*} data The message to send
     * @param {Boolean} mask Indicates whether or not to mask `data`
     * @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
     * @public
     */
    pong(data, mask, failSilently) {
        if (this.readyState !== Client.OPEN) {
            if (failSilently) {
                return;
            }
            throw new Error("Not opened");
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.pong(data || adone.EMPTY_BUFFER, mask);
    }

    /**
     * Send a data message.
     *
     * @param {*} data The message to send
     * @param {Object} options Options object
     * @param {Boolean} options.compress Specifies whether or not to compress `data`
     * @param {Boolean} options.binary Specifies whether `data` is binary or text
     * @param {Boolean} options.fin Specifies whether the fragment is the last one
     * @param {Boolean} options.mask Specifies whether or not to mask `data`
     * @param {Function} cb Callback which is executed when data is written out
     * @public
     */
    send(data, options, cb) {
        if (is.function(options)) {
            cb = options;
            options = {};
        }

        if (this.readyState !== Client.OPEN) {
            if (cb) {
                return cb(new Error("Not opened"));
            }
            throw new Error("Not opened");
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

        if (!this.extensions[PerMessageDeflate.extensionName]) {
            opts.compress = false;
        }

        this._sender.send(data || adone.EMPTY_BUFFER, opts, cb);
    }

    /**
     * Forcibly close the connection.
     *
     * @public
     */
    terminate() {
        if (this.readyState === Client.CLOSED) {
            return;
        }
        if (this.readyState === Client.CONNECTING) {
            this._req.abort();
            this.finalize(new Error("Closed before the connection is established"));
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
        /**
         * Return the listener of the event.
         *
         * @return {(Function|undefined)} The event listener or `undefined`
         * @public
         */
        get() {
            const listeners = this.listeners(method);
            for (let i = 0; i < listeners.length; i++) {
                if (listeners[i]._listener) {
                    return listeners[i]._listener;
                }
            }
        },
        /**
         * Add a listener for the event.
         *
         * @param {Function} listener The listener to add
         * @public
         */
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
