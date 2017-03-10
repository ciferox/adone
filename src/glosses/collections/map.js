
require("./shim");
const GenericCollection = require("./generic_collection");
let Map;

Map = module.exports = global.Map;
const GlobalMap = Map;

Map.prototype.constructClone = function (values) {
    return new this.constructor(values);
};

Map.prototype.isMap = true;
Map.prototype.addEach = function (values) {
    if (values && Object(values) === values) {
        if (typeof values.forEach === "function") {
            // copy map-alikes
            if (values.isMap === true) {
                values.forEach(function (value, key) {
                    this.set(key, value);
                }, this);
                // iterate key value pairs of other iterables
            } else {
                values.forEach(function (pair) {
                    this.set(pair[0], pair[1]);
                }, this);
            }
        } else if (typeof values.length === "number") {
            // Array-like objects that do not implement forEach, ergo,
            // Arguments
            for (let i = 0; i < values.length; i++) {
                this.add(values[i], i);
            }
        } else {
            // copy other objects as map-alikes
            Object.keys(values).forEach(function (key) {
                this.set(key, values[key]);
            }, this);
        }
    } else if (values && typeof values.length === "number") {
        // String
        for (let i = 0; i < values.length; i++) {
            this.add(values[i], i);
        }
    }
    return this;
};

Map.prototype.add = function (value, key) {
    return this.set(key, value);
};

Map.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    this.forEach(function (value, key, map) {
        basis = callback.call(thisp, basis, value, key, this);
    });
    return basis;
};

Map.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const keysIterator = this.keys();
    let size = this.size;
    const reverseOrder = new Array(this.size);
    let aKey;
    let i = 0;
    while ((aKey = keysIterator.next().value)) {
        reverseOrder[--size] = aKey;
    }
    while (i++ < size) {
        basis = callback.call(thisp, basis, this.get(reverseOrder[i]), reverseOrder[i], this);
    }
    return basis;
};

Map.prototype.equals = function (that, equals) {
    equals = equals || Object.equals;
    if (this === that) {
        return true;
    } else if (that && typeof that.every === "function") {
        return that.size === this.size && that.every(function (value, key) {
            return equals(this.get(key), value);
        }, this);
    } else {
        const keys = Object.keys(that);
        return keys.length === this.size && Object.keys(that).every(function (key) {
            return equals(this.get(key), that[key]);
        }, this);
    }
};

const _keysArrayFunction = function (value, key) {
    return key;
};
Map.prototype.keysArray = function () {
    return this.map(_keysArrayFunction);
};
const _valuesArrayFunction = function (value, key) {
    return value;
};
Map.prototype.valuesArray = function () {
    return this.map(_valuesArrayFunction);
};
const _entriesArrayFunction = function (value, key) {
    return [key, value];
};
Map.prototype.entriesArray = function () {
    return this.map(_entriesArrayFunction);
};
Map.prototype.toJSON = function () {
    return this.entriesArray();
};

// XXX deprecated
Map.prototype.items = function () {
    return this.entriesArray();
};

// Map.prototype.contentEquals = Object.equals;
// Map.prototype.contentHash = Object.hash;


Map.from = function (value) {
    const result = new this;
    result.addEach(value);
    return result;
};


//Backward compatibility:
Object.defineProperty(Map.prototype, "length", {
    get: function () {
        return this.size;
    },
    enumerable: true,
    configurable: true
});

Object.addEach(Map.prototype, GenericCollection.prototype, false);

const { Set } = adone.collection;
const GenericMap = require("./generic_map");

const CollectionsMap = Map = function Map(values, equals, hash, getDefault) {
    equals = equals || Object.equals;
    hash = hash || Object.hash;
    getDefault = getDefault || adone.noop;
    this.contentEquals = equals;
    this.contentHash = hash;
    this.getDefault = getDefault;
    this.store = new Set(
        undefined,
        function keysEqual(a, b) {
            return equals(a.key, b.key);
        },
        function keyHash(item) {
            return hash(item.key);
        }
    );
    this.length = 0;
    this.addEach(values);
};

Object.addEach(Map.prototype, GenericCollection.prototype);
Object.addEach(Map.prototype, GenericMap.prototype); // overrides GenericCollection
Object.defineProperty(Map.prototype, "size", GenericCollection._sizePropertyDescriptor);

Map.from = function (...args) {
    return new Map(...args);
};

Map.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

export default GlobalMap;
GlobalMap.CollectionsMap = CollectionsMap;
