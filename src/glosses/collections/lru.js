export default class LRU {
    constructor(size, { dispose = null } = {}) {
        this.queue = new adone.collection.LinkedList(size);
        this.cache = new Map();
        this.dispose = dispose;
    }

    get size() {
        return this.queue.length;
    }

    get(key) {
        if (!this.cache.has(key)) {
            return;
        }
        const node = this.cache.get(key);
        this.queue.unshiftNode(node);
        return node.value[1];
    }

    set(key, value) {
        if (!this.cache.has(key)) {
            if (this.queue.full) {
                const [key, value] = this.queue.pop();
                this.cache.delete(key);
                if (this.dispose) {
                    this.dispose(key, value);
                }
            }
            const node = this.queue.unshift([key, value]);
            this.cache.set(key, node);
        } else {
            const node = this.cache.get(key);
            node.value[1] = value;
            this.queue.unshiftNode(node);
        }
    }

    delete(key) {
        if (this.cache.has(key)) {
            const node = this.cache.get(key);
            this.cache.delete(key);
            const { value } = node;
            this.queue.removeNode(node);
            if (this.dispose) {
                this.dispose(value[0], value[1]);
            }
            return true;
        }
        return false;
    }

    has(key) {
        return this.cache.has(key);
    }

    keys() {
        return [...this.cache.keys()];
    }

    clear() {
        this.queue.clear({ strong: true });
        this.cache.clear();
    }
}
