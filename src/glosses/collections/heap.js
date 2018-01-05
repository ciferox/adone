const {
    is
} = adone;

const floor = Math.floor;
const min = Math.min;


/**
 * Default comparison function to be used
 */
const defaultCmp = function (x, y) {
    if (x < y) {
        return -1;
    }
    if (x > y) {
        return 1;
    }
    return 0;
};

const _siftdown = function (array, startpos, pos, cmp) {
    let parent;
    let parentpos;
    if (is.nil(cmp)) {
        cmp = defaultCmp;
    }
    const newitem = array[pos];
    while (pos > startpos) {
        parentpos = (pos - 1) >> 1;
        parent = array[parentpos];
        if (cmp(newitem, parent) < 0) {
            array[pos] = parent;
            pos = parentpos;
            continue;
        }
        break;
    }
    return array[pos] = newitem;
};

const _siftup = function (array, pos, cmp) {
    let childpos;
    let rightpos;
    if (is.nil(cmp)) {
        cmp = defaultCmp;
    }
    const endpos = array.length;
    const startpos = pos;
    const newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
        rightpos = childpos + 1;
        if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
            childpos = rightpos;
        }
        array[pos] = array[childpos];
        pos = childpos;
        childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
};


/**
 * Insert item x in list a, and keep it sorted assuming a is sorted.
 *
 * If x is already in a, insert it to the right of the rightmost x.
 *
 * Optional args lo (default 0) and hi (default a.length) bound the slice
 * of a to be searched.
 */
const insort = function (a, x, lo, hi, cmp) {
    let mid;
    if (is.nil(lo)) {
        lo = 0;
    }
    if (is.nil(cmp)) {
        cmp = defaultCmp;
    }
    if (lo < 0) {
        throw new Error("lo must be non-negative");
    }
    if (is.nil(hi)) {
        hi = a.length;
    }
    while (lo < hi) {
        mid = floor((lo + hi) / 2);
        if (cmp(x, a[mid]) < 0) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
};

export default class Heap {
    constructor(cmp) {
        this.cmp = !is.nil(cmp) ? cmp : defaultCmp;
        this.nodes = [];
    }


    /**
     * Push item onto heap, maintaining the heap invariant.
     */
    push(x) {
        if (is.nil(this.cmp)) {
            this.cmp = defaultCmp;
        }
        this.nodes.push(x);
        return _siftdown(this.nodes, 0, this.nodes.length - 1, this.cmp);
    }

    pop() {
        return Heap.heappop(this.nodes, this.cmp);
    }

    peek() {
        return this.nodes[0];
    }

    contains(x) {
        return this.nodes.includes(x);
    }


    /**
     * Pop and return the current smallest value, and add the new item.
     *
     * This is more efficient than heappop() followed by heappush(), and can be
     * more appropriate when using a fixed size heap. Note that the value
     * returned may be larger than item! That constrains reasonable use of
     * this routine unless written as part of a conditional replacement:
     * if item > array[0]
     * item = heapreplace(array, item)
     */
    replace(x) {
        if (is.nil(this.cmp)) {
            this.cmp = defaultCmp;
        }
        const returnitem = this.nodes[0];
        this.nodes[0] = x;
        _siftup(this.nodes, 0, this.cmp);
        return returnitem;
    }

    pushpop(x) {
        return Heap.pushpop(this.nodes, x, this.cmp);
    }

    heapify() {
        return Heap.heapify(this.nodes, this.cmp);
    }

    /**
     * Update the position of the given item in the heap.
     * This function should be called every time the item is being modified.
     */
    updateItem(x) {
        if (is.nil(this.cmp)) {
            this.cmp = defaultCmp;
        }
        const pos = this.nodes.indexOf(x);
        if (pos === -1) {
            return;
        }
        _siftdown(this.nodes, 0, pos, this.cmp);
        return _siftup(this.nodes, pos, this.cmp);
    }

    clear() {
        return this.nodes = [];
    }

    empty() {
        return this.nodes.length === 0;
    }

    size() {
        return this.nodes.length;
    }

    clone() {
        const heap = new Heap();
        heap.nodes = this.nodes.slice(0);
        return heap;
    }

    toArray() {
        return this.nodes.slice(0);
    }

    /**
     * Find the n largest elements in a dataset.
     */
    static nlargest(array, n, cmp) {
        let elem;
        let _i;
        let _len;

        if (is.nil(cmp)) {
            cmp = defaultCmp;
        }
        const result = array.slice(0, n);
        if (!result.length) {
            return result;
        }
        Heap.heapify(result, cmp);
        const _ref = array.slice(n);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            elem = _ref[_i];
            Heap.pushpop(result, elem, cmp);
        }
        return result.sort(cmp).reverse();
    }

    /**
     * Find the n smallest elements in a dataset.
     */
    static nsmallest(array, n, cmp) {
        let elem;
        let los;
        let result;
        let _i;
        let _j;
        let _len;
        let _ref;
        let _ref1;

        if (is.nil(cmp)) {
            cmp = defaultCmp;
        }
        if (n * 10 <= array.length) {
            result = array.slice(0, n).sort(cmp);
            if (!result.length) {
                return result;
            }
            los = result[result.length - 1];
            _ref = array.slice(n);
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                elem = _ref[_i];
                if (cmp(elem, los) < 0) {
                    insort(result, elem, 0, null, cmp);
                    result.pop();
                    los = result[result.length - 1];
                }
            }
            return result;
        }
        Heap.heapify(array, cmp);
        const _results = [];
        for (_j = 0, _ref1 = min(n, array.length); _ref1 >= 0 ? _j < _ref1 : _j > _ref1; _ref1 >= 0 ? ++_j : --_j) {
            _results.push(Heap.heappop(array, cmp));
        }
        return _results;
    }

    /**
     * Pop the smallest item off the heap, maintaining the heap invariant.
     */
    static heappop(array, cmp) {
        let returnitem;
        if (is.nil(cmp)) {
            cmp = defaultCmp;
        }
        const lastelt = array.pop();
        if (array.length) {
            returnitem = array[0];
            array[0] = lastelt;
            _siftup(array, 0, cmp);
        } else {
            returnitem = lastelt;
        }
        return returnitem;
    }

    /**
     * Fast version of a heappush followed by a heappop.
     */
    static pushpop(array, item, cmp) {
        let _ref;
        if (is.nil(cmp)) {
            cmp = defaultCmp;
        }
        if (array.length && cmp(array[0], item) < 0) {
            _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
            _siftup(array, 0, cmp);
        }
        return item;
    }

    /**
     * Transform list into a heap, in-place, in O(array.length) time.
     */
    static heapify(array, cmp) {
        let i;
        let _i;
        let _len;
        let _results1;

        if (is.nil(cmp)) {
            cmp = defaultCmp;
        }
        const _ref1 = (function () {
            _results1 = [];
            for (let _j = 0, _ref = floor(array.length / 2); _ref >= 0 ? _j < _ref : _j > _ref; _ref >= 0 ? _j++ : _j--) {
                _results1.push(_j);
            }
            return _results1;
        }).apply(this).reverse();
        const _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            i = _ref1[_i];
            _results.push(_siftup(array, i, cmp));
        }
        return _results;
    }
}
Heap.prototype.insert = Heap.prototype.push;
Heap.prototype.top = Heap.prototype.peek;
Heap.prototype.front = Heap.prototype.peek;
Heap.prototype.has = Heap.prototype.contains;
Heap.prototype.copy = Heap.prototype.clone;

