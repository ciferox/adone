export default function abortable(onEnd) {
    let aborted = false;
    let reading = false;
    let ended = false;
    let _cb;
    let _read;

    const doEnd = () => {
        if (!onEnd) {
            return;
        }
        if (aborted && aborted !== true) {
            return onEnd(aborted);
        }
        if (ended && ended !== true) {
            return onEnd(ended);

        }
        return onEnd(null);
    };

    const terminate = (err) => {
        doEnd();
        const cb = _cb; _cb = null;
        if (cb) {
            cb(aborted || ended);

        }
    };

    const cancel = () => {
        ended = ended || true;
        terminate(aborted || ended);
        if (_read) {
            _read(aborted, (err) => {
                if (_cb) {
                    _cb(err || aborted);
                }
            });
        }
    };

    const reader = (read) => {
        _read = read;
        return function (abort, cb) {
            _cb = cb;
            if (abort) {
                aborted = abort;
            }
            if (ended) {
                return cb(ended);
            }
            if (aborted) {
                return;
            }
            reading = true;
            read(abort, (end, data) => {
                reading = false;
                if (aborted) {
                    return !abort && read(aborted, () => {});

                }
                if (!_cb) {
                    return;
                }
                const cb = _cb;
                _cb = null;
                if (end) {
                    ended = aborted || end;
                    doEnd();
                    cb(aborted || end);
                } else {
                    cb(aborted || end, data);
                }
            });
        };
    };

    reader.abort = function (err) {
        if (ended) {
            return;
        }
        aborted = err || true;
        cancel();
    };

    return reader;
}
