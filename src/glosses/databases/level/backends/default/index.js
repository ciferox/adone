const { AbstractBackend } = adone.database.level;
const binding = adone.native.leveldown;
import ChainedBatch from "./chained-batch";
import Iterator from "./iterator";

export default class Default extends AbstractBackend {
    constructor(location) {
        super(location);
        this.binding = binding(location);
    }

    _open(options, callback) {
        this.binding.open(options, callback);
    }

    _close(callback) {
        this.binding.close(callback);
    }

    _put(key, value, options, callback) {
        this.binding.put(key, value, options, callback);
    }

    _get(key, options, callback) {
        this.binding.get(key, options, callback);
    }

    _del(key, options, callback) {
        this.binding.del(key, options, callback);
    }

    _chainedBatch() {
        return new ChainedBatch(this);
    }

    _batch(operations, options, callback) {
        return this.binding.batch(operations, options, callback);
    }

    compactRange(start, end, callback) {
        this.binding.compactRange(start, end, callback);
    }

    getProperty(property) {
        if (typeof property !== "string") {
            throw new Error("getProperty() requires a valid `property` argument");
        }

        return this.binding.getProperty(property);
    }

    _iterator(options) {
        return new Iterator(this, options);
    }

    static destroy(location, callback) {
        if (arguments.length < 2) {
            throw new Error("destroy() requires `location` and `callback` arguments");
        }

        if (typeof location !== "string") {
            throw new Error("destroy() requires a location string argument");
        }

        if (typeof callback !== "function") {
            throw new Error("destroy() requires a callback function argument");
        }

        binding.destroy(location, callback);
    }

    static repair(location, callback) {
        if (arguments.length < 2) {
            throw new Error("repair() requires `location` and `callback` arguments");
        }

        if (typeof location !== "string") {
            throw new Error("repair() requires a location string argument");
        }

        if (typeof callback !== "function") {
            throw new Error("repair() requires a callback function argument");
        }

        binding.repair(location, callback);
    }
}
