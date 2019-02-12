const {
    error,
    collection
} = adone;

/**
 * Represents a queue
 */
export default class Queue {
    constructor(length = Infinity) {
        this.length = 0;
        this.remaining = length;
        this.maxLength = length;
        this._incoming = new collection.Stack();
        this._outgoing = new collection.Stack();
    }

    /**
     * Whether the queue is full
     *
     * @returns {boolean}
     */
    get full() {
        return this.length === this.maxLength;
    }

    /**
     * Whether the queue is empty
     *
     * @returns {boolean}
     */
    get empty() {
        return this.length === 0;
    }

    /**
     * Inserts a new element at the end
     *
     * @returns {this}
     */
    push(x) {
        if (this.remaining === 0) {
            throw new error.IllegalStateException("This queue is full");
        }
        this._incoming.push(x);
        ++this.length;
        --this.remaining;
        return this;
    }

    /**
     * Removes and returns an element from the beginning
     *
     * @returns {any} value
     */
    pop() {
        if (this._outgoing.empty) {
            if (this._incoming.empty) {
                return;
            }
            this._incoming.moveTo(this._outgoing);
        }
        --this.length;
        ++this.remaining;
        return this._outgoing.pop();
    }

    clear() {
        this._incoming.clear();
        this._outgoing.clear();
        this.length = 0;
        this.remaining = this.maxLength;
        return this;
    }

    static from(iterable, length = Infinity) {
        const q = new this(length);
        for (const i of iterable) {
            q.push(i);
        }
        return q;
    }
}
