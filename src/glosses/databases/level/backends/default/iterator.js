export default class Iterator extends adone.database.level.AbstractIterator {
    constructor(db, options) {
        super(db);

        this.native = db.native.iterator(options);
        this.cache = null;
        this.finished = false;
    }

    seek(target) {
        if (this._ended) {
            throw new Error("cannot call seek() after end()");
        }
        if (this._nexting) {
            throw new Error("cannot call seek() before next() has completed");
        }

        if (typeof target !== "string" && !Buffer.isBuffer(target)) {
            throw new Error("seek() requires a string or buffer key");
        }
        if (target.length === 0) {
            throw new Error("cannot seek() to an empty key");
        }

        this.cache = null;
        this.native.seek(target);
        this.finished = false;
    }

    _next(callback) {
        if (this.cache && this.cache.length) {
            const key = this.cache.pop();
            const value = this.cache.pop();

            process.nextTick(() => callback(null, { key, value }));
        } else if (this.finished) {
            process.nextTick(() => callback(null));
        } else {
            this.native.next((err, array, finished) => {
                if (err) {
                    return callback(err);
                }

                this.cache = array;
                this.finished = finished;
                this._next(callback);
            });
        }
    }

    _end(callback) {
        delete this.cache;
        this.native.end(callback);
    }
}
