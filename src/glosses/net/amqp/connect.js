const {
    is,
    exception,
    net: { amqp },
    event,
    std: {
        util: { format: fmt },
        stream: {
            Duplex,
            PassThrough
        }
    }
} = adone;

const {
    credentials
} = amqp;

const {
    defs,
    frame,
    Mux,
    heartbeat: { Heart },
    format: {
        methodName,
        closeMessage: closeMsg,
        inspect
    }
} = adone.private(amqp);

const {
    constants
} = defs;

const {
    HEARTBEAT
} = frame;

const CLIENT_PROPERTIES = {
    product: "adone.net.amqp",
    version: fmt("adone %s", adone.package.version),
    platform: fmt("node.js %s", process.version),
    information: "https://github.com/ciferox/adone",
    capabilities: {
        publisher_confirms: true,
        exchange_exchange_bindings: true,
        "basic.nack": true,
        consumer_cancel_notify: true,
        "connection.blocked": true,
        authentication_failure_close: true
    }
};

// Construct the main frames used in the opening handshake
const openFrames = (vhost, query, credentials, extraClientProperties) => {
    if (!vhost) {
        vhost = "/";
    } else {
        vhost = adone.std.querystring.unescape(vhost);
    }

    query = query || {};

    const intOrDefault = (val, def) => {
        return is.undefined(val) ? def : parseInt(val);
    };

    const clientProperties = {
        ...adone.util.clone(CLIENT_PROPERTIES),
        ...extraClientProperties
    };

    return {
        // start-ok
        clientProperties,
        mechanism: credentials.mechanism,
        response: credentials.response(),
        locale: query.locale || "en_US",

        // tune-ok
        channelMax: intOrDefault(query.channelMax, 0),
        frameMax: intOrDefault(query.frameMax, 0x1000),
        heartbeat: intOrDefault(query.heartbeat, 0),

        // open
        virtualHost: vhost,
        capabilities: "",
        insist: 0
    };
};

// Decide on credentials based on what we're supplied.
export const credentialsFromUrl = (parts) => {
    let user = "guest";
    let passwd = "guest";
    if (parts.username || parts.password) {
        user = (parts.username) ? unescape(parts.username) : "";
        passwd = (parts.password) ? unescape(parts.password) : "";
    }
    return credentials.plain(user, passwd);
};

export const connect = (url, socketOptions, openCallback) => {
    // tls.connect uses `util._extend()` on the options given it, which
    // copies only properties mentioned in `Object.keys()`, when
    // processing the options. So I have to make copies too, rather
    // than using `Object.create()`.
    const sockopts = adone.util.clone(socketOptions || {});
    url = url || "amqp://localhost";

    const noDelay = Boolean(sockopts.noDelay);
    const timeout = sockopts.timeout;
    const keepAlive = Boolean(sockopts.keepAlive);
    // 0 is default for node
    const keepAliveDelay = sockopts.keepAliveDelay || 0;

    const extraClientProperties = sockopts.clientProperties || {};

    let protocol;
    let fields;
    if (is.plainObject(url)) {
        protocol = `${url.protocol || "amqp"}:`;
        sockopts.host = url.hostname;
        sockopts.port = url.port || ((protocol === "amqp") ? 5672 : 5671);

        let user;
        let pass;
        // Only default if both are missing, to have the same behaviour as
        // the stringly URL.
        if (is.nil(url.username) && is.nil(url.password)) {
            user = "guest"; pass = "guest";
        } else {
            user = url.username || "";
            pass = url.password || "";
        }

        const config = {
            locale: url.locale,
            channelMax: url.channelMax,
            frameMax: url.frameMax,
            heartbeat: url.heartbeat
        };

        fields = openFrames(url.vhost, config, sockopts.credentials || credentials.plain(user, pass), extraClientProperties);
    } else {
        const parts = adone.uri.parse(url);
        protocol = parts.protocol;
        sockopts.host = parts.hostname;
        sockopts.port = parseInt(parts.port) || ((protocol === "amqp") ? 5672 : 5671);
        const vhost = parts.pathname ? parts.pathname.substr(1) : null;
        fields = openFrames(vhost, adone.uri.parseQuery(parts.query), sockopts.credentials || credentialsFromUrl(parts), extraClientProperties);
    }

    let sockok = false;
    let sock;

    const onConnect = () => {
        sockok = true;
        sock.setNoDelay(noDelay);
        if (keepAlive) {
            sock.setKeepAlive(keepAlive, keepAliveDelay);
        }

        const c = new Connection(sock);
        c.open(fields, (err, ok) => {
            // disable timeout once the connection is open, we don't want
            // it fouling things
            if (timeout) {
                sock.setTimeout(0);
            }
            if (is.null(err)) {
                openCallback(null, c);
            } else {
                openCallback(err);
            }
        });
    };

    if (protocol === "amqp") {
        sock = require("net").connect(sockopts, onConnect);
    } else if (protocol === "amqps") {
        sock = require("tls").connect(sockopts, onConnect);
    } else {
        throw new Error(`Expected amqp or amqps as the protocol; got ${protocol}`);
    }

    if (timeout) {
        sock.setTimeout(timeout, () => {
            sock.end();
            sock.destroy();
            openCallback(new Error("connect ETIMEDOUT"));
        });
    }

    sock.once("error", (err) => {
        if (!sockok) {
            openCallback(err);
        }
    });
};

// High-water mark for channel write buffers, in 'objects' (which are
// encoded frames as buffers).
const DEFAULT_WRITE_HWM = 1024;
// If all the frames of a message (method, properties, content) total
// to less than this, copy them into a single buffer and write it all
// at once. Note that this is less than the minimum frame size: if it
// was greater, we might have to fragment the content.
const SINGLE_CHUNK_THRESHOLD = 2048;


// Usual frame accept mode
const mainAccept = function (frame) {
    const rec = this.channels[frame.channel];
    if (rec) {
        return rec.channel.accept(frame);
    }
    // NB CHANNEL_ERROR may not be right, but I don't know what is ..
    this.closeWithError(
        fmt("Frame on unknown channel %d", frame.channel),
        constants.CHANNEL_ERROR,
        new Error(fmt("Frame on unknown channel: %s",
            inspect(frame, false))));
};

export const isFatalError = (error) => {
    switch (error && error.code) {
        case defs.constants.CONNECTION_FORCED:
        case defs.constants.REPLY_SUCCESS:
            return false;
        default:
            return true;
    }
};

// Handle anything that comes through on channel 0, that's the
// connection control channel. This is only used once mainAccept is
// installed as the frame handler, after the opening handshake.
const channel0 = function (connection) {
    return function (f) {
        // Once we get a 'close', we know 1. we'll get no more frames, and
        // 2. anything we send except close, or close-ok, will be
        // ignored. If we already sent 'close', this won't be invoked since
        // we're already in closing mode; if we didn't well we're not going
        // to send it now are we.
        if (f === HEARTBEAT) {
            // ignore; it's already counted as activity
        } else if (f.id === defs.ConnectionClose) {
            // Oh. OK. I guess we're done here then.
            connection.sendMethod(0, defs.ConnectionCloseOk, {});
            const emsg = fmt("Connection closed: %s", closeMsg(f));
            const s = exception.captureStack(emsg);
            const e = new Error(emsg);
            e.code = f.fields.replyCode;
            if (isFatalError(e)) {
                connection.emit("error", e);
            }
            connection.toClosed(s, e);
        } else if (f.id === defs.ConnectionBlocked) {
            connection.emit("blocked", f.fields.reason);
        } else if (f.id === defs.ConnectionUnblocked) {
            connection.emit("unblocked");
        } else {
            connection.closeWithError(
                fmt("Unexpected frame on channel 0"),
                constants.UNEXPECTED_FRAME,
                new Error(fmt("Unexpected frame on channel 0: %s",
                    inspect(f, false))));
        }
    };
};

const invalidOp = (msg, stack) => {
    return function () {
        throw new amqp.x.IllegalOperationError(msg, stack);
    };
};

const invalidateSend = (conn, msg, stack) => {
    conn.sendMethod = conn.sendContent = conn.sendMessage = invalidOp(msg, stack);
};

const encodeMethod = defs.encodeMethod;
const encodeProperties = defs.encodeProperties;

const FRAME_OVERHEAD = defs.FRAME_OVERHEAD;
const makeBodyFrame = frame.makeBodyFrame;

const parseFrame = frame.parseFrame;
const decodeFrame = frame.decodeFrame;

const wrapStream = (s) => {
    if (s instanceof Duplex) {
        return s;
    }

    const ws = new Duplex();
    ws.wrap(s); //wraps the readable side of things
    ws._write = function (chunk, encoding, callback) {
        return s.write(chunk, encoding, callback);
    };
    return ws;
};

export class Connection extends event.Emitter {
    constructor(underlying) {
        super();
        const stream = this.stream = wrapStream(underlying);
        this.muxer = new Mux(stream);

        // frames
        this.rest = Buffer.alloc(0);
        this.frameMax = constants.FRAME_MIN_SIZE;
        this.sentSinceLastCheck = false;
        this.recvSinceLastCheck = false;

        this.expectSocketClose = false;
        this.freeChannels = new adone.math.BitSet();
        this.channels = [{
            channel: { accept: channel0(this) },
            buffer: underlying
        }];
    }


    // This changed between versions, as did the codec, methods, etc. AMQP
    // 0-9-1 is fairly similar to 0.8, but better, and nothing implements
    // 0.8 that doesn't implement 0-9-1. In other words, it doesn't make
    // much sense to generalise here.
    sendProtocolHeader() {
        this.sendBytes(frame.PROTOCOL_HEADER);
    }


    /**
     * The frighteningly complicated opening protocol (spec section 2.2.4):
     *
     * Client -> Server
     *
     * protocol header ->
     * <- start
     * start-ok ->
     * .. next two zero or more times ..
     * <- secure
     * secure-ok ->
     * <- tune
     * tune-ok ->
     * open ->
     * <- open-ok
     *
     * If I'm only supporting SASL's PLAIN mechanism (which I am for the time
     * being), it gets a bit easier since the server won't in general send
     * back a `secure`, it'll just send `tune` after the `start-ok`.
     * (SASL PLAIN: http://tools.ietf.org/html/rfc4616)
     *
     */
    open(allFields, openCallback0) {
        const openCallback = openCallback0 || function () { };

        // This is where we'll put our negotiated values
        const tunedOptions = Object.create(allFields);


        const bail = (err) => {
            openCallback(err);
        };

        const wait = (k) => {
            this.step((err, frame) => {
                if (!is.null(err)) {
                    bail(err);
                } else if (frame.channel !== 0) {
                    bail(new Error(
                        fmt("Frame on channel != 0 during handshake: %s",
                            inspect(frame, false))));
                } else {
                    k(frame);
                }
            });
        };

        const expect = (Method, k) => {
            wait((frame) => {
                if (frame.id === Method) {
                    k(frame);
                } else {
                    bail(new Error(
                        fmt("Expected %s; got %s",
                            methodName(Method), inspect(frame, false))));
                }
            });
        };

        const send = (Method) => {
            // This can throw an exception if there's some problem with the
            // options; e.g., something is a string instead of a number.
            try {
                this.sendMethod(0, Method, tunedOptions);
            } catch (err) {
                bail(err);
            }
        };

        const negotiate = (server, desired) => {
            // We get sent values for channelMax, frameMax and heartbeat,
            // which we may accept or lower (subject to a minimum for
            // frameMax, but we'll leave that to the server to enforce). In
            // all cases, `0` really means "no limit", or rather the highest
            // value in the encoding, e.g., unsigned short for channelMax.
            if (server === 0 || desired === 0) {
                // i.e., whichever places a limit, if either
                return Math.max(server, desired);
            }

            return Math.min(server, desired);

        };

        // If the server closes the connection, it's probably because of
        // something we did
        const endWhileOpening = (err) => {
            bail(err || new Error("Socket closed abruptly during opening handshake"));
        };

        const succeed = (ok) => {
            this.stream.removeListener("end", endWhileOpening);
            this.stream.removeListener("error", endWhileOpening);
            this.stream.on("error", this.onSocketError.bind(this));
            this.stream.on("end", this.onSocketError.bind(this, new Error("Unexpected close")));
            this.on("frameError", this.onSocketError.bind(this));
            this.acceptLoop();
            openCallback(null, ok);
        };

        const onOpenOk = (openOk) => {
            // Impose the maximum of the encoded value, if the negotiated
            // value is zero, meaning "no, no limits"
            this.channelMax = tunedOptions.channelMax || 0xffff;
            this.frameMax = tunedOptions.frameMax || 0xffffffff;
            // 0 means "no heartbeat", rather than "maximum period of
            // heartbeating"
            this.heartbeat = tunedOptions.heartbeat;
            this.heartbeater = this.startHeartbeater();
            this.accept = mainAccept;
            succeed(openOk);
        };

        const afterStartOk = (reply) => {
            switch (reply.id) {
                case defs.ConnectionSecure:
                    bail(new Error(
                        "Wasn't expecting to have to go through secure"));
                    break;
                case defs.ConnectionClose:
                    bail(new Error(fmt("Handshake terminated by server: %s",
                        closeMsg(reply))));
                    break;
                case defs.ConnectionTune: {
                    const fields = reply.fields;
                    tunedOptions.frameMax = negotiate(fields.frameMax, allFields.frameMax);
                    tunedOptions.channelMax = negotiate(fields.channelMax, allFields.channelMax);
                    tunedOptions.heartbeat = negotiate(fields.heartbeat, allFields.heartbeat);
                    send(defs.ConnectionTuneOk);
                    send(defs.ConnectionOpen);
                    expect(defs.ConnectionOpenOk, onOpenOk);
                    break;
                }
                default:
                    bail(new Error(
                        fmt("Expected connection.secure, connection.close, " +
                            "or connection.tune during handshake; got %s",
                        inspect(reply, false))));
                    break;
            }
        };

        const onStart = (start) => {
            const mechanisms = start.fields.mechanisms.toString().split(" ");
            if (!mechanisms.includes(allFields.mechanism)) {
                bail(new Error(fmt("SASL mechanism %s is not provided by the server",
                    allFields.mechanism)));
                return;
            }
            send(defs.ConnectionStartOk);
            wait(afterStartOk);
        };

        this.stream.on("end", endWhileOpening);
        this.stream.on("error", endWhileOpening);

        // Now kick off the handshake by prompting the server
        this.sendProtocolHeader();
        expect(defs.ConnectionStart, onStart);
    }

    // Closing things: AMQP has a closing handshake that applies to
    // closing both connects and channels. As the initiating party, I send
    // Close, then ignore all frames until I see either CloseOK --
    // which signifies that the other party has seen the Close and shut
    // the connection or channel down, so it's fine to free resources; or
    // Close, which means the other party also wanted to close the
    // whatever, and I should send CloseOk so it can free resources,
    // then go back to waiting for the CloseOk. If I receive a Close
    // out of the blue, I should throw away any unsent frames (they will
    // be ignored anyway) and send CloseOk, then clean up resources. In
    // general, Close out of the blue signals an error (or a forced
    // closure, which may as well be an error).
    //
    //  RUNNING [1] --- send Close ---> Closing [2] ---> recv Close --+
    //     |                               |                         [3]
    //     |                               +------ send CloseOk ------+
    //  recv Close                   recv CloseOk
    //     |                               |
    //     V                               V
    //  Ended [4] ---- send CloseOk ---> Closed [5]
    //
    // [1] All frames accepted; getting a Close frame from the server
    // moves to Ended; client may initiate a close by sending Close
    // itself.
    // [2] Client has initiated a close; only CloseOk or (simulataneously
    // sent) Close is accepted.
    // [3] Simultaneous close
    // [4] Server won't send any more frames; accept no more frames, send
    // CloseOk.
    // [5] Fully closed, client will send no more, server will send no
    // more. Signal 'close' or 'error'.
    //
    // There are two signalling mechanisms used in the API. The first is
    // that calling `close` will return a promise, that will either
    // resolve once the connection or channel is cleanly shut down, or
    // will reject if the shutdown times out.
    //
    // The second is the 'close' and 'error' events. These are
    // emitted as above. The events will fire *before* promises are
    // resolved.

    // Close the connection without even giving a reason. Typical.
    close(closeCallback) {
        const k = closeCallback && function () {
            closeCallback(null);
        };
        this.closeBecause("Cheers, thanks", constants.REPLY_SUCCESS, k);
    }

    // Close with a reason and a 'code'. I'm pretty sure RabbitMQ totally
    // ignores these; maybe it logs them. The continuation will be invoked
    // when the CloseOk has been received, and before the 'close' event.
    closeBecause(reason, code, k) {
        this.sendMethod(0, defs.ConnectionClose, {
            replyText: reason,
            replyCode: code,
            methodId: 0, classId: 0
        });
        const s = x.captureStack(`closeBecause called: ${reason}`);
        this.toClosing(s, k);
    }

    closeWithError(reason, code, error) {
        this.emit("error", error);
        this.closeBecause(reason, code);
    }

    onSocketError(err) {
        if (!this.expectSocketClose) {
            // forestall any more calls to onSocketError, since we're signed
            // up for `'error'` *and* `'end'`
            this.expectSocketClose = true;
            this.emit("error", err);
            const s = x.captureStack("Socket error");
            this.toClosed(s, err);
        }
    }

    // A close has been initiated. Repeat: a close has been initiated.
    // This means we should not send more frames, anyway they will be
    // ignored. We also have to shut down all the channels.
    toClosing(capturedStack, k) {
        const send = this.sendMethod.bind(this);

        this.accept = function (f) {
            if (f.id === defs.ConnectionCloseOk) {
                if (k) {
                    k();
                }
                const s = x.captureStack("ConnectionCloseOk received");
                this.toClosed(s, undefined);
            } else if (f.id === defs.ConnectionClose) {
                send(0, defs.ConnectionCloseOk, {});
            }
            // else ignore frame
        };
        invalidateSend(this, "Connection closing", capturedStack);
    }

    _closeChannels(capturedStack) {
        for (let i = 1; i < this.channels.length; i++) {
            const ch = this.channels[i];
            if (!is.null(ch)) {
                ch.channel.toClosed(capturedStack); // %%% or with an error? not clear
            }
        }
    }

    // A close has been confirmed. Cease all communication.
    toClosed(capturedStack, maybeErr) {
        this._closeChannels(capturedStack);
        const info = fmt("Connection closed (%s)", maybeErr ? maybeErr.toString() : "by client");
        // Tidy up, invalidate enverything, dynamite the bridges.
        invalidateSend(this, info, capturedStack);
        this.accept = invalidOp(info, capturedStack);
        this.close = function (cb) {
            cb && cb(new amqp.x.IllegalOperationError(info, capturedStack));
        };
        if (this.heartbeater) {
            this.heartbeater.clear();
        }
        // This is certainly true now, if it wasn't before
        this.expectSocketClose = true;
        this.stream.end();
        this.emit("close", maybeErr);
    }

    // ===

    startHeartbeater() {
        if (this.heartbeat === 0) {
            return null;
        }

        const self = this;
        const hb = new Heart(this.heartbeat,
            this.checkSend.bind(this),
            this.checkRecv.bind(this));
        hb.on("timeout", () => {
            const hberr = new Error("Heartbeat timeout");
            self.emit("error", hberr);
            const s = x.captureStack("Heartbeat timeout");
            self.toClosed(s, hberr);
        });
        hb.on("beat", () => {
            self.sendHeartbeat();
        });
        return hb;

    }

    // I use an array to keep track of the channels, rather than an
    // object. The channel identifiers are numbers, and allocated by the
    // connection. If I try to allocate low numbers when they are
    // available (which I do, by looking from the start of the bitset),
    // this ought to keep the array small, and out of 'sparse array
    // storage'. I also set entries to null, rather than deleting them, in
    // the expectation that the next channel allocation will fill the slot
    // again rather than growing the array. See
    // http://www.html5rocks.com/en/tutorials/speed/v8/
    freshChannel(channel, options) {
        const next = this.freeChannels.nextUnsetBit(1);
        if (next < 0 || next > this.channelMax) {
            throw new Error("No channels left to allocate");
        }
        this.freeChannels.set(next);

        const hwm = (options && options.highWaterMark) || DEFAULT_WRITE_HWM;
        const writeBuffer = new PassThrough({
            objectMode: true, highWaterMark: hwm
        });
        this.channels[next] = { channel, buffer: writeBuffer };
        writeBuffer.on("drain", () => {
            channel.onBufferDrain();
        });
        this.muxer.pipeFrom(writeBuffer);
        return next;
    }

    releaseChannel(channel) {
        this.freeChannels.unset(channel);
        const buffer = this.channels[channel].buffer;
        this.muxer.unpipeFrom(buffer);
        this.channels[channel] = null;
    }

    acceptLoop() {
        const go = () => {
            try {
                for ( ; ; ) {
                    const f = this.recvFrame();
                    if (!f) {
                        break;
                    }
                    this.accept(f);
                }
            } catch (e) {
                this.emit("frameError", e);
            }
        };
        this.stream.on("readable", go);
        go();
    }

    step(cb) {
        const recv = () => {
            let f;
            try {
                f = this.recvFrame();
            } catch (e) {
                cb(e, null);
                return;
            }
            if (f) {
                cb(null, f);
            } else {
                this.stream.once("readable", recv);
            }
        };
        recv();
    }

    checkSend() {
        const check = this.sentSinceLastCheck;
        this.sentSinceLastCheck = false;
        return check;
    }

    checkRecv() {
        const check = this.recvSinceLastCheck;
        this.recvSinceLastCheck = false;
        return check;
    }

    sendBytes(bytes) {
        this.sentSinceLastCheck = true;
        this.stream.write(bytes);
    }

    sendHeartbeat() {
        return this.sendBytes(frame.HEARTBEAT_BUF);
    }


    sendMethod(channel, Method, fields) {
        const frame = encodeMethod(Method, channel, fields);
        this.sentSinceLastCheck = true;
        const buffer = this.channels[channel].buffer;
        return buffer.write(frame);
    }

    sendMessage(channel, Method, fields, Properties, props, content) {
        if (!is.buffer(content)) {
            throw new TypeError("content is not a buffer");
        }

        const mframe = encodeMethod(Method, channel, fields);
        const pframe = encodeProperties(Properties, channel,
            content.length, props);
        const buffer = this.channels[channel].buffer;
        this.sentSinceLastCheck = true;

        const methodHeaderLen = mframe.length + pframe.length;
        const bodyLen = (content.length > 0) ?
            content.length + FRAME_OVERHEAD : 0;
        const allLen = methodHeaderLen + bodyLen;

        if (allLen < SINGLE_CHUNK_THRESHOLD) {
            const all = Buffer.alloc(allLen);
            let offset = mframe.copy(all, 0);
            offset += pframe.copy(all, offset);

            if (bodyLen > 0) {
                makeBodyFrame(channel, content).copy(all, offset);
            }
            return buffer.write(all);
        }

        if (methodHeaderLen < SINGLE_CHUNK_THRESHOLD) {
            const both = Buffer.alloc(methodHeaderLen);
            const offset = mframe.copy(both, 0);
            pframe.copy(both, offset);
            buffer.write(both);
        } else {
            buffer.write(mframe);
            buffer.write(pframe);
        }
        return this.sendContent(channel, content);

    }

    sendContent(channel, body) {
        if (!is.buffer(body)) {
            throw new TypeError(fmt("Expected buffer; got %s", body));
        }
        let writeResult = true;
        const buffer = this.channels[channel].buffer;

        const maxBody = this.frameMax - FRAME_OVERHEAD;

        for (let offset = 0; offset < body.length; offset += maxBody) {
            const end = offset + maxBody;
            const slice = (end > body.length) ? body.slice(offset) : body.slice(offset, end);
            const bodyFrame = makeBodyFrame(channel, slice);
            writeResult = buffer.write(bodyFrame);
        }
        this.sentSinceLastCheck = true;
        return writeResult;
    }

    recvFrame() {
        // %%% identifying invariants might help here?
        const frame = parseFrame(this.rest, this.frameMax);

        if (!frame) {
            const incoming = this.stream.read();
            if (is.null(incoming)) {
                return false;
            }

            this.recvSinceLastCheck = true;
            this.rest = Buffer.concat([this.rest, incoming]);
            return this.recvFrame();

        }

        this.rest = frame.rest;
        return decodeFrame(frame);
    }
}
