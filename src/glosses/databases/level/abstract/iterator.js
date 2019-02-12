const {
    is
} = adone;

export default class AbstractIterator {
    constructor(db) {
        if (typeof db !== "object" || is.null(db)) {
            throw new TypeError("First argument must be an abstract-leveldown compliant store");
        }

        this.db = db;
        this._ended = false;
        this._nexting = false;
    }

    next(callback) {
        if (!is.function(callback)) {
            throw new Error("next() requires a callback argument");
        }

        if (this._ended) {
            process.nextTick(callback, new Error("cannot call next() after end()"));
            return this;
        }

        if (this._nexting) {
            process.nextTick(callback, new Error("cannot call next() before previous next() has completed"));
            return this;
        }

        this._nexting = true;
        this._next((...args) => {
            this._nexting = false;
            callback.apply(null, args);
        });

        return this;
    }

    _next(callback) {
        process.nextTick(callback);
    }

    seek(target) {
        if (this._ended) {
            throw new Error("cannot call seek() after end()");
        }
        if (this._nexting) {
            throw new Error("cannot call seek() before next() has completed");
        }

        target = this.db._serializeKey(target);
        this._seek(target);
    }

    _seek(target) {
    }

    end(callback) {
        if (!is.function(callback)) {
            throw new Error("end() requires a callback argument");
        }

        if (this._ended) {
            return process.nextTick(callback, new Error("end() already called on iterator"));
        }

        this._ended = true;
        this._end(callback);
    }

    _end(callback) {
        process.nextTick(callback);
    }
}
