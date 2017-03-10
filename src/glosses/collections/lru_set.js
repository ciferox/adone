
const { Set } = adone.collection;
require("./shim");
const GenericCollection = require("./generic_collection");
const GenericSet = require("./generic_set");

export default class LruSet {
    constructor(values, capacity, equals, hash, getDefault) {
        capacity = capacity || Infinity;
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;
        this.store = new Set(undefined, equals, hash);
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.capacity = capacity;
        this.length = 0;
        this.addEach(values);
    }
}

Object.addEach(LruSet.prototype, GenericCollection.prototype);
Object.addEach(LruSet.prototype, GenericSet.prototype);
Object.defineProperty(LruSet.prototype, "size", GenericCollection._sizePropertyDescriptor);
LruSet.from = function(...args) {
    return new LruSet(...args);
};

LruSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.capacity,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

LruSet.prototype.has = function (value) {
    return this.store.has(value);
};

LruSet.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("LruSet#get does not support second argument: equals");
    }
    value = this.store.get(value);
    if (value !== undefined) {
        this.store["delete"](value);
        this.store.add(value);
    } else {
        value = this.getDefault(value);
    }
    return value;
};

LruSet.prototype.add = function (value) {
    const found = this.store.has(value);
    const plus = [];
    const minus = [];
    let eldest;
    // if the value already exists, we delete it and add it back again so it
    // appears at the end of the list of values to truncate
    if (found) {    // update
        this.store["delete"](value);
        this.store.add(value);
    } else if (this.capacity > 0) {    // add
        // because minus is constructed before adding value, we must ensure the
        // set has positive length. hence the capacity check.
        plus.push(value);
        if (this.length >= this.capacity) {
            eldest = this.store.order.head.next;
            minus.push(eldest.value);
        }
        this.store.add(value);
        if (minus.length > 0) {
            this.store["delete"](eldest.value);
        }
        // only assign to length once to avoid jitter on length observers
        this.length = this.length + plus.length - minus.length;
        // after change
    }
    // whether it grew
    return plus.length !== minus.length;
};

LruSet.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("LruSet#delete does not support second argument: equals");
    }
    const found = this.store.has(value);
    if (found) {
        this.store["delete"](value);
        this.length--;
    }
    return found;
};

LruSet.prototype.one = function () {
    if (this.length > 0) {
        return this.store.one();
    }
};

LruSet.prototype.clear = function () {
    this.store.clear();
    this.length = 0;
};

LruSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const set = this.store;
    let index = 0;
    return set.reduce(function (basis, value) {
        return callback.call(thisp, basis, value, index++, this);
    }, basis, this);
};

LruSet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const set = this.store;
    let index = this.length - 1;
    return set.reduceRight(function (basis, value) {
        return callback.call(thisp, basis, value, index--, this);
    }, basis, this);
};

LruSet.prototype.iterate = function () {
    return this.store.iterate();
};
