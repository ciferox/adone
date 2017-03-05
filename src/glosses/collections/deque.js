require("./shim");
const GenericCollection = require("./generic_collection");
const GenericOrder = require("./generic_order");

// by Petka Antonov
// https://github.com/petkaantonov/deque/blob/master/js/deque.js
// Deque specifically uses
// http://en.wikipedia.org/wiki/Circular_buffer#Use_a_Fill_Count
// 1. Incrementally maintained length
// 2. Modulus avoided by using only powers of two for the capacity

export default class Deque {
    constructor(values, capacity) {
        this.capacity = this.snap(capacity);
        this.init();
        this.length = 0;
        this.front = 0;
        this.addEach(values);
    }
}

Object.addEach(Deque.prototype, GenericCollection.prototype);
Object.addEach(Deque.prototype, GenericOrder.prototype);

Deque.from = function (...args) {
    return new Deque(...args);
};

Deque.prototype.maxCapacity = (1 << 30) | 0;
Deque.prototype.minCapacity = 16;

Deque.prototype.constructClone = function (values) {
    return new this.constructor(values, this.capacity);
};

Deque.prototype.add = function (value) {
    this.push(value);
};

Deque.prototype.push = function (value /* or ...values */) {
    const argsLength = arguments.length;
    let length = this.length;

    if (argsLength > 1) {
        const capacity = this.capacity;
        if (length + argsLength > capacity) {
            for (let argIndex = 0; argIndex < argsLength; ++argIndex) {
                this.ensureCapacity(length + 1);
                const j = (this.front + length) & (this.capacity - 1);
                this[j] = arguments[argIndex];
                length++;
                this.length = length;
            }
        } else {
            let j = this.front;
            for (let argIndex = 0; argIndex < argsLength; ++argIndex) {
                this[(j + length) & (capacity - 1)] = arguments[argIndex];
                j++;
            }
            this.length = length + argsLength;
        }

    } else if (argsLength === 1) {
        this.ensureCapacity(length + 1);
        const index = (this.front + length) & (this.capacity - 1);
        this[index] = value;
        this.length = length + 1;
    }

    return this.length;
};

Deque.prototype.pop = function () {
    const length = this.length;
    if (length === 0) {
        return;
    }
    const index = (this.front + length - 1) & (this.capacity - 1);
    const result = this[index];

    this[index] = void 0;
    this.length = length - 1;

    return result;
};

Deque.prototype.shift = function () {
    if (this.length !== 0) {
        const front = this.front;
        const result = this[front];

        this[front] = void 0;
        this.front = (front + 1) & (this.capacity - 1);
        this.length--;

        return result;
    }
};

Deque.prototype.unshift = function (value /* or ...values */) {
    let length = this.length;
    const argsLength = arguments.length;

    if (argsLength > 1) {
        let capacity = this.capacity;
        if (length + argsLength > capacity) {
            for (let argIndex = argsLength - 1; argIndex >= 0; argIndex--) {
                this.ensureCapacity(length + 1);
                capacity = this.capacity;
                const index = (
                    (
                        (
                            (this.front - 1) &
                            (capacity - 1)
                        ) ^ capacity
                    ) - capacity
                );
                this[index] = arguments[argIndex];
                length++;
                this.front = index;
                this.length = length;
            }
        } else {
            let front = this.front;
            for (let argIndex = argsLength - 1; argIndex >= 0; argIndex--) {
                const index = (
                    (
                        (
                            (front - 1) &
                            (capacity - 1)
                        ) ^ capacity
                    ) - capacity
                );
                this[index] = arguments[argIndex];
                front = index;
            }
            this.front = front;
            this.length = length + argsLength;
        }
    } else if (argsLength === 1) {
        this.ensureCapacity(length + 1);
        const capacity = this.capacity;
        const index = (
            (
                (
                    (this.front - 1) &
                    (capacity - 1)
                ) ^ capacity
            ) - capacity
        );
        this[index] = value;
        this.length = length + 1;
        this.front = index;
    }

    return this.length;
};

Deque.prototype.clear = function () {
    this.length = 0;
    this.front = 0;
    this.init();
};

Deque.prototype.ensureCapacity = function (capacity) {
    if (this.capacity < capacity) {
        this.grow(this.snap(this.capacity * 1.5 + 16));
    }
};

Deque.prototype.grow = function (capacity) {
    const oldFront = this.front;
    const oldCapacity = this.capacity;
    const oldContent = new Array(oldCapacity);
    const length = this.length;

    copy(this, 0, oldContent, 0, oldCapacity);
    this.capacity = capacity;
    this.init();
    this.front = 0;
    if (oldFront + length <= oldCapacity) {
        // Can perform direct linear copy.
        copy(oldContent, oldFront, this, 0, length);
    } else {
        // Cannot perform copy directly, perform as much as possible at the
        // end, and then copy the rest to the beginning of the buffer.
        const lengthBeforeWrapping = length - ((oldFront + length) & (oldCapacity - 1));
        copy(oldContent, oldFront, this, 0, lengthBeforeWrapping);
        copy(oldContent, 0, this, lengthBeforeWrapping, length - lengthBeforeWrapping);
    }
};

Deque.prototype.init = function () {
    for (let index = 0; index < this.capacity; ++index) {
        this[index] = "nil"; // TODO void 0
    }
};

Deque.prototype.snap = function (capacity) {
    if (typeof capacity !== "number") {
        return this.minCapacity;
    }
    return pow2AtLeast(
        Math.min(this.maxCapacity, Math.max(this.minCapacity, capacity))
    );
};

Deque.prototype.one = function () {
    if (this.length > 0) {
        return this[this.front];
    }
};

Deque.prototype.peek = function () {
    if (this.length === 0) {
        return;
    }
    return this[this.front];
};

Deque.prototype.poke = function (value) {
    if (this.length === 0) {
        return;
    }
    this[this.front] = value;
};

Deque.prototype.peekBack = function () {
    const length = this.length;
    if (length === 0) {
        return;
    }
    const index = (this.front + length - 1) & (this.capacity - 1);
    return this[index];
};

Deque.prototype.pokeBack = function (value) {
    const length = this.length;
    if (length === 0) {
        return;
    }
    const index = (this.front + length - 1) & (this.capacity - 1);
    this[index] = value;
};

Deque.prototype.get = function (index) {
    // Domain only includes integers
    if (index !== (index | 0)) {
        return;
    }
    // Support negative indicies
    if (index < 0) {
        index = index + this.length;
    }
    // Out of bounds
    if (index < 0 || index >= this.length) {
        return;
    }
    return this[(this.front + index) & (this.capacity - 1)];
};

Deque.prototype.indexOf = function (value, index) {
    // Default start index at beginning
    if (index == null) {
        index = 0;
    }
    // Support negative indicies
    if (index < 0) {
        index = index + this.length;
    }
    // Left to right walk
    const mask = this.capacity - 1;
    for (; index < this.length; index++) {
        const offset = (this.front + index) & mask;
        if (this[offset] === value) {
            return index;
        }
    }
    return -1;
};

Deque.prototype.lastIndexOf = function (value, index) {
    // Default start position at the end
    if (index == null) {
        index = this.length - 1;
    }
    // Support negative indicies
    if (index < 0) {
        index = index + this.length;
    }
    // Right to left walk
    const mask = this.capacity - 1;
    for (; index >= 0; index--) {
        const offset = (this.front + index) & mask;
        if (this[offset] === value) {
            return index;
        }
    }
    return -1;
};

// TODO rename findValue
Deque.prototype.findValue = function (value, equals, index) {
    equals = equals || Object.equals;
    // Default start index at beginning
    if (index == null) {
        index = 0;
    }
    // Support negative indicies
    if (index < 0) {
        index = index + this.length;
    }
    // Left to right walk
    const mask = this.capacity - 1;
    for (; index < this.length; index++) {
        const offset = (this.front + index) & mask;
        if (equals(value, this[offset])) {
            return index;
        }
    }
    return -1;
};

// TODO rename findLastValue
Deque.prototype.findLast = function (value, equals, index) {
    equals = equals || Object.equals;
    // Default start position at the end
    if (index == null) {
        index = this.length - 1;
    }
    // Support negative indicies
    if (index < 0) {
        index = index + this.length;
    }
    // Right to left walk
    const mask = this.capacity - 1;
    for (; index >= 0; index--) {
        const offset = (this.front + index) & mask;
        if (equals(value, this[offset])) {
            return index;
        }
    }
    return -1;
};

Deque.prototype.has = function (value, equals) {
    equals = equals || Object.equals;
    // Left to right walk
    const mask = this.capacity - 1;
    for (let index = 0; index < this.length; index++) {
        const offset = (this.front + index) & mask;
        if (this[offset] === value) {
            return true;
        }
    }
    return false;
};

Deque.prototype.reduce = function (callback, basis /*, thisp*/) {
    // TODO account for missing basis argument
    const thisp = arguments[2];
    const mask = this.capacity - 1;
    for (let index = 0; index < this.length; index++) {
        const offset = (this.front + index) & mask;
        basis = callback.call(thisp, basis, this[offset], index, this);
    }
    return basis;
};

Deque.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    // TODO account for missing basis argument
    const thisp = arguments[2];
    const mask = this.capacity - 1;
    for (let index = this.length - 1; index >= 0; index--) {
        const offset = (this.front + index) & mask;
        basis = callback.call(thisp, basis, this[offset], index, this);
    }
    return basis;
};

function copy(source, sourceIndex, target, targetIndex, length) {
    for (let index = 0; index < length; ++index) {
        target[index + targetIndex] = source[index + sourceIndex];
    }
}

function pow2AtLeast(n) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}
