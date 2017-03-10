
require("./shim");
const { SortedSet } = adone.collection;
const GenericCollection = require("./generic_collection");
const GenericMap = require("./generic_map");

export default class SortedMap {
    constructor(values, equals, compare, getDefault) {
        if (!(this instanceof SortedMap)) {
            return new SortedMap(values, equals, compare, getDefault);
        }
        equals = equals || Object.equals;
        compare = compare || Object.compare;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentCompare = compare;
        this.getDefault = getDefault;
        this.store = new SortedSet(
            null,
            function keysEqual(a, b) {
                return equals(a.key, b.key);
            },
            function compareKeys(a, b) {
                return compare(a.key, b.key);
            }
        );
        this.length = 0;
        this.addEach(values);
    }
}

SortedMap.from = function (...args) {
    return new SortedMap(...args);
};

Object.addEach(SortedMap.prototype, GenericCollection.prototype);
Object.addEach(SortedMap.prototype, GenericMap.prototype);
Object.defineProperty(SortedMap.prototype, "size", GenericCollection._sizePropertyDescriptor);

SortedMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.getDefault
    );
};
SortedMap.prototype.iterate = function () {
    return this.store.iterate();
};
