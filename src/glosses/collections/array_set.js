const { x } = adone;

/**
 * Respresetns a data structure which is a combination of an array and a set.
 * Adding a new member is O(1), testing for membership is O(1),
 * and finding the index of an element is O(1).
 */
export default class ArraySet {
    constructor() {
        this._array = [];
        this._map = new Map();
    }

    /**
     * The number of unique items in this ArraySet.
     * If duplicates have been added, than those do not count towards the size.
     *
     * @returns {number}
     */
    get length() {
        return this._map.size;
    }

    /**
     * Adds the given value to this set
     *
     * @param {string} value
     * @param {boolean} [allowDuplicates = false] Whether to allow duplicates in the set
     */
    add(value, allowDuplicates = false) {
        const isDuplicate = this._map.has(value);
        const idx = this._array.length;
        if (!isDuplicate || allowDuplicates) {
            this._array.push(value);
        }
        if (!isDuplicate) {
            this._map.set(value, idx);
        }
        return this;
    }

    /**
     * Checks whether the given value is a member of the set
     *
     * @param {string} value
     * @returns {boolean}
     */
    has(value) {
        return this._map.has(value);
    }

    /**
     * Returns the index of the given element
     *
     * @param {string} value
     * @returns {any}
     */
    indexOf(value) {
        if (!this._map.has(value)) {
            return -1;
        }
        return this._map.get(value);
    }

    /**
     * Returns an element at the given index
     * @param {number} idx
     * @returns {any}
     */
    at(idx) {
        if (idx >= 0 && idx < this._array.length) {
            return this._array[idx];
        }
        throw new x.Unknown(`No element indexed by ${idx}`);
    }

    /**
     * Converts the set into an array
     *
     * @returns {any[]}
     */
    toArray() {
        return this._array.slice();
    }

    /**
     * Creates an ArraySet from the given iterable object
     *
     * @returns {ArraySet}
     */
    static from(iterable, allowDuplicates) {
        const set = new ArraySet();
        for (const i of iterable) {
            set.add(i, allowDuplicates);
        }
        return set;
    }
}
