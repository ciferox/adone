const {
    is,
    multi: { address }
} = adone;

/**
 * Validation funcs
 */
const and = function (...args) {
    const partialMatch = function (a) {
        if (a.length < args.length) {
            return null;
        }
        args.some((arg) => {
            a = is.function(arg)
                ? arg().partialMatch(a)
                : arg.partialMatch(a);

            if (is.null(a)) {
                return true;
            }
        });

        return a;
    };

    const matches = function (a) {
        if (is.string(a)) {
            a = address.create(a);
        }
        const out = partialMatch(a.protoNames());
        if (is.null(out)) {
            return false;
        }
        return out.length === 0;
    };

    return {
        input: args,
        matches,
        partialMatch
    };
};

const or = function (...args) {
    const partialMatch = function (a) {
        let out = null;
        args.some((arg) => {
            const res = is.function(arg)
                ? arg().partialMatch(a)
                : arg.partialMatch(a);
            if (res) {
                out = res;
                return true;
            }
        });

        return out;
    };

    const matches = function (a) {
        if (is.string(a)) {
            a = address.create(a);
        }
        const out = partialMatch(a.protoNames());
        if (is.null(out)) {
            return false;
        }
        return out.length === 0;
    };

    const result = {
        toString() {
            return `{ ${args.join(" ")} }`;
        },
        input: args,
        matches,
        partialMatch
    };

    return result;
};

const base = function (n) {
    const name = n;

    const matches = function (a) {
        if (is.string(a)) {
            a = address.create(a);
        }

        const pnames = a.protoNames();
        if (pnames.length === 1 && pnames[0] === name) {
            return true;
        }
        return false;
    };

    const partialMatch = function (protos) {
        if (protos.length === 0) {
            return null;
        }

        if (protos[0] === name) {
            return protos.slice(1);
        }
        return null;
    };

    return {
        toString() {
            return name;
        },
        matches,
        partialMatch
    };
};

/**
 * Valid combinations
 */
export const DNS4 = base("dns4");
export const DNS6 = base("dns6");
export const _DNS = or(
    base("dns"),
    DNS4,
    DNS6
);

export const IP = or(base("ip4"), base("ip6"));
export const TCP = and(IP, base("tcp"));
export const UDP = and(IP, base("udp"));
export const UTP = and(UDP, base("utp"));

export const DNS = or(
    and(_DNS, base("tcp")),
    _DNS
);

export const WebSocket = or(
    and(TCP, base("ws")),
    and(DNS, base("ws"))
);

export const WebSocketSecure = or(
    and(TCP, base("wss")),
    and(DNS, base("wss"))
);

export const HTTP = or(
    and(TCP, base("http")),
    and(DNS),
    and(DNS, base("http"))
);

export const WebRTCStar = or(
    and(WebSocket, base("p2p-webrtc-star"), base("p2p")),
    and(WebSocketSecure, base("p2p-webrtc-star"), base("p2p"))
);

export const WebSocketStar = or(
    and(WebSocket, base("p2p-websocket-star"), base("p2p")),
    and(WebSocketSecure, base("p2p-websocket-star"), base("p2p")),
    and(WebSocket, base("p2p-websocket-star")),
    and(WebSocketSecure, base("p2p-websocket-star"))
);

export const WebRTCDirect = and(HTTP, base("p2p-webrtc-direct"));

export const Reliable = or(
    WebSocket,
    WebSocketSecure,
    HTTP,
    WebRTCStar,
    WebRTCDirect,
    TCP,
    UTP
);

const _IPFS = or(
    and(Reliable, base("p2p")),
    WebRTCStar,
    base("p2p")
);

const _Circuit = or(
    and(_IPFS, base("p2p-circuit"), _IPFS),
    and(_IPFS, base("p2p-circuit")),
    and(base("p2p-circuit"), _IPFS),
    and(Reliable, base("p2p-circuit")),
    and(base("p2p-circuit"), Reliable),
    base("p2p-circuit")
);

const CircuitRecursive = () => or(
    and(_Circuit, CircuitRecursive),
    _Circuit
);

export const Circuit = CircuitRecursive();

export const IPFS = or(
    and(Circuit, _IPFS, Circuit),
    and(_IPFS, Circuit),
    and(Circuit, _IPFS),
    Circuit,
    _IPFS
);
