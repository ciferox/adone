const { is } = adone;

export default class TimedoutMap extends Map {
    constructor(timeout = 1000, callback = null) {
        super();
        this._timeout = timeout;
        this._callback = callback || ((key) => super.delete(key));
    }

    getTimeout() {
        return this._timeout;
    }

    setTimeout(timeout) {
        this._timeout = timeout;
    }

    set(key, value) {
        if (super.has(key)) {
            const oldObj = super.get(key);
            adone.clearTimeout(oldObj.timer);
        }
        const newObj = { value };
        super.set(key, newObj);
        newObj.timer = adone.setTimeout(this._callback, this._timeout, key);
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
