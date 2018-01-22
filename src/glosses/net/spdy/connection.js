const debug = {
    server: require("debug")("spdy:connection:server"),
    client: require("debug")("spdy:connection:client")
};

const {
    is,
    event,
    net: { spdy }
} = adone;

export default class Connection extends event.Emitter {
    constructor(socket, options) {
        super();

        const state = {};
        this._spdyState = state;

        // NOTE: There's a big trick here. Connection is used as a `this` argument
        // to the wrapped `connection` event listener.
        // socket end doesn't necessarly mean connection drop
        this.httpAllowHalfOpen = true;

        state.timeout = new spdy.utils.Timeout(this);

        // Protocol info
        state.protocol = spdy.protocol[options.protocol];
        state.version = null;
        state.constants = state.protocol.constants;
        state.pair = null;
        state.isServer = options.isServer;

        // Root of priority tree (i.e. stream id = 0)
        state.priorityRoot = new spdy.Priority({
            defaultWeight: state.constants.DEFAULT_WEIGHT,
            maxCount: spdy.protocol.base.constants.MAX_PRIORITY_STREAMS
        });

        // Defaults
        state.maxStreams = options.maxStreams ||
            state.constants.MAX_CONCURRENT_STREAMS;

        state.autoSpdy31 = options.protocol.name !== "h2" && options.autoSpdy31;
        state.acceptPush = is.undefined(options.acceptPush)
            ? !state.isServer
            : options.acceptPush;

        if (options.maxChunk === false) {
            state.maxChunk = Infinity;
        } else if (is.undefined(options.maxChunk)) {
            state.maxChunk = spdy.protocol.base.constants.DEFAULT_MAX_CHUNK;
        } else {
            state.maxChunk = options.maxChunk;
        }

        // Connection-level flow control
        const windowSize = options.windowSize || 1 << 20;
        state.window = new spdy.Window({
            id: 0,
            isServer: state.isServer,
            recv: {
                size: state.constants.DEFAULT_WINDOW,
                max: state.constants.MAX_INITIAL_WINDOW_SIZE
            },
            send: {
                size: state.constants.DEFAULT_WINDOW,
                max: state.constants.MAX_INITIAL_WINDOW_SIZE
            }
        });

        // It starts with DEFAULT_WINDOW, update must be sent to change it on client
        state.window.recv.setMax(windowSize);

        // Boilerplate for Stream constructor
        state.streamWindow = new spdy.Window({
            id: -1,
            isServer: state.isServer,
            recv: {
                size: windowSize,
                max: state.constants.MAX_INITIAL_WINDOW_SIZE
            },
            send: {
                size: state.constants.DEFAULT_WINDOW,
                max: state.constants.MAX_INITIAL_WINDOW_SIZE
            }
        });

        // Various state info
        state.pool = state.protocol.CompressionPool.create(options.headerCompression);
        state.counters = {
            push: 0,
            stream: 0
        };

        // Init streams list
        state.stream = {
            map: {},
            count: 0,
            nextId: state.isServer ? 2 : 1,
            lastId: {
                both: 0,
                received: 0
            }
        };
        state.ping = {
            nextId: state.isServer ? 2 : 1,
            map: {}
        };
        state.goaway = false;

        // Debug
        state.debug = state.isServer ? debug.server : debug.client;

        // X-Forwarded feature
        state.xForward = null;

        // Create parser and hole for framer
        state.parser = state.protocol.Parser.create({
            // NOTE: needed to distinguish ping from ping ACK in SPDY
            isServer: state.isServer,
            window: state.window
        });
        state.framer = state.protocol.Framer.create({
            window: state.window,
            timeout: state.timeout
        });

        // SPDY has PUSH enabled on servers
        if (state.protocol.name === "spdy") {
            state.framer.enablePush(state.isServer);
        }

        if (!state.isServer) {
            state.parser.skipPreface();
        }

        this.socket = socket;

        this._init();
    }

    static create(socket, options) {
        return new Connection(socket, options);
    }

    _init() {
        const self = this;
        const state = this._spdyState;
        const pool = state.pool;

        // Initialize session window
        state.window.recv.on("drain", () => {
            self._onSessionWindowDrain();
        });

        // Initialize parser
        state.parser.on("data", (frame) => {
            self._handleFrame(frame);
        });
        state.parser.once("version", (version) => {
            self._onVersion(version);
        });

        // Propagate parser errors
        state.parser.on("error", (err) => {
            self._onParserError(err);
        });

        // Propagate framer errors
        state.framer.on("error", (err) => {
            self.emit("error", err);
        });

        this.socket.pipe(state.parser);
        state.framer.pipe(this.socket);

        // Allow high-level api to catch socket errors
        this.socket.on("error", function onSocketError(e) {
            self.emit("error", e);
        });

        this.socket.once("close", function onclose() {
            const err = new Error("socket hang up");
            err.code = "ECONNRESET";
            self.destroyStreams(err);
            self.emit("close", err);

            if (state.pair) {
                pool.put(state.pair);
            }

            state.framer.resume();
        });

        // Reset timeout on close
        this.once("close", () => {
            self.setTimeout(0);
        });

        const _onWindowOverflow = function () {
            self._onWindowOverflow();
        };

        state.window.recv.on("overflow", _onWindowOverflow);
        state.window.send.on("overflow", _onWindowOverflow);

        // Do not allow half-open connections
        this.socket.allowHalfOpen = false;
    }

    _onVersion(version) {
        const state = this._spdyState;
        const prev = state.version;
        const parser = state.parser;
        const framer = state.framer;
        const pool = state.pool;

        state.version = version;
        state.debug("id=0 version=%d", version);

        // Ignore transition to 3.1
        if (!prev) {
            state.pair = pool.get(version);
            parser.setCompression(state.pair);
            framer.setCompression(state.pair);
        }
        framer.setVersion(version);

        if (!state.isServer) {
            framer.prefaceFrame();
            if (!is.null(state.xForward)) {
                framer.xForwardedFor({ host: state.xForward });
            }
        }

        // Send preface+settings frame (once)
        framer.settingsFrame({
            max_header_list_size: state.constants.DEFAULT_MAX_HEADER_LIST_SIZE,
            max_concurrent_streams: state.maxStreams,
            enable_push: state.acceptPush ? 1 : 0,
            initial_window_size: state.window.recv.max
        });

        // Update session window
        if (state.version >= 3.1 || (state.isServer && state.autoSpdy31)) {
            this._onSessionWindowDrain();
        }

        this.emit("version", version);
    }

    _onParserError(err) {
        const state = this._spdyState;

        // Prevent further errors
        state.parser.kill();

        // Send GOAWAY
        if (err instanceof spdy.protocol.base.utils.ProtocolError) {
            this._goaway({
                lastId: state.stream.lastId.both,
                code: err.code,
                extra: err.message,
                send: true
            });
        }

        this.emit("error", err);
    }

    _handleFrame(frame) {
        const state = this._spdyState;

        state.debug("id=0 frame", frame);
        state.timeout.reset();

        // For testing purposes
        this.emit("frame", frame);

        let stream;

        // Session window update
        if (frame.type === "WINDOW_UPDATE" && frame.id === 0) {
            if (state.version < 3.1 && state.autoSpdy31) {
                state.debug("id=0 switch version to 3.1");
                state.version = 3.1;
                this.emit("version", 3.1);
            }
            state.window.send.update(frame.delta);
            return;
        }

        if (state.isServer && frame.type === "PUSH_PROMISE") {
            state.debug("id=0 server PUSH_PROMISE");
            this._goaway({
                lastId: state.stream.lastId.both,
                code: "PROTOCOL_ERROR",
                send: true
            });
            return;
        }

        if (!stream && !is.undefined(frame.id)) {
            // Load created one
            stream = state.stream.map[frame.id];

            // Fail if not found
            if (!stream &&
                frame.type !== "HEADERS" &&
                frame.type !== "PRIORITY" &&
                frame.type !== "RST") {
                // Other side should destroy the stream upon receiving GOAWAY
                if (this._isGoaway(frame.id)) {
                    return;
                }

                state.debug("id=0 stream=%d not found", frame.id);
                state.framer.rstFrame({ id: frame.id, code: "INVALID_STREAM" });
                return;
            }
        }

        // Create new stream
        if (!stream && frame.type === "HEADERS") {
            this._handleHeaders(frame);
            return;
        }

        if (stream) {
            stream._handleFrame(frame);
        } else if (frame.type === "SETTINGS") {
            this._handleSettings(frame.settings);
        } else if (frame.type === "ACK_SETTINGS") {
            // TODO(indutny): handle it one day
        } else if (frame.type === "PING") {
            this._handlePing(frame);
        } else if (frame.type === "GOAWAY") {
            this._handleGoaway(frame);
        } else if (frame.type === "X_FORWARDED_FOR") {
            // Set X-Forwarded-For only once
            if (is.null(state.xForward)) {
                state.xForward = frame.host;
            }
        } else if (frame.type === "PRIORITY") {
            // TODO(indutny): handle this
        } else {
            state.debug("id=0 unknown frame type: %s", frame.type);
        }
    }

    _onWindowOverflow() {
        const state = this._spdyState;
        state.debug("id=0 window overflow");
        this._goaway({
            lastId: state.stream.lastId.both,
            code: "FLOW_CONTROL_ERROR",
            send: true
        });
    }

    _isGoaway(id) {
        const state = this._spdyState;
        if (state.goaway !== false && state.goaway < id) {
            return true;
        }
        return false;
    }

    _getId() {
        const state = this._spdyState;

        const id = state.stream.nextId;
        state.stream.nextId += 2;
        return id;
    }

    _createStream(uri) {
        const state = this._spdyState;
        let id = uri.id;
        if (is.undefined(id)) {
            id = this._getId();
        }

        let isGoaway = this._isGoaway(id);

        if (uri.push && !state.acceptPush) {
            state.debug("id=0 push disabled promisedId=%d", id);

            // Fatal error
            this._goaway({
                lastId: state.stream.lastId.both,
                code: "PROTOCOL_ERROR",
                send: true
            });
            isGoaway = true;
        }

        const stream = new spdy.Stream(this, {
            id,
            request: uri.request !== false,
            method: uri.method,
            path: uri.path,
            host: uri.host,
            priority: uri.priority,
            headers: uri.headers,
            parent: uri.parent,
            readable: !isGoaway && uri.readable,
            writable: !isGoaway && uri.writable
        });
        const self = this;

        // Just an empty stream for API consistency
        if (isGoaway) {
            return stream;
        }

        state.stream.lastId.both = Math.max(state.stream.lastId.both, id);

        state.debug("id=0 add stream=%d", stream.id);
        state.stream.map[stream.id] = stream;
        state.stream.count++;
        state.counters.stream++;
        if (!is.null(stream.parent)) {
            state.counters.push++;
        }

        stream.once("close", () => {
            self._removeStream(stream);
        });

        return stream;
    }

    _handleHeaders(frame) {
        const state = this._spdyState;

        // Must be HEADERS frame after stream close
        if (frame.id <= state.stream.lastId.received) {
            return;
        }

        // Someone is using our ids!
        if ((frame.id + state.stream.nextId) % 2 === 0) {
            state.framer.rstFrame({ id: frame.id, code: "PROTOCOL_ERROR" });
            return;
        }

        const stream = this._createStream({
            id: frame.id,
            request: false,
            method: frame.headers[":method"],
            path: frame.headers[":path"],
            host: frame.headers[":authority"],
            priority: frame.priority,
            headers: frame.headers,
            writable: frame.writable
        });

        // GOAWAY
        if (this._isGoaway(stream.id)) {
            return;
        }

        state.stream.lastId.received = Math.max(state.stream.lastId.received,
            stream.id);

        // TODO(indutny) handle stream limit
        if (!this.emit("stream", stream)) {
            // No listeners was set - abort the stream
            stream.abort();
            return;
        }

        // Create fake frame to simulate end of the data
        if (frame.fin) {
            stream._handleFrame({ type: "FIN", fin: true });
        }

        return stream;
    }

    _onSessionWindowDrain() {
        const state = this._spdyState;
        if (state.version < 3.1 && !(state.isServer && state.autoSpdy31)) {
            return;
        }

        const delta = state.window.recv.getDelta();
        if (delta === 0) {
            return;
        }

        state.debug("id=0 session window drain, update by %d", delta);

        state.framer.windowUpdateFrame({
            id: 0,
            delta
        });
        state.window.recv.update(delta);
    }

    start(version) {
        this._spdyState.parser.setVersion(version);
    }

    // Mostly for testing
    getVersion() {
        return this._spdyState.version;
    }

    _handleSettings(settings) {
        const state = this._spdyState;

        state.framer.ackSettingsFrame();

        this._setDefaultWindow(settings);
        if (settings.max_frame_size) {
            state.framer.setMaxFrameSize(settings.max_frame_size);
        }

        // TODO(indutny): handle max_header_list_size
        if (settings.header_table_size) {
            try {
                state.pair.compress.updateTableSize(settings.header_table_size);
            } catch (e) {
                this._goaway({
                    lastId: 0,
                    code: "PROTOCOL_ERROR",
                    send: true
                });
                return;
            }
        }

        // HTTP2 clients needs to enable PUSH streams explicitly
        if (state.protocol.name !== "spdy") {
            if (is.undefined(settings.enable_push)) {
                state.framer.enablePush(state.isServer);
            } else {
                state.framer.enablePush(settings.enable_push === 1);
            }
        }

        // TODO(indutny): handle max_concurrent_streams
    }

    _setDefaultWindow(settings) {
        if (is.undefined(settings.initial_window_size)) {
            return;
        }

        const state = this._spdyState;

        // Update defaults
        const window = state.streamWindow;
        window.send.setMax(settings.initial_window_size);

        // Update existing streams
        Object.keys(state.stream.map).forEach((id) => {
            const stream = state.stream.map[id];
            const window = stream._spdyState.window;

            window.send.updateMax(settings.initial_window_size);
        });
    }

    _handlePing(frame) {
        const self = this;
        const state = this._spdyState;

        // Handle incoming PING
        if (!frame.ack) {
            state.framer.pingFrame({
                opaque: frame.opaque,
                ack: true
            });

            self.emit("ping", frame.opaque);
            return;
        }

        // Handle reply PING
        const hex = frame.opaque.toString("hex");
        if (!state.ping.map[hex]) {
            return;
        }
        const ping = state.ping.map[hex];
        delete state.ping.map[hex];

        if (ping.cb) {
            ping.cb(null);
        }
    }

    _handleGoaway(frame) {
        this._goaway({
            lastId: frame.lastId,
            code: frame.code,
            send: false
        });
    }

    ping(callback) {
        const state = this._spdyState;

        // HTTP2 is using 8-byte opaque
        const opaque = Buffer.alloc(state.constants.PING_OPAQUE_SIZE);
        opaque.fill(0);
        opaque.writeUInt32BE(state.ping.nextId, opaque.length - 4);
        state.ping.nextId += 2;

        state.ping.map[opaque.toString("hex")] = { cb: callback };
        state.framer.pingFrame({
            opaque,
            ack: false
        });
    }

    getCounter(name) {
        return this._spdyState.counters[name];
    }

    reserveStream(uri, callback) {
        const stream = this._createStream(uri);

        // GOAWAY
        if (this._isGoaway(stream.id)) {
            const err = new Error("Can't send request after GOAWAY");
            process.nextTick(() => {
                if (callback) {
                    callback(err);
                } else {
                    stream.emit("error", err);
                }
            });
            return stream;
        }

        if (callback) {
            process.nextTick(() => {
                callback(null, stream);
            });
        }

        return stream;
    }

    request(uri, callback) {
        const stream = this.reserveStream(uri, (err) => {
            if (err) {
                if (callback) {
                    callback(err);
                } else {
                    stream.emit("error", err);
                }
                return;
            }

            if (stream._wasSent()) {
                if (callback) {
                    callback(null, stream);
                }
                return;
            }

            stream.send((err) => {
                if (err) {
                    if (callback) {
                        return callback(err);
                    } return stream.emit("error", err);
                }

                if (callback) {
                    callback(null, stream);
                }
            });
        });

        return stream;
    }

    _removeStream(stream) {
        const state = this._spdyState;

        state.debug("id=0 remove stream=%d", stream.id);
        delete state.stream.map[stream.id];
        state.stream.count--;

        if (state.stream.count === 0) {
            this.emit("_streamDrain");
        }
    }

    _goaway(params) {
        const state = this._spdyState;
        const self = this;

        state.goaway = params.lastId;
        state.debug("id=0 goaway from=%d", state.goaway);

        Object.keys(state.stream.map).forEach((id) => {
            const stream = state.stream.map[id];

            // Abort every stream started after GOAWAY
            if (stream.id <= params.lastId) {
                return;
            }

            stream.abort();
            stream.emit("error", new Error("New stream after GOAWAY"));
        });

        const finish = function () {
            // Destroy socket if there are no streams
            if (state.stream.count === 0 || params.code !== "OK") {
                // No further frames should be processed
                state.parser.kill();

                process.nextTick(() => {
                    const err = new Error(`Fatal error: ${params.code}`);
                    self._onStreamDrain(err);
                });
                return;
            }

            self.on("_streamDrain", self._onStreamDrain);
        };

        if (params.send) {
            // Make sure that GOAWAY frame is sent before dumping framer
            state.framer.goawayFrame({
                lastId: params.lastId,
                code: params.code,
                extra: params.extra
            }, finish);
        } else {
            finish();
        }
    }

    _onStreamDrain(error) {
        const state = this._spdyState;

        state.debug("id=0 _onStreamDrain");

        state.framer.dump();
        state.framer.unpipe(this.socket);
        state.framer.resume();

        if (this.socket.destroySoon) {
            this.socket.destroySoon();
        }
        this.emit("close", error);
    }

    end(callback) {
        const state = this._spdyState;

        if (callback) {
            this.once("close", callback);
        }
        this._goaway({
            lastId: state.stream.lastId.both,
            code: "OK",
            send: true
        });
    }

    destroyStreams(err) {
        const state = this._spdyState;
        Object.keys(state.stream.map).forEach((id) => {
            const stream = state.stream.map[id];

            stream.abort();
            stream.emit("error", err);
        });
    }

    isServer() {
        return this._spdyState.isServer;
    }

    getXForwardedFor() {
        return this._spdyState.xForward;
    }

    sendXForwardedFor(host) {
        const state = this._spdyState;
        if (!is.null(state.version)) {
            state.framer.xForwardedFor({ host });
        } else {
            state.xForward = host;
        }
    }

    pushPromise(parent, uri, callback) {
        const state = this._spdyState;

        const stream = this._createStream({
            request: false,
            parent,
            method: uri.method,
            path: uri.path,
            host: uri.host,
            priority: uri.priority,
            headers: uri.headers,
            readable: false
        });

        let err;

        // TODO(indutny): deduplicate this logic somehow
        if (this._isGoaway(stream.id)) {
            err = new Error("Can't send PUSH_PROMISE after GOAWAY");

            process.nextTick(() => {
                if (callback) {
                    callback(err);
                } else {
                    stream.emit("error", err);
                }
            });
            return stream;
        }

        if (uri.push && !state.acceptPush) {
            err = new Error(
                "Can't send PUSH_PROMISE, other side won't accept it");
            process.nextTick(() => {
                if (callback) {
                    callback(err);
                } else {
                    stream.emit("error", err);
                }
            });
            return stream;
        }

        stream._sendPush(uri.status, uri.response, (err) => {
            if (!callback) {
                if (err) {
                    stream.emit("error", err);
                }
                return;
            }

            if (err) {
                return callback(err);
            }
            callback(null, stream);
        });

        return stream;
    }

    setTimeout(delay, callback) {
        const state = this._spdyState;

        state.timeout.set(delay, callback);
    }
}
