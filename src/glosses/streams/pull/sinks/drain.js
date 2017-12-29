const {
    is
} = adone;

export default function drain(op, done) {
    let read;
    let abort;

    const sink = (_read) => {
        read = _read;
        if (abort) {
            return sink.abort();
            //this function is much simpler to write if you
            //just use recursion, but by using a while loop
            //we do not blow the stack if the stream happens to be sync.
        }
        (function next() {
            let loop = true;
            let cbed = false;
            const cb = (end, data) => {
                cbed = true;
                end = end || abort;
                if (end) {
                    loop = false;
                    if (done) {
                        done(end === true ? null : end);

                    } else if (end && end !== true) {
                        throw end;

                    }
                } else if (op && op(data) === false || abort) {
                    loop = false;
                    read(abort || true, done || (() => { }));
                } else if (!loop) {
                    next();
                }
            };
            while (loop) {
                cbed = false;
                read(null, cb);
                if (!cbed) {
                    loop = false;
                    return;
                }
            }
        })();
    };

    sink.abort = function (err, cb) {
        if (is.function(err)) {
            cb = err, err = true;
        }
        abort = err || true;
        if (read) {
            return read(abort, cb || (() => { }));

        }
    };

    return sink;
}
