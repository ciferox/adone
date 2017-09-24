export default class Set {
    constructor(key = adone.identity) {
        this.storage = new Map();
        this.key = key;
    }

    has(value) {
        return this.storage.has(this.key(value));
    }

    add(value) {
        const k = this.key(value);
        if (this.storage.has(k)) {
            return;
        }
        this.storage.set(k, value);
    }

    delete(value) {
        this.storage.delete(this.key(value));
    }

    get(value) {
        return this.storage.get(this.key(value));
    }

    get size() {
        return this.storage.size;
    }

    only() {
        if (this.size !== 1) {
            return;
        }
        return this.storage.get(this.storage.keys().next().value);
    }
}
