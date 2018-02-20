const { is, error } = adone;

const empty = Symbol.for("linkedlist:empty");

/**
 * Represents the node of a linked list
 */
class Node {
    constructor(prev = null, next = null, value = empty) {
        this.next = next;
        this.prev = prev;
        this.value = value;
    }
}

class Iterator {
    constructor(list) {
        this.list = list;
        this.reset();
    }

    reset() {
        this.i = 0;
        this.cursor = null;
        this._done = false;
        this._started = false;
    }

    remove() {
        if (this._done) {
            return false;
        }
        this.list.removeNode(this.cursor);
    }

    _advanceCursor() {
        if (this._started === false) {
            this._started = true;
            this.cursor = this.list.head;
        } else {
            this.cursor = this.cursor.next;
        }
    }

    next() {
        if (this.i++ >= this.list.length) {
            this._done = true;
            return { done: true };
        }
        this._advanceCursor();
        return { value: this.cursor.value, done: false };
    }
}

/**
 * Represents a linked list
 */
export default class LinkedList {
    constructor(maxLength) {
        if (!maxLength || !is.finite(maxLength)) {
            maxLength = LinkedList.DEFAULT_LENGTH;
            this.autoresize = true;
        } else {
            this.autoresize = false;
        }

        this.head = new Node();

        let cursor = this.head;
        for (let i = 0; i < maxLength - 1; ++i) {
            cursor = cursor.next = new Node(cursor);
        }
        this.tail = cursor;
        this.tail.next = this.head;
        this.head.prev = this.tail;
        this.tail = this.head.prev;
        this.length = 0;
        this.maxLength = maxLength;
    }

    _maybeResize() {
        if (!this.autoresize || this.maxLength <= LinkedList.DEFAULT_LENGTH) {
            return;
        }
        const l = this.maxLength >>> 1;
        if (this.length < l) {
            this.resize(l);
        }
    }

    /**
     * Whether the list is full
     *
     * @returns {boolean}
     */
    get full() {
        return this.length === this.maxLength;
    }

    /**
     * Whether the list is empty
     *
     * @returns {boolean}
     */
    get empty() {
        return this.length === 0;
    }

    /**
     * Resizes the list
     *
     * @param {number} newLength
     */
    resize(newLength) {
        if (newLength === this.maxLength) {
            return this;
        }
        if (newLength < this.maxLength) {
            if (newLength > this.length) {
                let cursor = this.tail;
                for (let i = 0, n = newLength - this.length; i < n; ++i) {
                    cursor = cursor.next;
                }
                cursor.next = this.head;
                this.head.prev = cursor;
            } else if (newLength < this.length) {
                let cursor = this.tail;
                for (let i = 0, n = this.length - newLength; i < n; ++i) {
                    cursor = cursor.prev;
                }
                cursor.next = this.head;
                this.head.prev = cursor;
                this.tail = cursor;
                this.length = newLength;
            } else {
                this.tail.next = this.head;
                this.head.prev = this.tail;
            }
        } else if (newLength > this.maxLength) {
            let cursor = this.head.prev;
            for (let i = 0, n = newLength - this.maxLength; i < n; ++i) {
                cursor = cursor.next = new Node(cursor);
            }
            cursor.next = this.head;
            this.head.prev = cursor;
        }
        this.maxLength = newLength;
        return this;
    }

    /**
     * Adds a new node to the end
     *
     * @returns {Node} Added node
     */
    push(value) {
        if (this.full) {
            if (this.autoresize) {
                this.resize(this.maxLength * 2);
            } else {
                throw new error.IllegalState("Full");
            }
        }
        this.tail = this.tail.next;
        this.tail.value = value;
        ++this.length;

        return this.tail;
    }

    /**
     * Removes the last node
     *
     * @returns {any} the last node's value
     */
    pop() {
        if (this.empty) {
            return;
        }
        const value = this.tail.value;
        this.tail.value = empty;
        this.tail = this.tail.prev;
        --this.length;
        this._maybeResize();
        return value;
    }

    /**
     * Removes the first node
     *
     * @returns {any} the first node's value
     */
    shift() {
        if (this.empty) {
            return;
        }
        const value = this.head.value;
        this.head.value = empty;
        this.head = this.head.next;
        --this.length;
        this._maybeResize();
        return value;
    }

    /**
     * Inserts a new node at the beginning of the list
     *
     * @returns {Node} Added node
     */
    unshift(value) {
        if (this.full) {
            if (this.autoresize) {
                this.resize(this.maxLength * 2);
            } else {
                throw new error.IllegalState("Full");
            }
        }
        this.head = this.head.prev;
        this.head.value = value;
        ++this.length;
        return this.head;
    }

    /**
     * Moves the given node to the end of the list
     *
     * @returns {void}
     */
    pushNode(node) {
        if (node === this.tail) {
            return;
        }
        if (node === this.head) {
            this.head = this.head.next;
        }
        node.next.prev = node.prev;
        node.prev.next = node.next;

        node.next = this.tail.next;
        this.tail.next.prev = node;

        node.prev = this.tail;
        this.tail.next = node;
    }

    /**
     * Moved the given node to the beginning of the list
     *
     * @returns {void}
     */
    unshiftNode(node) {
        if (node === this.head) {
            return;
        }
        if (node === this.tail) {
            this.tail = this.tail.prev;
        }
        node.next.prev = node.prev;
        node.prev.next = node.next;

        node.prev = this.head.prev;
        this.head.prev.next = node;

        node.next = this.head;
        this.head.prev = node;

        this.head = node;
    }

    /**
     * Removes the given node from the list
     *
     * @returns {void}
     */
    removeNode(node) {
        if (node === this.tail) {
            this.tail.value = empty;
            this.tail = this.tail.prev;
            --this.length;
            this._maybeResize();
            return;
        }
        node.value = empty;
        this.pushNode(node);
        --this.length;
    }

    /**
     * Clears the list
     *
     * @param {boolean} [strong = false] Whether to reset all the node's values
     * @returns {void}
     */
    clear(strong = false) {
        if (strong) {
            for (let i = 0, n = this.length, cursor = this.head; i < n; ++i, cursor = cursor.next) {
                cursor.value = empty;
            }
        }
        this.length = 0;
        this.tail = this.head.prev;
        if (this.autoresize) {
            this.resize(LinkedList.DEFAULT_LENGTH);
        }
    }

    /**
     * Convers the list to an array
     *
     * @returns {any[]} all the elements of the list
     */
    toArray() {
        const f = [];
        for (let i = 0, cursor = this.head, n = this.length; i < n; ++i, cursor = cursor.next) {
            f.push(cursor.value);
        }
        return f;
    }

    /**
     * The first element of the list
     *
     * @returns {any} the first node's value
     */
    get front() {
        if (this.length === 0) {
            throw new error.IllegalState("Empty");
        }
        return this.head.value;
    }

    /**
     * The last element of the list
     *
     * @returns {any} the last node's value
     */
    get back() {
        if (this.length === 0) {
            throw new error.IllegalState("Empty");
        }
        return this.tail.value;
    }

    /**
     * Returns an iterator over the list elements
     */
    [Symbol.iterator]() {
        return new Iterator(this);
    }

    /**
     * Returns the next node for the given node
     *
     * @param {Node} node
     * @returns {Node} the next node
     */
    nextNode(node) {
        if (!node) {
            return this.empty ? null : this.head;
        }
        if (node !== this.tail) {
            return node.next;
        }
        return null;
    }

    /**
     * Invokes the given callback for each value from the beginning to the end (much faster than for-of).
     * If the given function returns false it stops iterating.
     *
     * @param {(value: any, idx: number) => void} callback
     * @returns {void}
     */
    forEach(callback) {
        let cursor = this.head;
        for (let i = 0; i < this.length; ++i) {
            // eslint-disable-next-line callback-return
            if (callback(cursor.value, i) === false) {
                break;
            }
            cursor = cursor.next;
        }
    }

    /**
     * Maps this linked list to a new one using the given function
     *
     * @param {(value: any, idx: number) => any} fn
     * @returns {LinkedList}
     */
    map(fn) {
        const res = new LinkedList();
        this.forEach((value, idx) => {
            res.push(fn(value, idx));
        });
        return res;
    }
}

/**
 * Default length of a new created linked list
 */
LinkedList.DEFAULT_LENGTH = 16;
LinkedList.Iterator = Iterator;
