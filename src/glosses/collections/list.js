const _List = require("./_list");

export default class List extends _List {
}

List.from = _List.from;

Object.defineProperties(List.prototype, {
    "_dispatchEmptyArray": {
        value: []
    }
});

/*
var list_clear = _List.prototype.clear,
    set_add = GlobalSet.prototype.add,
    set_delete = GlobalSet.prototype.delete;
*/

// LIFO (delete removes the most recently added equivalent value)
List.prototype["delete"] = function (value, equals) {
    const found = this.findLast(value, equals);
    if (found) {
        found["delete"]();
        this.length--;
        return true;
    }
    return false;
};

Object.defineProperty(List.prototype, "superClear", {
    value: _List.prototype.clear,
    enumerable: false,
    configurable: true,
    writable: true
});
List.prototype.clear = function () {
    this.superClear();
};

List.prototype.add = function (value) {
    const node = new this.Node(value);

    this._addNode(node);

    return true;
};

Object.defineProperty(List.prototype, "superPush", {
    value: _List.prototype.push,
    enumerable: false,
    configurable: true,
    writable: true
});

List.prototype.push = function () {
    arguments.length === 1 ? this.superPush.call(this, arguments[0]) : (arguments.length === 2) ? this.superPush.call(this, arguments[0],  arguments[1]) : this.superPush.apply(this, arguments);
};

Object.defineProperty(List.prototype, "superUnshift", {
    value: _List.prototype.unshift,
    enumerable: false,
    configurable: true,
    writable: true
});

List.prototype.unshift = function () {
    arguments.length === 1 ? this.superUnshift.call(this, arguments[0]) : (arguments.length === 2) ? this.superUnshift.call(this, arguments[0],  arguments[1]) : this.superUnshift.apply(this, arguments);
};

Object.defineProperty(List.prototype, "superPop", {
    value: _List.prototype.pop,
    enumerable: false,
    configurable: true,
    writable: true
});

List.prototype.pop = function () {
    return this.superPop();
};

Object.defineProperty(List.prototype, "_beforeShift", {
    value: function(value, index) {
        let dispatchValueArray;
        if (this.dispatchesRangeChanges) {
            dispatchValueArray = [value];
            this.dispatchBeforeRangeChange(/*plus*/this._dispatchEmptyArray, /*minus*/dispatchValueArray, index);
        }
        return dispatchValueArray;
    },
    enumerable: false,
    configurable: true,
    writable: true
});
Object.defineProperty(List.prototype, "_afterShift", {
    value: function(value, index, dispatchValueArray) {
        if (this.dispatchesRangeChanges) {
            this.updateIndexes(this.head.next, index);
            this.dispatchRangeChange(/*plus*/this._dispatchEmptyArray, /*minus*/dispatchValueArray, index);
        }
    },
    enumerable: false,
    configurable: true,
    writable: true
});
Object.defineProperty(List.prototype, "superShift", {
    value: _List.prototype.shift,
    enumerable: false,
    configurable: true,
    writable: true
});
List.prototype.shift = function () {
    return this.superShift(this._beforeShift, this._afterShift);
};

Object.defineProperty(List.prototype, "superSwap", {
    value: _List.prototype.swap,
    enumerable: false,
    configurable: true,
    writable: true
});
List.prototype.swap = function (start, length, plus) {
    return this.superSwap(start, length, plus);
};

Object.defineProperty(List.prototype, "superReverse", {
    value: _List.prototype.reverse,
    enumerable: false,
    configurable: true,
    writable: true
});
List.prototype.reverse = function () {
    this.superReverse();
    return this;
};
