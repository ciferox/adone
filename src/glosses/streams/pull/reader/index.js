const {
    is
} = adone;

const isInteger = (i) => is.finite(i);

const maxDelay = (fn, delay) => {
    if (!delay) {
        return fn;
    }
    return function (a, cb) {
        const timer = setTimeout(() => {
            fn(new Error("pull-reader: read exceeded timeout"), cb);
        }, delay);
        fn(a, (err, value) => {
            clearTimeout(timer);
            cb(err, value);
        });

    };

};

export default function createReader(timeout) {
    const queue = [];
    let read;
    let readTimed;
    let reading = false;
    const state = createReader.state();
    let ended;
    let streaming;
    let abort;

    const drain = () => {
        while (queue.length) {
            if (is.nil(queue[0].length) && state.has(1)) {
                queue.shift().cb(null, state.get());
            } else if (state.has(queue[0].length)) {
                const next = queue.shift();
                next.cb(null, state.get(next.length));
            } else if (ended) {
                queue.shift().cb(ended);
            } else {
                return Boolean(queue.length);
            }
        }
        //always read a little data
        return queue.length || !state.has(1) || abort;
    };

    const more = () => {
        const d = drain();
        if (d && !reading) {
            if (read && !reading && !streaming) {
                reading = true;
                readTimed(null, (err, data) => {
                    reading = false;
                    if (err) {
                        ended = err;
                        return drain();
                    }
                    state.add(data);
                    more();
                });
            }
        }
    };

    const reader = (_read) => {
        if (abort) {
            while (queue.length) {
                queue.shift().cb(abort);
            }
            return cb && cb(abort);
        }
        readTimed = maxDelay(_read, timeout);
        read = _read;
        more();
    };

    reader.abort = function (err, cb) {
        abort = err || true;
        if (read) {
            reading = true;
            read(abort, () => {
                while (queue.length) {
                    queue.shift().cb(abort);
                }
                cb && cb(abort);
            });
        } else {
            cb();
        }
    };

    reader.read = function (len, _timeout, cb) {
        if (is.function(_timeout)) {
            cb = _timeout, _timeout = timeout;
        }
        if (is.function(cb)) {
            queue.push({ length: isInteger(len) ? len : null, cb });
            more();
        } else {
            //switch into streaming mode for the rest of the stream.
            streaming = true;
            //wait for the current read to complete
            return function (abort, cb) {
                //if there is anything still in the queue,
                if (reading || state.has(1)) {
                    if (abort) {
                        return read(abort, cb);
                    }
                    queue.push({ length: null, cb });
                    more();
                } else {
                    maxDelay(read, _timeout)(abort, (err, data) => {
                        cb(err, data);
                    });
                }
            };
        }
    };

    return reader;
}


adone.lazify({
    state: "./state"
}, createReader, require);
