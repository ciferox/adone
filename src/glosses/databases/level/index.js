const {
    is
} = adone;

export const getCallback = function (options, callback) {
    return is.function(options) ? options : callback;
};

export const getOptions = function (options) {
    return typeof options === "object" && !is.null(options) ? options : {};
};

export const concatIterator = function (iterator, cb) {
    const data = [];
    const next = function () {
        iterator.next((err, key, value) => {
            if (err || (is.undefined(key) && is.undefined(value))) {
                return iterator.end((err2) => {
                    cb(err || err2, data);
                });
            }
            data.push({ key, value });
            next();
        });
    };
    next();
};


adone.lazify({
    AbstractBackend: "./abstract/backend",
    AbstractIterator: "./abstract/iterator",
    AbstractChainedBatch: "./abstract/chained_batch",
    DB: "./db",
    Batch: "./batch",
    Codec: "./codec",
    backend: "./backends",
    packager: "./packager",
    streamFromIterator: "./stream_from_iterator"
}, adone.asNamespace(exports), require);
