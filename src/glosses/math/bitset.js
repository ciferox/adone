const { is, math: { Long } } = adone;

// each bin holds bits 0 - 30, totaling 31 (sign takes up last bit)
const BITS_PER_INT = 31;

// used for ffs of a word in O(1) time. LUTs get a bad wrap, they are fast.
const multiplyDeBruijnBitPosition = [
    0, 1, 28, 2, 29, 14, 24, 3,
    30, 22, 20, 15, 25, 17, 4, 8,
    31, 27, 13, 23, 21, 19, 16, 7,
    26, 12, 18, 6, 11, 5, 10, 9
];

// the index of the least significant bit in the current array
const _lsb = (word) => multiplyDeBruijnBitPosition[(((word & -word) * 0x077CB531)) >>> 27];

// the index of the most significant bit in the current array
const _msb = (word) => {
    word |= word >> 1;
    word |= word >> 2;
    word |= word >> 4;
    word |= word >> 8;
    word |= word >> 16;
    word = (word >> 1) + 1;
    return multiplyDeBruijnBitPosition[(word * 0x077CB531) >>> 27];
};

const _toggleFunc = (word, len, curStart) => {
    const mask = (((1 << len) - 1) << curStart);
    return word ^ mask;
};

const _setFunc = (word, len, curStart) => {
    const mask = (((1 << len) - 1) << curStart);
    return word | mask;
};

const _unsetFunc = (word, len, curStart) => {
    const mask = 0x7fffffff ^ (((1 << len) - 1) << curStart);
    return word & mask;
};

const _and = (word1, word2) => word1 & word2;

const _or = (word1, word2) => word1 | word2;

const _xor = (word1, word2) => word1 ^ word2;

export default class BitSet {
    constructor(nBitsOrKey) {
        let wordCount;
        if (is.number(nBitsOrKey)) {
            nBitsOrKey = nBitsOrKey || BITS_PER_INT; // default to 1 word
            wordCount = Math.ceil(nBitsOrKey / BITS_PER_INT);
            this.arr = new Uint32Array(wordCount);
            this.MAX_BIT = nBitsOrKey - 1;
        } else {
            let arrVals = JSON.parse(`[${nBitsOrKey}]`);
            this.MAX_BIT = arrVals.pop();
            const leadingZeros = arrVals.pop();
            if (leadingZeros > 0) {
                const front = [];
                for (let i = 0; i < leadingZeros; ++i) {
                    front[i] = 0;
                }
                for (let i = 0; i < arrVals.length; ++i) {
                    front[leadingZeros + i] = arrVals[i];
                }
                arrVals = front;
            }
            wordCount = Math.ceil((this.MAX_BIT + 1) / BITS_PER_INT);
            this.arr = new Uint32Array(wordCount);
            this.arr.set(arrVals);
        }
    }

    get(idx) {
        const word = this._getWord(idx);
        return word === -1 ? false : (((this.arr[word] >> (idx % BITS_PER_INT)) & 1) === 1);
    }

    set(idx) {
        const word = this._getWord(idx);
        if (word === -1) {
            return false;
        }
        this.arr[word] |= 1 << (idx % BITS_PER_INT);
        return true;
    }

    setRange(from, to) {
        return this._doRange(from, to, _setFunc);
    }

    unset(idx) {
        const word = this._getWord(idx);
        if (word === -1) {
            return false;
        }
        this.arr[word] &= ~(1 << (idx % BITS_PER_INT));
        return true;
    }

    unsetRange(from, to) {
        return this._doRange(from, to, _unsetFunc);
    }

    toggle(idx) {
        const word = this._getWord(idx);
        if (word === -1) {
            return false;
        }
        this.arr[word] ^= (1 << (idx % BITS_PER_INT));
        return true;
    }

    toggleRange(from, to) {
        return this._doRange(from, to, _toggleFunc);
    }

    clear() {
        for (let i = 0; i < this.arr.length; i++) {
            this.arr[i] = 0;
        }
        return true;
    }

    clone() {
        return new BitSet(this.dehydrate());
    }

    /**
     * Turn the bitset into a comma separated string that skips leading & trailing 0 words.
     * Ends with the number of leading 0s and MAX_BIT.
     * Can rehydrate by passing the result into the constructor
     */
    dehydrate() {
        let leadingZeros = 0;
        for (let i = 0; i < this.arr.length; i++) {
            if (this.arr[i] !== 0) {
                break;
            }
            leadingZeros++;
        }
        let lastUsedWord;
        for (let i = this.arr.length - 1; i >= leadingZeros; i--) {
            if (this.arr[i] !== 0) {
                lastUsedWord = i;
                break;
            }
        }
        let s = "";
        for (let i = leadingZeros; i <= lastUsedWord; i++) {
            s += `${this.arr[i]},`;
        }
        s += `${leadingZeros},${this.MAX_BIT}`;  // leading 0s, stop numbers
        return s;
    }

    // bitwise AND on 2 bitsets or 1 bitset and 1 index.
    and(bsOrIdx) {
        return this._op(bsOrIdx, _and);
    }

    // bitwise OR on 2 bitsets or 1 bitset and 1 index.
    or(bsOrIdx) {
        return this._op(bsOrIdx, _or);
    }

    // bitwise XOR on 2 bitsets or 1 bitset and 1 index.
    xor(bsOrIdx) {
        return this._op(bsOrIdx, _xor);
    }

    // Run a custom function on every set bit. Faster than iterating over the entire bitset with a `get()`
    forEach(func) {
        for (let i = this.ffs(); i !== -1; i = this.nextSetBit(i + 1)) {
            func(i);
        }
    }

    // count of set bits for the entire bitset
    getCardinality() {
        let setCount = 0;
        for (let i = this.arr.length - 1; i >= 0; i--) {
            let j = this.arr[i];
            j = j - ((j >> 1) & 0x55555555);
            j = (j & 0x33333333) + ((j >> 2) & 0x33333333);
            setCount += ((((j + (j >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24);
        }
        return setCount;
    }

    // get the indices of all set bits
    getIndices() {
        const indices = [];
        this.forEach((i) => {
            indices.push(i);
        });
        return indices;
    }

    // check if one bitset is subset of another (better than AND checking)
    isSubsetOf(bs) {
        const arr1 = this.arr;
        const arr2 = bs.arr;
        const len = arr1.length;
        for (let i = 0; i < len; i++) {
            if ((arr1[i] & arr2[i]) !== arr1[i]) {
                return false;
            }
        }
        return true;
    }

    // quickly determine if a bitset is empty
    isEmpty() {
        const arr = this.arr;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i]) {
                return false;
            }
        }
        return true;
    }

    // quickly determine if both bitsets are equal (faster than XOR checking)
    isEqual(bs) {
        for (let i = 0; i < this.arr.length; i++) {
            if (this.arr[i] !== bs.arr[i]) {
                return false;
            }
        }
        return true;
    }

    toString() {
        let fullString = "";
        for (let i = this.arr.length - 1; i >= 0; i--) {
            const str = this.arr[i].toString(2);
            fullString += (`0000000000000000000000000000000${str}`).slice(-BITS_PER_INT);
        }
        return fullString;
    }

    // find first set bit
    ffs(_startWord) {
        let fs = -1;
        _startWord = _startWord || 0;
        for (let i = _startWord; i < this.arr.length; i++) {
            const setVal = this.arr[i];
            if (setVal === 0) {
                continue;
            }
            fs = _lsb(setVal) + i * BITS_PER_INT;
            break;
        }
        return fs <= this.MAX_BIT ? fs : -1;
    }

    // find first zero (unset bit)
    ffz(_startWord = 0) {
        let fz = -1;
        for (let i = _startWord; i < this.arr.length; i++) {
            let setVal = this.arr[i];
            if (setVal === 0x7fffffff) {
                continue;
            }
            setVal ^= 0x7fffffff;
            fz = _lsb(setVal) + i * BITS_PER_INT;
            break;
        }
        return fz <= this.MAX_BIT ? fz : -1;
    }

    // find last set bit
    fls(_startWord = this.arr.length - 1) {
        let ls = -1;
        for (let i = _startWord; i >= 0; i--) {
            const setVal = this.arr[i];
            if (setVal === 0) {
                continue;
            }
            ls = _msb(setVal) + i * BITS_PER_INT;
            break;
        }
        return ls;
    }

    // find last zero (unset bit)
    flz(_startWord = this.arr.length - 1) {
        let ls = -1;
        for (let i = _startWord; i >= 0; i--) {
            let setVal = this.arr[i];
            if (i === this.arr.length - 1) {
                const wordIdx = this.MAX_BIT % BITS_PER_INT;
                const unusedBitCount = BITS_PER_INT - wordIdx - 1;
                setVal |= ((1 << unusedBitCount) - 1) << (wordIdx + 1);
            }
            if (setVal === 0x7fffffff) {
                continue;
            }
            setVal ^= 0x7fffffff;
            ls = _msb(setVal) + i * BITS_PER_INT;
            break;
        }
        return ls;
    }

    // find first set bit, starting at a given index
    nextSetBit(idx) {
        const startWord = this._getWord(idx);
        if (startWord === -1) {
            return -1;
        }
        const wordIdx = idx % BITS_PER_INT;
        const len = BITS_PER_INT - wordIdx;
        const mask = ((1 << (len)) - 1) << wordIdx;
        const reducedWord = this.arr[startWord] & mask;
        if (reducedWord > 0) {
            return _lsb(reducedWord) + startWord * BITS_PER_INT;
        }
        return this.ffs(startWord + 1);
    }

    // find first unset bit, starting at a given index
    nextUnsetBit(idx) {
        const startWord = this._getWord(idx);
        if (startWord === -1) {
            return -1;
        }
        const mask = ((1 << (idx % BITS_PER_INT)) - 1);
        const reducedWord = this.arr[startWord] | mask;
        if (reducedWord === 0x7fffffff) {
            return this.ffz(startWord + 1);
        }
        return _lsb(0x7fffffff ^ reducedWord) + startWord * BITS_PER_INT;
    }

    // find last set bit, up to a given index
    previousSetBit(idx) {
        const startWord = this._getWord(idx);
        if (startWord === -1) {
            return -1;
        }
        const mask = 0x7fffffff >>> (BITS_PER_INT - (idx % BITS_PER_INT) - 1);
        const reducedWord = this.arr[startWord] & mask;
        if (reducedWord > 0) {
            return _msb(reducedWord) + startWord * BITS_PER_INT;
        }
        return this.fls(startWord - 1);
    }

    // find last unset bit, up to a given index
    previousUnsetBit(idx) {
        const startWord = this._getWord(idx);
        if (startWord === -1) {
            return -1;
        }
        const wordIdx = idx % BITS_PER_INT;
        const mask = ((1 << (BITS_PER_INT - wordIdx - 1)) - 1) << wordIdx + 1;
        const reducedWord = this.arr[startWord] | mask;
        if (reducedWord === 0x7fffffff) {
            return this.flz(startWord - 1);
        }
        return _msb(0x7fffffff ^ reducedWord) + startWord * BITS_PER_INT;
    }

    circularShift(offset) {
        offset = -offset;

        const S = this; // source BitSet (this)
        const MASK_SIGN = 0x7fffffff;
        const BITS = S.MAX_BIT + 1;
        const WORDS = S.arr.length;
        const BITS_LAST_WORD = BITS_PER_INT - (WORDS * BITS_PER_INT - BITS);

        const T = new BitSet(BITS); // target BitSet (the shifted bitset)

        offset = (BITS + (offset % BITS)) % BITS; // positive, within length
        let s = ~~(offset / BITS_PER_INT) % WORDS;
        let t = 0; // (s)ource and (t)arget word indices
        let i = offset % BITS_PER_INT;
        let j = 0; // current bit indices for source (i) and target (j) words
        let z = 0; // bit index for entire sequence.

        while (z < BITS) {
            const sourceWordLength = s === WORDS - 1 ? BITS_LAST_WORD : BITS_PER_INT;
            let bits = S.arr[s];

            if (i > 0) {
                bits = bits >>> i;
            }
            if (j > 0) {
                bits = bits << j;
            }

            T.arr[t] = T.arr[t] | bits;

            const bitsAdded = Math.min(BITS_PER_INT - j, sourceWordLength - i);
            z += bitsAdded;
            j += bitsAdded;
            if (j >= BITS_PER_INT) {
                T.arr[t] = T.arr[t] & MASK_SIGN;
                j = 0; t++;
            }
            i += bitsAdded;
            if (i >= sourceWordLength) {
                i = 0; s++;
            }
            if (s >= WORDS) {
                s -= WORDS;
            }
        }
        T.arr[WORDS - 1] = T.arr[WORDS - 1] & (MASK_SIGN >>> (BITS_PER_INT - BITS_LAST_WORD));
        return T;
    }

    toLong() {
        const parts = [0, 0];
        for (let n = 0; n < 2; ++n) {
            for (let i = 0; i < 32; ++i) {
                if (this.get(i + 32 * n)) {
                    parts[n] |= ((1 << i) >>> 0);
                }
            }
        }

        return new Long(parts[0], parts[1], true);
    }

    readUInt(bits = 1, offset = 0) {
        let val = 0 >>> 0;
        const maxOffset = (offset + bits > 64 ? 64 : offset + bits);
        for (let i = offset; i < maxOffset; ++i) {
            if (this.get(i)) {
                val |= (1 << (i - offset));
            }
        }
        return val;
    }

    writeUInt(val = 1, bits = 1, offset = 0) {
        val >>>= 0;
        const maxOffset = (offset + bits > 64 ? 64 : offset + bits);
        for (let i = offset; i < maxOffset; ++i) {
            if (val & (1 << (i - offset))) {
                this.set(i);
            }
        }
    }

    static fromLong(l) {
        const bs = new BitSet(64);
        const parts = [l.getLowBitsUnsigned(), l.getHighBitsUnsigned()];
        for (let n = 0; n < 2; ++n) {
            for (let i = 0; i < 32; ++i) {
                if (parts[n] & ((1 << i) >>> 0)) {
                    bs.set(i + 32 * n);
                }
            }
        }
        return bs;
    }

    _getWord(idx) {
        return (idx < 0 || idx > this.MAX_BIT) ? -1 : ~~(idx / BITS_PER_INT);
    }

    // shared function for setting, unsetting, or toggling a range of bits
    _doRange(from, to, func) {
        if (to < from) {
            to ^= from;
            from ^= to;
            to ^= from;
        }
        const startWord = this._getWord(from);
        const endWord = this._getWord(to);
        if (startWord === -1 || endWord === -1) {
            return false;
        }
        for (let i = startWord; i <= endWord; i++) {
            const curStart = (i === startWord) ? from % BITS_PER_INT : 0;
            const curEnd = (i === endWord) ? to % BITS_PER_INT : BITS_PER_INT - 1;
            const len = curEnd - curStart + 1;
            this.arr[i] = func(this.arr[i], len, curStart);

        }
        return true;
    }

    _op(bsOrIdx, func) {
        let newBS;
        const arr1 = this.arr;
        if (typeof bsOrIdx === "number") {
            const word = this._getWord(bsOrIdx);
            newBS = this.clone();
            if (word !== -1) {
                newBS.arr[word] = func(arr1[word], 1 << (bsOrIdx % BITS_PER_INT));
            }
        } else {
            const arr2 = bsOrIdx.arr;
            const len = arr1.length;
            newBS = new BitSet(this.MAX_BIT + 1);
            for (let i = 0; i < len; i++) {
                newBS.arr[i] = func(arr1[i], arr2[i]);
            }
        }
        return newBS;
    }
}
