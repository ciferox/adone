require("./shim");

const { LruSet } = adone.collection;
const GenericCollection = require("./generic_collection");
const GenericMap = require("./generic_map");

export default class LruMap {
    constructor(values, maxLength, equals, hash, getDefault) {
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.store = new LruSet(
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

Object.addEach(LruMap.prototype, GenericCollection.prototype);
Object.addEach(LruMap.prototype, GenericMap.prototype);

Object.defineProperty(LruMap.prototype, "size", GenericCollection._sizePropertyDescriptor);
LruMap.from = function (...args) {
    return new LruMap(...args);
};

LruMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.maxLength,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

LruMap.prototype.stringify = function (item, leader) {
    return leader + JSON.stringify(item.key) + ": " + JSON.stringify(item.value);
};
