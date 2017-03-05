import adone from "adone";
const { LfuSet } = adone.collection;
require("./shim");
const GenericCollection = require("./generic_collection");
const GenericMap = require("./generic_map");

export default class LfuMap {
    constructor(values, maxLength, equals, hash, getDefault) {
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.store = new LfuSet(
            undefined,
            maxLength,
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

Object.addEach(LfuMap.prototype, GenericCollection.prototype);
Object.addEach(LfuMap.prototype, GenericMap.prototype);

Object.defineProperty(LfuMap.prototype, "size", GenericCollection._sizePropertyDescriptor);
LfuMap.from = function (...args) {
    return new LfuMap(...args);
};

LfuMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.maxLength,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

LfuMap.prototype.stringify = function (item, leader) {
    return leader + JSON.stringify(item.key) + ": " + JSON.stringify(item.value);
};
