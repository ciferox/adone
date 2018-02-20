const {
    is
} = adone;

export default function pushable(separated, onClose) {
    if (is.function(separated)) {
        onClose = separated;
        separated = false;
    }

    // create a buffer for data
    // that have been pushed
    // but not yet pulled.
    const buffer = [];

    // a pushable is a source stream
    // (abort, cb) => cb(end, data)
    //
    // when pushable is pulled,
    // keep references to abort and cb
    // so we can call back after
    // .end(end) or .push(data)
    let abort;
    let cb;

    // `callback` calls back to waiting sink,
    // and removes references to sink cb.
    const callback = (err, val) => {
        const _cb = cb;
        // if error and pushable passed onClose, call it
        // the first time this stream ends or errors.
        if (err && onClose) {
            const c = onClose;
            onClose = null;
            c(err === true ? null : err);
        }
        cb = null;
        _cb(err, val);
    };

    let ended;

    // `drain` calls back to (if any) waiting
    // sink with abort, end, or next data.
    const drain = () => {
        if (!cb) {
            return;
        }

        if (abort) {
            callback(abort);
        } else if (!buffer.length && ended) {
            callback(ended);
        } else if (buffer.length) {
            callback(null, buffer.shift());
        }
    };

    const end = (end) => {
        ended = ended || end || true;
        // attempt to drain
        drain();
    };

    const read = (_abort, _cb) => {
        if (_abort) {
            abort = _abort;
            // if there is already a cb waiting, abort it.
            if (cb) {
                callback(abort);
            }
        }
        cb = _cb;
        drain();
    };

    const push = (data) => {
        if (ended) {
            return;
        }
        // if sink already waiting,
        // we can call back directly.
        if (cb) {
            callback(abort, data);
            return;
        }
        // otherwise buffer data
        buffer.push(data);
    };

    // Return functions separated from source { push, end, source }
    if (separated) {
        return { push, end, source: read, buffer };
    }

    // Return normal
    read.push = push;
    read.end = end;
    read.buffer = buffer;
    return read;
}
