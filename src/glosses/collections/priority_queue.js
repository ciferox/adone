const defaultComparator = (a, b) => {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }
    return 0;
};

/**
 * Represents a priority queue
 */
export default class PriorityQueue {
    constructor({ compare = defaultComparator, priority = compare } = {}) {
        this._nodes = [];
        this._priority = priority;
        this._compare = compare;
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
     * The length of the queue
     *
     * @returns {boolean}
     */
    get length() {
        return this._nodes.length;
    }

    /**
     * Clones the queue
     *
     * @returns {PriorityQueue}
     */
    clone() {
        const h = new this.constructor({ compare: this._compare, priority: this._priority });
        h._nodes = this._nodes.slice();
        return h;
    }

    /**
     * Inserts a new element
     *
     * @returns {this}
     */
    push(a) {
        this._nodes.push(a);
        this._siftdown(0, this._nodes.length - 1);
        return this;
    }

    /**
     * Removes the top element (that has the highest priority)
     *
     * @returns {any} removed value
     */
    pop() {
        const lastelt = this._nodes.pop();
        if (this._nodes.length !== 0) {
            const returnitem = this._nodes[0];
            this._nodes[0] = lastelt;
            this._siftup(0);
            return returnitem;
        }
        return lastelt;
    }

    /**
     * Deletes the given element from the queue
     *
     * @returns {this}
     */
    delete(item) {
        // ...
        for (let i = 0; i < this._nodes.length; ++i) {
            if (this._compare(item, this._nodes[i]) === 0) {
                if (i === this._nodes.length - 1) {
                    this._nodes.pop();
                } else {
                    this._nodes[i] = this._nodes.pop();
                    this._siftup(i);
                }
                break;
            }
        }
        return this;
    }

    /**
     * Replaces the top element (pop + push)
     *
     * @returns {any} old top
     */
    replace(item) {
        const toReturn = this._nodes[0];
        this._nodes[0] = item;
        this._siftup(0);
        return toReturn;
    }

    /**
     * Faster push + pop
     *
     * @returns {any} removed value
     */
    pushpop(item) {
        if (this._nodes.length && this._priority(this._nodes[0], item) > 0) {
            [item, this._nodes[0]] = [this._nodes[0], item];
            this._siftup(0);
        }
        return item;
    }

    _siftup(pos) {
        const endpos = this._nodes.length;
        const startpos = pos;
        const newitem = this._nodes[pos];
        let childpos = (pos << 1) + 1;
        while (childpos < endpos) {
            const rightpos = childpos + 1;
            if (rightpos < endpos && this._priority(this._nodes[childpos], this._nodes[rightpos]) <= 0) {
                childpos = rightpos;
            }
            this._nodes[pos] = this._nodes[childpos];
            pos = childpos;
            childpos = (pos << 1) + 1;
        }
        this._nodes[pos] = newitem;
        return this._siftdown(startpos, pos);
    }

    _siftdown(startpos, pos) {
        const newitem = this._nodes[pos];
        while (pos > startpos) {
            const parentpos = (pos - 1) >> 1;
            const parent = this._nodes[parentpos];
            if (this._priority(newitem, parent) > 0) {
                this._nodes[pos] = parent;
                pos = parentpos;
                continue;
            }
            break;
        }
        return this._nodes[pos] = newitem;
    }

    /**
     * Converts the queue to an array, it works with a clone of the queue, so the original queue is untouched
     *
     * @returns {any[]}
     */
    toArray() {
        const h = this.clone();
        const f = [];
        while (!h.empty) {
            f.push(h.pop());
        }
        return f;
    }

    /**
     * Creates a queue object from the given iterable
     *
     * @returns {PriorityQueue}
     */
    static from(iterable, options) {
        const h = new this(options);
        for (const i of iterable) {
            h.push(i);
        }
        return h;
    }
}
