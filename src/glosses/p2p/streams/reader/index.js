const State = require("./state");

const {
    is
} = adone;


const maxDelay = function (fn, delay) {
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

module.exports = function (timeout) {
    const queue = []; let read; let readTimed; let reading = false;
    const state = State(); let ended; let streaming; let abort;

    const drain = function () {
        while (queue.length) {
            if (is.nil(queue[0].length) && state.has(1)) {
                queue.shift().cb(null, state.get());
            } else if (state.has(queue[0].length)) {
                const next = queue.shift();
                next.cb(null, state.get(next.length));
            } else if (ended == true && queue[0].length && state.length < queue[0].length) {
                const msg = `stream ended with:${state.length} but wanted:${queue[0].length}`;
                queue.shift().cb(new Error(msg));
            } else if (ended) {
                queue.shift().cb(ended);

            } else {
                return Boolean(queue.length);

            }
        }
        //always read a little data
        return queue.length || !state.has(1) || abort;
    };

    const more = function () {
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

    const reader = function (_read) {
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
            queue.push({ length: is.finite(len) ? len : null, cb });
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
};






