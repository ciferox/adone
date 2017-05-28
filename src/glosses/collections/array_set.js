const { x } = adone;

export default class ArraySet {
    constructor() {
        this._array = [];
        this._map = new Map();
    }

    static fromArray(other, allowDuplicates) {
        const set = new ArraySet();
        for (let i = 0, n = other.length; i < n; ++i) {
            set.add(other[i], allowDuplicates);
        }
        return set;
    }

    size() {
        return this._map.size;
    }

    add(value, aAllowDuplicates = false) {
        const isDuplicate = this._map.has(value);
        const idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
            this._array.push(value);
        }
        if (!isDuplicate) {
            this._map.set(value, idx);
        }
    }

    has(value) {
        return this._map.has(value);
    }

    indexOf(value) {
        if (!this._map.has(value)) {
            throw new x.Unknown(`"${value} is not in the set.`);
        }
        return this._map.get(value);
    }

    at(idx) {
        if (idx >= 0 && idx < this._array.length) {
            return this._array[idx];
        }
        throw new x.Unknown(`No element indexed by ${idx}`);
    }

    toArray() {
        return this._array.slice();
    }
}
