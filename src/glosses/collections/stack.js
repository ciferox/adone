/**
 * Represents the node of a stack
 */
class Node {
    constructor(data, next) {
        this.data = data;
        this.next = next;
    }
}

/**
 * Represents a stack
 */
export default class Stack {
    constructor() {
        this.head = null;
        this.length = 0;
    }

    /**
     * Whether the stack is empty
     *
     * @returns {boolean}
     */
    get empty() {
        return this.length === 0;
    }

    /**
     * The top element of the stack
     */
    get top() {
        if (!this.head) {
            return;
        }
        return this.head.data;
    }

    /**
     * Inserts a new element
     *
     * @returns {this}
     */
    push(v) {
        this.head = new Node(v, this.head);
        ++this.length;
        return this;
    }

    /**
     * Removes the top element
     *
     * @returns {any} top element value
     */
    pop() {
        if (!this.head) {
            return;
        }
        const value = this.head.data;
        this.head = this.head.next;
        --this.length;
        return value;
    }

    /**
     * Returns an iterator over the values
     */
    *[Symbol.iterator]() {
        let t = this.head;
        while (t) {
            yield t.data;
            t = t.next;
        }
    }

    /**
     * Creates a stack and pushed all the values from the given iterable object
     *
     * @returns {Stack}
     */
    static from(iterable) {
        const s = new Stack();
        for (const v of iterable) {
            s.push(v);
        }
        return s;
    }
}
