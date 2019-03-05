const {
    is
} = adone;

module.exports = function drain(op, done) {
    let read; let abort;

    function sink(_read) {
        read = _read;
        if (abort) {
            return sink.abort()
            //this function is much simpler to write if you
            //just use recursion, but by using a while loop
            //we do not blow the stack if the stream happens to be sync.
            ; 
        }(function next() {
            let loop = true; let cbed = false;
            while (loop) {
                cbed = false;
                read(null, (end, data) => {
                    cbed = true;
                    if (end = end || abort) {
                        loop = false;
                        if (done) {
                            done(end === true ? null : end); 
                        } else if (end && end !== true) {
                            throw end; 
                        }
                    } else if (op && op(data) === false || abort) {
                        loop = false;
                        read(abort || true, done || (() => {}));
                    } else if (!loop) {
                        next();
                    }
                });
                if (!cbed) {
                    loop = false;
                    return;
                }
            }
        })();
    }

    sink.abort = function (err, cb) {
        if (is.function(err)) {
            cb = err, err = true; 
        }
        abort = err || true;
        if (read) {
            return read(abort, cb || (() => {})); 
        }
    };

    return sink;
};
