const {
    is,
    event,
    net: { ws: { constants, extension, Receiver, Sender, PerMessageDeflate } },
    std: { crypto, http, https, url, net, tls }
} = adone;

/**
 * Class representing an event.
 *
 * @private
 */
class Event {
    /**
     * Create a new `Event`.
     *
     * @param {String} type The name of the event
     * @param {Object} target A reference to the target to which the event was dispatched
     */
    constructor(type, target) {
        this.target = target;
        this.type = type;
    }
}

/**
 * Class representing a message event.
 *
 * @extends Event
 * @private
 */
class MessageEvent extends Event {
    /**
     * Create a new `MessageEvent`.
     *
     * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The received data
     * @param {WebSocket} target A reference to the target to which the event was dispatched
     */
    constructor(data, target) {
        super("message", target);

        this.data = data;
    }
}

/**
 * Class representing a close event.
 *
 * @extends Event
 * @private
 */
class CloseEvent extends Event {
    /**
     * Create a new `CloseEvent`.
     *
     * @param {Number} code The status code explaining why the connection is being closed
     * @param {String} reason A human-readable string explaining why the connection is closing
     * @param {WebSocket} target A reference to the target to which the event was dispatched
     */
    constructor(code, reason, target) {
        super("close", target);

        this.wasClean = target._closeFrameReceived && target._closeFrameSent;
        this.reason = reason;
        this.code = code;
    }
}

/**
 * Class representing an open event.
 *
 * @extends Event
 * @private
 */
class OpenEvent extends Event {
    /**
     * Create a new `OpenEvent`.
     *
     * @param {WebSocket} target A reference to the target to which the event was dispatched
     */
    constructor(target) {
        super("open", target);
    }
}

/**
 * Class representing an error event.
 *
 * @extends Event
 * @private
 */
class ErrorEvent extends Event {
    /**
     * Create a new `ErrorEvent`.
     *
     * @param {Object} error The error that generated this event
     * @param {WebSocket} target A reference to the target to which the event was dispatched
     */
    constructor(error, target) {
        super("error", target);

        this.message = error.message;
        this.error = error;
    }
}

/**
 * This provides methods for emulating the `EventTarget` interface. It's not
 * meant to be used directly.
 *
 * @mixin
 */
const EventTarget = {
    /**
     * Register an event listener.
     *
     * @param {String} method A string representing the event type to listen for
     * @param {Function} listener The listener to add
     * @public
     */
    addEventListener(method, listener) {
        if (!is.function(listener)) {
            return;
        }

        const onMessage = function (data) {
            listener.call(this, new MessageEvent(data, this));
        };

        const onClose = function (code, message) {
            listener.call(this, new CloseEvent(code, message, this));
        };

        const onError = function (error) {
            listener.call(this, new ErrorEvent(error, this));
        };

        const onOpen = function () {
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

    /**
     * Remove an event listener.
     *
     * @param {String} method A string representing the event type to remove
     * @param {Function} listener The listener to remove
     * @public
     */
    removeEventListener(method, listener) {
        const listeners = this.listeners(method);

        for (let i = 0; i < listeners.length; i++) {
            if (listeners[i] === listener || listeners[i]._listener === listener) {
                this.removeListener(method, listeners[i]);
            }
        }
    }
};

const readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
const protocolVersions = [8, 13];
const closeTimeout = 30 * 1000; // Allow 30 seconds to terminate the connection cleanly.
const kWebSocket = constants.kWebSocket;

/**
 * Abort the handshake and emit an error.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {(http.ClientRequest|net.Socket)} stream The request to abort or the
 *     socket to destroy
 * @param {String} message The error message
 * @private
 */
const abortHandshake = function (websocket, stream, message) {
    websocket.readyState = Client.CLOSING;

    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);

    if (stream.setHeader) {
        stream.abort();
        stream.once("abort", websocket.emitClose.bind(websocket));
        websocket.emit("error", err);
    } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
    }
};

/**
 * The listener of the `Receiver` `'drain'` event.
 *
 * @private
 */
const receiverOnDrain = function () {
    this[kWebSocket]._socket.resume();
};

/**
 * The listener of the `Receiver` `'error'` event.
 *
 * @param {(RangeError|Error)} err The emitted error
 * @private
 */
const receiverOnError = function (err) {
    const websocket = this[kWebSocket];

    websocket.readyState = Client.CLOSING;
    websocket._closeCode = err[constants.kStatusCode];
    websocket.emit("error", err);
    websocket._socket.destroy();
};

/**
 * The listener of the `Receiver` `'finish'` event.
 *
 * @private
 */
const receiverOnFinish = function () {
    this[kWebSocket].emitClose();
};

/**
 * The listener of the `Receiver` `'message'` event.
 *
 * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The message
 * @private
 */
const receiverOnMessage = function (data) {
    this[kWebSocket].emit("message", data);
};

/**
 * The listener of the `Receiver` `'ping'` event.
 *
 * @param {Buffer} data The data included in the ping frame
 * @private
 */
const receiverOnPing = function (data) {
    const websocket = this[kWebSocket];

    websocket.pong(data, !websocket._isServer, adone.noop);
    websocket.emit("ping", data);
};

/**
 * The listener of the `Receiver` `'pong'` event.
 *
 * @param {Buffer} data The data included in the pong frame
 * @private
 */
const receiverOnPong = function (data) {
    this[kWebSocket].emit("pong", data);
};

/**
 * The listener of the `net.Socket` `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
const socketOnData = function (chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
    }
};

/**
 * The listener of the `net.Socket` `'end'` event.
 *
 * @private
 */
const socketOnEnd = function () {
    const websocket = this[kWebSocket];

    websocket.readyState = Client.CLOSING;
    websocket._receiver.end();
    this.end();
};

/**
 * The listener of the `Receiver` `'conclude'` event.
 *
 * @param {Number} code The status code
 * @param {String} reason The reason for closing
 * @private
 */
const receiverOnConclude = function (code, reason) {
    const websocket = this[kWebSocket];

    websocket._socket.removeListener("data", socketOnData);
    websocket._socket.resume();

    websocket._closeFrameReceived = true;
    websocket._closeMessage = reason;
    websocket._closeCode = code;

    if (code === 1005) {
        websocket.close();
    } else {
        websocket.close(code, reason);
    }
};

/**
 * The listener of the `net.Socket` `'close'` event.
 *
 * @private
 */
const socketOnClose = function () {
    const websocket = this[kWebSocket];

    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    this[kWebSocket] = undefined;

    websocket.readyState = Client.CLOSING;

    //
    // The close frame might not have been received or the `'end'` event emitted,
    // for example, if the socket was destroyed due to an error. Ensure that the
    // `receiver` stream is closed after writing any remaining buffered data to
    // it.
    //
    websocket._socket.read();
    websocket._receiver.end();

    clearTimeout(websocket._closeTimer);

    if (
        websocket._receiver._writableState.finished ||
        websocket._receiver._writableState.errorEmitted
    ) {
        websocket.emitClose();
    } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
    }
};

/**
 * The listener of the `net.Socket` `'error'` event.
 *
 * @private
 */
const socketOnError = function () {
    const websocket = this[kWebSocket];

    this.removeListener("error", socketOnError);
    this.on("error", adone.noop);

    if (websocket) {
        websocket.readyState = Client.CLOSING;
        this.destroy();
    }
};

/**
 * Create a `net.Socket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {net.Socket} The newly created socket used to start the connection
 * @private
 */
const netConnect = function (options) {
    options.path = options.socketPath || options._socketPath || undefined;
    return net.connect(options);
};

/**
 * Create a `tls.TLSSocket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {tls.TLSSocket} The newly created socket used to start the connection
 * @private
 */
const tlsConnect = function (options) {
    options.path = options.socketPath || options._socketPath || undefined;
    options.servername = options.servername || options.host;
    return tls.connect(options);
};

/**
 * Initialize a WebSocket client.
 *
 * @param {(String|url.Url|url.URL)} address The URL to which to connect
 * @param {String} protocols The subprotocols
 * @param {Object} options Connection options
 * @param {(Boolean|Object)} options.perMessageDeflate Enable/disable permessage-deflate
 * @param {Number} options.handshakeTimeout Timeout in milliseconds for the handshake request
 * @param {Number} options.protocolVersion Value of the `Sec-WebSocket-Version` header
 * @param {String} options.origin Value of the `Origin` or `Sec-WebSocket-Origin` header
 * @private
 */
const initAsClient = function (address, protocols, options) {
    options = {
        protocolVersion: protocolVersions[1],
        perMessageDeflate: true,
        ...options,
        createConnection: undefined,
        socketPath: undefined,
        hostname: undefined,
        protocol: undefined,
        timeout: undefined,
        method: undefined,
        auth: undefined,
        host: undefined,
        path: undefined,
        port: undefined
    };

    if (protocolVersions.indexOf(options.protocolVersion) === -1) {
        throw new RangeError(
            `Unsupported protocol version: ${options.protocolVersion} ` +
            `(supported versions: ${protocolVersions.join(", ")})`
        );
    }

    this._isServer = false;

    let parsedUrl;

    if (typeof address === "object" && !is.undefined(address.href)) {
        parsedUrl = address;
        this.url = address.href;
    } else {
        parsedUrl = url.parse(address);
        this.url = address;
    }

    const isUnixSocket = parsedUrl.protocol === "ws+unix:";

    if (!parsedUrl.host && (!isUnixSocket || !parsedUrl.pathname)) {
        throw new Error(`Invalid URL: ${this.url}`);
    }

    const isSecure = parsedUrl.protocol === "wss:" || parsedUrl.protocol === "https:";
    const key = crypto.randomBytes(16).toString("base64");
    const httpObj = isSecure ? https : http;
    const path = parsedUrl.search
        ? `${parsedUrl.pathname || "/"}${parsedUrl.search}`
        : parsedUrl.pathname || "/";
    let perMessageDeflate;

    options.createConnection = isSecure ? tlsConnect : netConnect;
    options.port = parsedUrl.port || (isSecure ? 443 : 80);
    options.host = parsedUrl.hostname.startsWith("[")
        ? parsedUrl.hostname.slice(1, -1)
        : parsedUrl.hostname;
    options.headers = {
        "Sec-WebSocket-Version": options.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket",
        ...options.headers
    };
    options.path = path;

    if (options.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
            options.perMessageDeflate !== true ? options.perMessageDeflate : {},
            false
        );
        options.headers["Sec-WebSocket-Extensions"] = extension.format({
            [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
    }
    if (protocols) {
        options.headers["Sec-WebSocket-Protocol"] = protocols;
    }
    if (options.origin) {
        if (options.protocolVersion < 13) {
            options.headers["Sec-WebSocket-Origin"] = options.origin;
        } else {
            options.headers.Origin = options.origin;
        }
    }
    if (parsedUrl.auth) {
        options.auth = parsedUrl.auth;
    } else if (parsedUrl.username || parsedUrl.password) {
        options.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }

    if (isUnixSocket) {
        const parts = path.split(":");
        if (is.nil(options.agent) && process.versions.modules < 57) {
            //
            // Setting `socketPath` in conjunction with `createConnection` without an
            // agent throws an error on Node.js < 8. Work around the issue by using a
            // different property.
            //
            options._socketPath = parts[0];
        } else {
            options.socketPath = parts[0];
        }

        options.path = parts[1];
    }

    let req = this._req = httpObj.get(options);

    if (options.handshakeTimeout) {
        req.setTimeout(
            options.handshakeTimeout,
            abortHandshake.bind(null, this, req, "Opening handshake has timed out")
        );
    }

    req.on("error", (err) => {
        if (this._req.aborted) {
            return;
        }

        req = this._req = null;
        this.readyState = Client.CLOSING;
        this.emit("error", err);
        this.emitClose();
    });

    req.on("response", (res) => {
        if (this.emit("unexpected-response", req, res)) {
            return;
        }

        abortHandshake(this, req, `Unexpected server response: ${res.statusCode}`);
    });

    req.on("upgrade", (res, socket, head) => {
        this.emit("upgrade", res);

        //
        // The user may have closed the connection from a listener of the `upgrade`
        // event.
        //
        if (this.readyState !== Client.CONNECTING) {
            return;
        }

        req = this._req = null;

        const digest = crypto.createHash("sha1")
            .update(key + constants.GUID, "binary")
            .digest("base64");

        if (res.headers["sec-websocket-accept"] !== digest) {
            abortHandshake(this, socket, "Invalid Sec-WebSocket-Accept header");
            return;
        }

        const serverProt = res.headers["sec-websocket-protocol"];
        const protList = (protocols || "").split(/, */);
        let protError;

        if (!protocols && serverProt) {
            protError = "Server sent a subprotocol but none was requested";
        } else if (protocols && !serverProt) {
            protError = "Server sent no subprotocol";
        } else if (serverProt && protList.indexOf(serverProt) === -1) {
            protError = "Server sent an invalid subprotocol";
        }

        if (protError) {
            abortHandshake(this, socket, protError);
            return;
        }

        if (serverProt) {
            this.protocol = serverProt;
        }

        if (perMessageDeflate) {
            try {
                const extensions = extension.parse(
                    res.headers["sec-websocket-extensions"]
                );

                if (extensions[PerMessageDeflate.extensionName]) {
                    perMessageDeflate.accept(
                        extensions[PerMessageDeflate.extensionName]
                    );
                    this._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
                }
            } catch (err) {
                abortHandshake(this, socket, "Invalid Sec-WebSocket-Extensions header");
                return;
            }
        }

        this.setSocket(socket, head, 0);
    });
};

/**
 * Class representing a Client.
 *
 * @extends EventEmitter
 */
export default class Client extends event.Emitter {
    /**
     * Create a new `WebSocket`.
     *
     * @param {(String|url.Url|url.URL)} address The URL to which to connect
     * @param {(String|String[])} protocols The subprotocols
     * @param {Object} options Connection options
     */
    constructor(address, protocols, options) {
        super();

        this.readyState = Client.CONNECTING;
        this.protocol = "";

        this._binaryType = constants.BINARY_TYPES[0];
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = "";
        this._closeTimer = null;
        this._closeCode = 1006;
        this._extensions = {};
        this._isServer = true;
        this._receiver = null;
        this._sender = null;
        this._socket = null;

        if (!is.null(address)) {
            if (is.array(protocols)) {
                protocols = protocols.join(", ");
            } else if (typeof protocols === "object" && !is.null(protocols)) {
                options = protocols;
                protocols = undefined;
            }

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
     * This deviates from the WHATWG interface since ws doesn't support the required
     * default "blob" type (instead we define a custom "nodebuffer" type).
     *
     * @type {String}
     */
    get binaryType() {
        return this._binaryType;
    }

    set binaryType(type) {
        if (constants.BINARY_TYPES.indexOf(type) < 0) {
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
     * @type {Number}
     */
    get bufferedAmount() {
        if (!this._socket) {
            return 0;
        }

        //
        // `socket.bufferSize` is `undefined` if the socket is closed.
        //
        return (this._socket.bufferSize || 0) + this._sender._bufferedBytes;
    }

    /**
     * @type {String}
     */
    get extensions() {
        return Object.keys(this._extensions).join();
    }

    /**
     * Set up the socket and the internal resources.
     *
     * @param {net.Socket} socket The network socket between the server and client
     * @param {Buffer} head The first packet of the upgraded stream
     * @param {Number} maxPayload The maximum allowed message size
     * @private
     */
    setSocket(socket, head, maxPayload) {
        const receiver = new Receiver(
            this._binaryType,
            this._extensions,
            maxPayload
        );

        this._sender = new Sender(socket, this._extensions);
        this._receiver = receiver;
        this._socket = socket;

        receiver[kWebSocket] = this;
        socket[kWebSocket] = this;

        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);

        socket.setTimeout(0);
        socket.setNoDelay();

        if (head.length > 0) {
            socket.unshift(head);
        }

        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);

        this.readyState = Client.OPEN;
        this.emit("open");
    }

    /**
     * Emit the `'close'` event.
     *
     * @private
     */
    emitClose() {
        this.readyState = Client.CLOSED;

        if (!this._socket) {
            this.emit("close", this._closeCode, this._closeMessage);
            return;
        }

        if (this._extensions[PerMessageDeflate.extensionName]) {
            this._extensions[PerMessageDeflate.extensionName].cleanup();
        }

        this._receiver.removeAllListeners();
        this.emit("close", this._closeCode, this._closeMessage);
    }

    /**
     * Start a closing handshake.
     *
     *          +----------+   +-----------+   +----------+
     *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
     *    |     +----------+   +-----------+   +----------+     |
     *          +----------+   +-----------+         |
     * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
     *          +----------+   +-----------+   |
     *    |           |                        |   +---+        |
     *                +------------------------+-->|fin| - - - -
     *    |         +---+                      |   +---+
     *     - - - - -|fin|<---------------------+
     *              +---+
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
            const msg = "WebSocket was closed before the connection was established";
            return abortHandshake(this, this._req, msg);
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

            if (this._socket.writable) {
                if (this._closeFrameReceived) {
                    this._socket.end();
                }

                //
                // Ensure that the connection is closed even if the closing handshake
                // fails.
                //
                this._closeTimer = setTimeout(
                    this._socket.destroy.bind(this._socket),
                    closeTimeout
                );
            }
        });
    }

    /**
     * Send a ping.
     *
     * @param {*} data The data to send
     * @param {Boolean} mask Indicates whether or not to mask `data`
     * @param {Function} cb Callback which is executed when the ping is sent
     * @public
     */
    ping(data, mask, cb) {
        if (is.function(data)) {
            cb = data;
            data = mask = undefined;
        } else if (is.function(mask)) {
            cb = mask;
            mask = undefined;
        }

        if (this.readyState !== Client.OPEN) {
            const err = new Error(
                `WebSocket is not open: readyState ${this.readyState} ` +
                `(${readyStates[this.readyState]})`
            );

            if (cb) {
                return cb(err);
            }
            throw err;
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.ping(data || adone.EMPTY_BUFFER, mask, cb);
    }

    /**
     * Send a pong.
     *
     * @param {*} data The data to send
     * @param {Boolean} mask Indicates whether or not to mask `data`
     * @param {Function} cb Callback which is executed when the pong is sent
     * @public
     */
    pong(data, mask, cb) {
        if (is.function(data)) {
            cb = data;
            data = mask = undefined;
        } else if (is.function(mask)) {
            cb = mask;
            mask = undefined;
        }

        if (this.readyState !== Client.OPEN) {
            const err = new Error(
                `WebSocket is not open: readyState ${this.readyState} ` +
                `(${readyStates[this.readyState]})`
            );

            if (cb) {
                return cb(err);
            }
            throw err;
        }

        if (is.number(data)) {
            data = data.toString();
        }
        if (is.undefined(mask)) {
            mask = !this._isServer;
        }
        this._sender.pong(data || adone.EMPTY_BUFFER, mask, cb);
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
            const err = new Error(
                `WebSocket is not open: readyState ${this.readyState} ` +
                `(${readyStates[this.readyState]})`
            );

            if (cb) {
                return cb(err);
            }
            throw err;
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

        if (!this._extensions[PerMessageDeflate.extensionName]) {
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
            const msg = "WebSocket was closed before the connection was established";
            return abortHandshake(this, this._req, msg);
        }

        if (this._socket) {
            this.readyState = Client.CLOSING;
            this._socket.destroy();
        }
    }
}

readyStates.forEach((readyState, i) => {
    Client[readyStates[i]] = i;
});

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
