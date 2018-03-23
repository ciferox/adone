const {
    is,
    lodash: { map }
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

        throw new adone.error.Unknown(`No protocol with code: ${proto}`);
    } else if (is.string(proto)) {
        if (protocols.names[proto]) {
            return protocols.names[proto];
        }

        throw new adone.error.Unknown(`No protocol with name: ${proto}`);
    }

    throw new adone.error.NotValid(`Invalid protocol id type: ${proto}`);
}

protocols.lengthPrefixedVarSize = V;
protocols.V = V;

protocols.table = [
    [4, 32, "ip4"],
    [5, 128, "ip6"],
    [6, 16, "tcp"],
    [7, 16, "udp"],
    [8, 16, "sctp"],
    [9, 16, "dccp"],
    [17, 16, "udt"],
    [18, 16, "utp"],
    [19, 16, "quic"],
    [53, V, "dns", true],
    [54, V, "dns4", true],
    [55, V, "dns6", true],
    // all of the below use varint for size
    [400, protocols.lengthPrefixedVarSize, "unix"], // path of unix socket
    [401, protocols.lengthPrefixedVarSize, "winpipe"], // name of windows pipe
    [420, protocols.lengthPrefixedVarSize, "p2p"],
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
    const proto = p(...row);
    protocols.codes[proto.code] = proto;
    protocols.names[proto.name] = proto;
});
