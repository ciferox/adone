export default class HashSet {
    #hashFn;

    #store = new Map();

    constructor(iterable, hashFn = adone.identity) {    
        this.#hashFn = hashFn;

        if (iterable) {
            for (const item of iterable) {
                this.add(item);
            }
        }
    }

    get size() {
        return this.#store.size;
    }

    add(value) {
        const id = this.#hashFn(value);

        if (!this.#store.has(id)) {
            this.#store.set(id, value);
        }

        return this;
    }

    has(value) {
        return this.#store.has(this.#hashFn(value));
    }

    delete(value) {
        return this.#store.delete(this.#hashFn(value));
    }

    clear() {
        this.#store.clear();
    }

    entries() {
        return this.#store.values();
    }

    forEach(callbackFn, thisArg) {
        this.#store.forEach((value, key) => callbackFn.call(thisArg, value, key, this));
    }

    values() {
        return this.#store.values();
    }

    keys() {
        return this.#store.values();
    }

    [Symbol.iterator]() {
        return this.#store.values();
    }

    valueOf() {
        return new Set(this.#store.values());
    }

    toString() {
        return "[object Set]";
    }
}
