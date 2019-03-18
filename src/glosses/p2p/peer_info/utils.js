const {
    multiformat: { multiaddr }
} = adone;

export const ensureMultiaddr = function (ma) {
    if (multiaddr.isMultiaddr(ma)) {
        return ma;
    }

    return multiaddr(ma);
};
