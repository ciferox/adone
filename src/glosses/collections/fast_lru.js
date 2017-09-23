const { collection } = adone;

/**
 * Represents a faster LRU cache but with less functionality
 */
export default class FastLRU {
    /**
     * @param {number} size Cache size, unlimited by default
     */
    constructor(size, { dispose = null } = {}) {
        this.queue = new collection.LinkedList(size);
        this.cache = new Map();
        this.dispose = dispose;
    }

    /**
     * The actual size of the cache
     *
     * @returns {number}
     */
    get size() {
        return this.queue.length;
    }

    /**
     * Gets the value by the given key
     *
     * @returns {any}
     */
    get(key) {
        if (!this.cache.has(key)) {
            return;
        }
        const node = this.cache.get(key);
        this.queue.unshiftNode(node);
        return node.value[1];
    }

    /**
     * Sets a new value for the given key
     *
     * @returns {void}
     */
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

    /**
     * Deletes the given key from the cache
     *
     * @returns {boolean} Whether the key was deleted
     */
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

    /**
     * Checks whether the cache has an element with the given key
     *
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Returns the keys iterator
     */
    keys() {
        return this.cache.keys();
    }

    /**
     * Returns the values iterator
     */
    values() {
        return this.cache.values();
    }

    /**
     * Clears the cache
     */
    clear() {
        this.queue.clear(true);
        this.cache.clear();
    }
}
