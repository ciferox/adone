/**
 * Represents a stack
 */
export default class Stack {
    constructor() {
        this._list = [];
    }

    get length() {
        return this._list.length;
    }

    /**
     * Whether the stack is empty
     *
     * @returns {boolean}
     */
    get empty() {
        return this._list.length === 0;
    }

    /**
     * The top element of the stack
     */
    get top() {
        return (this._list.length > 0)
            ? this._list[this._list.length - 1]
            : undefined;
    }

    /**
     * Inserts a new element
     *
     * @returns {this}
     */
    push(v) {
        this._list.push(v);
        return this;
    }

    /**
     * Removes the top element
     *
     * @returns {any} top element value
     */
    pop() {
        return this._list.pop();
    }

    /**
     * Returns an iterator over the values
     */
    *[Symbol.iterator]() {
        for (let i = this._list.length - 1; i >= 0; --i) {
            yield this._list[i];
        }
    }

    /**
     * Moves everything from the stack to another stack
     */
    moveTo(target) {
        const len = this._list.length;
        for (let i = 0; i < len; ++i) {
            target._list.push(this._list[len - i - 1]);
        }
        this._list.length = 0;
        return this;
    }

    clear() {
        this._list.length = 0;
        return this;
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
