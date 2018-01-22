const debug = {
    client: require("debug")("spdy:stream:client"),
    server: require("debug")("spdy:stream:server")
};

const {
    assert,
    is,
    net: { spdy },
    std: { stream: { Duplex } }
} = adone;

const checkAborted = function (stream, state, callback) {
    if (state.aborted) {
        state.debug("id=%d abort write", stream.id);
        process.nextTick(() => {
            callback(new Error("Stream write aborted"));
        });
        return true;
    }

    return false;
};

const _send = function (stream, state, data, callback) {
    if (checkAborted(stream, state, callback)) {
        return;
    }

    state.debug("id=%d presend=%d", stream.id, data.length);

    state.timeout.reset();

    state.window.send.update(-data.length, () => {
        if (checkAborted(stream, state, callback)) {
            return;
        }

        state.debug("id=%d send=%d", stream.id, data.length);

        state.timeout.reset();

        state.framer.dataFrame({
            id: stream.id,
            priority: state.priority.getPriority(),
            fin: false,
            data
        }, (err) => {
            state.debug("id=%d postsend=%d", stream.id, data.length);
            callback(err);
        });
    });
};

export default class Stream extends Duplex {
    constructor(connection, options) {
        super();

        const connectionState = connection._spdyState;

        const state = {};
        this._spdyState = state;

        this.id = options.id;
        this.method = options.method;
        this.path = options.path;
        this.host = options.host;
        this.headers = options.headers || {};
        this.connection = connection;
        this.parent = options.parent || null;

        state.socket = null;
        state.protocol = connectionState.protocol;
        state.constants = state.protocol.constants;

        // See _initPriority()
        state.priority = null;

        state.version = this.connection.getVersion();
        state.isServer = this.connection.isServer();
        state.debug = state.isServer ? debug.server : debug.client;

        state.framer = connectionState.framer;
        state.parser = connectionState.parser;

        state.request = options.request;
        state.needResponse = options.request;
        state.window = connectionState.streamWindow.clone(options.id);
        state.sessionWindow = connectionState.window;
        state.maxChunk = connectionState.maxChunk;

        // Can't send incoming request
        // (See `.send()` method)
        state.sent = !state.request;

        state.readable = options.readable !== false;
        state.writable = options.writable !== false;

        state.aborted = false;

        state.corked = 0;
        state.corkQueue = [];

        state.timeout = new spdy.utils.Timeout(this);

        this.on("finish", this._onFinish);
        this.on("end", this._onEnd);

        const self = this;
        const _onWindowOverflow = function () {
            self._onWindowOverflow();
        };

        state.window.recv.on("overflow", _onWindowOverflow);
        state.window.send.on("overflow", _onWindowOverflow);

        this._initPriority(options.priority);

        if (!state.readable) {
            this.push(null);
        }
        if (!state.writable) {
            this._writableState.ended = true;
            this._writableState.finished = true;
        }
    }

    _init(socket) {
        this.socket = socket;
    }

    _initPriority(priority) {
        const state = this._spdyState;
        const connectionState = this.connection._spdyState;
        const root = connectionState.priorityRoot;

        if (!priority) {
            state.priority = root.addDefault(this.id);
            return;
        }

        state.priority = root.add({
            id: this.id,
            parent: priority.parent,
            weight: priority.weight,
            exclusive: priority.exclusive
        });
    }

    _handleFrame(frame) {
        const state = this._spdyState;

        // Ignore any kind of data after abort
        if (state.aborted) {
            state.debug("id=%d ignoring frame=%s after abort", this.id, frame.type);
            return;
        }

        // Restart the timer on incoming frames
        state.timeout.reset();

        if (frame.type === "DATA") {
            this._handleData(frame);
        } else if (frame.type === "HEADERS") {
            this._handleHeaders(frame);
        } else if (frame.type === "RST") {
            this._handleRST(frame);
        } else if (frame.type === "WINDOW_UPDATE") {
            this._handleWindowUpdate(frame);
        } else if (frame.type === "PRIORITY") {
            this._handlePriority(frame);
        } else if (frame.type === "PUSH_PROMISE") {
            this._handlePushPromise(frame);
        }

        if (frame.fin) {
            state.debug("id=%d end", this.id);
            this.push(null);
        }
    }

    _write(data, enc, callback) {
        const state = this._spdyState;

        // Send the request if it wasn't sent
        if (!state.sent) {
            this.send();
        }

        // Writes should come after pending control frames (response and headers)
        if (state.corked !== 0) {
            const self = this;
            state.corkQueue.push(() => {
                self._write(data, enc, callback);
            });
            return;
        }

        // Split DATA in chunks to prevent window from going negative
        this._splitStart(data, _send, callback);
    }

    _splitStart(data, onChunk, callback) {
        return this._split(data, 0, onChunk, callback);
    }

    _split(data, offset, onChunk, callback) {
        if (offset === data.length) {
            return process.nextTick(callback);
        }

        const state = this._spdyState;
        const local = state.window.send;
        const session = state.sessionWindow.send;

        let availSession = Math.max(0, session.getCurrent());
        if (availSession === 0) {
            availSession = session.getMax();
        }
        let availLocal = Math.max(0, local.getCurrent());
        if (availLocal === 0) {
            availLocal = local.getMax();
        }

        let avail = Math.min(availSession, availLocal);
        avail = Math.min(avail, state.maxChunk);

        const self = this;

        if (avail === 0) {
            state.window.send.update(0, () => {
                self._split(data, offset, onChunk, callback);
            });
            return;
        }

        // Split data in chunks in a following way:
        const limit = avail;
        const size = Math.min(data.length - offset, limit);

        const chunk = data.slice(offset, offset + size);

        onChunk(this, state, chunk, (err) => {
            if (err) {
                return callback(err);
            }

            // Get the next chunk
            self._split(data, offset + size, onChunk, callback);
        });
    }

    _read() {
        const state = this._spdyState;

        if (!state.window.recv.isDraining()) {
            return;
        }

        const delta = state.window.recv.getDelta();

        state.debug("id=%d window emptying, update by %d", this.id, delta);

        state.window.recv.update(delta);
        state.framer.windowUpdateFrame({
            id: this.id,
            delta
        });
    }

    _handleData(frame) {
        const state = this._spdyState;

        // DATA on ended or not readable stream!
        if (!state.readable || this._readableState.ended) {
            state.framer.rstFrame({ id: this.id, code: "STREAM_CLOSED" });
            return;
        }

        state.debug("id=%d recv=%d", this.id, frame.data.length);
        state.window.recv.update(-frame.data.length);

        this.push(frame.data);
    }

    _handleRST(frame) {
        if (frame.code !== "CANCEL") {
            this.emit("error", new Error(`Got RST: ${frame.code}`));
        }
        this.abort();
    }

    _handleWindowUpdate(frame) {
        const state = this._spdyState;

        state.window.send.update(frame.delta);
    }

    _onWindowOverflow() {
        const state = this._spdyState;

        state.debug("id=%d window overflow", this.id);
        state.framer.rstFrame({ id: this.id, code: "FLOW_CONTROL_ERROR" });

        this.aborted = true;
        this.emit("error", new Error("HTTP2 window overflow"));
    }

    _handlePriority(frame) {
        const state = this._spdyState;

        state.priority.remove();
        state.priority = null;
        this._initPriority(frame.priority);

        // Mostly for testing purposes
        this.emit("priority", frame.priority);
    }

    _handleHeaders(frame) {
        const state = this._spdyState;

        if (!state.readable || this._readableState.ended) {
            state.framer.rstFrame({ id: this.id, code: "STREAM_CLOSED" });
            return;
        }

        if (state.needResponse) {
            return this._handleResponse(frame);
        }

        this.emit("headers", frame.headers);
    }

    _handleResponse(frame) {
        const state = this._spdyState;

        if (is.undefined(frame.headers[":status"])) {
            state.framer.rstFrame({ id: this.id, code: "PROTOCOL_ERROR" });
            return;
        }

        state.needResponse = false;
        this.emit("response", frame.headers[":status"] | 0, frame.headers);
    }

    _onFinish() {
        const state = this._spdyState;

        // Send the request if it wasn't sent
        if (!state.sent) {
            // NOTE: will send HEADERS with FIN flag
            this.send();
        } else {
            // Just an `.end()` without any writes will trigger immediate `finish` event
            // without any calls to `_write()`.
            if (state.corked !== 0) {
                const self = this;
                state.corkQueue.push(() => {
                    self._onFinish();
                });
                return;
            }

            state.framer.dataFrame({
                id: this.id,
                priority: state.priority.getPriority(),
                fin: true,
                data: Buffer.alloc(0)
            });
        }

        this._maybeClose();
    }

    _onEnd() {
        this._maybeClose();
    }

    _checkEnded(callback) {
        const state = this._spdyState;

        let ended = false;
        if (state.aborted) {
            ended = true;
        }

        if (!state.writable || this._writableState.finished) {
            ended = true;
        }

        if (!ended) {
            return true;
        }

        if (!callback) {
            return false;
        }

        const err = new Error("Ended stream can't send frames");
        process.nextTick(() => {
            callback(err);
        });

        return false;
    }

    _maybeClose() {
        const state = this._spdyState;

        // .abort() emits `close`
        if (state.aborted) {
            return;
        }

        if ((!state.readable || this._readableState.ended) &&
            this._writableState.finished) {
            // Clear timeout
            state.timeout.set(0);

            this.emit("close");
        }
    }

    _handlePushPromise(frame) {
        const push = this.connection._createStream({
            id: frame.promisedId,
            parent: this,
            push: true,
            request: true,
            method: frame.headers[":method"],
            path: frame.headers[":path"],
            host: frame.headers[":authority"],
            priority: frame.priority,
            headers: frame.headers,
            writable: false
        });

        // GOAWAY
        if (this.connection._isGoaway(push.id)) {
            return;
        }

        if (!this.emit("pushPromise", push)) {
            push.abort();
        }
    }

    _hardCork() {
        const state = this._spdyState;

        this.cork();
        state.corked++;
    }

    _hardUncork() {
        const state = this._spdyState;

        this.uncork();
        state.corked--;
        if (state.corked !== 0) {
            return;
        }

        // Invoke callbacks
        const queue = state.corkQueue;
        state.corkQueue = [];
        for (let i = 0; i < queue.length; i++) {
            queue[i]();
        }
    }

    _sendPush(status, response, callback) {
        const self = this;
        const state = this._spdyState;

        this._hardCork();
        state.framer.pushFrame({
            id: this.parent.id,
            promisedId: this.id,
            priority: state.priority.toJSON(),
            path: this.path,
            host: this.host,
            method: this.method,
            status,
            headers: this.headers,
            response
        }, (err) => {
            self._hardUncork();

            callback(err);
        });
    }

    _wasSent() {
        const state = this._spdyState;
        return state.sent;
    }

    // Public API

    send(callback) {
        const state = this._spdyState;

        if (state.sent) {
            const err = new Error("Stream was already sent");
            process.nextTick(() => {
                if (callback) {
                    callback(err);
                }
            });
            return;
        }

        state.sent = true;
        state.timeout.reset();

        // GET requests should always be auto-finished
        if (this.method === "GET") {
            this._writableState.ended = true;
            this._writableState.finished = true;
        }

        // TODO(indunty): ideally it should just take a stream object as an input
        const self = this;
        this._hardCork();
        state.framer.requestFrame({
            id: this.id,
            method: this.method,
            path: this.path,
            host: this.host,
            priority: state.priority.toJSON(),
            headers: this.headers,
            fin: this._writableState.finished
        }, (err) => {
            self._hardUncork();

            if (!callback) {
                return;
            }

            callback(err);
        });
    }

    respond(status, headers, callback) {
        const self = this;
        const state = this._spdyState;
        assert(!state.request, "Can't respond on request");

        state.timeout.reset();

        if (!this._checkEnded(callback)) {
            return;
        }

        const frame = {
            id: this.id,
            status,
            headers
        };
        this._hardCork();
        state.framer.responseFrame(frame, (err) => {
            self._hardUncork();
            if (callback) {
                callback(err);
            }
        });
    }

    setWindow(size) {
        const state = this._spdyState;

        state.timeout.reset();

        if (!this._checkEnded()) {
            return;
        }

        state.debug("id=%d force window max=%d", this.id, size);
        state.window.recv.setMax(size);

        const delta = state.window.recv.getDelta();
        if (delta === 0) {
            return;
        }

        state.framer.windowUpdateFrame({
            id: this.id,
            delta
        });
        state.window.recv.update(delta);
    }

    sendHeaders(headers, callback) {
        const self = this;
        const state = this._spdyState;

        state.timeout.reset();

        if (!this._checkEnded(callback)) {
            return;
        }

        // Request wasn't yet send, coalesce headers
        if (!state.sent) {
            this.headers = Object.assign({}, this.headers);
            Object.assign(this.headers, headers);
            process.nextTick(() => {
                if (callback) {
                    callback(null);
                }
            });
            return;
        }

        this._hardCork();
        state.framer.headersFrame({
            id: this.id,
            headers
        }, (err) => {
            self._hardUncork();
            if (callback) {
                callback(err);
            }
        });
    }

    destroy() {
        this.abort();
    }

    abort(code, callback) {
        const state = this._spdyState;

        // .abort(callback)
        if (is.function(code)) {
            callback = code;
            code = null;
        }

        if (this._readableState.ended && this._writableState.finished) {
            state.debug("id=%d already closed", this.id);
            if (callback) {
                process.nextTick(callback);
            }
            return;
        }

        if (state.aborted) {
            state.debug("id=%d already aborted", this.id);
            if (callback) {
                process.nextTick(callback);
            }
            return;
        }

        state.aborted = true;
        state.debug("id=%d abort", this.id);

        this.setTimeout(0);

        const abortCode = code || "CANCEL";

        state.framer.rstFrame({
            id: this.id,
            code: abortCode
        });

        const self = this;
        process.nextTick(() => {
            if (callback) {
                callback(null);
            }
            self.emit("close", new Error(`Aborted, code: ${abortCode}`));
        });
    }

    setPriority(info) {
        const state = this._spdyState;

        state.timeout.reset();

        if (!this._checkEnded()) {
            return;
        }

        state.debug("id=%d priority change", this.id, info);

        const frame = { id: this.id, priority: info };

        // Change priority on this side
        this._handlePriority(frame);

        // And on the other too
        state.framer.priorityFrame(frame);
    }

    pushPromise(uri, callback) {
        if (!this._checkEnded(callback)) {
            return;
        }

        const self = this;
        this._hardCork();
        const push = this.connection.pushPromise(this, uri, (err) => {
            self._hardUncork();
            if (!err) {
                push._hardUncork();
            }

            if (callback) {
                return callback(err, push);
            }

            if (err) {
                push.emit("error", err);
            }
        });
        push._hardCork();

        return push;
    }

    setMaxChunk(size) {
        const state = this._spdyState;
        state.maxChunk = size;
    }

    setTimeout(delay, callback) {
        const state = this._spdyState;

        state.timeout.set(delay, callback);
    }
}
