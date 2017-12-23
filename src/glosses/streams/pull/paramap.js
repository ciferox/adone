const {
    is
} = adone;

const looper = function (fn) {
    let active = false;
    let called = 0;
    return function () {
        called = true;
        if (!active) {
            active = true;
            while (called) {
                called = false;
                fn();
            }
            active = false;
        }
    };
};

export default function (map, width, inOrder) {
    inOrder = is.undefined(inOrder) ? true : inOrder;
    let reading = false;
    let abort;
    return function (read) {
        let i = 0;
        let j = 0;
        let last = 0;
        const seen = [];
        let started = false;
        let ended = false;
        let _cb;
        let error;

        const drain = () => {
            if (_cb) {
                const cb = _cb;
                if (error) {
                    _cb = null;
                    return cb(error);
                }
                if (Object.hasOwnProperty.call(seen, j)) {
                    _cb = null;
                    const data = seen[j]; delete seen[j]; j++;
                    cb(null, data);
                    if (width) {
                        start();

                    }
                } else if (j >= last && ended) {
                    _cb = null;
                    cb(ended);
                }
            }
        };

        const start = looper(() => {
            started = true;
            if (ended) {
                return drain();
            }
            if (reading || width && (i - width >= j)) {
                return;
            }
            reading = true;
            read(abort, (end, data) => {
                reading = false;
                if (end) {
                    last = i; ended = end;
                    drain();
                } else {
                    const k = i++;

                    map(data, (err, data) => {
                        if (inOrder) {
                            seen[k] = data;
                        } else {
                            seen.push(data);
                        }
                        if (err) {
                            error = err;

                        }
                        drain();
                    });

                    if (!ended) {
                        start();

                    }

                }
            });
        });

        return function (_abort, cb) {
            if (_abort) {
                read(ended = abort = _abort, (err) => {
                    if (cb) {
                        return cb(err);
                    }
                });
            } else {
                _cb = cb;
                if (!started) {
                    start();
                }
                drain();
            }
        };
    };
}

