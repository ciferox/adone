const OffsetBuffer = require("obuf");

const {
    assert,
    is,
    net: { spdy }
} = adone;

const { protocol: { base, spdy: { constants } } } = spdy;

export default class Parser extends base.Parser {
    constructor(options) {
        super(options);

        this.isServer = options.isServer;
        this.waiting = constants.FRAME_HEADER_SIZE;
        this.state = "frame-head";
        this.pendingHeader = null;
    }

    setMaxFrameSize(size) {
        // http2-only
    }

    setMaxHeaderListSize(size) {
        // http2-only
    }

    // Only for testing
    skipPreface() {
    }

    execute(buffer, callback) {
        if (this.state === "frame-head") {
            return this.onFrameHead(buffer, callback);
        }

        assert(this.state === "frame-body" && !is.null(this.pendingHeader));

        const self = this;
        const header = this.pendingHeader;
        this.pendingHeader = null;

        this.onFrameBody(header, buffer, (err, frame) => {
            if (err) {
                return callback(err);
            }

            self.state = "frame-head";
            self.waiting = constants.FRAME_HEADER_SIZE;
            self.partial = false;
            callback(null, frame);
        });
    }

    executePartial(buffer, callback) {
        const header = this.pendingHeader;

        if (this.window) {
            this.window.recv.update(-buffer.size);
        }

        // DATA frame
        callback(null, {
            type: "DATA",
            id: header.id,

            // Partial DATA can't be FIN
            fin: false,
            data: buffer.take(buffer.size)
        });
    }

    onFrameHead(buffer, callback) {
        const header = {
            control: (buffer.peekUInt8() & 0x80) === 0x80,
            version: null,
            type: null,
            id: null,
            flags: null,
            length: null
        };

        if (header.control) {
            header.version = buffer.readUInt16BE() & 0x7fff;
            header.type = buffer.readUInt16BE();
        } else {
            header.id = buffer.readUInt32BE(0) & 0x7fffffff;
        }
        header.flags = buffer.readUInt8();
        header.length = buffer.readUInt24BE();

        if (is.null(this.version) && header.control) {
            // TODO(indutny): do ProtocolError here and in the rest of errors
            if (header.version !== 2 && header.version !== 3) {
                return callback(new Error(`Unsupported SPDY version: ${header.version}`));
            }
            this.setVersion(header.version);
        }

        this.state = "frame-body";
        this.waiting = header.length;
        this.pendingHeader = header;
        this.partial = !header.control;

        callback(null, null);
    }

    onFrameBody(header, buffer, callback) {
        // Data frame
        if (!header.control) {
            // Count received bytes
            if (this.window) {
                this.window.recv.update(-buffer.size);
            }

            // No support for compressed DATA
            if ((header.flags & constants.flags.FLAG_COMPRESSED) !== 0) {
                return callback(new Error("DATA compression not supported"));
            }

            if (header.id === 0) {
                return callback(this.error(constants.error.PROTOCOL_ERROR,
                    "Invalid stream id for DATA"));
            }

            return callback(null, {
                type: "DATA",
                id: header.id,
                fin: (header.flags & constants.flags.FLAG_FIN) !== 0,
                data: buffer.take(buffer.size)
            });
        }

        if (header.type === 0x01 || header.type === 0x02) { // SYN_STREAM or SYN_REPLY
            this.onSynHeadFrame(header.type, header.flags, buffer, callback);
        } else if (header.type === 0x03) { // RST_STREAM
            this.onRSTFrame(buffer, callback);
        } else if (header.type === 0x04) { // SETTINGS
            this.onSettingsFrame(buffer, callback);
        } else if (header.type === 0x05) {
            callback(null, { type: "NOOP" });
        } else if (header.type === 0x06) { // PING
            this.onPingFrame(buffer, callback);
        } else if (header.type === 0x07) { // GOAWAY
            this.onGoawayFrame(buffer, callback);
        } else if (header.type === 0x08) { // HEADERS
            this.onHeaderFrames(buffer, callback);
        } else if (header.type === 0x09) { // WINDOW_UPDATE
            this.onWindowUpdateFrame(buffer, callback);
        } else if (header.type === 0xf000) { // X-FORWARDED
            this.onXForwardedFrame(buffer, callback);
        } else {
            callback(null, { type: `unknown: ${header.type}` });
        }
    }

    _filterHeader(headers, name) {
        const res = {};
        const keys = Object.keys(headers);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key !== name) {
                res[key] = headers[key];
            }
        }

        return res;
    }

    onSynHeadFrame(type, flags, body, callback) {
        const self = this;
        const stream = type === 0x01;
        const offset = stream ? 10 : this.version === 2 ? 6 : 4;

        if (!body.has(offset)) {
            return callback(new Error("SynHead OOB"));
        }

        const head = body.clone(offset);
        body.skip(offset);
        this.parseKVs(body, (err, headers) => {
            if (err) {
                return callback(err);
            }

            if (stream &&
                (!headers[":method"] || !headers[":path"])) {
                return callback(new Error("Missing `:method` and/or `:path` header"));
            }

            const id = head.readUInt32BE() & 0x7fffffff;

            if (id === 0) {
                return callback(self.error(constants.error.PROTOCOL_ERROR,
                    "Invalid stream id for HEADERS"));
            }

            const associated = stream ? head.readUInt32BE() & 0x7fffffff : 0;
            const priority = stream
                ? head.readUInt8() >> 5
                : base.utils.weightToPriority(constants.DEFAULT_WEIGHT);
            const fin = (flags & constants.flags.FLAG_FIN) !== 0;
            const unidir = (flags & constants.flags.FLAG_UNIDIRECTIONAL) !== 0;
            const path = headers[":path"];

            const isPush = stream && associated !== 0;

            const weight = base.utils.priorityToWeight(priority);
            const priorityInfo = {
                weight,
                exclusive: false,
                parent: 0
            };

            if (!isPush) {
                callback(null, {
                    type: "HEADERS",
                    id,
                    priority: priorityInfo,
                    fin,
                    writable: !unidir,
                    headers,
                    path
                });
                return;
            }

            if (stream && !headers[":status"]) {
                return callback(new Error("Missing `:status` header"));
            }

            const filteredHeaders = self._filterHeader(headers, ":status");

            callback(null, [{
                type: "PUSH_PROMISE",
                id: associated,
                fin: false,
                promisedId: id,
                headers: filteredHeaders,
                path
            }, {
                type: "HEADERS",
                id,
                fin,
                priority: priorityInfo,
                writable: true,
                path: undefined,
                headers: {
                    ":status": headers[":status"]
                }
            }]);
        });
    }

    onHeaderFrames(body, callback) {
        const offset = this.version === 2 ? 6 : 4;
        if (!body.has(offset)) {
            return callback(new Error("HEADERS OOB"));
        }

        const streamId = body.readUInt32BE() & 0x7fffffff;
        if (this.version === 2) {
            body.skip(2);
        }

        this.parseKVs(body, (err, headers) => {
            if (err) {
                return callback(err);
            }

            callback(null, {
                type: "HEADERS",
                priority: {
                    parent: 0,
                    exclusive: false,
                    weight: constants.DEFAULT_WEIGHT
                },
                id: streamId,
                fin: false,
                writable: true,
                path: undefined,
                headers
            });
        });
    }

    parseKVs(buffer, callback) {
        const self = this;

        this.decompress.write(buffer.toChunks(), (err, chunks) => {
            if (err) {
                return callback(err);
            }

            const buffer = new OffsetBuffer();
            for (let i = 0; i < chunks.length; i++) {
                buffer.push(chunks[i]);
            }

            const size = self.version === 2 ? 2 : 4;
            if (!buffer.has(size)) {
                return callback(new Error("KV OOB"));
            }

            let count = self.version === 2
                ? buffer.readUInt16BE()
                : buffer.readUInt32BE();

            const headers = {};

            const readString = function () {
                if (!buffer.has(size)) {
                    return null;
                }
                const len = self.version === 2
                    ? buffer.readUInt16BE()
                    : buffer.readUInt32BE();

                if (!buffer.has(len)) {
                    return null;
                }

                const value = buffer.take(len);
                return value.toString();
            };

            while (count > 0) {
                let key = readString();
                let value = readString();

                if (is.null(key) || is.null(value)) {
                    return callback(new Error("Headers OOB"));
                }

                if (self.version < 3) {
                    const isInternal = /^(method|version|url|host|scheme|status)$/.test(key);
                    if (key === "url") {
                        key = "path";
                    }
                    if (isInternal) {
                        key = `:${key}`;
                    }
                }

                // Compatibility with HTTP2
                if (key === ":status") {
                    value = value.split(/ /g, 2)[0];
                }

                count--;
                if (key === ":host") {
                    key = ":authority";
                }

                // Skip version, not present in HTTP2
                if (key === ":version") {
                    continue;
                }

                value = value.split(/\0/g);
                for (let j = 0; j < value.length; j++) {
                    base.utils.addHeaderLine(key, value[j], headers);
                }
            }

            callback(null, headers);
        });
    }

    onRSTFrame(body, callback) {
        if (!body.has(8)) {
            return callback(new Error("RST OOB"));
        }

        const frame = {
            type: "RST",
            id: body.readUInt32BE() & 0x7fffffff,
            code: constants.errorByCode[body.readUInt32BE()]
        };

        if (frame.id === 0) {
            return callback(this.error(constants.error.PROTOCOL_ERROR,
                "Invalid stream id for RST"));
        }

        if (body.size !== 0) {
            frame.extra = body.take(body.size);
        }
        callback(null, frame);
    }

    onSettingsFrame(body, callback) {
        if (!body.has(4)) {
            return callback(new Error("SETTINGS OOB"));
        }

        const settings = {};
        const number = body.readUInt32BE();
        const idMap = {
            1: "upload_bandwidth",
            2: "download_bandwidth",
            3: "round_trip_time",
            4: "max_concurrent_streams",
            5: "current_cwnd",
            6: "download_retrans_rate",
            7: "initial_window_size",
            8: "client_certificate_vector_size"
        };

        if (!body.has(number * 8)) {
            return callback(new Error("SETTINGS OOB#2"));
        }

        for (let i = 0; i < number; i++) {
            let id = this.version === 2
                ? body.readUInt32LE()
                : body.readUInt32BE();

            const flags = (id >> 24) & 0xff;
            id = id & 0xffffff;

            // Skip persisted settings
            if (flags & 0x2) {
                continue;
            }

            const name = idMap[id];

            settings[name] = body.readUInt32BE();
        }

        callback(null, {
            type: "SETTINGS",
            settings
        });
    }

    onPingFrame(body, callback) {
        if (!body.has(4)) {
            return callback(new Error("PING OOB"));
        }

        const isServer = this.isServer;
        const opaque = body.clone(body.size).take(body.size);
        const id = body.readUInt32BE();
        const ack = isServer ? (id % 2 === 0) : (id % 2 === 1);

        callback(null, { type: "PING", opaque, ack });
    }

    onGoawayFrame(body, callback) {
        if (!body.has(8)) {
            return callback(new Error("GOAWAY OOB"));
        }

        callback(null, {
            type: "GOAWAY",
            lastId: body.readUInt32BE() & 0x7fffffff,
            code: constants.goawayByCode[body.readUInt32BE()]
        });
    }

    onWindowUpdateFrame(body, callback) {
        if (!body.has(8)) {
            return callback(new Error("WINDOW_UPDATE OOB"));
        }

        callback(null, {
            type: "WINDOW_UPDATE",
            id: body.readUInt32BE() & 0x7fffffff,
            delta: body.readInt32BE()
        });
    }

    onXForwardedFrame(body, callback) {
        if (!body.has(4)) {
            return callback(new Error("X_FORWARDED OOB"));
        }

        const len = body.readUInt32BE();
        if (!body.has(len)) {
            return callback(new Error("X_FORWARDED host length OOB"));
        }

        callback(null, {
            type: "X_FORWARDED_FOR",
            host: body.take(len).toString()
        });
    }

    static create(options) {
        return new Parser(options);
    }
}
