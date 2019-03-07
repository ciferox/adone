const {
    multiformat: { multiaddr }
} = adone;

const ensureMultiaddr = function (ma) {
    if (multiaddr.isMultiaddr(ma)) {
        return ma;
    }

    return multiaddr(ma);
};

module.exports = {
    ensureMultiaddr
};
