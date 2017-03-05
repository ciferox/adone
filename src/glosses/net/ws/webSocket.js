import adone from "adone";
import Sender from "./sender";
import Receiver from "./receiver";
import PerMessageDeflate from "./perMessageDeflate";
const is = adone.is;

// Default protocol version
const protocolVersion = 13;

// Close timeout
const closeTimeout = 30 * 1000; // Allow 30 seconds to terminate the connection cleanly


/**
 * W3C MessageEvent
 *
 * @see http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function MessageEvent(dataArg, isBinary, target) {
    this.type = "message";
    this.data = dataArg;
    this.target = target;
    this.binary = isBinary; // non-standard.
}

/**
 * W3C CloseEvent
 *
 * @see http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function CloseEvent(code, reason, target) {
    this.type = "close";
    this.wasClean = code === undefined || code === 1000;
    this.code = code;
    this.reason = reason;
    this.target = target;
}

/**
 * W3C OpenEvent
 *
 * @see http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function OpenEvent(target) {
    this.type = "open";
    this.target = target;
}

// Append port number to Host header, only if specified in the url and non-default
export function buildHostHeader(isSecure, hostname, port) {
    let headerHost = hostname;
    if (hostname) {
        if ((isSecure && (port !== 443)) || (!isSecure && (port !== 80))) {
            headerHost = headerHost + ":" + port;
        }
    }
    return headerHost;
}

function startQueue(instance) {
    instance._queue = instance._queue || [];
}

function executeQueueSends(instance) {
    const queue = instance._queue;
    if (queue === undefined) return;

    delete instance._queue;
    for (let i = 0, l = queue.length; i < l; ++i) {
        queue[i]();
    }
}

function sendStream(instance, stream, options, cb) {
    stream.on("data", function incoming(data) {
        if (instance.readyState !== WebSocket.OPEN) {
            if (cb) cb(new Error("not opened"));
            else {
                delete instance._queue;
                instance.emit("error", new Error("not opened"));
            }
            return;
        }

        options.fin = false;
        instance._sender.send(data, options);
    });

    stream.on("end", function end() {
        if (instance.readyState !== WebSocket.OPEN) {
            if (cb) cb(new Error("not opened"));
            else {
                delete instance._queue;
                instance.emit("error", new Error("not opened"));
            }
            return;
        }

        options.fin = true;
        instance._sender.send(null, options);

        if (cb) cb(null);
    });
}

function cleanupWebsocketResources(error) {
    if (this.readyState === WebSocket.CLOSED) return;

    this.readyState = WebSocket.CLOSED;

    clearTimeout(this._closeTimer);
    this._closeTimer = null;

    // If the connection was closed abnormally (with an error), or if
    // the close control frame was not received then the close code
    // must default to 1006.
    if (error || !this._closeReceived) {
        this._closeCode = 1006;
    }
    this.emit("close", this._closeCode || 1000, this._closeMessage || "");

    if (this._socket) {
        this._socket.on("error", function onerror() {
            try {
                this.destroy();
            } catch (e) {
                //
            }
        });

        try {
            if (!error) this._socket.end();
            else this._socket.destroy();
        } catch (e) { 
            // Ignore termination errors 
        }

        this._socket = null;
    }

    if (this._sender) {
        this._sender = this._sender.onerror = null;
    }

    if (this._receiver) {
        this._receiver.cleanup();
        this._receiver = null;
    }

    if (this.extensions[PerMessageDeflate.extensionName]) {
        this.extensions[PerMessageDeflate.extensionName].cleanup();
    }

    this.extensions = null;

    this.removeAllListeners();
    this.on("error", function onerror() { }); // catch all errors after this
    delete this._queue;
}

/**
 * WebSocket implementation
 *
 * @constructor
 * @param {String} address Connection address.
 * @param {String|Array} protocols WebSocket protocols.
 * @param {Object} options Additional connection options.
 * @api public
 */
export default class WebSocket extends adone.EventEmitter {
    constructor(address, protocols, options) {
        super();
        if (protocols && !is.array(protocols) && is.object(protocols)) {
            // accept the "options" Object as the 2nd argument
            options = protocols;
            protocols = null;
        }

        if (is.string(protocols)) {
            protocols = [protocols];
        }

        if (!is.array(protocols)) {
            protocols = [];
        }

        this._socket = null;
        this._closeReceived = false;
        this.bytesReceived = 0;
        this.readyState = null;
        this.supports = { binary: true };
        this.extensions = {};
        this._binaryType = "nodebuffer";

        if (is.array(address)) {
            this._initAsServerClient(address[0], address[1], address[2], options);
        } else {
            this._initAsClient(address, protocols, options);
        }
    }

    /**
     * Gracefully closes the connection, after sending a description message to the server
     *
     * @param {Object} data to be sent to the server
     * @api public
     */
    close(code, data) {
        if (this.readyState === WebSocket.CLOSED) return;

        if (this.readyState === WebSocket.CONNECTING) {
            this.readyState = WebSocket.CLOSED;
            return;
        }

        if (this.readyState === WebSocket.CLOSING) {
            if (this._closeReceived && this._isServer) {
                this.terminate();
            }
            return;
        }

        try {
            this.readyState = WebSocket.CLOSING;
            this._closeCode = code;
            this._closeMessage = data;
            const mask = !this._isServer;
            this._sender.close(code, data, mask, (err) => {
                if (err) this.emit("error", err);

                if (this._closeReceived && this._isServer) {
                    this.terminate();
                } else {
                    // ensure that the connection is cleaned up even when no response of closing handshake.
                    clearTimeout(this._closeTimer);
                    this._closeTimer = setTimeout(cleanupWebsocketResources.bind(this, true), closeTimeout);
                }
            });
        } catch (e) {
            this.emit("error", e);
        }
    }

    /**
     * Pause the client stream
     *
     * @api public
     */
    pause() {
        if (this.readyState !== WebSocket.OPEN) throw new Error("not opened");

        return this._socket.pause();
    }

    /**
     * Sends a ping
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
     * @api public
     */
    ping(data, options, dontFailWhenClosed) {
        if (this.readyState !== WebSocket.OPEN) {
            if (dontFailWhenClosed === true) return;
            throw new Error("not opened");
        }

        options = options || {};

        if (options.mask === undefined) options.mask = !this._isServer;

        this._sender.ping(data, options);
    }

    /**
     * Sends a pong
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
     * @api public
     */
    pong(data, options, dontFailWhenClosed) {
        if (this.readyState !== WebSocket.OPEN) {
            if (dontFailWhenClosed === true) return;
            throw new Error("not opened");
        }

        options = options || {};

        if (options.mask === undefined) options.mask = !this._isServer;

        this._sender.pong(data, options);
    }

    /**
     * Resume the client stream
     *
     * @api public
     */
    resume() {
        if (this.readyState !== WebSocket.OPEN) throw new Error("not opened");

        return this._socket.resume();
    }

    /**
     * Sends a piece of data
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean, compress: boolean
     * @param {function} Optional callback which is executed after the send completes
     * @api public
     */
    send(data, options, cb) {
        if (is.function(options)) {
            cb = options;
            options = {};
        }

        if (this.readyState !== WebSocket.OPEN) {
            if (cb) cb(new Error("not opened"));
            else throw new Error("not opened");
            return;
        }

        if (!data) data = "";

        if (this._queue) {
            this._queue.push(() => this.send(data, options, cb));
            return;
        }

        options = options || {};
        if (options.fin !== false) options.fin = true;

        if (is.undefined(options.binary)) {
            options.binary = data instanceof Buffer || data instanceof ArrayBuffer || ArrayBuffer.isView(data);
        }

        if (is.undefined(options.mask)) options.mask = !this._isServer;
        if (is.undefined(options.compress)) options.compress = true;
        if (!this.extensions[PerMessageDeflate.extensionName]) {
            options.compress = false;
        }

        if (data instanceof adone.std.stream.Readable) {
            startQueue(this);

            sendStream(this, data, options, (error) => {
                process.nextTick(() => executeQueueSends(this));
                if (cb) cb(error);
            });
        } else {
            this._sender.send(data, options, cb);
        }
    }

    /**
     * Streams data through calls to a user supplied function
     *
     * @param {Object} Members - mask: boolean, binary: boolean, compress: boolean
     * @param {function} 'function (error, send)' which is executed on successive
     *  ticks of which send is 'function (data, final)'.
     * @api public
     */
    stream(options, cb) {
        if (is.function(options)) {
            cb = options;
            options = {};
        }

        if (!cb) throw new Error("callback must be provided");

        if (this.readyState !== WebSocket.OPEN) {
            if (cb) cb(new Error("not opened"));
            else throw new Error("not opened");
            return;
        }

        if (this._queue) {
            this._queue.push(() => this.stream(options, cb));
            return;
        }

        options = options || {};

        if (options.mask === undefined) options.mask = !this._isServer;
        if (options.compress === undefined) options.compress = true;
        if (!this.extensions[PerMessageDeflate.extensionName]) {
            options.compress = false;
        }

        startQueue(this);

        const send = (data, final) => {
            try {
                if (this.readyState !== WebSocket.OPEN) throw new Error("not opened");
                options.fin = final === true;
                this._sender.send(data, options);
                if (!final) process.nextTick(cb, null, send);
                else executeQueueSends(this);
            } catch (e) {
                if (is.function(cb)) cb(e);
                else {
                    delete this._queue;
                    this.emit("error", e);
                }
            }
        };

        process.nextTick(cb, null, send);
    }

    /**
     * Immediately shuts down the connection
     *
     * @api public
     */
    terminate() {
        if (this.readyState === WebSocket.CLOSED) return;

        if (this._socket) {
            this.readyState = WebSocket.CLOSING;

            // End the connection
            try {
                this._socket.end();
            } catch (e) {
                // Socket error during end() call, so just destroy it right now
                cleanupWebsocketResources.call(this, true);
                return;
            }

            // Add a timeout to ensure that the connection is completely
            // cleaned up within 30 seconds, even if the clean close procedure
            // fails for whatever reason
            // First cleanup any pre-existing timeout from an earlier "terminate" call,
            // if one exists.  Otherwise terminate calls in quick succession will leak timeouts
            // and hold the program open for `closeTimout` time.
            if (this._closeTimer) {
                clearTimeout(this._closeTimer);
            }
            this._closeTimer = setTimeout(cleanupWebsocketResources.bind(this, true), closeTimeout);
        } else if (this.readyState === WebSocket.CONNECTING) {
            cleanupWebsocketResources.call(this, true);
        }
    }

    /**
     * Emulates the W3C Browser based WebSocket interface using addEventListener.
     *
     * @see https://developer.mozilla.org/en/DOM/element.addEventListener
     * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
     * @api public
     */
    addEventListener(method, listener) {
        const target = this;

        function onMessage(data, flags) {
            if (flags.binary && this.binaryType === "arraybuffer") {
                data = new Uint8Array(data).buffer;
            }
            listener.call(target, new MessageEvent(data, !!flags.binary, target));
        }

        function onClose(code, message) {
            listener.call(target, new CloseEvent(code, message, target));
        }

        function onError(event) {
            event.type = "error";
            event.target = target;
            listener.call(target, event);
        }

        function onOpen() {
            listener.call(target, new OpenEvent(target));
        }

        if (is.function(listener)) {
            if (method === "message") {
                // store a reference so we can return the original function from the
                // addEventListener hook
                onMessage._listener = listener;
                this.on(method, onMessage);
            } else if (method === "close") {
                // store a reference so we can return the original function from the
                // addEventListener hook
                onClose._listener = listener;
                this.on(method, onClose);
            } else if (method === "error") {
                // store a reference so we can return the original function from the
                // addEventListener hook
                onError._listener = listener;
                this.on(method, onError);
            } else if (method === "open") {
                // store a reference so we can return the original function from the
                // addEventListener hook
                onOpen._listener = listener;
                this.on(method, onOpen);
            } else {
                this.on(method, listener);
            }
        }
    }

    /**
     * Expose bufferedAmount
     *
     * @api public
     */
    get bufferedAmount() {
        let amount = 0;
        if (this._socket) {
            amount = this._socket.bufferSize || 0;
        }
        return amount;
    }

    /**
     * Expose binaryType
     *
     * This deviates from the W3C interface since ws doesn't support the required
     * default "blob" type (instead we define a custom "nodebuffer" type).
     *
     * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
     * @api public
     */
    get binaryType() {
        return this._binaryType;
    }

    set binaryType(type) {
        if (type === "arraybuffer" || type === "nodebuffer") {
            this._binaryType = type;
        } else {
            throw new SyntaxError("unsupported binaryType: must be either \"nodebuffer\" or \"arraybuffer\"");
        }
    }

    _initAsClient(address, protocols, options) {
        options = Object.assign({
            origin: null,
            protocolVersion,
            host: null,
            headers: null,
            protocol: protocols.join(","),
            agent: null,

            // ssl-related options
            pfx: null,
            key: null,
            passphrase: null,
            cert: null,
            ca: null,
            ciphers: null,
            rejectUnauthorized: null,
            checkServerIdentity: null,
            perMessageDeflate: true,
            localAddress: null
        }, options);

        if (options.protocolVersion !== 8 && options.protocolVersion !== 13) {
            throw new adone.x.NotSupported("Unsupported protocol version");
        }

        // verify URL and establish http class
        const serverUrl = adone.std.url.parse(address);
        const isUnixSocket = serverUrl.protocol === "ws+unix:";
        if (!serverUrl.host && !isUnixSocket) throw new adone.x.NotValid("invalid url");
        const isSecure = serverUrl.protocol === "wss:" || serverUrl.protocol === "https:";
        const HttpType = isSecure ? adone.std.https : adone.std.http;
        const port = serverUrl.port || (isSecure ? 443 : 80);
        const auth = serverUrl.auth;

        // prepare extensions
        const extensionsOffer = {};
        let perMessageDeflate;
        if (options.perMessageDeflate) {
            const opts = options.perMessageDeflate !== true ? options.perMessageDeflate : {};
            perMessageDeflate = new PerMessageDeflate(opts, false);
            extensionsOffer[PerMessageDeflate.extensionName] = perMessageDeflate.offer();
        }

        // expose state properties
        this._isServer = false;
        this.url = address;
        this.protocolVersion = options.protocolVersion;

        // begin handshake
        const key = new Buffer(options.protocolVersion + "-" + Date.now()).toString("base64");
        const shasum = adone.std.crypto.createHash("sha1");
        shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary");
        const expectedServerKey = shasum.digest("base64");

        let agent = options.agent;

        const headerHost = buildHostHeader(isSecure, serverUrl.hostname, port);

        const requestOptions = {
            port,
            host: serverUrl.hostname,
            path: "/",
            headers: {
                "Connection": "Upgrade",
                "Upgrade": "websocket",
                "Host": headerHost,
                "Sec-WebSocket-Version": options.protocolVersion,
                "Sec-WebSocket-Key": key
            }
        };

        // If we have basic auth.
        if (auth) {
            requestOptions.headers.Authorization = "Basic " + new Buffer(auth).toString("base64");
        }

        if (options.protocol) {
            requestOptions.headers["Sec-WebSocket-Protocol"] = options.protocol;
        }

        if (options.host) {
            requestOptions.headers.Host = options.host;
        }

        if (options.headers) {
            for (const header in options.headers) {
                if (options.headers.hasOwnProperty(header)) {
                    requestOptions.headers[header] = options.headers[header];
                }
            }
        }

        if (Object.keys(extensionsOffer).length) {
            requestOptions.headers["Sec-WebSocket-Extensions"] = adone.net.ws.exts.format(extensionsOffer);
        }

        if (!is.nil(options.pfx) ||
            !is.nil(options.key) ||
            !is.nil(options.passphrase) ||
            !is.nil(options.cert) ||
            !is.nil(options.ca) ||
            !is.nil(options.ciphers) ||
            !is.nil(options.rejectUnauthorized) ||
            !is.nil(options.checkServerIdentity)) {
            if (!is.nil(options.pfx)) requestOptions.pfx = options.pfx;
            if (!is.nil(options.key)) requestOptions.key = options.key;
            if (!is.nil(options.passphrase)) requestOptions.passphrase = options.passphrase;
            if (!is.nil(options.cert)) requestOptions.cert = options.cert;
            if (!is.nil(options.ca)) requestOptions.ca = options.ca;
            if (!is.nil(options.ciphers)) requestOptions.ciphers = options.ciphers;
            if (!is.nil(options.rejectUnauthorized)) {
                requestOptions.rejectUnauthorized = options.rejectUnauthorized;
            }
            if (!is.nil(options.checkServerIdentity)) {
                requestOptions.checkServerIdentity = options.checkServerIdentity;
            }

            if (!agent) {
                // global agent ignores client side certificates
                agent = new HttpType.Agent(requestOptions);
            }
        }

        // make sure that path starts with `/`
        if (serverUrl.path) {
            if (serverUrl.path.charAt(0) !== "/") {
                requestOptions.path = `/${serverUrl.path}`;
            } else {
                requestOptions.path = serverUrl.path;
            }
        }

        if (agent) {
            requestOptions.agent = agent;
        }

        if (isUnixSocket) {
            requestOptions.socketPath = serverUrl.pathname;
        }

        if (options.localAddress) {
            requestOptions.localAddress = options.localAddress;
        }

        if (options.origin) {
            if (options.protocolVersion < 13) requestOptions.headers["Sec-WebSocket-Origin"] = options.origin;
            else requestOptions.headers.Origin = options.origin;
        }

        let req = HttpType.request(requestOptions);

        req.on("error", (error) => {
            this.emit("error", error);
            cleanupWebsocketResources.call(this, error);
        });

        req.once("response", (res) => {
            let error;

            if (!this.emit("unexpected-response", req, res)) {
                error = new Error(`unexpected server response (${res.statusCode})`);
                req.abort();
                this.emit("error", error);
            }

            cleanupWebsocketResources.call(this, error);
        });

        req.once("upgrade", (res, socket, upgradeHead) => {
            if (this.readyState === WebSocket.CLOSED) {
                // client closed before server accepted connection
                this.emit("close");
                this.removeAllListeners();
                socket.end();
                return;
            }

            const serverKey = res.headers["sec-websocket-accept"];
            if (serverKey !== expectedServerKey) {
                this.emit("error", new Error("invalid server key"));
                this.removeAllListeners();
                socket.end();
                return;
            }

            const serverProt = res.headers["sec-websocket-protocol"];
            const protList = (options.protocol || "").split(/, */);
            let protError = null;

            if (!options.protocol && serverProt) {
                protError = "server sent a subprotocol even though none requested";
            } else if (options.protocol && !serverProt) {
                protError = "server sent no subprotocol even though requested";
            } else if (serverProt && protList.indexOf(serverProt) === -1) {
                protError = "server responded with an invalid protocol";
            }

            if (protError) {
                this.emit("error", new Error(protError));
                this.removeAllListeners();
                socket.end();
                return;
            } else if (serverProt) {
                this.protocol = serverProt;
            }

            const serverExtensions = adone.net.ws.exts.parse(res.headers["sec-websocket-extensions"]);
            if (perMessageDeflate && serverExtensions[PerMessageDeflate.extensionName]) {
                try {
                    perMessageDeflate.accept(serverExtensions[PerMessageDeflate.extensionName]);
                } catch (err) {
                    this.emit("error", new Error("invalid extension parameter"));
                    this.removeAllListeners();
                    socket.end();
                    return;
                }
                this.extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }

            this._establishConnection(socket, upgradeHead);

            // perform cleanup on http resources
            req.removeAllListeners();
            req = null;
            agent = null;
        });

        req.end();
        this.readyState = WebSocket.CONNECTING;
    }

    /**
     * Entirely private apis,
     * which may or may not be bound to a sepcific WebSocket instance.
     */
    _initAsServerClient(req, socket, upgradeHead, options) {
        // expose state properties
        Object.assign(this, options);
        this.readyState = WebSocket.CONNECTING;
        this.upgradeReq = req;
        this._isServer = true;
        // establish connection
        this._establishConnection(socket, upgradeHead);
    }

    _establishConnection(socket, upgradeHead) {
        socket.setTimeout(0);
        socket.setNoDelay(true);

        this._receiver = new Receiver(this.extensions, this.maxPayload);
        this._socket = socket;

        // socket cleanup handlers
        socket.on("end", cleanupWebsocketResources.bind(this));
        socket.on("close", cleanupWebsocketResources.bind(this));
        socket.on("error", cleanupWebsocketResources.bind(this));

        // ensure that the upgradeHead is added to the receiver
        if (upgradeHead && upgradeHead.length > 0) {
            socket.unshift(upgradeHead);
            upgradeHead = null;
        }

        // subsequent packets are pushed to the receiver
        socket.on("data", (data) => {
            this.bytesReceived += data.length;
            this._receiver.add(data);
        });

        // receiver event handlers
        this._receiver.ontext = (data, flags) => this.emit("message", data, flags || {});

        this._receiver.onbinary = (data, flags) => {
            flags = flags || {};
            flags.binary = true;

            this.emit("message", data, flags);
        };

        this._receiver.onping = (data, flags) => {
            flags = flags || {};

            this.pong(data, {
                mask: !this._isServer,
                binary: flags.binary === true
            }, true);

            this.emit("ping", data, flags);
        };

        this._receiver.onpong = (data, flags) => this.emit("pong", data, flags || {});

        this._receiver.onclose = (code, data) => {
            this._closeReceived = true;
            this.close(code, data);
        };

        this._receiver.onerror = (error, errorCode) => {
            // close the connection when the receiver reports a HyBi error code
            this.close(errorCode, "");
            this.emit("error", error);
        };

        // finalize the client
        this._sender = new Sender(socket, this.extensions);
        this._sender.onerror = (error) => {
            this.close(1002, "");
            this.emit("error", error);
        };

        this.readyState = WebSocket.OPEN;
        this.emit("open");
    }
}

// Ready States
["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach((state, index) => {
    WebSocket.prototype[state] = WebSocket[state] = index;
});
/**
 * Emulates the W3C Browser based WebSocket interface using function members.
 *
 * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
 * @api public
 */
["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket.prototype, "on" + method, {
        /**
         * Returns the current listener
         *
         * @returns {Mixed} the set function or undefined
         * @api public
         */
        get: function get() {
            const listener = this.listeners(method)[0];
            return listener ? (listener._listener ? listener._listener : listener) : undefined;
        },

        /**
         * Start listening for events
         *
         * @param {Function} listener the listener
         * @returns {Mixed} the set function or undefined
         * @api public
         */
        set: function set(listener) {
            this.removeAllListeners(method);
            this.addEventListener(method, listener);
        }
    });
});