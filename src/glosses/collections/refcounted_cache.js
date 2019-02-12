const {
    error,
    collection: { MapCache }
} = adone;

class Entry {
    constructor(value) {
        this.value = value;
        this.references = 1;
    }

    ref() {
        ++this.references;
    }

    unref() {
        --this.references;
    }

    isDereferenced() {
        return this.references === 0;
    }
}

export default class RefCountedCache extends MapCache {
    get(key) {
        // unknown key?
        return super.get(key).value;
    }

    set(key, value) {
        super.set(key, new Entry(value));
    }

    ref(key) {
        const entry = super.get(key);
        if (!entry) {
            throw new error.UnknownException(`Unknown key: ${key}`);
        }
        entry.ref();
    }

    unref(key) {
        const entry = super.get(key);
        if (!entry) {
            throw new error.UnknownException(`Unknown key: ${key}`);
        }
        entry.unref();
        if (entry.isDereferenced()) {
            this.delete(key);
        }
    }

    references(key) {
        const entry = super.get(key);
        if (!entry) {
            throw new error.UnknownException(`Unknown key: ${key}`);
        }
        return entry.references;
    }
}
