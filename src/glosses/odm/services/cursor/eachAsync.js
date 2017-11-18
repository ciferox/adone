const PromiseProvider = require("../../promise_provider");
const async = require("async");

const {
    is
} = adone;

/**
 * Execute `fn` for every document in the cursor. If `fn` returns a promise,
 * will wait for the promise to resolve before iterating on to the next one.
 * Returns a promise that resolves when done.
 *
 * @param {Function} next the thunk to call to get the next document
 * @param {Function} fn
 * @param {Object} options
 * @param {Function} [callback] executed when all docs have been processed
 * @return {Promise}
 * @api public
 * @method eachAsync
 */

module.exports = function eachAsync(next, fn, options, callback) {
    const Promise = PromiseProvider.get();
    const parallel = options.parallel || 1;

    const handleNextResult = function (doc, callback) {
        const promise = fn(doc);
        if (promise && is.function(promise.then)) {
            promise.then(
                () => {
                    callback(null);
                },
                (error) => {
                    callback(error);
                });
        } else {
            callback(null);
        }
    };

    const iterate = function (callback) {
        let drained = false;
        const nextQueue = async.queue((task, cb) => {
            if (drained) {
                return cb();
            }
            next((err, doc) => {
                if (err) {
                    return cb(err);
                }
                if (!doc) {
                    drained = true;
                }
                cb(null, doc);
            });
        }, 1);

        var getAndRun = function (cb) {
            nextQueue.push({}, (err, doc) => {
                if (err) {
                    return cb(err);
                }
                if (!doc) {
                    return cb();
                }
                handleNextResult(doc, (err) => {
                    if (err) {
                        return cb(err);
                    }
                    // Make sure to clear the stack re: gh-4697
                    setTimeout(() => {
                        getAndRun(cb);
                    }, 0);
                });
            });
        };

        async.times(parallel, (n, cb) => {
            getAndRun(cb);
        }, callback);
    };

    return new Promise.ES6(((resolve, reject) => {
        iterate((error) => {
            if (error) {
                callback && callback(error);
                return reject(error);
            }
            callback && callback(null);
            return resolve();
        });
    }));
};
