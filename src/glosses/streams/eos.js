const { is } = adone;

const isRequest = function (stream) {
    return stream.setHeader && is.function(stream.abort);
};

const isChildProcess = function (stream) {
    return stream.stdio && is.array(stream.stdio) && stream.stdio.length === 3;
};

const eos = (stream, opts, callback) => {
    if (is.function(opts)) {
        return eos(stream, null, opts);
    }
    if (!opts) {
        opts = {};
    }

    callback = adone.util.once(callback || adone.noop);

    const ws = stream._writableState;
    const rs = stream._readableState;
    let readable = opts.readable || (opts.readable !== false && stream.readable);
    let writable = opts.writable || (opts.writable !== false && stream.writable);

    const onfinish = () => {
        writable = false;
        if (!readable) {
            callback.call(stream);
        }
    };

    const onlegacyfinish = function () {
        if (!stream.writable) {
            onfinish();
        }
    };

    const onend = function () {
        readable = false;
        if (!writable) {
            callback.call(stream);
        }
    };

    const onexit = function (exitCode) {
        callback.call(stream, exitCode ? new Error(`exited with error code: ${exitCode}`) : null);
    };

    const onclose = function () {
        if (readable && !(rs && rs.ended)) {
            return callback.call(stream, new Error("premature close"));
        }
        if (writable && !(ws && ws.ended)) {
            return callback.call(stream, new Error("premature close"));
        }
    };

    const onrequest = function () {
        stream.req.on("finish", onfinish);
    };

    if (isRequest(stream)) {
        stream.on("complete", onfinish);
        stream.on("abort", onclose);
        if (stream.req) {
            onrequest();
        } else {
            stream.on("request", onrequest);
        }
    } else if (writable && !ws) { // legacy streams
        stream.on("end", onlegacyfinish);
        stream.on("close", onlegacyfinish);
    }

    if (isChildProcess(stream)) {
        stream.on("exit", onexit);
    }

    stream.on("end", onend);
    stream.on("finish", onfinish);
    if (opts.error !== false) {
        stream.on("error", callback);
    }
    stream.on("close", onclose);

    return () => {
        stream.removeListener("complete", onfinish);
        stream.removeListener("abort", onclose);
        stream.removeListener("request", onrequest);
        if (stream.req) {
            stream.req.removeListener("finish", onfinish);
        }
        stream.removeListener("end", onlegacyfinish);
        stream.removeListener("close", onlegacyfinish);
        stream.removeListener("finish", onfinish);
        stream.removeListener("exit", onexit);
        stream.removeListener("end", onend);
        stream.removeListener("error", callback);
        stream.removeListener("close", onclose);
    };
};

export default eos;
