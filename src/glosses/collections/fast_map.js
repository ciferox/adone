require("./shim");
import adone from "adone";
const { FastSet } = adone.collection;
const GenericCollection = require("./generic_collection");
const GenericMap = require("./generic_map");

export default class FastMap {
    constructor(values, equals, hash, getDefault) {
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.store = new FastSet(
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
    }
}

Object.addEach(FastMap.prototype, GenericCollection.prototype);
Object.addEach(FastMap.prototype, GenericMap.prototype);

FastMap.from = function (...args) {
    return new FastMap(...args);
};
FastMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

FastMap.prototype.stringify = function (item, leader) {
    return leader + JSON.stringify(item.key) + ": " + JSON.stringify(item.value);
};
