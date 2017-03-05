import adone from "adone";
require("./shim");
const { FastSet } = adone.collection;
const GenericCollection = require("./generic_collection");
const GenericSet = require("./generic_set");
const List = require("./_list");
const Iterator = require("./iterator");

const CollectionsSet = function (values, equals, hash, getDefault) {
    return CollectionsSet._init(CollectionsSet, this, values, equals, hash, getDefault);
};

CollectionsSet._init = function (constructor, object, values, equals, hash, getDefault) {
    if (!(object instanceof constructor)) {
        return new constructor(values, equals, hash, getDefault);
    }
    equals = equals || Object.equals;
    hash = hash || Object.hash;
    getDefault = getDefault || adone.noop;
    object.contentEquals = equals;
    object.contentHash = hash;
    object.getDefault = getDefault;
    // a list of values in insertion order, used for all operations that depend
    // on iterating in insertion order
    object.order = new object.Order(undefined, equals);
    // a set of nodes from the order list, indexed by the corresponding value,
    // used for all operations that need to quickly seek  value in the list
    object.store = new object.Store(
        undefined,
        function (a, b) {
            return equals(a.value, b.value);
        },
        function (node) {
            return hash(node.value);
        }
    );
    object.length = 0;
    object.addEach(values);
};

Object.addEach(CollectionsSet.prototype, GenericCollection.prototype);
Object.addEach(CollectionsSet.prototype, GenericSet.prototype);

CollectionsSet.from = function (...args) {
    return new CollectionsSet(...args);
};

Object.defineProperty(CollectionsSet.prototype, "size", GenericCollection._sizePropertyDescriptor);

//Overrides for consistency:
// Set.prototype.forEach = GenericCollection.prototype.forEach;


CollectionsSet.prototype.Order = List;
CollectionsSet.prototype.Store = FastSet;

CollectionsSet.prototype.constructClone = function (values) {
    return new this.constructor(values, this.contentEquals, this.contentHash, this.getDefault);
};

CollectionsSet.prototype.has = function (value) {
    const node = new this.order.Node(value);
    return this.store.has(node);
};

CollectionsSet.prototype.get = function (value) {
    let node = new this.order.Node(value);
    node = this.store.get(node);
    if (node) {
        return node.value;
    } else {
        return this.getDefault(value);
    }
};

CollectionsSet.prototype.add = function (value) {
    let node = new this.order.Node(value);
    if (!this.store.has(node)) {
        this.order.add(value);
        node = this.order.head.prev;
        this.store.add(node);
        this.length++;
        return true;
    }
    return false;
};

CollectionsSet.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("Set#delete does not support second argument: equals");
    }
    let node = new this.order.Node(value);
    if (this.store.has(node)) {
        node = this.store.get(node);
        this.store["delete"](node); // removes from the set
        this.order.splice(node, 1); // removes the node from the list
        this.length--;
        return true;
    }
    return false;
};

CollectionsSet.prototype.pop = function () {
    if (this.length) {
        const result = this.order.head.prev.value;
        this["delete"](result);
        return result;
    }
};

CollectionsSet.prototype.shift = function () {
    if (this.length) {
        const result = this.order.head.next.value;
        this["delete"](result);
        return result;
    }
};

CollectionsSet.prototype.one = function () {
    if (this.length > 0) {
        return this.store.one().value;
    }
};

CollectionsSet.prototype.clear = function () {
    this.store.clear();
    this.order.clear();
    this.length = 0;
};
Object.defineProperty(CollectionsSet.prototype, "_clear", {
    value: CollectionsSet.prototype.clear
});

CollectionsSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const list = this.order;
    let index = 0;
    return list.reduce(function (basis, value) {
        return callback.call(thisp, basis, value, index++, this);
    }, basis, this);
};

CollectionsSet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    const list = this.order;
    let index = this.length - 1;
    return list.reduceRight(function (basis, value) {
        return callback.call(thisp, basis, value, index--, this);
    }, basis, this);
};

CollectionsSet.prototype.iterate = function () {
    return this.order.iterate();
};

CollectionsSet.prototype.values = function () {
    return new Iterator(this.valuesArray());
};

export default CollectionsSet;
