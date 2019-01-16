const format = require("quick-format-unescaped");
const { mapHttpRequest, mapHttpResponse } = require("./serializers");
const SonicBoom = require("sonic-boom");
const stringifySafe = require("fast-safe-stringify");
const {
    lsCacheSym,
    chindingsSym,
    parsedChindingsSym,
    writeSym,
    messageKeyStringSym,
    serializersSym,
    formatOptsSym,
    endSym,
    stringifiersSym,
    stringifySym,
    needsMetadataGsym,
    wildcardGsym,
    redactFmtSym,
    streamSym
} = require("./symbols");

const {
    is,
    noop
} = adone;

const genLog = function (z) {
    return function LOG(o, ...n) {
        if (typeof o === "object" && !is.null(o)) {
            if (o.method && o.headers && o.socket) {
                o = mapHttpRequest(o);
            } else if (is.function(o.setHeader)) {
                o = mapHttpResponse(o);
            }
            this[writeSym](o, format(null, n, this[formatOptsSym]), z);
        } else {
            this[writeSym](null, format(o, n, this[formatOptsSym]), z);
        }
    };
};

// magically escape strings for json
// relying on their charCodeAt
// everything below 32 needs JSON.stringify()
// 34 and 92 happens all the time, so we
// have a fast case for them
const asString = function (str) {
    let result = "";
    let last = 0;
    let found = false;
    let point = 255;
    const l = str.length;
    if (l > 100) {
        return JSON.stringify(str);
    }
    for (let i = 0; i < l && point >= 32; i++) {
        point = str.charCodeAt(i);
        if (point === 34 || point === 92) {
            result += `${str.slice(last, i)}\\`;
            last = i;
            found = true;
        }
    }
    if (!found) {
        result = str;
    } else {
        result += str.slice(last);
    }
    return point < 32 ? JSON.stringify(str) : `"${result}"`;
};

const asJson = function (obj, msg, num, time) {
    // to catch both null and undefined
    const hasObj = !is.nil(obj);
    const objError = hasObj && obj instanceof Error;
    msg = !msg && objError === true ? obj.message : msg || undefined;
    const stringify = this[stringifySym];
    const stringifiers = this[stringifiersSym];
    const end = this[endSym];
    const messageKeyString = this[messageKeyStringSym];
    const chindings = this[chindingsSym];
    const serializers = this[serializersSym];
    let data = this[lsCacheSym][num] + time;
    if (!is.undefined(msg)) {
        data += messageKeyString + asString(String(msg));
    }
    // we need the child bindings added to the output first so instance logged
    // objects can take precedence when JSON.parse-ing the resulting log line
    data = data + chindings;
    let value;
    if (hasObj === true) {
        const notHasOwnProperty = is.undefined(obj.hasOwnProperty);
        if (objError === true) {
            data += ',"type":"Error"';
            if (!is.undefined(obj.stack)) {
                data += `,"stack":${stringify(obj.stack)}`;
            }
        }
        // if global serializer is set, call it first
        if (serializers[wildcardGsym]) {
            obj = serializers[wildcardGsym](obj);
        }
        for (const key in obj) {
            value = obj[key];
            if ((notHasOwnProperty || obj.hasOwnProperty(key)) && !is.undefined(value)) {
                value = serializers[key] ? serializers[key](value) : value;

                switch (typeof value) {
                    case "undefined":
                    case "function":
                        continue;
                    case "number":
                        /* eslint no-fallthrough: "off" */
                        if (is.finite(value) === false) {
                            value = null;
                        }
                    // this case explicity falls through to the next one
                    case "boolean":
                        if (stringifiers[key]) {
                            value = stringifiers[key](value);
                        }
                        data += `,"${key}":${value}`;
                        continue;
                    case "string":
                        value = (stringifiers[key] || asString)(value);
                        break;
                    default:
                        value = (stringifiers[key] || stringify)(value);
                }
                if (is.undefined(value)) {
                    continue;
                }
                data += `,"${key}":${value}`;
            }
        }
    }
    return data + end;
};

const asChindings = function (instance, bindings) {
    if (!bindings) {
        throw Error("missing bindings for child Pino");
    }
    let key;
    let value;
    let data = instance[chindingsSym];
    const stringify = instance[stringifySym];
    const stringifiers = instance[stringifiersSym];
    const serializers = instance[serializersSym];
    if (serializers[wildcardGsym]) {
        bindings = serializers[wildcardGsym](bindings);
    }
    for (key in bindings) {
        value = bindings[key];
        const valid = key !== "level" &&
            key !== "serializers" &&
            key !== "customLevels" &&
            bindings.hasOwnProperty(key) &&
            !is.undefined(value);
        if (valid === true) {
            value = serializers[key] ? serializers[key](value) : value;
            value = (stringifiers[key] || stringify)(value);
            if (is.undefined(value)) {
                continue;
            }
            data += `,"${key}":${value}`;
        }
    }
    return data;
};

const prettifierMetaWrapper = function (pretty, dest) {
    let warned = false;
    return {
        [needsMetadataGsym]: true,
        lastLevel: 0,
        lastMsg: null,
        lastObj: null,
        lastLogger: null,
        flushSync() {
            if (warned) {
                return;
            }
            warned = true;
            dest.write(pretty(Object.assign({
                level: 40, // warn
                msg: "pino.final with prettyPrint does not support flushing",
                time: Date.now()
            }, this.chindings())));
        },
        chindings() {
            const lastLogger = this.lastLogger;
            let chindings = null;

            // protection against flushSync being called before logging
            // anything
            if (!lastLogger) {
                return null;
            }

            if (lastLogger.hasOwnProperty(parsedChindingsSym)) {
                chindings = lastLogger[parsedChindingsSym];
            } else {
                chindings = JSON.parse(`{"v":1${lastLogger[chindingsSym]}}`);
                lastLogger[parsedChindingsSym] = chindings;
            }

            return chindings;
        },
        write(chunk) {
            const lastLogger = this.lastLogger;
            const chindings = this.chindings();

            let time = this.lastTime;

            if (time.match(/^\d+/)) {
                time = parseInt(time);
            }

            const lastObj = this.lastObj;
            let msg = this.lastMsg;
            let errorProps = null;

            if (lastObj instanceof Error) {
                msg = msg || lastObj.message;
                errorProps = {
                    type: "Error",
                    stack: lastObj.stack
                };
            }

            const obj = Object.assign({
                level: this.lastLevel,
                msg,
                time
            }, chindings, lastObj, errorProps);

            const serializers = lastLogger[serializersSym];
            const keys = Object.keys(serializers);
            let key;

            for (let i = 0; i < keys.length; i++) {
                key = keys[i];
                if (!is.undefined(obj[key])) {
                    obj[key] = serializers[key](obj[key]);
                }
            }

            const stringifiers = lastLogger[stringifiersSym];
            const redact = stringifiers[redactFmtSym];

            const formatted = pretty(is.function(redact) ? redact(obj) : obj);
            if (is.undefined(formatted)) {
                return;
            }
            dest.write(formatted);
        }
    };
};

const getPrettyStream = function (opts, prettifier, dest) {
    if (prettifier && is.function(prettifier)) {
        return prettifierMetaWrapper(prettifier(opts), dest);
    }
    try {
        const prettyFactory = adone.app.fastLogger.pretty;
        prettyFactory.asMetaWrapper = prettifierMetaWrapper;
        return prettifierMetaWrapper(prettyFactory(opts), dest);
    } catch (e) {
        throw Error("Missing `pino-pretty` module: `pino-pretty` must be installed separately");
    }
};

const hasBeenTampered = function (stream) {
    return stream.write !== stream.constructor.prototype.write;
};

const buildSafeSonicBoom = function (dest, buffer = 0, sync = true) {
    const stream = new SonicBoom(dest, buffer, sync);

    const filterBrokenPipe = function (err) {
        // TODO verify on Windows
        if (err.code === "EPIPE") {
            // If we get EPIPE, we should stop logging here
            // however we have no control to the consumer of
            // SonicBoom, so we just overwrite the write method
            stream.write = noop;
            stream.end = noop;
            stream.flushSync = noop;
            stream.destroy = noop;
            return;
        }
        stream.removeListener("error", filterBrokenPipe);
        stream.emit("error", err);
    };

    stream.on("error", filterBrokenPipe);
    return stream;
};

const createArgsNormalizer = function (defaultOptions) {
    return function normalizeArgs(opts = {}, stream) {
        // support stream as a string
        if (is.string(opts)) {
            stream = buildSafeSonicBoom(opts);
            opts = {};
        } else if (is.string(stream)) {
            stream = buildSafeSonicBoom(stream);
        } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
            stream = opts;
            opts = null;
        }
        opts = Object.assign({}, defaultOptions, opts);
        if ("extreme" in opts) {
            throw Error("The extreme option has been removed, use pino.extreme instead");
        }
        if ("onTerminated" in opts) {
            throw Error("The onTerminated option has been removed, use pino.final instead");
        }
        const { enabled, prettyPrint, prettifier, messageKey } = opts;
        if (enabled === false) {
            opts.level = "silent";
        }
        stream = stream || process.stdout;
        if (stream === process.stdout && stream.fd >= 0 && !hasBeenTampered(stream)) {
            stream = buildSafeSonicBoom(stream.fd);
        }
        if (prettyPrint) {
            const prettyOpts = Object.assign({ messageKey }, prettyPrint);
            stream = getPrettyStream(prettyOpts, prettifier, stream);
        }
        return { opts, stream };
    };
};

const final = function (logger, handler) {
    if (is.undefined(logger) || !is.function(logger.child)) {
        throw Error("expected a pino logger instance");
    }
    const hasHandler = (!is.undefined(handler));
    if (hasHandler && !is.function(handler)) {
        throw Error("if supplied, the handler parameter should be a function");
    }
    const stream = logger[streamSym];
    if (!is.function(stream.flushSync)) {
        throw Error("final requires a stream that has a flushSync method, such as pino.destination and pino.extreme");
    }

    const finalLogger = new Proxy(logger, {
        get: (logger, key) => {
            if (key in logger.levels.values) {
                return (...args) => {
                    logger[key](...args);
                    stream.flushSync();
                };
            }
            return logger[key];
        }
    });

    if (!hasHandler) {
        return finalLogger;
    }

    return (err = null, ...args) => {
        try {
            stream.flushSync();
        } catch (e) {
            // it's too late to wait for the stream to be ready
            // because this is a final tick scenario.
            // in practice there shouldn't be a situation where it isn't
            // however, swallow the error just in case (and for easier testing)
        }
        return handler(err, finalLogger, ...args);
    };
};

const stringify = function (obj) {
    try {
        return JSON.stringify(obj);
    } catch (_) {
        return stringifySafe(obj);
    }
};

module.exports = {
    noop,
    buildSafeSonicBoom,
    getPrettyStream,
    asChindings,
    asJson,
    genLog,
    createArgsNormalizer,
    final,
    stringify
};
