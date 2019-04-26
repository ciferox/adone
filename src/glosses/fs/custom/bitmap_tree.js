/* eslint-disable func-style */

/**
 * The number of bits of a word
 * @const
 * @type number
 */
const WORD_LENGTH = 32;

/**
 * The log base 2 of WORD_LENGTH
 * @const
 * @type number
 */
const WORD_LOG = 5;

/**
 * Calculates the number of set bits
 *
 * @param {number} v
 * @returns {number}
 */
function popCount(v) {

    // Warren, H. (2009). Hacker`s Delight. New York, NY: Addison-Wesley

    v -= ((v >>> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    return (((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24);
}

/**
 * Divide a number in base two by B
 *
 * @param {Array} arr
 * @param {number} B
 * @returns {number}
 */
function divide(arr, B) {

    let r = 0;

    for (let i = 0; i < arr.length; i++) {
        r *= 2;
        const d = (arr[i] + r) / B | 0;
        r = (arr[i] + r) % B;
        arr[i] = d;
    }
    return r;
}

/**
 * Parses the parameters and set variable P
 *
 * @param {Object} P
 * @param {string|BitSet|Array|Uint8Array|number=} val
 */
function parse(P, val) {

    if (val == null) {
        P.data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        P._ = 0;
        return;
    }

    if (val instanceof BitSet) {
        P.data = val.data;
        P._ = val._;
        return;
    }

    switch (typeof val) {

        case "number":
            P.data = [val | 0];
            P._ = 0;
            break;

        case "string": {

            let base = 2;
            let len = WORD_LENGTH;

            if (val.indexOf("0b") === 0) {
                val = val.substr(2);
            } else if (val.indexOf("0x") === 0) {
                val = val.substr(2);
                base = 16;
                len = 8;
            }

            P.data = [];
            P._ = 0;

            let a = val.length - len;
            let b = val.length;

            do {

                const num = parseInt(val.slice(a > 0 ? a : 0, b), base);

                if (isNaN(num)) {
                    throw SyntaxError("Invalid param");
                }

                P.data.push(num | 0);

                if (a <= 0) {
                    break;
                }

                a -= len;
                b -= len;
            } while (1);

            break;
        }
        default: {
            P.data = [0];
            const data = P.data;

            if (val instanceof Array) {

                for (let i = val.length - 1; i >= 0; i--) {

                    const ndx = val[i];

                    if (ndx === Infinity) {
                        P._ = -1;
                    } else {
                        scale(P, ndx);
                        data[ndx >>> WORD_LOG] |= 1 << ndx;
                    }
                }
                break;
            }

            if (Uint8Array && val instanceof Uint8Array) {

                const bits = 8;

                scale(P, val.length * bits);

                for (let i = 0; i < val.length; i++) {

                    const n = val[i];

                    for (let j = 0; j < bits; j++) {

                        const k = i * bits + j;

                        data[k >>> WORD_LOG] |= (n >> j & 1) << k;
                    }
                }
                break;
            }
            throw new SyntaxError("Invalid param");
        }
    }
}

/**
 * Module entry point
 *
 * @constructor
 * @param {string|BitSet|number=} param
 * @returns {BitSet}
 */
function BitSet(param) {

    if (!(this instanceof BitSet)) {
        return new BitSet(param);
    }
    parse(this, param);
    this.data = this.data.slice();
}

function scale(dst, ndx) {

    let l = ndx >>> WORD_LOG;
    const d = dst.data;
    const v = dst._;

    for (let i = d.length; l >= i; l--) {
        d.push(v);
    }
}

const P = {
    data: [], // Holds the actual bits in form of a 32bit integer array.
    _: 0 // Holds the MSB flag information to make indefinitely large bitsets inversion-proof
};

BitSet.prototype = {
    data: [],
    _: 0,
    /**
     * Set a single bit flag
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * bs1.set(3, 1);
     *
     * @param {number} ndx The index of the bit to be set
     * @param {number=} value Optional value that should be set on the index (0 or 1)
     * @returns {BitSet} this
     */
    set(ndx, value) {

        ndx |= 0;

        scale(this, ndx);

        if (value === undefined || value) {
            this.data[ndx >>> WORD_LOG] |= (1 << ndx);
        } else {
            this.data[ndx >>> WORD_LOG] &= ~(1 << ndx);
        }
        return this;
    },
    /**
     * Get a single bit flag of a certain bit position
     *
     * Ex:
     * bs1 = new BitSet();
     * var isValid = bs1.get(12);
     *
     * @param {number} ndx the index to be fetched
     * @returns {number} The binary flag
     */
    get(ndx) {

        ndx |= 0;

        const d = this.data;
        const n = ndx >>> WORD_LOG;

        if (n >= d.length) {
            return this._ & 1;
        }
        return (d[n] >>> ndx) & 1;
    },
    /**
     * Creates the bitwise NOT of a set.
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * res = bs1.not();
     *
     * @returns {BitSet} A new BitSet object, containing the bitwise NOT of this
     */
    not() { // invert()

        const t = this.clone();
        const d = t.data;
        for (let i = 0; i < d.length; i++) {
            d[i] = ~d[i];
        }

        t._ = ~t._;

        return t;
    },
    /**
     * Creates the bitwise AND of two sets.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * res = bs1.and(bs2);
     *
     * @param {BitSet} value A bitset object
     * @returns {BitSet} A new BitSet object, containing the bitwise AND of this and value
     */
    and(value) { // intersection

        parse(P, value);

        const T = this.clone();
        const t = T.data;
        const p = P.data;

        const pl = p.length;
        const p_ = P._;
        const t_ = T._;

        // If this is infinite, we need all bits from P
        if (t_ !== 0) {
            scale(T, pl * WORD_LENGTH - 1);
        }

        const tl = t.length;
        const l = Math.min(pl, tl);
        let i = 0;

        for (; i < l; i++) {
            t[i] &= p[i];
        }

        for (; i < tl; i++) {
            t[i] &= p_;
        }

        T._ &= p_;

        return T;
    },
    /**
     * Creates the bitwise OR of two sets.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * res = bs1.or(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} A new BitSet object, containing the bitwise OR of this and val
     */
    or(val) { // union

        parse(P, val);

        const t = this.clone();
        const d = t.data;
        const p = P.data;

        const pl = p.length - 1;
        const tl = d.length - 1;

        const minLength = Math.min(tl, pl);

        // Append backwards, extend array only once
        let i;
        for (i = pl; i > minLength; i--) {
            d[i] = p[i];
        }

        for (; i >= 0; i--) {
            d[i] |= p[i];
        }

        t._ |= P._;

        return t;
    },
    /**
     * Creates the bitwise XOR of two sets.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * res = bs1.xor(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} A new BitSet object, containing the bitwise XOR of this and val
     */
    xor(val) { // symmetric difference

        parse(P, val);

        const t = this.clone();
        const d = t.data;
        const p = P.data;

        const t_ = t._;
        const p_ = P._;

        let i = 0;

        const tl = d.length - 1;
        const pl = p.length - 1;

        // Cut if tl > pl
        for (i = tl; i > pl; i--) {
            d[i] ^= p_;
        }

        // Cut if pl > tl
        for (i = pl; i > tl; i--) {
            d[i] = t_ ^ p[i];
        }

        // XOR the rest
        for (; i >= 0; i--) {
            d[i] ^= p[i];
        }

        // XOR infinity
        t._ ^= p_;

        return t;
    },
    /**
     * Creates the bitwise AND NOT (not confuse with NAND!) of two sets.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * res = bs1.notAnd(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} A new BitSet object, containing the bitwise AND NOT of this and other
     */
    andNot(val) { // difference

        return this.and(new BitSet(val).flip());
    },
    /**
     * Flip/Invert a range of bits by setting
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.flip(); // Flip entire set
     * bs1.flip(5); // Flip single bit
     * bs1.flip(3,10); // Flip a bit range
     *
     * @param {number=} from The start index of the range to be flipped
     * @param {number=} to The end index of the range to be flipped
     * @returns {BitSet} this
     */
    flip(from, to) {

        if (from === undefined) {

            const d = this.data;
            for (let i = 0; i < d.length; i++) {
                d[i] = ~d[i];
            }

            this._ = ~this._;

        } else if (to === undefined) {

            scale(this, from);

            this.data[from >>> WORD_LOG] ^= (1 << from);

        } else if (from >= 0 && from <= to) {

            scale(this, to);

            for (let i = from; i <= to; i++) {
                this.data[i >>> WORD_LOG] ^= (1 << i);
            }
        }
        return this;
    },
    /**
     * Clear a range of bits by setting it to 0
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.clear(); // Clear entire set
     * bs1.clear(5); // Clear single bit
     * bs1.clear(3,10); // Clear a bit range
     *
     * @param {number=} from The start index of the range to be cleared
     * @param {number=} to The end index of the range to be cleared
     * @returns {BitSet} this
     */
    clear(from, to) {

        const data = this.data;

        if (from === undefined) {

            for (let i = data.length - 1; i >= 0; i--) {
                data[i] = 0;
            }
            this._ = 0;

        } else if (to === undefined) {

            from |= 0;

            scale(this, from);

            data[from >>> WORD_LOG] &= ~(1 << from);

        } else if (from <= to) {

            scale(this, to);

            for (let i = from; i <= to; i++) {
                data[i >>> WORD_LOG] &= ~(1 << i);
            }
        }
        return this;
    },
    /**
     * Gets an entire range as a new bitset object
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.slice(4, 8);
     *
     * @param {number=} from The start index of the range to be get
     * @param {number=} to The end index of the range to be get
     * @returns {BitSet} A new smaller bitset object, containing the extracted range
     */
    slice(from, to) {

        if (from === undefined) {
            return this.clone();
        } else if (to === undefined) {

            to = this.data.length * WORD_LENGTH;

            const im = Object.create(BitSet.prototype);

            im._ = this._;
            im.data = [0];

            for (let i = from; i <= to; i++) {
                im.set(i - from, this.get(i));
            }
            return im;

        } else if (from <= to && from >= 0) {

            const im = Object.create(BitSet.prototype);
            im.data = [0];

            for (let i = from; i <= to; i++) {
                im.set(i - from, this.get(i));
            }
            return im;
        }
        return null;
    },
    /**
     * Set a range of bits
     *
     * Ex:
     * bs1 = new BitSet();
     *
     * bs1.setRange(10, 15, 1);
     *
     * @param {number} from The start index of the range to be set
     * @param {number} to The end index of the range to be set
     * @param {number} value Optional value that should be set on the index (0 or 1)
     * @returns {BitSet} this
     */
    setRange(from, to, value) {

        for (let i = from; i <= to; i++) {
            this.set(i, value);
        }
        return this;
    },
    /**
     * Clones the actual object
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = bs1.clone();
     *
     * @returns {BitSet|Object} A new BitSet object, containing a copy of the actual object
     */
    clone() {

        const im = Object.create(BitSet.prototype);
        im.data = this.data.slice();
        im._ = this._;

        return im;
    },
    /**
     * Gets a list of set bits
     *
     * @returns {Array}
     */
    toArray: Math.clz32 ?
        function () {

            const ret = [];
            const data = this.data;

            for (let i = data.length - 1; i >= 0; i--) {

                let num = data[i];

                while (num !== 0) {
                    const t = 31 - Math.clz32(num);
                    num ^= 1 << t;
                    ret.unshift((i * WORD_LENGTH) + t);
                }
            }

            if (this._ !== 0) {
                ret.push(Infinity);
            }

            return ret;
        } :
        function () {

            const ret = [];
            const data = this.data;

            for (let i = 0; i < data.length; i++) {

                let num = data[i];

                while (num !== 0) {
                    const t = num & -num;
                    num ^= t;
                    ret.push((i * WORD_LENGTH) + popCount(t - 1));
                }
            }

            if (this._ !== 0) {
                ret.push(Infinity);
            }

            return ret;
        },
    /**
     * Overrides the toString method to get a binary representation of the BitSet
     *
     * @param {number=} base
     * @returns string A binary string
     */
    toString(base) {

        const data = this.data;

        if (!base) {
            base = 2;
        }

        // If base is power of two
        if ((base & (base - 1)) === 0 && base < 36) {

            let ret = "";
            const len = 2 + Math.log(4294967295/*Math.pow(2, WORD_LENGTH)-1*/) / Math.log(base) | 0;

            for (let i = data.length - 1; i >= 0; i--) {

                let cur = data[i];

                // Make the number unsigned
                if (cur < 0) {
                    cur += 4294967296 /*Math.pow(2, WORD_LENGTH)*/;
                }

                const tmp = cur.toString(base);

                if (ret !== "") {
                    // Fill small positive numbers with leading zeros. The +1 for array creation is added outside already
                    ret += "0".repeat(len - tmp.length - 1);
                }
                ret += tmp;
            }

            if (this._ === 0) {

                ret = ret.replace(/^0+/, "");

                if (ret === "") {
                    ret = "0";
                }
                return ret;

            }
            // Pad the string with ones
            ret = `1111${ret}`;
            return ret.replace(/^1+/, "...1111");


        }

        if ((base < 2 || base > 36)) {
            throw new SyntaxError("Invalid base");
        }

        const ret = [];
        const arr = [];

        // Copy every single bit to a new array
        for (let i = data.length; i--;) {

            for (let j = WORD_LENGTH; j--;) {

                arr.push(data[i] >>> j & 1);
            }
        }

        do {
            ret.unshift(divide(arr, base).toString(base));
        } while (!arr.every((x) => {
            return x === 0;
        }));

        return ret.join("");

    },
    /**
     * Check if the BitSet is empty, means all bits are unset
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * bs1.isEmpty() ? 'yes' : 'no'
     *
     * @returns {boolean} Whether the bitset is empty
     */
    isEmpty() {

        if (this._ !== 0) {
            return false;
        }

        const d = this.data;

        for (let i = d.length - 1; i >= 0; i--) {
            if (d[i] !== 0) {
                return false;
            }
        }
        return true;
    },
    /**
     * Calculates the number of bits set
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var num = bs1.cardinality();
     *
     * @returns {number} The number of bits set
     */
    cardinality() {

        if (this._ !== 0) {
            return Infinity;
        }

        let s = 0;
        const d = this.data;
        for (let i = 0; i < d.length; i++) {
            const n = d[i];
            if (n !== 0) {
                s += popCount(n);
            }
        }
        return s;
    },
    /**
     * Calculates the Most Significant Bit / log base two
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var logbase2 = bs1.msb();
     *
     * var truncatedTwo = Math.pow(2, logbase2); // May overflow!
     *
     * @returns {number} The index of the highest bit set
     */
    msb: Math.clz32 ?
        function () {

            if (this._ !== 0) {
                return Infinity;
            }

            const data = this.data;

            for (let i = data.length; i-- > 0;) {

                const c = Math.clz32(data[i]);

                if (c !== WORD_LENGTH) {
                    return (i * WORD_LENGTH) + WORD_LENGTH - 1 - c;
                }
            }
            return Infinity;
        } :
        function () {

            if (this._ !== 0) {
                return Infinity;
            }

            const data = this.data;

            for (let i = data.length; i-- > 0;) {

                let v = data[i];
                let c = 0;

                if (v) {

                    for (; (v >>>= 1) > 0; c++) {
                    }
                    return (i * WORD_LENGTH) + c;
                }
            }
            return Infinity;
        },
    /**
     * Calculates the number of trailing zeros
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var ntz = bs1.ntz();
     *
     * @returns {number} The index of the lowest bit set
     */
    ntz() {

        const data = this.data;

        for (let j = 0; j < data.length; j++) {
            let v = data[j];

            if (v !== 0) {

                v = (v ^ (v - 1)) >>> 1; // Set v's trailing 0s to 1s and zero rest

                return (j * WORD_LENGTH) + popCount(v);
            }
        }
        return Infinity;
    },
    /**
     * Calculates the Least Significant Bit
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var lsb = bs1.lsb();
     *
     * @returns {number} The index of the lowest bit set
     */
    lsb() {

        const data = this.data;

        for (let i = 0; i < data.length; i++) {

            const v = data[i];
            let c = 0;

            if (v) {

                let bit = (v & -v);

                for (; (bit >>>= 1); c++) {

                }
                return WORD_LENGTH * i + c;
            }
        }
        return this._ & 1;
    },
    /**
     * Compares two BitSet objects
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.equals(bs2) ? 'yes' : 'no'
     *
     * @param {BitSet} val A bitset object
     * @returns {boolean} Whether the two BitSets have the same bits set (valid for indefinite sets as well)
     */
    equals(val) {

        parse(P, val);

        const t = this.data;
        const p = P.data;

        const t_ = this._;
        const p_ = P._;

        const tl = t.length - 1;
        const pl = p.length - 1;

        if (p_ !== t_) {
            return false;
        }

        const minLength = tl < pl ? tl : pl;
        let i = 0;

        for (; i <= minLength; i++) {
            if (t[i] !== p[i]) {
                return false;
            }
        }

        for (i = tl; i > pl; i--) {
            if (t[i] !== p_) {
                return false;
            }
        }

        for (i = pl; i > tl; i--) {
            if (p[i] !== t_) {
                return false;
            }
        }
        return true;
    }
};

BitSet.fromBinaryString = function (str) {

    return new BitSet(`0b${str}`);
};

BitSet.fromHexString = function (str) {

    return new BitSet(`0x${str}`);
};

BitSet.Random = function (n) {

    if (n === undefined || n < 0) {
        n = WORD_LENGTH;
    }

    const m = n % WORD_LENGTH;

    // Create an array, large enough to hold the random bits
    const t = [];
    const len = Math.ceil(n / WORD_LENGTH);

    // Create an bitset instance
    const s = Object.create(BitSet.prototype);

    // Fill the vector with random data, uniformally distributed
    for (let i = 0; i < len; i++) {
        t.push(Math.random() * 4294967296 | 0);
    }

    // Mask out unwanted bits
    if (m > 0) {
        t[len - 1] &= (1 << m) - 1;
    }

    s.data = t;
    s._ = 0;
    return s;
};


// bitset library uses 32 bits numbers internally
// it preemptively adds an extra number whan it detects it's full
// this is why we use Uint8Array and minus 1 from the blocksize / 8
// in order to get exactly the right size
// because of the functions supplied by the bitset library
// we invert the notions of set and unset where
// set is 0 and unset is 1

/**
 * Creates a new bitmap sized according to the block size
 */
const createBitMap = (blockSize) => new BitSet(new Uint8Array(blockSize / 8 - 1)).flip(0, blockSize - 1);

/**
 * Set a bit
 */
const setBit = (bitMap, i) => bitMap.set(i, 0);

/**
 * Unsets a bit
 */
const unsetBit = (bitMap, i) => bitMap.set(i, 1);

/**
 * Checks if the entire bitmap is set
 */
const allSet = (bitMap) => bitMap.isEmpty();

/**
 * Checks if the entire bitmap is unset
 */
const allUnset = (bitMap, blockSize) => bitMap.cardinality() === blockSize;

/**
 * Find first set algorithm
 * If null is returned, all items have been set
 */
const firstUnset = (bitMap) => {
    let first = bitMap.ntz();
    if (first === Infinity) {
        first = null;
    }
    return first;
};

/**
 * Checks if a bit is set.
 */
const isSet = (bitMap, i) => !bitMap.get(i);


/**
 * Class representing a lazy recursive fully-persistent bitmap tree.
 * Only the leaf bitmaps correspond to counters.
 * Interior bitmaps index their child bitmaps.
 * If an interior bit is set, that means there's no free bits in the child bitmap.
 * If an interior bit is not set, that means there's at least 1 free bit in the child bitmap.
 * The snapshot parameter for allocate and deallocate controls how the persistence works.
 * If a snapshot is passed in to mutation methods and a mutation occurs either by
 * changing the current node or leaf, or creating a new parent or child, then these
 * will always create new nodes or leafs instead of mutating the current node or leaf.
 * If the node or leaf to be copied is already in a snapshot, then it will not bother copying
 * unnecessarily.
 */
class BitMapTree {
    /**
     * Creates a BitMapTree, this is an abstract class.
     * It is not meant to by directly instantiated.
     */
    constructor(blockSize, shrink, begin, depth, bitMap) {
        this.blockSize = blockSize;
        this.shrink = shrink;
        this.begin = begin;
        this.depth = depth;
        this.bitMap = bitMap || createBitMap(blockSize);
    }
}

/**
 * Class representing a Leaf of the recursive bitmap tree.
 * This represents the base case of the lazy recursive bitmap tree.
 */
class Leaf extends BitMapTree {
    /**
     * Creates a Leaf
     */
    constructor(blockSize, shrink, begin, bitMap) {
        super(blockSize, shrink, begin, 0, bitMap);
    }

    /**
     * Allocates a counter and sets the corresponding bit for the bitmap.
     * It will lazily grow parents.
     */
    allocate(counter, callback, snapshot) {
        let index;
        if (counter == null) {
            index = firstUnset(this.bitMap);
        } else {
            index = counter - this.begin;
        }
        if (index !== null && index < this.blockSize) {
            if (!isSet(this.bitMap, index)) {
                let bitMapNew;
                let treeNew;
                if (!snapshot || snapshot.has(this)) {
                    bitMapNew = this.bitMap;
                    setBit(bitMapNew, index);
                    treeNew = this;
                } else {
                    bitMapNew = this.bitMap.clone();
                    setBit(bitMapNew, index);
                    treeNew = new Leaf(this.blockSize, this.shrink, this.begin, bitMapNew);
                    snapshot.add(treeNew);
                }
                callback({
                    counter: this.begin + index,
                    changed: true,
                    bitMap: bitMapNew,
                    tree: treeNew
                });
            } else {
                callback({
                    counter: this.begin + index,
                    changed: false,
                    bitMap: this.bitMap,
                    tree: this
                });
            }
        } else {
            // grow the tree upwards
            const treeNew = new Node(
                this.blockSize,
                this.shrink,
                this.begin,
                this.depth + 1
            );
            if (snapshot) {
                snapshot.add(treeNew);
                snapshot.add(treeNew.bitMap);
            }
            treeNew.bitMapTrees[0] = this;
            if (allSet(this.bitMap)) {
                setBit(treeNew.bitMap, 0);
            }
            treeNew.allocate(
                counter,
                callback,
                snapshot
            );
        }
    }

    /**
     * Deallocates a counter and unsets the corresponding bit for the bitmap.
     */
    deallocate(counter, callback, snapshot) {
        const index = counter - this.begin;
        if (index >= 0 && index < this.blockSize) {
            if (isSet(this.bitMap, index)) {
                let bitMapNew;
                let treeNew;
                if (!snapshot || snapshot.has(this)) {
                    bitMapNew = this.bitMap;
                    unsetBit(bitMapNew, index);
                    treeNew = this;
                } else {
                    bitMapNew = this.bitMap.clone();
                    unsetBit(bitMapNew, index);
                    treeNew = new Leaf(this.blockSize, this.shrink, this.begin, bitMapNew);
                    snapshot.add(treeNew);
                }
                callback({
                    exists: true,
                    changed: true,
                    bitMap: bitMapNew,
                    tree: treeNew
                });
            } else {
                callback({
                    exists: true,
                    changed: false,
                    bitMap: this.bitMap,
                    tree: this
                });
            }
        } else {
            callback({
                exists: false,
                changed: false,
                bitMap: this.bitMap,
                tree: this
            });
        }
    }

    /**
     * Checks if the counter has been set
     */
    check(counter, callback) {
        const index = counter - this.begin;
        if (index >= 0 && index < this.blockSize) {
            if (isSet(this.bitMap, index)) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(null);
        }
    }
}

/**
 * Class representing a Node of the recursive bitmap tree.
 */
class Node extends BitMapTree {
    constructor(blockSize, shrink, begin, depth, bitMap, bitMapTrees) {
        super(blockSize, shrink, begin, depth, bitMap);
        this.bitMapTrees = bitMapTrees || [];
    }

    /**
     * Allocates a counter by allocating the corresponding child.
     * Passes a continuation to the child allocate that will
     * set the current bitmap if the child bitmap is now all set.
     * It will also lazily create the children or parents as necessary.
     */
    allocate(counter, callback, snapshot) {
        let index;
        if (counter == null) {
            index = firstUnset(this.bitMap);
        } else {
            index = Math.floor(
                (counter - this.begin) / (this.blockSize ** this.depth)
            );
        }
        if (index != null && this.bitMapTrees[index]) {
            const index_ = index; // fix the non-null value
            this.bitMapTrees[index].allocate(
                counter,
                ({ counter, changed, bitMap: bitMapChild, tree: treeChild }) => {
                    let bitMapNew = this.bitMap;
                    let treeNew = this;
                    if (changed) {
                        if (!snapshot && allSet(bitMapChild)) {
                            setBit(bitMapNew, index_);
                        } else if (snapshot && snapshot.has(this)) {
                            if (allSet(bitMapChild)) {
                                if (!snapshot.has(this.bitMap)) {
                                    bitMapNew = this.bitMap.clone();
                                    snapshot.add(bitMapNew);
                                    this.bitMap = bitMapNew;
                                }
                                setBit(bitMapNew, index_);
                            }
                            treeNew.bitMapTrees[index_] = treeChild;
                        } else if (snapshot) {
                            if (allSet(bitMapChild)) {
                                bitMapNew = this.bitMap.clone();
                                snapshot.add(bitMapNew);
                                setBit(bitMapNew, index_);
                            }
                            const bitMapTreesNew = this.bitMapTrees.slice();
                            bitMapTreesNew[index_] = treeChild;
                            treeNew = new Node(
                                this.blockSize,
                                this.shrink,
                                this.begin,
                                this.depth,
                                bitMapNew,
                                bitMapTreesNew
                            );
                            snapshot.add(treeNew);
                        }
                    }
                    callback({
                        counter,
                        changed,
                        bitMap: bitMapNew,
                        tree: treeNew
                    });
                },
                snapshot
            );
        } else if (index === null || index >= this.blockSize) {
            // grow the tree upwards
            const treeNew = new Node(
                this.blockSize,
                this.shrink,
                this.begin,
                this.depth + 1
            );
            if (snapshot) {
                snapshot.add(treeNew);
                snapshot.add(treeNew.bitMap);
            }
            treeNew.bitMapTrees[0] = this;
            if (allSet(this.bitMap)) {
                setBit(treeNew.bitMap, 0);
            }
            treeNew.allocate(
                counter,
                callback,
                snapshot
            );
        } else {
            // grow the tree downwards
            const beginNew = this.begin + index * (this.blockSize ** this.depth);
            const depthNew = this.depth - 1;
            let treeChild;
            if (depthNew === 0) {
                treeChild = new Leaf(this.blockSize, this.shrink, beginNew);
            } else {
                treeChild = new Node(this.blockSize, this.shrink, beginNew, depthNew);
            }
            if (snapshot) {
                snapshot.add(treeChild);
                snapshot.add(treeChild.bitMap);
            }
            let treeNew;
            if (!snapshot || snapshot.has(this)) {
                this.bitMapTrees[index] = treeChild;
                treeNew = this;
            } else {
                const bitMapTreesNew = this.bitMapTrees.slice();
                bitMapTreesNew[index] = treeChild;
                treeNew = new Node(
                    this.blockSize,
                    this.shrink,
                    this.begin,
                    this.depth,
                    this.bitMap,
                    bitMapTreesNew
                );
                snapshot.add(treeNew);
            }
            const index_ = index; // fix the non-null value
            treeChild.allocate(
                counter,
                ({ counter, changed, bitMap: bitMapChild, tree: treeChild }) => {
                    let bitMapNew = this.bitMap;
                    if (bitMapChild && allSet(bitMapChild)) {
                        if (snapshot && !snapshot.has(this.bitMap)) {
                            bitMapNew = this.bitMap.clone();
                            snapshot.add(bitMapNew);
                            treeNew.bitMap = bitMapNew;
                        }
                        setBit(bitMapNew, index_);
                    }
                    callback({
                        counter,
                        changed,
                        bitMap: bitMapNew,
                        tree: treeNew
                    });
                },
                snapshot
            );
        }
    }

    /**
     * Deallocates a counter by deallocating the corresponding child.
     * Passes a continuation to the child deallocate that will
     * unset the current bitmap if the child bitmap was previously all set.
     * It can also shrink the tree if the child node is compeletely empty
     * or if the child leaf is completely unset.
     */
    deallocate(counter, callback, snapshot) {
        const index = Math.floor(
            (counter - this.begin) / (this.blockSize ** this.depth)
        );
        if (this.bitMapTrees[index]) {
            const allSetPrior = allSet(this.bitMapTrees[index].bitMap);
            this.bitMapTrees[index].deallocate(
                counter,
                ({ exists, changed, bitMap: bitMapChild, tree: treeChild }) => {
                    let bitMapNew = this.bitMap;
                    let treeNew = this;
                    if (!exists) {
                        callback({
                            exists,
                            changed,
                            bitMap: bitMapNew,
                            tree: treeNew
                        });
                    } else {
                        if (changed) {
                            if (!snapshot && allSetPrior) {
                                unsetBit(bitMapNew, index);
                            } else if (snapshot && snapshot.has(this)) {
                                if (allSetPrior) {
                                    if (!snapshot.has(this.bitMap)) {
                                        bitMapNew = this.bitMap.clone();
                                        snapshot.add(bitMapNew);
                                        this.bitMap = bitMapNew;
                                    }
                                    unsetBit(bitMapNew, index);
                                }
                                treeNew.bitMapTrees[index] = treeChild;
                            } else if (snapshot) {
                                if (allSetPrior) {
                                    bitMapNew = this.bitMap.clone();
                                    snapshot.add(bitMapNew);
                                    unsetBit(bitMapNew, index);
                                }
                                const bitMapTreesNew = this.bitMapTrees.slice();
                                bitMapTreesNew[index] = treeChild;
                                treeNew = new Node(
                                    this.blockSize,
                                    this.shrink,
                                    this.begin,
                                    this.depth,
                                    bitMapNew,
                                    bitMapTreesNew
                                );
                                snapshot.add(treeNew);
                            }
                            if (
                                this.shrink &&
                                (
                                    (
                                        treeChild instanceof Leaf &&
                                        allUnset(bitMapChild, this.blockSize)
                                    )
                                    ||
                                    (
                                        treeChild instanceof Node &&
                                        Object.keys(treeChild.bitMapTrees).length === 0
                                    )
                                )
                            ) {
                                delete treeNew.bitMapTrees[index];
                            }
                        }
                        callback({
                            exists: true,
                            changed,
                            bitMap: bitMapNew,
                            tree: treeNew
                        });
                    }
                },
                snapshot
            );
        } else {
            callback({
                exists: false,
                changed: false,
                bitMap: this.bitMap,
                tree: this
            });
        }
    }

    /**
     * Checks if the counter has been set
     */
    check(counter, callback) {
        const index = Math.floor(
            (counter - this.begin) / (this.blockSize ** this.depth)
        );
        if (this.bitMapTrees[index]) {
            this.bitMapTrees[index].check(counter, (set) => {
                callback(set);
            });
        } else {
            callback(null);
        }
    }
}

export { Leaf, Node };
