
require("./shim");
const { SortedArray } = adone.collection;
const GenericSet = require("./generic_set");

export default class SortedArraySet extends SortedArray {
}

Object.addEach(SortedArraySet.prototype, GenericSet.prototype);

SortedArraySet.from = SortedArray.from;

SortedArraySet.prototype.isSorted = true;

SortedArraySet.prototype.add = function (value) {
    if (!this.has(value)) {
        SortedArray.prototype.add.call(this, value);
        return true;
    } else {
        return false;
    }
};

SortedArraySet.prototype.reduce = function (callback, basis /*, thisp*/) {
    const self = this;
    const thisp = arguments[2];
    return this.array.reduce(function (basis, value, index) {
        return callback.call(thisp, basis, value, index, self);
    }, basis);
};

SortedArraySet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    const self = this;
    const thisp = arguments[2];
    return this.array.reduceRight(function (basis, value, index) {
        return callback.call(thisp, basis, value, index, self);
    }, basis);
};
