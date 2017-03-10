// Based on http://dhruvbird.com/lfu.pdf

const { Set } = adone.collection;

require("./shim");
const GenericCollection = require("./generic_collection");
const GenericSet = require("./generic_set");

export default class LfuSet {
    constructor(values, capacity, equals, hash, getDefault) {
        capacity = capacity || Infinity;
        equals = equals || Object.equals;
        hash = hash || Object.hash;
        getDefault = getDefault || adone.noop;

        // TODO
        this.store = new Set(
            undefined,
            function valueEqual(a, b) {
                return equals(a.value, b.value);
            },
            function valueHash(node) {
                return hash(node.value);
            }
        );
        this.frequencyHead = new this.FrequencyNode(0);

        this.contentEquals = equals;
        this.contentHash = hash;
        this.getDefault = getDefault;
        this.capacity = capacity;
        this.length = 0;
        this.addEach(values);
    }
}

Object.addEach(LfuSet.prototype, GenericCollection.prototype);
Object.addEach(LfuSet.prototype, GenericSet.prototype);
Object.defineProperty(LfuSet.prototype, "size", GenericCollection._sizePropertyDescriptor);
LfuSet.from = function (...args) {
    return new LfuSet(...args);
};

LfuSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.capacity,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

LfuSet.prototype.has = function (value) {
    return this.store.has(new this.Node(value));
};

LfuSet.prototype.get = function (value, equals) {
    if (equals) {
        throw new Error("LfuSet#get does not support second argument: equals");
    }

    const node = this.store.get(new this.Node(value));
    if (node !== undefined) {
        const frequencyNode = node.frequencyNode;
        let nextFrequencyNode = frequencyNode.next;
        if (nextFrequencyNode.frequency !== frequencyNode.frequency + 1) {
            nextFrequencyNode = new this.FrequencyNode(frequencyNode.frequency + 1, frequencyNode, nextFrequencyNode);
        }

        nextFrequencyNode.values.add(node);
        node.frequencyNode = nextFrequencyNode;
        frequencyNode.values["delete"](node);

        if (frequencyNode.values.length === 0) {
            frequencyNode.prev.next = frequencyNode.next;
            frequencyNode.next.prev = frequencyNode.prev;
        }

        return node.value;
    } else {
        return this.getDefault(value);
    }
};

LfuSet.prototype.add = function (value) {
    // if the value already exists, get it so that its frequency increases
    if (this.has(value)) {
        this.get(value);
        return false;
    }

    const plus = [];
    const minus = [];
    let leastFrequentNode;
    let leastFrequent;
    if (this.capacity > 0) {
        plus.push(value);
        if (this.length + 1 > this.capacity) {
            leastFrequentNode = this.frequencyHead.next;
            leastFrequent = leastFrequentNode.values.order.head.next.value;
            minus.push(leastFrequent.value);
        }

        // removal must happen before addition, otherwise we could remove
        // the value we are about to add
        if (minus.length > 0) {
            this.store["delete"](leastFrequent);
            leastFrequentNode.values["delete"](leastFrequent);
            // Don't remove the frequencyNode with value of 1, because we
            // are about to use it again in the addition.
            if (leastFrequentNode.value !== 1 && leastFrequentNode.values.length === 0) {
                this.frequencyHead.next = leastFrequentNode.next;
                leastFrequentNode.next.prev = this.frequencyHead;
            }
        }

        const node = new this.Node(value);
        let frequencyNode = this.frequencyHead.next;
        if (frequencyNode.frequency !== 1) {
            frequencyNode = new this.FrequencyNode(1, this.frequencyHead, frequencyNode);
        }
        this.store.add(node);
        frequencyNode.values.add(node);
        node.frequencyNode = frequencyNode;

        this.length = this.length + plus.length - minus.length;
    }

    // whether it grew
    return plus.length !== minus.length;
};

LfuSet.prototype["delete"] = function (value, equals) {
    if (equals) {
        throw new Error("LfuSet#delete does not support second argument: equals");
    }

    const node = this.store.get(new this.Node(value));
    const found = !!node;
    if (found) {
        const frequencyNode = node.frequencyNode;

        this.store["delete"](node);
        frequencyNode.values["delete"](node);
        if (frequencyNode.values.length === 0) {
            frequencyNode.prev.next = frequencyNode.next;
            frequencyNode.next.prev = frequencyNode.prev;
        }
        this.length--;
    }

    return found;
};

LfuSet.prototype.one = function () {
    if (this.length > 0) {
        return this.frequencyHead.next.values.one().value;
    }
};

LfuSet.prototype.clear = function () {
    this.store.clear();
    this.frequencyHead.next = this.frequencyHead;
    this.length = 0;
};

LfuSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    let index = 0;
    let frequencyNode = this.frequencyHead.next;

    while (frequencyNode.frequency !== 0) {
        const set = frequencyNode.values;
        basis = set.reduce(function (basis, node) {
            return callback.call(thisp, basis, node.value, index++, this);
        }, basis, this);

        frequencyNode = frequencyNode.next;
    }

    return basis;
};

LfuSet.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    const thisp = arguments[2];
    let index = this.length - 1;
    let frequencyNode = this.frequencyHead.prev;

    while (frequencyNode.frequency !== 0) {
        const set = frequencyNode.values;
        basis = set.reduceRight(function (basis, node) {
            return callback.call(thisp, basis, node.value, index--, this);
        }, basis, this);

        frequencyNode = frequencyNode.prev;
    }

    return basis;
};

LfuSet.prototype.iterate = function () {
    return this.store.map(function (node) {
        return node.value;
    }).iterate();
};

LfuSet.prototype.Node = Node;

function Node(value, frequencyNode) {
    this.value = value;
    this.frequencyNode = frequencyNode;
}

LfuSet.prototype.FrequencyNode = FrequencyNode;

function FrequencyNode(frequency, prev, next) {
    this.frequency = frequency;
    this.values = new Set();
    this.prev = prev || this;
    this.next = next || this;
    if (prev) {
        prev.next = this;
    }
    if (next) {
        next.prev = this;
    }
}
