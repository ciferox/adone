const { net: { address }, std: { net } } = adone;

export default function splitRange(startAddress, endAddress) {
    const Cls = net.isIPv4(startAddress) ? address.IP4 : address.IP6;
    startAddress = new Cls(startAddress);
    endAddress = new Cls(endAddress);
    const startBitset = startAddress.toBitSet();
    const endBitset = endAddress.toBitSet();
    const { MAX_BIT } = startBitset;
    let common = MAX_BIT;
    while (common > 0 && startBitset.get(common) === endBitset.get(common)) {
        --common;
    }
    if (common === 0) {
        return [startAddress];
    }
    if (common === 1) {
        return [Cls.fromBitSet(startBitset, MAX_BIT)];
    }
    if (startBitset.previousSetBit(common) === -1 && endBitset.previousUnsetBit(common) === -1) {
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
            startBitset.set(i);
            ranges.push(Cls.fromBitSet(startBitset, MAX_BIT - i + 1));
            startBitset.unset(i);
        }
    }
    for (let i = common - 1; i >= 0; --i) {
        if (endBitset.previousUnsetBit(i) === -1) {
            ranges.push(Cls.fromBitSet(endBitset, MAX_BIT - i));
            break;
        }
        if (i === 0) {
            ranges.push(Cls.fromBitSet(endBitset));
            break;
        }
        if (endBitset.get(i)) {
            endBitset.unset(i);
            ranges.push(Cls.fromBitSet(endBitset, MAX_BIT - i + 1));
            endBitset.set(i);
        }
    }
    return ranges;
}
