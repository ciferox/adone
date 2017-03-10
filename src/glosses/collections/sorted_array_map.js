
require("./shim");
const { SortedArraySet } = adone.collection;
const GenericCollection = require("./generic_collection");
const GenericMap = require("./generic_map");

export default class SortedArrayMap {
    constructor(values, equals, compare, getDefault) {
        equals = equals || Object.equals;
        compare = compare || Object.compare;
        getDefault = getDefault || adone.noop;
        this.contentEquals = equals;
        this.contentCompare = compare;
        this.getDefault = getDefault;
        this.store = new SortedArraySet(
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

Object.addEach(SortedArrayMap.prototype, GenericCollection.prototype);
Object.addEach(SortedArrayMap.prototype, GenericMap.prototype);

SortedArrayMap.from = function (...args) {
    return new SortedArrayMap(...args);
};

SortedArrayMap.prototype.isSorted = true;

SortedArrayMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.getDefault
    );
};
