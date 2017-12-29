const {
    is,
    stream: { pull }
} = adone;

// convert a stream of arrays or streams into just a stream.
export default function flatten() {
    return function (read) {
        let _read;
        return function (abort, cb) {
            if (abort) { //abort the current stream, and then stream of streams.
                _read ? _read(abort, (err) => {
                    read(err || abort, cb);
                }) : read(abort, cb);
                return;
            }

            const nextChunk = () => {
                _read(null, (err, data) => {
                    if (err === true) {
                        nextStream();

                    } else if (err) {
                        read(true, (abortErr) => {
                            // TODO: what do we do with the abortErr?
                            cb(err);
                        });
                    } else {
                        cb(null, data);
                    }
                });
            };

            const nextStream = () => {
                _read = null;
                read(null, (end, stream) => {
                    if (end) {
                        return cb(end);
                    }
                    if (is.array(stream) || (stream && is.object(stream) && !is.function(stream))) {
                        stream = pull.values(stream);
                    } else if (!is.function(stream)) {
                        stream = pull.once(stream);
                    }
                    _read = stream;
                    nextChunk();
                });
            };

            if (_read) {
                nextChunk();
            } else {
                nextStream();
            }
        };
    };
}

