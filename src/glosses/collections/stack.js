

export default class {
    constructor(iterable) {
        this.head = null;
        this.length = 0;

        if (iterable) {
            this.extend(iterable);
        }
    }

    extend(iterable) {
        for (const v of iterable) {
            this.push(v);
        }
    }

    get empty() {
        return this.length === 0;
    }

    get top() {
        if (!this.head) {
            return;
        }
        return this.head.data;
    }

    push(v) {
        this.head = { next: this.head, data: v };
        return ++this.length;
    }

    pop() {
        if (!this.head) {
            return;
        }
        const value = this.head.data;
        this.head = this.head.next;
        --this.length;
        return value;
    }

    *[Symbol.iterator]() {
        let t = this.head;
        while (t) {
            yield t.data;
            t = t.next;
        }
    }
}
