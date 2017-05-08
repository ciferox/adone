const STDERR = adone.net.ssh.c.CHANNEL_EXTENDED_DATATYPE.STDERR;
const PACKET_SIZE = 32 * 1024;
const MAX_WINDOW = 1 * 1024 * 1024;
const WINDOW_THRESHOLD = MAX_WINDOW / 2;
const CUSTOM_EVENTS = [
    "CHANNEL_EOF",
    "CHANNEL_CLOSE",
    "CHANNEL_DATA",
    "CHANNEL_EXTENDED_DATA",
    "CHANNEL_WINDOW_ADJUST",
    "CHANNEL_SUCCESS",
    "CHANNEL_FAILURE",
    "CHANNEL_REQUEST"
];
const CUSTOM_EVENTS_LEN = CUSTOM_EVENTS.length;

const windowAdjust = (self) => {
    if (self.outgoing.state !== "open") {
        return true;
    }
    const amt = MAX_WINDOW - self.incoming.window;
    if (amt <= 0) {
        return true;
    }
    self.incoming.window += amt;
    return self._client._sshstream.channelWindowAdjust(self.outgoing.id, amt);
};


class ServerStderr extends adone.std.stream.Writable {
    constructor(channel) {
        super({
            highWaterMark: MAX_WINDOW
        });
        this._channel = channel;
    }

    _write(data, encoding, cb) {
        const channel = this._channel;
        const sshstream = channel._client._sshstream;
        const outgoing = channel.outgoing;
        const packetSize = outgoing.packetSize;
        const id = outgoing.id;
        let window = outgoing.window;
        const len = data.length;
        let p = 0;
        let ret;
        let buf;
        let sliceLen;

        if (channel.outgoing.state !== "open") {
            return;
        }

        while (len - p > 0 && window > 0) {
            sliceLen = len - p;
            if (sliceLen > window) {
                sliceLen = window;
            }
            if (sliceLen > packetSize) {
                sliceLen = packetSize;
            }

            ret = sshstream.channelExtData(id, data.slice(p, p + sliceLen), STDERR);

            p += sliceLen;
            window -= sliceLen;

            if (!ret) {
                channel._waitClientDrain = true;
                channel._chunkErr = undefined;
                channel._chunkcbErr = cb;
                break;
            }
        }

        outgoing.window = window;

        if (len - p > 0) {
            if (window === 0) {
                channel._waitWindow = true;
            }
            if (p > 0) {
                // partial
                buf = new Buffer(len - p);
                data.copy(buf, 0, p);
                channel._chunkErr = buf;
            } else {
                channel._chunkErr = data;
            }
            channel._chunkcbErr = cb;
            return;
        }

        if (!channel._waitClientDrain) {
            cb();
        }
    }
}

export default class Channel extends adone.std.stream.Duplex {
    constructor(info, client, opts) {
        const streamOpts = {
            highWaterMark: MAX_WINDOW,
            allowHalfOpen: (!opts || (opts && opts.allowHalfOpen !== false))
        };
        super(streamOpts);

        this.allowHalfOpen = streamOpts.allowHalfOpen;

        const self = this;
        const server = opts && opts.server;

        this.server = server;
        this.type = info.type;
        this.subtype = undefined;
        /*
            incoming and outgoing contain these properties:
            {
                id: undefined,
                window: undefined,
                packetSize: undefined,
                state: "closed"
            }
        */
        const incoming = this.incoming = info.incoming;
        const incomingId = incoming.id;
        const outgoing = this.outgoing = info.outgoing;
        let callbacks = this._callbacks = [];
        let exitCode;
        let exitSignal;
        let exitDump;
        let exitDesc;
        let exitLang;

        this._client = client;
        this._hasX11 = false;

        const channels = client._channels;
        const sshstream = client._sshstream;

        const ondrain = () => {
            if (self._waitClientDrain) {
                self._waitClientDrain = false;
                if (!self._waitWindow) {
                    if (self._chunk) {
                        self._write(self._chunk, null, self._chunkcb);
                    } else if (self._chunkcb) {
                        self._chunkcb();
                    } else if (self._chunkErr) {
                        self.stderr._write(self._chunkErr, null, self._chunkcbErr);
                    } else if (self._chunkcbErr) {
                        self._chunkcbErr();
                    }
                }
            }
        };

        client._sock.on("drain", ondrain);

        sshstream.once(`CHANNEL_EOF:${incomingId}`, () => {
            if (incoming.state === "closed" || incoming.state === "eof") {
                return;
            }
            incoming.state = "eof";

            if (self.readable) {
                self.push(null);
            }
            if (!server && self.stderr.readable) {
                self.stderr.push(null);
            }
        }).once(`CHANNEL_CLOSE:${incomingId}`, () => {
            if (incoming.state === "closed") {
                return;
            }
            incoming.state = "closed";

            if (self.readable) {
                self.push(null);
            }
            if (server && self.stderr.writable) {
                self.stderr.end();
            } else if (!server && self.stderr.readable) {
                self.stderr.push(null);
            }

            if (outgoing.state === "open" || outgoing.state === "eof") {
                self.close();
            }
            if (outgoing.state === "closing") {
                outgoing.state = "closed";
            }

            delete channels[incomingId];

            const state = self._writableState;
            client._sock.removeListener("drain", ondrain);
            if (!state.ending && !state.finished) {
                self.end();
            }

            // Take care of any outstanding channel requests
            self._callbacks = [];
            for (let i = 0; i < callbacks.length; ++i) {
                callbacks[i](true);
            }
            callbacks = self._callbacks;

            if (!server) {
                // align more with node child processes, where the close event gets the
                // same arguments as the exit event
                if (!self.readable) {
                    if (exitCode === null) {
                        self.emit("close", exitCode, exitSignal, exitDump, exitDesc,
                            exitLang);
                    } else {
                        self.emit("close", exitCode);
                    }
                } else {
                    self.once("end", () => {
                        if (exitCode === null) {
                            self.emit("close", exitCode, exitSignal, exitDump, exitDesc,
                                exitLang);
                        } else {
                            self.emit("close", exitCode);
                        }
                    });
                }

                if (!self.stderr.readable) {
                    self.stderr.emit("close");
                } else {
                    self.stderr.once("end", () => {
                        self.stderr.emit("close");
                    });
                }
            } else { // Server mode
                if (!self.readable) {
                    self.emit("close");
                } else {
                    self.once("end", () => {
                        self.emit("close");
                    });
                }
            }

            for (let i = 0; i < CUSTOM_EVENTS_LEN; ++i) {
                sshstream.removeAllListeners(`${CUSTOM_EVENTS[i]}:${incomingId}`);
            }
        }).on(`CHANNEL_DATA:${incomingId}`, (data) => {
            // the remote party should not be sending us data if there is no window
            // space available ...
            if (incoming.window === 0) {
                return;
            }

            incoming.window -= data.length;

            if (!self.push(data)) {
                self._waitChanDrain = true;
                return;
            }

            if (incoming.window <= WINDOW_THRESHOLD) {
                windowAdjust(self);
            }
        }).on(`CHANNEL_WINDOW_ADJUST:${incomingId}`, (amt) => {
            // the server is allowing us to send `amt` more bytes of data
            outgoing.window += amt;

            if (self._waitWindow) {
                self._waitWindow = false;
                if (!self._waitClientDrain) {
                    if (self._chunk) {
                        self._write(self._chunk, null, self._chunkcb);
                    } else if (self._chunkcb) {
                        self._chunkcb();
                    } else if (self._chunkErr) {
                        self.stderr._write(self._chunkErr, null, self._chunkcbErr);
                    } else if (self._chunkcbErr) {
                        self._chunkcbErr();
                    }
                }
            }
        }).on(`CHANNEL_SUCCESS:${incomingId}`, () => {
            if (server) {
                sshstream._kalast = Date.now();
                sshstream._kacnt = 0;
            } else {
                client._resetKA();
            }
            if (callbacks.length) {
                callbacks.shift()(false);
            }
        }).on(`CHANNEL_FAILURE:${incomingId}`, () => {
            if (server) {
                sshstream._kalast = Date.now();
                sshstream._kacnt = 0;
            } else {
                client._resetKA();
            }
            if (callbacks.length) {
                callbacks.shift()(true);
            }
        }).on(`CHANNEL_REQUEST:${incomingId}`, (info) => {
            if (!server) {
                if (info.request === "exit-status") {
                    self.emit("exit", exitCode = info.code);
                    return;
                } else if (info.request === "exit-signal") {
                    self.emit("exit",
                        exitCode = null,
                        exitSignal = `SIG${info.signal}`,
                        exitDump = info.coredump,
                        exitDesc = info.description,
                        exitLang = info.lang);
                    return;
                }
            }

            // keepalive request? OpenSSH will send one as a channel request if there
            // is a channel open

            if (info.wantReply) {
                sshstream.channelFailure(outgoing.id);
            }
        });

        this.stdin = this.stdout = this;

        if (server) {
            this.stderr = new ServerStderr(this);
        } else {
            this.stderr = new adone.std.stream.Readable(streamOpts);
            this.stderr._read = function (n) {
                if (self._waitChanDrain) {
                    self._waitChanDrain = false;
                    if (incoming.window <= WINDOW_THRESHOLD) {
                        windowAdjust(self);
                    }
                }
            };

            sshstream.on(`CHANNEL_EXTENDED_DATA:${incomingId}`,
                (type, data) => {
                    // the remote party should not be sending us data if there is no window space available ...
                    if (incoming.window === 0) {
                        return;
                    }

                    incoming.window -= data.length;

                    if (!self.stderr.push(data)) {
                        self._waitChanDrain = true;
                        return;
                    }

                    if (incoming.window <= WINDOW_THRESHOLD) {
                        windowAdjust(self);
                    }
                }
            );
        }

        // outgoing data
        this._waitClientDrain = false; // Client stream-level backpressure
        this._waitWindow = false; // SSH-level backpressure

        // incoming data
        this._waitChanDrain = false; // Channel Readable side backpressure

        this._chunk = undefined;
        this._chunkcb = undefined;
        this._chunkErr = undefined;
        this._chunkcbErr = undefined;

        const onFinish = () => {
            self.eof();
            if (server || (!server && !self.allowHalfOpen)) {
                self.close();
            }
            self.writable = false;
        };

        this.on("finish", onFinish)
            .on("prefinish", onFinish); // for node v0.11+
        const onEnd = () => {
            self.readable = false;
        };

        this.on("end", onEnd)
            .on("close", onEnd);
    }

    eof() {
        let ret = true;
        const outgoing = this.outgoing;

        if (outgoing.state === "open") {
            outgoing.state = "eof";
            ret = this._client._sshstream.channelEOF(outgoing.id);
        }

        return ret;
    }

    close() {
        let ret = true;
        const outgoing = this.outgoing;

        if (outgoing.state === "open" || outgoing.state === "eof") {
            outgoing.state = "closing";
            ret = this._client._sshstream.channelClose(outgoing.id);
        }

        return ret;
    }

    _read(n) {
        if (this._waitChanDrain) {
            this._waitChanDrain = false;
            if (this.incoming.window <= WINDOW_THRESHOLD) {
                windowAdjust(this);
            }
        }
    }

    _write(data, encoding, cb) {
        const sshstream = this._client._sshstream;
        const outgoing = this.outgoing;
        const packetSize = outgoing.packetSize;
        const id = outgoing.id;
        let window = outgoing.window;
        const len = data.length;
        let p = 0;
        let ret;
        let buf;
        let sliceLen;

        if (outgoing.state !== "open") {
            return;
        }

        while (len - p > 0 && window > 0) {
            sliceLen = len - p;
            if (sliceLen > window) {
                sliceLen = window;
            }
            if (sliceLen > packetSize) {
                sliceLen = packetSize;
            }

            ret = sshstream.channelData(id, data.slice(p, p + sliceLen));

            p += sliceLen;
            window -= sliceLen;

            if (!ret) {
                this._waitClientDrain = true;
                this._chunk = undefined;
                this._chunkcb = cb;
                break;
            }
        }

        outgoing.window = window;

        if (len - p > 0) {
            if (window === 0) {
                this._waitWindow = true;
            }
            if (p > 0) {
                // partial
                buf = new Buffer(len - p);
                data.copy(buf, 0, p);
                this._chunk = buf;
            } else {
                this._chunk = data;
            }
            this._chunkcb = cb;
            return;
        }

        if (!this._waitClientDrain) {
            cb();
        }
    }

    destroy() {
        this.end();
    }

    // session type-specific methods
    setWindow(rows, cols, height, width) {
        if (this.server) {
            throw new Error("Client-only method called in server mode");
        }

        if (this.type === "session" &&
            (this.subtype === "shell" || this.subtype === "exec") &&
            this.writable &&
            this.outgoing.state === "open") {
            return this._client._sshstream.windowChange(this.outgoing.id,
                rows,
                cols,
                height,
                width);
        }

        return true;
    }

    signal(signalName) {
        if (this.server) {
            throw new Error("Client-only method called in server mode");
        }

        if (this.type === "session" && this.writable && this.outgoing.state === "open") {
            return this._client._sshstream.signal(this.outgoing.id, signalName);
        }

        return true;
    }

    exit(name, coreDumped, msg) {
        if (!this.server) {
            throw new Error("Server-only method called in client mode");
        }

        if (this.type === "session" && this.writable && this.outgoing.state === "open") {
            if (typeof name === "number") {
                return this._client._sshstream.exitStatus(this.outgoing.id, name);
            } else {
                return this._client._sshstream.exitSignal(this.outgoing.id, name, coreDumped, msg);
            }
        }

        return true;
    }
}
Channel.MAX_WINDOW = MAX_WINDOW;
Channel.PACKET_SIZE = PACKET_SIZE;
