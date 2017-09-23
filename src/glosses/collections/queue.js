/**
 * Represents a queue
 */
export default class Queue {
    /**
     * @param length queue length, unlimited by default
     */
    constructor(length) {
        this._list = new adone.collection.LinkedList(length);
    }

    /**
     * Whether the queue is full
     *
     * @returns {boolean}
     */
    get full() {
        return this._list.full;
    }

    /**
     * The length of the queue
     *
     * @returns {number}
     */
    get length() {
        return this._list.length;
    }

    /**
     * Whether the queue is empty
     *
     * @returns {boolean}
     */
    get empty() {
        return this._list.empty;
    }

    /**
     * Inserts a new element at the end
     *
     * @returns {this}
     */
    push(x) {
        this._list.push(x);
        return this;
    }

    /**
     * Removes and returns an element from the beginning
     *
     * @returns {any} value
     */
    pop() {
        return this._list.shift();
    }
}
