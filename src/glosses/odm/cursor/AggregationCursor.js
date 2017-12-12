const PromiseProvider = require("../promise_provider");

const {
    is
} = adone;

const _waitForCursor = (ctx, cb) => {
    if (ctx.cursor) {
        return cb();
    }
    ctx.once("cursor", () => {
        cb();
    });
};

/*!
 * Get the next doc from the underlying cursor and mongooseify it
 * (populate, etc.)
 */
const _next = (ctx, cb) => {
    let callback = cb;
    if (ctx._transforms.length) {
        callback = function (err, doc) {
            if (err || is.null(doc)) {
                return cb(err, doc);
            }
            cb(err, ctx._transforms.reduce((doc, fn) => {
                return fn(doc);
            }, doc));
        };
    }

    if (ctx._error) {
        return process.nextTick(() => {
            callback(ctx._error);
        });
    }

    if (ctx.cursor) {
        return ctx.cursor.next((error, doc) => {
            if (error) {
                return callback(error);
            }
            if (!doc) {
                return callback(null, null);
            }

            callback(null, doc);
        });
    }
    ctx.once("cursor", () => {
        _next(ctx, cb);
    });
};

const _init = (model, c, agg) => {
    if (!model.collection.buffer) {
        model.hooks.execPre("aggregate", agg, () => {
            c.cursor = model.collection.aggregate(agg._pipeline, agg.options || {});
            c.emit("cursor", c.cursor);
        });
    } else {
        model.collection.emitter.once("queue", () => {
            model.hooks.execPre("aggregate", agg, () => {
                c.cursor = model.collection.aggregate(agg._pipeline, agg.options || {});
                c.emit("cursor", c.cursor);
            });
        });
    }
};

/**
 * An AggregationCursor is a concurrency primitive for processing aggregation
 * results one document at a time. It is analogous to QueryCursor.
 *
 * An AggregationCursor fulfills the [Node.js streams3 API](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/),
 * in addition to several other mechanisms for loading documents from MongoDB
 * one at a time.
 *
 * Creating an AggregationCursor executes the model's pre aggregate hooks,
 * but **not** the model's post aggregate hooks.
 *
 * Unless you're an advanced user, do **not** instantiate this class directly.
 * Use [`Aggregate#cursor()`](/docs/api.html#aggregate_Aggregate-cursor) instead.
 *
 * @param {Aggregate} agg
 * @param {Object} options
 * @inherits Readable
 * @event `cursor`: Emitted when the cursor is created
 * @event `error`: Emitted when an error occurred
 * @event `data`: Emitted when the stream is flowing and the next doc is ready
 * @event `end`: Emitted when the stream is exhausted
 * @api public
 */

export default class AggregationCursor extends adone.std.stream.Readable {
    constructor(agg) {
        super({ objectMode: true });

        this.cursor = null;
        this.agg = agg;
        this._transforms = [];
        const model = agg._model;
        delete agg.options.cursor.useMongooseAggCursor;

        _init(model, this, agg);
    }

    /*!
    * Necessary to satisfy the Readable API
    */
    _read() {
        const _this = this;
        _next(this, (error, doc) => {
            if (error) {
                return _this.emit("error", error);
            }
            if (!doc) {
                _this.push(null);
                _this.cursor.close((error) => {
                    if (error) {
                        return _this.emit("error", error);
                    }
                    setTimeout(() => {
                        _this.emit("close");
                    }, 0);
                });
                return;
            }
            _this.push(doc);
        });
    }

    /**
     * Registers a transform function which subsequently maps documents retrieved
     * via the streams interface or `.next()`
     *
     * ####Example
     *
     *     // Map documents returned by `data` events
     *     Thing.
     *       find({ name: /^hello/ }).
     *       cursor().
     *       map(function (doc) {
     *        doc.foo = "bar";
     *        return doc;
     *       })
     *       on('data', function(doc) { console.log(doc.foo); });
     *
     *     // Or map documents returned by `.next()`
     *     var cursor = Thing.find({ name: /^hello/ }).
     *       cursor().
     *       map(function (doc) {
     *         doc.foo = "bar";
     *         return doc;
     *       });
     *     cursor.next(function(error, doc) {
     *       console.log(doc.foo);
     *     });
     *
     * @param {Function} fn
     * @return {QueryCursor}
     * @api public
     * @method map
     */
    map(fn) {
        this._transforms.push(fn);
        return this;
    }

    /*!
    * Marks this cursor as errored
    */
    _markError(error) {
        this._error = error;
        return this;
    }

    /**
     * Marks this cursor as closed. Will stop streaming and subsequent calls to
     * `next()` will error.
     *
     * @param {Function} callback
     * @return {Promise}
     * @api public
     * @method close
     * @emits close
     * @see MongoDB driver cursor#close http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
     */
    close(callback) {
        const Promise = PromiseProvider.get();
        const _this = this;
        return new Promise.ES6(((resolve, reject) => {
            _this.cursor.close((error) => {
                if (error) {
                    callback && callback(error);
                    reject(error);
                    return _this.listeners("error").length > 0 &&
                        _this.emit("error", error);
                }
                _this.emit("close");
                resolve();
                callback && callback();
            });
        }));
    }

    /**
     * Get the next document from this cursor. Will return `null` when there are
     * no documents left.
     *
     * @param {Function} callback
     * @return {Promise}
     * @api public
     * @method next
     */
    next(callback) {
        const Promise = PromiseProvider.get();
        const _this = this;
        return new Promise.ES6(((resolve, reject) => {
            _next(_this, (error, doc) => {
                if (error) {
                    callback && callback(error);
                    return reject(error);
                }
                callback && callback(null, doc);
                resolve(doc);
            });
        }));
    }

    /**
     * Execute `fn` for every document in the cursor. If `fn` returns a promise,
     * will wait for the promise to resolve before iterating on to the next one.
     * Returns a promise that resolves when done.
     *
     * @param {Function} fn
     * @param {Function} [callback] executed when all docs have been processed
     * @return {Promise}
     * @api public
     * @method eachAsync
     */
    eachAsync(fn, callback) {
        const Promise = PromiseProvider.get();
        const _this = this;

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
            return _next(_this, (error, doc) => {
                if (error) {
                    return callback(error);
                }
                if (!doc) {
                    return callback(null);
                }
                handleNextResult(doc, (error) => {
                    if (error) {
                        return callback(error);
                    }
                    // Make sure to clear the stack re: gh-4697
                    setTimeout(() => {
                        iterate(callback);
                    }, 0);
                });
            });
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
    }

    /**
     * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
     * Useful for setting the `noCursorTimeout` and `tailable` flags.
     *
     * @param {String} flag
     * @param {Boolean} value
     * @return {AggregationCursor} this
     * @api public
     * @method addCursorFlag
     */
    addCursorFlag(flag, value) {
        const _this = this;
        _waitForCursor(this, () => {
            _this.cursor.addCursorFlag(flag, value);
        });
        return this;
    }
}
