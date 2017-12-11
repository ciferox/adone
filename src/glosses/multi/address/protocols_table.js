const {
    is,
    vendor: { lodash: { map } }
} = adone;

const V = -1;

const p = (code, size, name, resolvable) => ({
    code,
    size,
    name,
    resolvable: Boolean(resolvable)
});

export default function protocols(proto) {
    if (is.number(proto)) {
        if (protocols.codes[proto]) {
            return protocols.codes[proto];
        }

        throw new Error(`no protocol with code: ${proto}`);
    } else if (is.string(proto) || proto instanceof String) {
        if (protocols.names[proto]) {
            return protocols.names[proto];
        }

        throw new Error(`no protocol with name: ${proto}`);
    }

    throw new Error(`invalid protocol id type: ${proto}`);
}

protocols.lengthPrefixedVarSize = V;
protocols.V = V;

protocols.table = [
    [4, 32, "ip4"],
    [6, 16, "tcp"],
    [17, 16, "udp"],
    [33, 16, "dccp"],
    [41, 128, "ip6"],
    [53, V, "dns", "resolvable"],
    [54, V, "dns4", "resolvable"],
    [55, V, "dns6", "resolvable"],
    [132, 16, "sctp"],
    // all of the below use varint for size
    [302, 0, "utp"],
    [421, protocols.lengthPrefixedVarSize, "ipfs"],
    [480, 0, "http"],
    [443, 0, "https"],
    [477, 0, "ws"],
    [478, 0, "wss"],
    [479, 0, "p2p-websocket-star"],
    [275, 0, "p2p-webrtc-star"],
    [276, 0, "p2p-webrtc-direct"],
    [290, 0, "p2p-circuit"]
];

protocols.names = {};
protocols.codes = {};

protocols.object = p;

// populate tables
map(protocols.table, (row) => {
    const proto = p.apply(null, row);
    protocols.codes[proto.code] = proto;
    protocols.names[proto.name] = proto;
});
