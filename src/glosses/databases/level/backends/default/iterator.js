export default class Iterator extends adone.database.level.AbstractIterator {
    constructor(db, options) {
        super(db);

        this.binding = db.binding.iterator(options);
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
        this.binding.seek(target);
        this.finished = false;
    }

    _next() {
        if (this.cache && this.cache.length) {
            const key = this.cache.pop();
            const value = this.cache.pop();

            return new Promise((resolve) => {
                process.nextTick(() => resolve({ key, value }));
            });
        } else if (this.finished) {
            return new Promise((resolve) => {
                process.nextTick(() => resolve());
            });
        } else {
            return new Promise((resolve, reject) => {
                this.binding.next((err, array, finished) => {
                    if (err) {
                        return reject(err);
                    }

                    this.cache = array;
                    this.finished = finished;
                    resolve(this._next());
                });
            }); 
        }
    }

    _end(callback) {
        delete this.cache;
        this.binding.end(callback);
    }
}
