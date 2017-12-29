const {
    is
} = adone;

const looper = function (fun) {
    (function next() {
        let loop = true;
        let sync = false;
        const cb = () => {
            if (sync) {
                loop = true;
            } else {
                next();
            }
        };
        do {
            sync = true;
            loop = false;
            fun.call(this, cb);
            sync = false;
        } while (loop);
    })();
};

export default function transform(writer, ender) {
    return function (read) {
        const queue = [];
        let ended;
        let error;

        const enqueue = (data) => {
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
                switch (event) {
                    case "data":
                        enqueue(data);
                        break;
                    case "end":
                        ended = true;
                        enqueue(null);
                        break;
                    case "error":
                        error = data;
                        break;
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
                        if (ended || end) {
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
}

