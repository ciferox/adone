const defaultComparator = (a, b) => {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }
    return 0;
};

export default class Heap {
    constructor({ compare = defaultComparator, priority = compare } = {}) {
        this.nodes = [];
        this.priority = priority;
        this.compare = compare;
    }

    get length() {
        return this.nodes.length;
    }

    push(a) {
        this.nodes.push(a);
        this._siftdown(0, this.nodes.length - 1);
    }

    pop() {
        const lastelt = this.nodes.pop();
        if (this.nodes.length !== 0) {
            const returnitem = this.nodes[0];
            this.nodes[0] = lastelt;
            this._siftup(0);
            return returnitem;
        }
        return lastelt;
    }


    delete(item) {
        // ...
        for (let i = 0; i < this.nodes.length; ++i) {
            if (this.compare(item, this.nodes[i]) === 0) {
                this.nodes[i] = this.nodes.pop();
                this._siftup(i);
                break;
            }
        }
    }

    replace(item) {
        const toReturn = this.nodes[0];
        this.nodes[0] = item;
        this._siftup(0);
        return toReturn;
    }

    pushpop(item) {
        if (this.nodes.length && this.priority(this.nodes[0], item) < 0) {
            [item, this.nodes[0]] = [this.nodes[0], item];
            this._siftup(0);
        }
        return item;
    }

    _siftup(pos) {
        const endpos = this.nodes.length;
        const startpos = pos;
        const newitem = this.nodes[pos];
        let childpos = (pos << 1) + 1;
        while (childpos < endpos) {
            const rightpos = childpos + 1;
            if (rightpos < endpos && this.priority(this.nodes[childpos], this.nodes[rightpos]) >= 0) {
                childpos = rightpos;
            }
            this.nodes[pos] = this.nodes[childpos];
            pos = childpos;
            childpos = (pos << 1) + 1;
        }
        this.nodes[pos] = newitem;
        return this._siftdown(startpos, pos);
    }

    _siftdown(startpos, pos) {
        const newitem = this.nodes[pos];
        while (pos > startpos) {
            const parentpos = (pos - 1) >> 1;
            const parent = this.nodes[parentpos];
            if (this.priority(newitem, parent) < 0) {
                this.nodes[pos] = parent;
                pos = parentpos;
                continue;
            }
            break;
        }
        return this.nodes[pos] = newitem;
    }

    static from(iterable, cmp = defaultComparator) {
        const h = new this.constructor(cmp);
        for (const i of iterable) {
            h.push(i);
        }
        return h;
    }
}
