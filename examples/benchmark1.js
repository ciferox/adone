"use strict";

const MAGIC_FLAG = 0x80000000 >>> 0;

class Flags {
    constructor() {
        this.value = MAGIC_FLAG;
    }

    set(bit) {
        this.value |= (1 << bit);
    }

    write1(val, bits, offset) {
        const maxOffset = offset + bits;
        for (let i = offset; i < maxOffset; ++i) {
            if (val & (1 << (i - offset))) {
                this.value |= (1 << i);
            }
        }
    }
	
	write2(val, bits, offset) {
        const maxOffset = offset + bits;
		if (val & 1) {
			this.value |= (1 << offset);
		}
        for (let i = offset + 1; i < maxOffset; ++i) {
            if (val & (1 << (i - offset))) {
                this.value |= (1 << i);
            }
        }
    }
}

const f1 = new Flags();
const f2 = new Flags();
const f3 = new Flags();

const a1 = 0b00000000 >>> 0;
const a2 = 0b00001111 >>> 0;
const a3 = 0b11111111 >>> 0;
const a4 = 0b01010101 >>> 0;
const a5 = 0b10101010 >>> 0;

const bits = 8 >>> 0;
const offset = 20 >>> 0;


export default {
    'case 1': function() {
        f1.write1(a1, bits, offset);
        f1.write1(a2, bits, offset);
        f1.write1(a3, bits, offset);
        f1.write1(a4, bits, offset);
        f1.write1(a5, bits, offset);
    },
    'case 2': function() {
        f2.write2(a1, bits, offset);
        f2.write2(a2, bits, offset);
        f2.write2(a3, bits, offset);
        f2.write2(a4, bits, offset);
        f2.write2(a5, bits, offset);
    },
    'case 3': function() {
        f3.write2(a1, 8, offset);
        f3.write2(a2, 8, offset);
        f3.write2(a3, 8, offset);
        f3.write2(a4, 8, offset);
        f3.write2(a5, 8, offset);
    }
};