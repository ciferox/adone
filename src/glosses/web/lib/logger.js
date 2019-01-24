const {
    codes: {
        FST_ERR_LOG_INVALID_DESTINATION
    }
} = require("./errors");

const {
    app: { fastLogger }
} = adone;

const { serializersSym } = fastLogger;

const createLogger = function (opts, stream) {
    stream = stream || opts.stream;
    delete opts.stream;

    if (stream && opts.file) {
        throw new FST_ERR_LOG_INVALID_DESTINATION();
    } else if (opts.file) {
        // we do not have stream
        stream = fastLogger.destination(opts.file);
        delete opts.file;
    }

    const prevLogger = opts.logger;
    const prevGenReqId = opts.genReqId;
    let logger = null;

    if (prevLogger) {
        opts.logger = undefined;
        opts.genReqId = undefined;
        // we need to tap into fastLogger internals because in v5 it supports
        // adding serializers in child loggers
        if (prevLogger[serializersSym]) {
            opts.serializers = Object.assign({}, opts.serializers, prevLogger[serializersSym]);
        }
        logger = prevLogger.child(opts);
        opts.logger = prevLogger;
        opts.genReqId = prevGenReqId;
    } else {
        logger = fastLogger(opts, stream);
    }

    return logger;
};

const serializers = {
    req: function asReqValue(req) {
        return {
            method: req.method,
            url: req.url,
            version: req.headers["accept-version"],
            hostname: req.hostname,
            remoteAddress: req.ip,
            remotePort: req.connection.remotePort
        };
    },
    err: fastLogger.stdSerializers.err,
    res: function asResValue(res) {
        return {
            statusCode: res.statusCode
        };
    }
};

function now() {
    const ts = process.hrtime();
    return (ts[0] * 1e3) + (ts[1] / 1e6);
}

module.exports = {
    createLogger,
    serializers,
    now
};
