//another idea: buffer 2* the max, but only call write with half of that,
//this could manage cases where the read ahead is latent. Hmm, we probably
//shouldn't guess at that here, just handle write latency.

//how would we measure this anyway?

import Looper from "../looper4";

const {
    is
} = adone;

const append = function (array, item) {
    (array = array || []).push(item);
    return array;
};

module.exports = function (write, reduce, max, cb) {
    reduce = reduce || append;
    let ended; let _cb; let _read;
    const reader = function (read) {
        let queue = null; let writing = false; let length = 0;
        _read = read;
        if (ended) {
            return read(ended.abort ? true : ended, (err) => {
                cb(err); _cb && _cb();
            });
        }

        let reading = false;
        const more = Looper(() => {
            if (reading || ended) {
                return;
            }
            reading = true;
            read(null, (err, data) => {
                reading = false;
                (function (end, data) {
                    if (ended) {
                        return;
                    }
                    ended = end;
                    if (!ended) {
                        queue = reduce(queue, data);
                        length = (queue && queue.length) || 0;
                        if (!is.nil(queue)) {
                            flush();
                        }
                        if (length < max) {
                            more();
                        }
                    } else if (!writing) {
                        cb(ended === true ? null : ended);
                    }
                })(err, data);
            });
        });

        cosnt flush = function () {
            if (writing) {
                return;
            }
            const _queue = queue;
            queue = null; writing = true; length = 0;
            write(_queue, (err) => {
                writing = false;

                if (ended === true && !length) {
                    cb(err);
                } else if (ended && ended !== true) {
                    cb(ended);
                    _cb && _cb();
                } else if (err) {
                    read(ended = (err.abort ? true : err), cb);
                } //abort upstream.
                else if (length) {
                    flush();
                } else {
                    more();
                }
            });
        }

        reader.abort = function (__cb) {
            _cb = function (end) {
                __cb && __cb();
            };
            const err = new Error("aborted");
            err.abort = true;
            read(ended = err, (end) => {
                end = end === true ? null : end;
                if (!writing) {
                    cb && cb(end);
                    _cb && _cb(end);
                }
            });
        };

        more();
    }

    reader.abort = function (cb) {
        ended = new Error("aborted before connecting");
        _cb = function (err) {
            cb && cb();
        };
    };

    return reader;
};

