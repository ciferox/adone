const { is, util, net: { http } } = adone;

const getDecoder = (encoding) => {
    if (!encoding) {
        return null;
    }

    try {
        return util.iconv.getDecoder(encoding);
    } catch (e) {
        if (!e.message.startsWith("Encoding not recognized: ")) {
            throw e;
        }

        throw http.error.create(415, "specified encoding unsupported", {
            encoding,
            type: "encoding.unsupported"
        });
    }
};

const readStream = (stream, encoding, length, limit) => new Promise((resolve, reject) => {
    let complete = false;
    let set = false;

    const done = (err, buf) => {
        complete = true;

        if (set) {
            cleanup(); // eslint-disable-line no-use-before-define
        }

        if (err) {
            stream.unpipe().pause();
            return reject(err);
        }

        resolve(buf);
    };

    if (!is.null(limit) && !is.null(length) && length > limit) {
        return done(http.error.create(413, "request entity too large", {
            expected: length,
            length,
            limit,
            type: "entity.too.large"
        }));
    }

    if (stream._readableState.encoding) {
        // developer error
        return done(http.error.create(500, "stream encoding should not be set", {
            type: "stream.encoding.set"
        }));
    }

    let received = 0;
    let decoder;

    try {
        decoder = getDecoder(encoding);
    } catch (err) {
        return done(err);
    }

    let buffer = decoder ? "" : [];

    const onAborted = () => {
        if (complete) {
            return;
        }

        done(http.error.create(400, "request aborted", {
            code: "ECONNABORTED",
            expected: length,
            length,
            received,
            type: "request.aborted"
        }));
    };

    const onData = (chunk) => {
        if (complete) {
            return;
        }

        received += chunk.length;
        if (decoder) {
            buffer += decoder.write(chunk);
        } else {
            buffer.push(chunk);
        }

        if (!is.null(limit) && received > limit) {
            done(http.error.create(413, "request entity too large", {
                limit,
                received,
                type: "entity.too.large"
            }));
        }
    };

    const onEnd = (err) => {
        if (complete) {
            return;
        }
        if (err) {
            return done(err);
        }

        if (!is.null(length) && received !== length) {
            done(http.error.create(400, "request size did not match content length", {
                expected: length,
                length,
                received,
                type: "request.size.invalid"
            }));
        } else {
            if (!decoder) {
                done(null, Buffer.concat(buffer));
            } else {
                done(null, buffer + (decoder.end() || ""));
            }
        }
    };

    const cleanup = () => {
        stream.removeListener("aborted", onAborted);
        stream.removeListener("data", onData);
        stream.removeListener("end", onEnd);
        stream.removeListener("error", onEnd);
        stream.removeListener("close", cleanup);
    };

    // attach listeners
    stream.on("aborted", onAborted);
    stream.on("close", cleanup);
    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onEnd);
    set = true;
});

export default async function getRawBody(stream, options = {}) {
    if (options === true || is.string(options)) {
        options = {
            encoding: options
        };
    }

    const encoding = options.encoding !== true ? options.encoding : "utf-8";

    const limit = util.parseSize(options.limit);

    let length = parseInt(options.length, 10);
    if (isNaN(length)) {
        length = null;
    }

    return readStream(stream, encoding, length, limit);
}
