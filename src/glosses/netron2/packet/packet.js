const setBit = (target, offset) => target | (1 << offset);

const clearBit = (target, offset) => target & ~(1 << offset);

const getBit = (target, offset) => (target >> offset) & 1;

const clearBits = (target, offset, count) => {
    const maxOffset = offset + count;
    for (let i = offset; i < maxOffset; ++i) {
        target &= ~(1 << i);
    }

    return target;
};

const writeBits = (target, val, offset, count) => {
    const maxOffset = offset + count;
    if (val & 1) {
        target |= (1 << offset);
    }
    for (let i = offset + 1; i < maxOffset; ++i) {
        if (val & (1 << (i - offset))) {
            target |= (1 << i);
        }
    }

    return target;
};

const readBits = (target, offset, count) => {
    let val = 0 >>> 0;
    const maxOffset = offset + count;
    for (let i = offset; i < maxOffset; ++i) {
        if (getBit(target, i)) {
            val |= (1 << (i - offset));
        }
    }
    return val;
};

/**
 * Represents netron packet.
 * 
 * Packet fields in left to right order:
 * - flags - contains impulse and action values (uint8)
 * - id    - packet id (uint32)
 * - data  - custom data
 * 
 *    name | offset | bits | min/max
 *   -------------------------------- 
 *   action       0      7  0x00-0x7F 
 *  impulse       7      1  0|1
 * 
 */

const IMPULSE_OFFSET = 7;
const ERROR_OFFSET = 6;
const ACTION_OFFSET = 0;
const ACTION_SIZE = 6;

export default class Packet {
    constructor() {
        this.flags = 0x00;
        this.id = undefined;
        this.data = undefined;
    }

    setAction(action) {
        this.flags = writeBits(clearBits(this.flags, ACTION_OFFSET, ACTION_SIZE), action, ACTION_OFFSET, ACTION_SIZE);
    }

    getAction() {
        return readBits(this.flags, ACTION_OFFSET, ACTION_SIZE);
    }

    setImpulse(val) {
        this.flags = val === 1 ? setBit(this.flags, IMPULSE_OFFSET) : clearBit(this.flags, IMPULSE_OFFSET);
    }

    getImpulse() {
        return getBit(this.flags, IMPULSE_OFFSET);
    }

    setError(val) {
        this.flags = val === 1 ? setBit(this.flags, ERROR_OFFSET) : clearBit(this.flags, ERROR_OFFSET);
    }

    getError() {
        return getBit(this.flags, ERROR_OFFSET);
    }

    setData(data) {
        this.data = data;
    }
}
