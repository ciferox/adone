const { is, database: { level: { AbstractBackend, _: { native } } } } = adone;

const imports = adone.lazify({
    ChainedBatch: "./chained-batch",
    Iterator: "./iterator"
}, null, require);

export default class Default extends AbstractBackend {
    constructor(location) {
        super(location);
        this.native = native(location);
    }

    _open(options, callback) {
        this.native.open(options, callback);
    }

    _close(callback) {
        this.native.close(callback);
    }

    _put(key, value, options, callback) {
        this.native.put(key, value, options, callback);
    }

    _get(key, options, callback) {
        this.native.get(key, options, callback);
    }

    _del(key, options, callback) {
        this.native.del(key, options, callback);
    }

    _chainedBatch() {
        return new imports.ChainedBatch(this);
    }

    _batch(operations, options, callback) {
        return this.native.batch(operations, options, callback);
    }

    compactRange(start, end, callback) {
        this.native.compactRange(start, end, callback);
    }

    getProperty(property) {
        if (!is.string(property)) {
            throw new Error("getProperty() requires a valid `property` argument");
        }

        return this.native.getProperty(property);
    }

    _iterator(options) {
        return new imports.Iterator(this, options);
    }

    static destroy(location, callback) {
        if (arguments.length < 2) {
            throw new Error("destroy() requires `location` and `callback` arguments");
        }

        if (!is.string(location)) {
            throw new Error("destroy() requires a location string argument");
        }

        if (!is.function(callback)) {
            throw new Error("destroy() requires a callback function argument");
        }

        native.destroy(location, callback);
    }

    static repair(location, callback) {
        if (arguments.length < 2) {
            throw new Error("repair() requires `location` and `callback` arguments");
        }

        if (!is.string(location)) {
            throw new Error("repair() requires a location string argument");
        }

        if (!is.function(callback)) {
            throw new Error("repair() requires a callback function argument");
        }

        native.repair(location, callback);
    }
}
