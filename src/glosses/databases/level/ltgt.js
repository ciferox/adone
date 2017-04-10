const { is } = adone;

export const compare = (a, b) => {
    if (is.buffer(a)) {
        const l = Math.min(a.length, b.length);
        for (let i = 0; i < l; i++) {
            const cmp = a[i] - b[i];
            if (cmp) {
                return cmp;
            }
        }
        return a.length - b.length;
    }
    return a < b ? -1 : a > b ? 1 : 0;
};

const isDef = (val) => val !== undefined && val !== "";
const hasKey = (range, name) => is.propertyOwned(range, name) && name;

export const lowerBoundKey = (range) => {
    return (hasKey(range, "gt") || hasKey(range, "gte") || hasKey(range, "min") || (range.reverse ? hasKey(range, "end") : hasKey(range, "start")) || undefined);
};

export const lowerBound = (range) => {
    const k = lowerBoundKey(range);
    return k && range[k];
};

export const lowerBoundInclusive = (range) => (is.propertyOwned(range, "gt") ? false : true);

export const upperBoundInclusive = (range) => {
    return (is.propertyOwned(range, "lt") /*&& !range.maxEx*/) ? false : true;
};

export const lowerBoundExclusive = (range) => !lowerBoundInclusive(range);

export const upperBoundExclusive = (range) => !upperBoundInclusive(range);

export const upperBoundKey = (range) => (hasKey(range, "lt") || hasKey(range, "lte") || hasKey(range, "max") || (range.reverse ? hasKey(range, "start") : hasKey(range, "end")) || undefined);

export const upperBound = (range) => {
    const k = upperBoundKey(range);
    return k && range[k];
};

export const toLtgt = (range, _range, map, lower, upper) => {
    _range = _range || {};
    map = map || adone.identity;
    const defaults = arguments.length > 3;
    const lb = lowerBoundKey(range);
    const ub = upperBoundKey(range);
    if (lb) {
        if (lb === "gt") {
            _range.gt = map(range.gt, false);
        } else {
            _range.gte = map(range[lb], false);
        }
    } else if (defaults) {
        _range.gte = map(lower, false);
    }

    if (ub) {
        if (ub === "lt") {
            _range.lt = map(range.lt, true);
        } else {
            _range.lte = map(range[ub], true);
        }
    } else if (defaults) {
        _range.lte = map(upper, true);
    }

    if (range.reverse != null) {
        _range.reverse = Boolean(range.reverse);
    }

    if (is.propertyOwned(_range, "max")) {
        delete _range.max;
    }
    if (is.propertyOwned(_range, "min")) {
        delete _range.min;
    }
    if (is.propertyOwned(_range, "start")) {
        delete _range.start;
    }
    if (is.propertyOwned(_range, "end")) {
        delete _range.end;
    }

    return _range;
};

export const contains = (range, key, compare) => {
    compare = compare || exports.compare;

    const lb = lowerBound(range);
    if (isDef(lb)) {
        const cmp = compare(key, lb);
        if (cmp < 0 || (cmp === 0 && lowerBoundExclusive(range))) {
            return false;
        }
    }

    const ub = upperBound(range);
    if (isDef(ub)) {
        const cmp = compare(key, ub);
        if (cmp > 0 || (cmp === 0) && upperBoundExclusive(range)) {
            return false;
        }
    }

    return true;
};

export const filter = (range, compare) => (key) => exports.contains(range, key, compare);
