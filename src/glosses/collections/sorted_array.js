require("./shim");

const GenericCollection = require("./generic_collection");
export default class SortedArray {
    constructor(values, equals, compare, getDefault) {
        if (!(this instanceof SortedArray)) {
            return new SortedArray(values, equals, compare, getDefault);
        }
        if (Array.isArray(values)) {
            this.array = values;
            values = values.splice(0, values.length);
        } else {
            this.array = [];
        }
        this.contentEquals = equals || Object.equals;
        this.contentCompare = compare || Object.compare;
        this.getDefault = getDefault || adone.noop;

        this.length = 0;
        this.addEach(values);
    }
}

SortedArray.from = function (...args) {
    return new SortedArray(...args);
};

Object.addEach(SortedArray.prototype, GenericCollection.prototype);
SortedArray.prototype.isSorted = true;

function search(array, value, compare) {
    let first = 0;
    let last = array.length - 1;
    while (first <= last) {
        const middle = (first + last) >> 1; // Math.floor( / 2)
        const comparison = compare(value, array[middle]);
        if (comparison > 0) {
            first = middle + 1;
        } else if (comparison < 0) {
            last = middle - 1;
        } else {
            return middle;
        }
    }
    return -(first + 1);
}

function searchFirst(array, value, compare, equals) {
    let index = search(array, value, compare);
    if (index < 0) {
        return -1;
    } else {
        while (index > 0 && equals(value, array[index - 1])) {
            index--;
        }
        if (!equals(value, array[index])) {
            return -1;
        } else {
            return index;
        }
    }
}

function searchLast(array, value, compare, equals) {
    let index = search(array, value, compare);
    if (index < 0) {
        return -1;
    } else {
        while (index < array.length - 1 && equals(value, array[index + 1])) {
            index++;
        }
        if (!equals(value, array[index])) {
            return -1;
        } else {
            return index;
        }
    }
}

function searchForInsertionIndex(array, value, compare) {
    let index = search(array, value, compare);
    if (index < 0) {
        return -index - 1;
    } else {
        const last = array.length - 1;
        while (index < last && compare(value, array[index + 1]) === 0) {
            index++;
        }
        return index;
    }
}

SortedArray.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentCompare,
        this.getDefault
    );
};

SortedArray.prototype.has = function (value, equals) {
    if (equals) {
        throw new Error("SortedSet#has does not support second argument: equals");
    }
    const index = search(this.array, value, this.contentCompare);
    return index >= 0 && this.contentEquals(this.array[index], value);
};

SortedArray.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("SortedArray#get does not support second argument: equals");
    }
    const index = searchFirst(this.array, value, this.contentCompare, this.contentEquals);
    if (index !== -1) {
        return this.array[index];
    } else {
        return this.getDefault(value);
    }
};

SortedArray.prototype.add = function (value) {
    const index = searchForInsertionIndex(this.array, value, this.contentCompare);
    this.array.splice(index, 0, value);
    this.length++;
    return true;
};

SortedArray.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("SortedArray#delete does not support second argument: equals");
    }
    const index = searchFirst(this.array, value, this.contentCompare, this.contentEquals);
    if (index !== -1) {
        this.array.spliceOne(index);
        this.length--;
        return true;
    } else {
        return false;
    }
};

SortedArray.prototype.deleteAll = function (value, equals) {
    if (equals) {
        const count = this.array.deleteAll(value, equals);
        this.length -= count;
        return count;
    } else {
        const start = searchFirst(this.array, value, this.contentCompare, this.contentEquals);
        if (start !== -1) {
            let end = start;
            while (this.contentEquals(value, this.array[end])) {
                end++;
            }
            const minus = this.slice(start, end);
            this.array.splice(start, minus.length);
            this.length -= minus.length;
            return minus.length;
        } else {
            return 0;
        }
    }
};

SortedArray.prototype.indexOf = function (value) {
    // TODO throw error if provided a start index
    return searchFirst(this.array, value, this.contentCompare, this.contentEquals);
};

SortedArray.prototype.lastIndexOf = function (value) {
    // TODO throw error if provided a start index
    return searchLast(this.array, value, this.contentCompare, this.contentEquals);
};

SortedArray.prototype.findValue = function (value, equals, index) {
    // TODO throw error if provided a start index
    if (equals) {
        throw new Error("SortedArray#find does not support second argument: equals");
    }
    if (index) {
        throw new Error("SortedArray#find does not support third argument: index");
    }
    // TODO support initial partition index
    return searchFirst(this.array, value, this.contentCompare, this.contentEquals);
};

SortedArray.prototype.findLast = function (value, equals, index) {
    if (equals) {
        throw new Error("SortedArray#findLast does not support second argument: equals");
    }
    if (index) {
        throw new Error("SortedArray#findLast does not support third argument: index");
    }
    // TODO support initial partition index
    return searchLast(this.array, value, this.contentCompare, this.contentEquals);
};

SortedArray.prototype.push = function () {
    this.addEach(arguments);
};

SortedArray.prototype.unshift = function () {
    this.addEach(arguments);
};

SortedArray.prototype.pop = function () {
    const val = this.array.pop();
    this.length = this.array.length;
    return val;
};

SortedArray.prototype.shift = function () {
    const val = this.array.shift();
    this.length = this.array.length;
    return val;
};

SortedArray.prototype.slice = function () {
    return this.array.slice.apply(this.array, arguments);
};

SortedArray.prototype.splice = function (index, length /*...plus*/) {
    return this.swap(index, length, Array.prototype.slice.call(arguments, 2));
};

SortedArray.prototype.swap = function (index, length, plus) {
    if (index === undefined && length === undefined) {
        return Array.empty;
    }
    index = index || 0;
    if (index < 0) {
        index += this.length;
    }
    if (length === undefined) {
        length = Infinity;
    }
    const minus = this.slice(index, index + length);
    this.array.splice(index, length);
    this.length -= minus.length;
    this.addEach(plus);
    return minus;
};

SortedArray.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    return this.array.reduce(function (basis, value, key) {
        return callback.call(thisp, basis, value, key, this);
    }, basis, this);
};

SortedArray.prototype.reduceRight = function (callback, basis) {
    const thisp = arguments[2];
    return this.array.reduceRight(function (basis, value, key) {
        return callback.call(thisp, basis, value, key, this);
    }, basis, this);
};

SortedArray.prototype.min = function () {
    if (this.length) {
        return this.array[0];
    }
};

SortedArray.prototype.max = function () {
    if (this.length) {
        return this.array[this.length - 1];
    }
};

SortedArray.prototype.one = function () {
    return this.array.one();
};

SortedArray.prototype.clear = function () {
    this.length = 0;
    this.array.clear();
};

SortedArray.prototype.equals = function (that, equals) {
    return this.array.equals(that, equals);
};

SortedArray.prototype.compare = function (that, compare) {
    return this.array.compare(that, compare);
};

SortedArray.prototype.iterate = function (start, end) {
    return new this.Iterator(this.array, start, end);
};

SortedArray.prototype.toJSON = function () {
    return this.toArray();
};

SortedArray.prototype.Iterator = Array.prototype.Iterator;
