const abortAll = (ary, abort, cb) => {
    let n = ary.length;
    if (!n) {
        return cb(abort);
    }
    const next = () => {
        if (--n) {
            return;

        }
        cb(abort);
    };


    ary.forEach((f) => {
        if (f) {
            f(abort, next);
        } else {
            next();
        }
    });

    if (!n) {
        next();

    }
};

export default function (streams) {
    return function (abort, cb) {
        (function next() {
            if (abort) {
                abortAll(streams, abort, cb);
            } else if (!streams.length) {
                cb(true);

            } else if (!streams[0]) {
                streams.shift(), next();
            } else {
                streams[0](null, (err, data) => {
                    if (err) {
                        streams.shift(); //drop the first, has already ended.
                        if (err === true) {
                            next();
                        } else {
                            abortAll(streams, err, cb);
                        }
                    } else {
                        cb(null, data);
                    }
                });
            }
        })();
    };
};