const {
    multiformat: { multiaddr }
} = adone;

function ensureMultiaddr(ma) {
    if (multiaddr.isMultiaddr(ma)) {
        return ma;
    }

    return multiaddr(ma);
}

module.exports = {
    ensureMultiaddr
};
