const {
    is,
    util: { once },
    stream: { eos },
    std: { fs },
    noop
} = adone;

const isFS = function (stream) {
    if (!fs) { // browser
        return false;
    }
    return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && is.function(stream.close);
};

const isRequest = function (stream) {
    return stream.setHeader && is.function(stream.abort);
};

const destroyer = function (stream, reading, writing, callback) {
    callback = once(callback);

    let closed = false;
    stream.on("close", () => {
        closed = true;
    });

    eos(stream, { readable: reading, writable: writing }, (err) => {
        if (err) {
            return callback(err);
        }
        closed = true;
        callback();
    });

    let destroyed = false;
    return function (err) {
        if (closed) {
            return;
        }
        if (destroyed) {
            return;
        }
        destroyed = true;

        if (isFS(stream)) {
            return stream.close(noop);
        } // use close for fs streams to avoid fd leaks
        if (isRequest(stream)) {
            return stream.abort();
        } // request.destroy just do .end - .abort is what we want

        if (is.function(stream.destroy)) {
            return stream.destroy();
        }

        callback(err || new Error("stream was destroyed"));
    };
};

const call = function (fn) {
    fn();
};

const pipe = function (from, to) {
    return from.pipe(to);
};

const pump = function () {
    let streams = Array.prototype.slice.call(arguments);
    const callback = is.function(streams[streams.length - 1] || noop) && streams.pop() || noop;

    if (is.array(streams[0])) {
        streams = streams[0];
    }
    if (streams.length < 2) {
        throw new Error("pump requires two streams per minimum");
    }

    let error;
    const destroys = streams.map((stream, i) => {
        const reading = i < streams.length - 1;
        const writing = i > 0;
        return destroyer(stream, reading, writing, (err) => {
            if (!error) {
                error = err;
            }
            if (err) {
                destroys.forEach(call);
            }
            if (reading) {
                return;
            }
            destroys.forEach(call);
            callback(error);
        });
    });

    return streams.reduce(pipe);
};

module.exports = pump;
