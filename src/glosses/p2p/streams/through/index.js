import looper from "../looper3";
const {
    is
} = adone;

module.exports = function (writer, ender) {
    return function (read) {
        const queue = []; let ended; let error;

        const enqueue = function (data) {
            queue.push(data);
        };

        writer = writer || function (data) {
            this.queue(data);
        };

        ender = ender || function () {
            this.queue(null);
        };

        const emitter = {
            emit(event, data) {
                if (event === "data") {
                    enqueue(data);
                }
                if (event === "end") {
                    ended = true, enqueue(null);
                }
                if (event === "error") {
                    error = data;
                }
            },
            queue: enqueue
        };
        let _cb;
        return function (end, cb) {
            ended = ended || end;
            if (end) {
                return read(end, () => {
                    if (_cb) {
                        const t = _cb; _cb = null; t(end);
                    }
                    cb(end);
                });
            }

            _cb = cb;
            looper(function pull(next) {
                //if it's an error
                if (!_cb) {
                    return;
                }
                cb = _cb;
                if (error) {
                    _cb = null, cb(error);
                } else if (queue.length) {
                    const data = queue.shift();
                    _cb = null, cb(is.null(data), data);
                } else {
                    read(ended, (end, data) => {
                        //null has no special meaning for pull-stream
                        if (end && end !== true) {
                            error = end; return next();
                        }
                        if (ended = ended || end) {
                            ender.call(emitter);
                        } else if (!is.null(data)) {
                            writer.call(emitter, data);
                            if (error || ended) {
                                return read(error || ended, () => {
                                    _cb = null; cb(error || ended);
                                });
                            }
                        }
                        next(pull);
                    });
                }
            });
        };
    };
};

