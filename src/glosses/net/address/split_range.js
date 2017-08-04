const { net: { address }, std: { net } } = adone;

export default function splitRange(startAddress, endAddress) {
    let Cls;
    if (startAddress instanceof address.IP4) {
        Cls = address.IP4;
    } else if (startAddress instanceof address.IP6) {
        Cls = address.IP6;
    } else if (net.isIPv4(startAddress)) {
        Cls = address.IP4;
        startAddress = new Cls(startAddress);
        endAddress = new Cls(endAddress);
    } else {
        Cls = address.IP6;
        startAddress = new Cls(startAddress);
        endAddress = new Cls(endAddress);
    }

    const startBitset = startAddress.toBitSet();
    const endBitset = endAddress.toBitSet();
    const { MAX_BIT } = startBitset;
    let common = MAX_BIT;
    while (common >= 0 && startBitset.get(common) === endBitset.get(common)) {
        --common;
    }
    if (common === -1) {
        // identical
        return [Cls.fromBitSet(startBitset, MAX_BIT + 1)];
    }
    if (common === 0) {
        // 1 bit difference
        return [Cls.fromBitSet(startBitset, MAX_BIT)];
    }
    if (endBitset.previousUnsetBit(common) === -1 && startBitset.previousSetBit(common) === -1) {
        // AAAA11111
        // AAAA00000
        return [Cls.fromBitSet(startBitset, MAX_BIT - common)];
    }
    const ranges = [];
    for (let i = common - 1; i >= 0; --i) {
        if (startBitset.previousSetBit(i) === -1) {
            ranges.push(Cls.fromBitSet(startBitset, MAX_BIT - i));
            break;
        }
        if (i === 0) {
            ranges.push(Cls.fromBitSet(startBitset));
            break;
        }
        if (!startBitset.get(i)) {
            const t = startBitset.clone();
            t.set(i);
            t.unsetRange(i - 1, 0);
            ranges.push(Cls.fromBitSet(t, MAX_BIT - i + 1));
        }
    }
    for (let i = common - 1; i >= 0; --i) {
        if (endBitset.previousUnsetBit(i) === -1) {
            const t = endBitset.clone();
            t.unsetRange(i, 0);
            ranges.push(Cls.fromBitSet(t, MAX_BIT - i));
            break;
        }
        if (i === 0) {
            ranges.push(Cls.fromBitSet(endBitset));
            break;
        }
        if (endBitset.get(i)) {
            const t = endBitset.clone();
            t.unsetRange(i, 0);
            ranges.push(Cls.fromBitSet(t, MAX_BIT - i + 1));
        }
    }
    return ranges;
}
