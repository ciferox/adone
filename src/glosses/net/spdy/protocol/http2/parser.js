const parser = exports;

const {
    is,
    net: { spdy: transport }
} = adone;
const base = transport.protocol.base;
const utils = base.utils;
const constants = require("./").constants;

const assert = require("assert");
const util = require("util");

function Parser(options) {
    base.Parser.call(this, options);

    this.isServer = options.isServer;

    this.waiting = constants.PREFACE_SIZE;
    this.state = "preface";
    this.pendingHeader = null;

    // Header Block queue
    this._lastHeaderBlock = null;
    this.maxFrameSize = constants.INITIAL_MAX_FRAME_SIZE;
    this.maxHeaderListSize = constants.DEFAULT_MAX_HEADER_LIST_SIZE;
}
util.inherits(Parser, base.Parser);

parser.create = function create(options) {
    return new Parser(options);
};

Parser.prototype.setMaxFrameSize = function setMaxFrameSize(size) {
    this.maxFrameSize = size;
};

Parser.prototype.setMaxHeaderListSize = function setMaxHeaderListSize(size) {
    this.maxHeaderListSize = size;
};

// Only for testing
Parser.prototype.skipPreface = function skipPreface() {
    // Just some number bigger than 3.1, doesn't really matter for HTTP2
    this.setVersion(4);

    // Parse frame header!
    this.state = "frame-head";
    this.waiting = constants.FRAME_HEADER_SIZE;
};

Parser.prototype.execute = function execute(buffer, callback) {
    if (this.state === "preface") {
        return this.onPreface(buffer, callback);
    }

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
        self.partial = false;
        self.waiting = constants.FRAME_HEADER_SIZE;
        callback(null, frame);
    });
};

Parser.prototype.executePartial = function executePartial(buffer, callback) {
    const header = this.pendingHeader;

    assert.equal(header.flags & constants.flags.PADDED, 0);

    if (this.window) {
        this.window.recv.update(-buffer.size);
    }

    callback(null, {
        type: "DATA",
        id: header.id,

        // Partial DATA can't be FIN
        fin: false,
        data: buffer.take(buffer.size)
    });
};

Parser.prototype.onPreface = function onPreface(buffer, callback) {
    if (buffer.take(buffer.size).toString() !== constants.PREFACE) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid preface"));
    }

    this.skipPreface();
    callback(null, null);
};

Parser.prototype.onFrameHead = function onFrameHead(buffer, callback) {
    const header = {
        length: buffer.readUInt24BE(),
        control: true,
        type: buffer.readUInt8(),
        flags: buffer.readUInt8(),
        id: buffer.readUInt32BE() & 0x7fffffff
    };

    if (header.length > this.maxFrameSize) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "Frame length OOB"));
    }

    header.control = header.type !== constants.frameType.DATA;

    this.state = "frame-body";
    this.pendingHeader = header;
    this.waiting = header.length;
    this.partial = !header.control;

    // TODO(indutny): eventually support partial padded DATA
    if (this.partial) {
        this.partial = (header.flags & constants.flags.PADDED) === 0;
    }

    callback(null, null);
};

Parser.prototype.onFrameBody = function onFrameBody(header, buffer, callback) {
    const frameType = constants.frameType;

    if (header.type === frameType.DATA) {
        this.onDataFrame(header, buffer, callback);
    } else if (header.type === frameType.HEADERS) {
        this.onHeadersFrame(header, buffer, callback);
    } else if (header.type === frameType.CONTINUATION) {
        this.onContinuationFrame(header, buffer, callback);
    } else if (header.type === frameType.WINDOW_UPDATE) {
        this.onWindowUpdateFrame(header, buffer, callback);
    } else if (header.type === frameType.RST_STREAM) {
        this.onRSTFrame(header, buffer, callback);
    } else if (header.type === frameType.SETTINGS) {
        this.onSettingsFrame(header, buffer, callback);
    } else if (header.type === frameType.PUSH_PROMISE) {
        this.onPushPromiseFrame(header, buffer, callback);
    } else if (header.type === frameType.PING) {
        this.onPingFrame(header, buffer, callback);
    } else if (header.type === frameType.GOAWAY) {
        this.onGoawayFrame(header, buffer, callback);
    } else if (header.type === frameType.PRIORITY) {
        this.onPriorityFrame(header, buffer, callback);
    } else if (header.type === frameType.X_FORWARDED_FOR) {
        this.onXForwardedFrame(header, buffer, callback);
    } else {
        this.onUnknownFrame(header, buffer, callback);
    }
};

Parser.prototype.onUnknownFrame = function onUnknownFrame(header, buffer, callback) {
    if (!is.null(this._lastHeaderBlock)) {
        callback(this.error(constants.error.PROTOCOL_ERROR,
            "Received unknown frame in the middle of a header block"));
        return;
    }
    callback(null, { type: `unknown: ${header.type}` });
};

Parser.prototype.unpadData = function unpadData(header, body, callback) {
    const isPadded = (header.flags & constants.flags.PADDED) !== 0;

    if (!isPadded) {
        return callback(null, body);
    }

    if (!body.has(1)) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "Not enough space for padding"));
    }

    const pad = body.readUInt8();
    if (!body.has(pad)) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid padding size"));
    }

    const contents = body.clone(body.size - pad);
    body.skip(body.size);
    callback(null, contents);
};

Parser.prototype.onDataFrame = function onDataFrame(header, body, callback) {
    const isEndStream = (header.flags & constants.flags.END_STREAM) !== 0;

    if (header.id === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Received DATA frame with stream=0"));
    }

    // Count received bytes
    if (this.window) {
        this.window.recv.update(-body.size);
    }

    this.unpadData(header, body, (err, data) => {
        if (err) {
            return callback(err);
        }

        callback(null, {
            type: "DATA",
            id: header.id,
            fin: isEndStream,
            data: data.take(data.size)
        });
    });
};

Parser.prototype.initHeaderBlock = function initHeaderBlock(header,
    frame,
    block,
    callback) {
    if (this._lastHeaderBlock) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Duplicate Stream ID"));
    }

    this._lastHeaderBlock = {
        id: header.id,
        frame,
        queue: [],
        size: 0
    };

    this.queueHeaderBlock(header, block, callback);
};

Parser.prototype.queueHeaderBlock = function queueHeaderBlock(header,
    block,
    callback) {
    const self = this;
    const item = this._lastHeaderBlock;
    if (!this._lastHeaderBlock || item.id !== header.id) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "No matching stream for continuation"));
    }

    const fin = (header.flags & constants.flags.END_HEADERS) !== 0;

    const chunks = block.toChunks();
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        item.queue.push(chunk);
        item.size += chunk.length;
    }

    if (item.size >= self.maxHeaderListSize) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Compressed header list is too large"));
    }

    if (!fin) {
        return callback(null, null);
    }
    this._lastHeaderBlock = null;

    this.decompress.write(item.queue, (err, chunks) => {
        if (err) {
            return callback(self.error(constants.error.COMPRESSION_ERROR,
                err.message));
        }

        let headers = {};
        let size = 0;
        for (let i = 0; i < chunks.length; i++) {
            let header = chunks[i];

            size += header.name.length + header.value.length + 32;
            if (size >= self.maxHeaderListSize) {
                return callback(self.error(constants.error.PROTOCOL_ERROR,
                    "Header list is too large"));
            }

            if (/[A-Z]/.test(header.name)) {
                return callback(self.error(constants.error.PROTOCOL_ERROR,
                    "Header name must be lowercase"));
            }

            utils.addHeaderLine(header.name, header.value, headers);
        }

        item.frame.headers = headers;
        item.frame.path = headers[":path"];

        callback(null, item.frame);
    });
};

Parser.prototype.onHeadersFrame = function onHeadersFrame(header,
    body,
    callback) {
    const self = this;

    if (header.id === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for HEADERS"));
    }

    this.unpadData(header, body, (err, data) => {
        if (err) {
            return callback(err);
        }

        let isPriority = (header.flags & constants.flags.PRIORITY) !== 0;
        if (!data.has(isPriority ? 5 : 0)) {
            return callback(self.error(constants.error.FRAME_SIZE_ERROR,
                "Not enough data for HEADERS"));
        }

        let exclusive = false;
        let dependency = 0;
        let weight = constants.DEFAULT_WEIGHT;
        if (isPriority) {
            dependency = data.readUInt32BE();
            exclusive = (dependency & 0x80000000) !== 0;
            dependency &= 0x7fffffff;

            // Weight's range is [1, 256]
            weight = data.readUInt8() + 1;
        }

        if (dependency === header.id) {
            return callback(self.error(constants.error.PROTOCOL_ERROR,
                "Stream can't dependend on itself"));
        }

        let streamInfo = {
            type: "HEADERS",
            id: header.id,
            priority: {
                parent: dependency,
                exclusive,
                weight
            },
            fin: (header.flags & constants.flags.END_STREAM) !== 0,
            writable: true,
            headers: null,
            path: null
        };

        self.initHeaderBlock(header, streamInfo, data, callback);
    });
};

Parser.prototype.onContinuationFrame = function onContinuationFrame(header,
    body,
    callback) {
    this.queueHeaderBlock(header, body, callback);
};

Parser.prototype.onRSTFrame = function onRSTFrame(header, body, callback) {
    if (body.size !== 4) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "RST_STREAM length not 4"));
    }

    if (header.id === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for RST_STREAM"));
    }

    callback(null, {
        type: "RST",
        id: header.id,
        code: constants.errorByCode[body.readUInt32BE()]
    });
};

Parser.prototype._validateSettings = function _validateSettings(settings) {
    if (!is.undefined(settings.enable_push) &&
        settings.enable_push !== 0 &&
        settings.enable_push !== 1) {
        return this.error(constants.error.PROTOCOL_ERROR,
            "SETTINGS_ENABLE_PUSH must be 0 or 1");
    }

    if (!is.undefined(settings.initial_window_size) &&
        (settings.initial_window_size > constants.MAX_INITIAL_WINDOW_SIZE ||
            settings.initial_window_size < 0)) {
        return this.error(constants.error.FLOW_CONTROL_ERROR,
            "SETTINGS_INITIAL_WINDOW_SIZE is OOB");
    }

    if (!is.undefined(settings.max_frame_size) &&
        (settings.max_frame_size > constants.ABSOLUTE_MAX_FRAME_SIZE ||
            settings.max_frame_size < constants.INITIAL_MAX_FRAME_SIZE)) {
        return this.error(constants.error.PROTOCOL_ERROR,
            "SETTINGS_MAX_FRAME_SIZE is OOB");
    }

    return undefined;
};

Parser.prototype.onSettingsFrame = function onSettingsFrame(header,
    body,
    callback) {
    if (header.id !== 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for SETTINGS"));
    }

    const isAck = (header.flags & constants.flags.ACK) !== 0;
    if (isAck && body.size !== 0) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "SETTINGS with ACK and non-zero length"));
    }

    if (isAck) {
        return callback(null, { type: "ACK_SETTINGS" });
    }

    if (body.size % 6 !== 0) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "SETTINGS length not multiple of 6"));
    }

    const settings = {};
    while (!body.isEmpty()) {
        const id = body.readUInt16BE();
        const value = body.readUInt32BE();
        const name = constants.settingsIndex[id];

        if (name) {
            settings[name] = value;
        }
    }

    const err = this._validateSettings(settings);
    if (!is.undefined(err)) {
        return callback(err);
    }

    callback(null, {
        type: "SETTINGS",
        settings
    });
};

Parser.prototype.onPushPromiseFrame = function onPushPromiseFrame(header,
    body,
    callback) {
    if (header.id === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for PUSH_PROMISE"));
    }

    const self = this;
    this.unpadData(header, body, (err, data) => {
        if (err) {
            return callback(err);
        }

        if (!data.has(4)) {
            return callback(self.error(constants.error.FRAME_SIZE_ERROR,
                "PUSH_PROMISE length less than 4"));
        }

        let streamInfo = {
            type: "PUSH_PROMISE",
            id: header.id,
            fin: false,
            promisedId: data.readUInt32BE() & 0x7fffffff,
            headers: null,
            path: null
        };

        self.initHeaderBlock(header, streamInfo, data, callback);
    });
};

Parser.prototype.onPingFrame = function onPingFrame(header, body, callback) {
    if (body.size !== 8) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "PING length != 8"));
    }

    if (header.id !== 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for PING"));
    }

    const ack = (header.flags & constants.flags.ACK) !== 0;
    callback(null, { type: "PING", opaque: body.take(body.size), ack });
};

Parser.prototype.onGoawayFrame = function onGoawayFrame(header,
    body,
    callback) {
    if (!body.has(8)) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "GOAWAY length < 8"));
    }

    if (header.id !== 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for GOAWAY"));
    }

    const frame = {
        type: "GOAWAY",
        lastId: body.readUInt32BE(),
        code: constants.goawayByCode[body.readUInt32BE()]
    };

    if (body.size !== 0) {
        frame.debug = body.take(body.size);
    }

    callback(null, frame);
};

Parser.prototype.onPriorityFrame = function onPriorityFrame(header,
    body,
    callback) {
    if (body.size !== 5) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "PRIORITY length != 5"));
    }

    if (header.id === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Invalid stream id for PRIORITY"));
    }

    const dependency = body.readUInt32BE();

    // Again the range is from 1 to 256
    const weight = body.readUInt8() + 1;

    if (dependency === header.id) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "Stream can't dependend on itself"));
    }

    callback(null, {
        type: "PRIORITY",
        id: header.id,
        priority: {
            exclusive: (dependency & 0x80000000) !== 0,
            parent: dependency & 0x7fffffff,
            weight
        }
    });
};

Parser.prototype.onWindowUpdateFrame = function onWindowUpdateFrame(header,
    body,
    callback) {
    if (body.size !== 4) {
        return callback(this.error(constants.error.FRAME_SIZE_ERROR,
            "WINDOW_UPDATE length != 4"));
    }

    const delta = body.readInt32BE();
    if (delta === 0) {
        return callback(this.error(constants.error.PROTOCOL_ERROR,
            "WINDOW_UPDATE delta == 0"));
    }

    callback(null, {
        type: "WINDOW_UPDATE",
        id: header.id,
        delta
    });
};

Parser.prototype.onXForwardedFrame = function onXForwardedFrame(header,
    body,
    callback) {
    callback(null, {
        type: "X_FORWARDED_FOR",
        host: body.take(body.size).toString()
    });
};
