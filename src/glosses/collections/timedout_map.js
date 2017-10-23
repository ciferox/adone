const { is } = adone;

/**
 * Represents a Map that keeps keys only for a specified interval of time
 */
export default class TimedoutMap extends Map {
    /**
     * @param {number} [timeout = number] maximum age of the keys, 1000 by default
     * @param {Function} [callback] callback that is called with each key when the timeout is passed
     */
    constructor(timeout = 1000, callback = null) {
        super();
        this._timeout = timeout;
        this._callback = callback || ((key) => super.delete(key));
    }

    /**
     * Gets the timeout
     *
     * @returns {number}
     */
    getTimeout() {
        return this._timeout;
    }

    /**
     * Sets the timeout
     *
     * @param {number} timeout
     */
    setTimeout(timeout) {
        this._timeout = timeout;
    }

    set(key, value, callback, timeout) {
        if (super.has(key)) {
            const oldObj = super.get(key);
            adone.clearTimeout(oldObj.timer);
        }
        const newObj = { value };
        super.set(key, newObj);
        newObj.timer = adone.setTimeout(is.function(callback) ? callback : this._callback, (is.number(timeout) && timeout > 0 ? timeout : this._timeout), key);
        return this;
    }

    get(key) {
        const obj = super.get(key);
        if (is.undefined(obj)) {
            return obj;
        }
        return obj.value;
    }

    forEach(callback, thisArg) {
        super.forEach((obj, key) => {
            callback.call(thisArg, obj.value, key, this);
        });
        return this;
    }

    *entries() {
        for (const [key, obj] of super.entries()) {
            yield [key, obj.value];
        }
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *values() {
        for (const obj of super.values()) {
            yield obj.value;
        }
    }

    delete(key) {
        const obj = super.get(key);
        if (is.undefined(obj)) {
            return false;
        }
        adone.clearTimeout(obj.timer);
        return super.delete(key);
    }

    clear() {
        super.forEach((obj) => {
            adone.clearTimeout(obj.timer);
        });
        super.clear();
    }
}
