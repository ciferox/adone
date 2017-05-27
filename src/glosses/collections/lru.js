const { is, std: { util } } = adone;

// use symbols if possible, otherwise just _props
const symbols = {};
const makeSymbol = (key) => Symbol.for(key);

const priv = function (obj, key, val) {
    let sym;
    if (symbols[key]) {
        sym = symbols[key];
    } else {
        sym = makeSymbol(key);
        symbols[key] = sym;
    }
    if (arguments.length === 2) {
        return obj[sym];
    }
    obj[sym] = val;
    return val;
};

const naiveLength = () => 1;

const isStale = (self, hit) => {
    if (!hit || (!hit.maxAge && !priv(self, "maxAge"))) {
        return false;
    }
    let stale = false;
    const diff = Date.now() - hit.now;
    if (hit.maxAge) {
        stale = diff > hit.maxAge;
    } else {
        stale = priv(self, "maxAge") && (diff > priv(self, "maxAge"));
    }
    return stale;
};

const del = (self, node) => {
    if (node) {
        const hit = node.value;
        if (priv(self, "dispose")) {
            priv(self, "dispose").call(this, hit.key, hit.value);
        }
        priv(self, "length", priv(self, "length") - hit.length);
        priv(self, "cache").delete(hit.key);
        priv(self, "lruList").removeNode(node);
    }
};

const forEachStep = (self, fn, node, thisp) => {
    let hit = node.value;
    if (isStale(self, hit)) {
        del(self, node);
        if (!priv(self, "allowStale")) {
            hit = undefined;
        }
    }
    if (hit) {
        fn.call(thisp, hit.value, hit.key, self);
    }
};

const get = (self, key, doUse) => {
    const node = priv(self, "cache").get(key);
    let hit;
    if (node) {
        hit = node.value;
        if (isStale(self, hit)) {
            del(self, node);
            if (!priv(self, "allowStale")) {
                hit = undefined;
            }
        } else {
            if (doUse) {
                priv(self, "lruList").unshiftNode(node);
            }
        }
        if (hit) {
            hit = hit.value
                ;
        }
    }
    return hit;
};

const trim = (self) => {
    if (priv(self, "length") > priv(self, "max")) {
        for (let walker = priv(self, "lruList").tail;
            priv(self, "length") > priv(self, "max") && !is.null(walker);) {
            // We know that we're about to delete this one, and also
            // what the next least recently used key will be, so just
            // go ahead and set it now.
            const prev = walker.prev;
            del(self, walker);
            walker = prev;
        }
    }
};

// classy, since V8 prefers predictable objects.
class Entry {
    constructor(key, value, length, now, maxAge) {
        this.key = key;
        this.value = value;
        this.length = length;
        this.now = now;
        this.maxAge = maxAge || 0;
    }
}


// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
export default class LRU {
    constructor(options) {
        if (is.number(options)) {
            options = { max: options };
        }

        if (!is.object(options)) {
            options = {};
        }

        const max = priv(this, "max", options.max);
        // Kind of weird to have a default max of Infinity, but oh well.
        if (!max || !(is.number(max)) || max <= 0) {
            priv(this, "max", Infinity);
        }

        let lc = options.length || naiveLength;
        if (!is.function(lc)) {
            lc = naiveLength;
        }
        priv(this, "lengthCalculator", lc);

        priv(this, "allowStale", options.stale || false);
        priv(this, "maxAge", options.maxAge || 0);
        priv(this, "dispose", options.dispose);
        this.reset();
    }

    // resize the cache when the max changes.
    set max(mL) {
        if (!mL || !(is.number(mL)) || mL <= 0) {
            mL = Infinity;
        }
        priv(this, "max", mL);
        trim(this);
    }

    get max() {
        return priv(this, "max");
    }

    set allowStale(allowStale) {
        priv(this, "allowStale", Boolean(allowStale));
    }

    get allowStale() {
        return priv(this, "allowStale");
    }

    set maxAge(mA) {
        if (!mA || !(is.number(mA)) || mA < 0) {
            mA = 0;
        }
        priv(this, "maxAge", mA);
        trim(this);
    }

    get maxAge() {
        return priv(this, "maxAge");
    }

    // resize the cache when the lengthCalculator changes.
    set lengthCalculator(lC) {
        if (!is.function(lC)) {
            lC = naiveLength;
        }
        if (lC !== priv(this, "lengthCalculator")) {
            priv(this, "lengthCalculator", lC);
            priv(this, "length", 0);
            for (const hit of priv(this, "lruList")) {
                hit.length = priv(this, "lengthCalculator").call(this, hit.value, hit.key);
                priv(this, "length", priv(this, "length") + hit.length);
            }
        }
        trim(this);
    }

    get lengthCalculator() {
        return priv(this, "lengthCalculator");
    }

    get length() {
        return priv(this, "length");
    }

    get itemCount() {
        return priv(this, "lruList").length;
    }

    rforEach(fn, thisp) {
        thisp = thisp || this;
        const length = priv(this, "lruList").length;

        for (let walker = priv(this, "lruList").tail, i = 0; i < length; i++) {
            const prev = walker.prev;
            forEachStep(this, fn, walker, thisp);
            walker = prev;
        }
    }

    forEach(fn, thisp) {
        thisp = thisp || this;
        const length = priv(this, "lruList").length;

        for (let walker = priv(this, "lruList").head, i = 0; i < length; i++) {
            const next = walker.next;
            forEachStep(this, fn, walker, thisp);
            walker = next;
        }
    }

    keys() {
        return priv(this, "lruList").toArray().map((k) => {
            return k.key;
        }, this);
    }

    values() {
        return priv(this, "lruList").toArray().map((k) => {
            return k.value;
        }, this);
    }

    reset() {
        if (priv(this, "dispose") && priv(this, "lruList") && priv(this, "lruList").length) {
            for (const hit of priv(this, "lruList")) {
                priv(this, "dispose").call(this, hit.key, hit.value);
            }
        }

        priv(this, "cache", new Map()); // hash of items by key
        priv(this, "lruList", new adone.collection.LinkedList()); // list of items in order of use recency
        priv(this, "length", 0); // length of items in the list
    }

    dump() {
        return priv(this, "lruList").map((hit) => {
            if (!isStale(this, hit)) {
                return {
                    k: hit.key,
                    v: hit.value,
                    e: hit.now + (hit.maxAge || 0)
                };
            }
            return undefined;
        }).toArray().filter((h) => h);
    }

    dumpLru() {
        return priv(this, "lruList");
    }

    inspect(n, opts) {
        let str = "LRUCache {";
        let extras = false;

        const as = priv(this, "allowStale");
        if (as) {
            str += "\n  allowStale: true";
            extras = true;
        }

        const max = priv(this, "max");
        if (max && max !== Infinity) {
            if (extras) {
                str += ",";
            }
            str += `\n  max: ${util.inspect(max, opts)}`;
            extras = true;
        }

        const maxAge = priv(this, "maxAge");
        if (maxAge) {
            if (extras) {
                str += ",";
            }
            str += `\n  maxAge: ${util.inspect(maxAge, opts)}`;
            extras = true;
        }

        const lc = priv(this, "lengthCalculator");
        if (lc && lc !== naiveLength) {
            if (extras) {
                str += ",";
            }
            str += `\n  length: ${util.inspect(priv(this, "length"), opts)}`;
            extras = true;
        }

        let didFirst = false;
        for (const item of priv(this, "lruList")) {
            if (didFirst) {
                str += ",\n  ";
            } else {
                if (extras) {
                    str += ",\n";
                }
                didFirst = true;
                str += "\n  ";
            }
            const key = util.inspect(item.key).split("\n").join("\n  ");
            let val = { value: item.value };
            if (item.maxAge !== maxAge) {
                val.maxAge = item.maxAge;
            }
            if (lc !== naiveLength) {
                val.length = item.length;
            }
            if (isStale(this, item)) {
                val.stale = true;
            }

            val = util.inspect(val, opts).split("\n").join("\n  ");
            str += `${key} => ${val}`;
        }

        if (didFirst || extras) {
            str += "\n";
        }
        str += "}";

        return str;
    }

    set(key, value, maxAge) {
        maxAge = maxAge || priv(this, "maxAge");

        const now = maxAge ? Date.now() : 0;
        const len = priv(this, "lengthCalculator").call(this, value, key);

        if (priv(this, "cache").has(key)) {
            if (len > priv(this, "max")) {
                del(this, priv(this, "cache").get(key));
                return false;
            }

            const node = priv(this, "cache").get(key);
            const item = node.value;

            // dispose of the old one before overwriting
            if (priv(this, "dispose")) {
                priv(this, "dispose").call(this, key, item.value);
            }

            item.now = now;
            item.maxAge = maxAge;
            item.value = value;
            priv(this, "length", priv(this, "length") + (len - item.length));
            item.length = len;
            this.get(key);
            trim(this);
            return true;
        }

        const hit = new Entry(key, value, len, now, maxAge);

        // oversized objects fall out of cache automatically.
        if (hit.length > priv(this, "max")) {
            if (priv(this, "dispose")) {
                priv(this, "dispose").call(this, key, value);
            }
            return false;
        }

        priv(this, "length", priv(this, "length") + hit.length);
        priv(this, "lruList").unshift(hit);
        priv(this, "cache").set(key, priv(this, "lruList").head);
        trim(this);
        return true;
    }

    has(key) {
        if (!priv(this, "cache").has(key)) {
            return false
                ;
        }
        const hit = priv(this, "cache").get(key).value;
        if (isStale(this, hit)) {
            return false;
        }
        return true;
    }

    get(key) {
        return get(this, key, true);
    }

    peek(key) {
        return get(this, key, false);
    }

    pop() {
        if (priv(this, "lruList").empty) {
            return null;
        }
        const node = priv(this, "lruList").tail;
        del(this, node);
        return node.value;
    }

    del(key) {
        del(this, priv(this, "cache").get(key));
    }

    load(arr) {
        // reset the cache
        this.reset();

        const now = Date.now();
        // A previous serialized cache has the most recent items first
        for (let l = arr.length - 1; l >= 0; l--) {
            const hit = arr[l];
            const expiresAt = hit.e || 0;
            if (expiresAt === 0) {
                // the item was created without expiration in a non aged cache
                this.set(hit.k, hit.v);
            } else {
                const maxAge = expiresAt - now;
                // dont add already expired items
                if (maxAge > 0) {
                    this.set(hit.k, hit.v, maxAge);
                }
            }
        }
    }

    prune() {
        const self = this;
        priv(this, "cache").forEach((value, key) => {
            get(self, key, false);
        });
    }
}
