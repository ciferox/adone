require("./shim");
import adone from "adone";
const { Dict } = adone.collection;
const List = require("./_list");
const GenericCollection = require("./generic_collection");
const GenericSet = require("./generic_set");

export default class FastSet {
    constructor(values, equals, hash, getDefault) {
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        const self = this;
        this.buckets = new this.Buckets(null, function getDefaultBucket() {
            return new self.Bucket();
        });
        this.length = 0;
        this.addEach(values);
    }
}

Object.addEach(FastSet.prototype, GenericCollection.prototype);
Object.addEach(FastSet.prototype, GenericSet.prototype);
FastSet.from = function (...args) {
    return new FastSet(...args);
};

FastSet.prototype.Buckets = Dict;
FastSet.prototype.Bucket = List;

FastSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

FastSet.prototype.has = function (value) {
    const hash = this.contentHash(value);
    return this.buckets.get(hash).has(value);
};

FastSet.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("FastSet#get does not support second argument: equals");
    }
    const hash = this.contentHash(value);
    const buckets = this.buckets;
    if (buckets.has(hash)) {
        return buckets.get(hash).get(value);
    } else {
        return this.getDefault(value);
    }
};

FastSet.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("FastSet#delete does not support second argument: equals");
    }
    const hash = this.contentHash(value);
    const buckets = this.buckets;
    if (buckets.has(hash)) {
        const bucket = buckets.get(hash);
        if (bucket["delete"](value)) {
            this.length--;
            if (bucket.length === 0) {
                buckets["delete"](hash);
            }
            return true;
        }
    }
    return false;
};

FastSet.prototype.clear = function () {
    this.buckets.clear();
    this.length = 0;
};

FastSet.prototype.add = function (value) {
    const hash = this.contentHash(value);
    const buckets = this.buckets;
    if (!buckets.has(hash)) {
        buckets.set(hash, new this.Bucket(null, this.contentEquals));
    }
    if (!buckets.get(hash).has(value)) {
        buckets.get(hash).add(value);
        this.length++;
        return true;
    }
    return false;
};

FastSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const buckets = this.buckets;
    let index = 0;
    return buckets.reduce(function (basis, bucket) {
        return bucket.reduce(function (basis, value) {
            return callback.call(thisp, basis, value, index++, this);
        }, basis, this);
    }, basis, this);
};

FastSet.prototype.one = function () {
    if (this.length > 0) {
        return this.buckets.one().one();
    }
};

FastSet.prototype.iterate = function () {
    return this.buckets.valuesArray().flatten().iterate();
};
