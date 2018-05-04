import { isRef, push as pushRef } from "./ref";

const {
    is
} = adone;

const extendedCheckForValue = function (value, insensitive) {
    const valueType = typeof value;

    if (valueType === "object") {
        if (value instanceof Date) {
            return (item) => {
                return item instanceof Date && value.getTime() === item.getTime();
            };
        }
        if (is.buffer(value)) {
            return (item) => {

                return is.buffer(item) && value.length === item.length && value.toString("binary") === item.toString("binary");
            };
        }
    } else if (insensitive && valueType === "string") {
        const lowercaseValue = value.toLowerCase();
        return (item) => {
            return is.string(item) && lowercaseValue === item.toLowerCase();
        };
    }

    return null;
};

export default class ModelSet {
    constructor(from) {
        this._set = new Set(from);
        this._hasRef = false;
    }

    add(value, refs) {
        const isRef_ = isRef(value);
        if (!isRef_ && this.has(value, null, null, false)) {

            return this;
        }

        if (!is.undefined(refs)) { // If it's a merge, we don't have any refs
            pushRef(refs, value);
        }

        this._set.add(value);

        this._hasRef |= isRef_;

        return this;
    }

    merge(add, remove) {
        for (const item of add._set) {
            this.add(item);
        }

        for (const item of remove._set) {
            this.remove(item);
        }

        return this;
    }

    remove(value) {
        this._set.delete(value);
        return this;
    }

    has(value, state, options, insensitive) {
        if (!this._set.size) {
            return false;
        }

        const hasValue = this._set.has(value);
        if (hasValue) {
            return hasValue;
        }

        const extendedCheck = extendedCheckForValue(value, insensitive);
        if (!extendedCheck) {
            if (state && this._hasRef) {
                for (let item of this._set) {
                    if (isRef(item)) {
                        item = item(state.reference || state.parent, options);
                        if (value === item || (is.array(item) && item.includes(value))) {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        return this._has(value, state, options, extendedCheck);
    }

    _has(value, state, options, check) {

        const checkRef = Boolean(state && this._hasRef);

        const isReallyEqual = function (item) {

            if (value === item) {
                return true;
            }

            return check(item);
        };

        for (let item of this._set) {
            if (checkRef && isRef(item)) { // Only resolve references if there is a state, otherwise it's a merge
                item = item(state.reference || state.parent, options);

                if (is.array(item)) {
                    if (item.find(isReallyEqual)) {
                        return true;
                    }
                    continue;
                }
            }

            if (isReallyEqual(item)) {
                return true;
            }
        }

        return false;
    }

    values(options) {
        if (options && options.stripUndefined) {
            const values = [];

            for (const item of this._set) {
                if (!is.undefined(item)) {
                    values.push(item);
                }
            }

            return values;
        }

        return Array.from(this._set);
    }

    slice() {
        const set = new ModelSet(this._set);
        set._hasRef = this._hasRef;
        return set;
    }

    concat(source) {
        const set = new ModelSet([...this._set, ...source._set]);
        set._hasRef = Boolean(this._hasRef | source._hasRef);
        return set;
    }
}
