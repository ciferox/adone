const {
    is,
    database: { level: { AbstractBackend } }
} = adone;

const native = adone.nativeAddon(adone.std.path.join(__dirname, "native", "leveldown.node")).leveldown;

const __ = adone.lazify({
    ChainedBatch: "./chained_batch",
    Iterator: "./iterator"
}, null, require);

export default class LeveldbBackend extends AbstractBackend {
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
        return new __.ChainedBatch(this);
    }

    _batch(operations, options, callback) {
        return this.native.batch(operations, options, callback);
    }

    approximateSize(start, end, callback) {
        if (is.nil(start) || is.nil(end) || is.function(start) || is.function(end)) {
            throw new Error("approximateSize() requires valid `start`, `end` and `callback` arguments");
        }
      
        if (!is.function(callback)) {
            throw new Error("approximateSize() requires a callback argument");
        }
      
        start = this._serializeKey(start);
        end = this._serializeKey(end);
      
        this.native.approximateSize(start, end, callback);
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
        return new __.Iterator(this, options);
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
