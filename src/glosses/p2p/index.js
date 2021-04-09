const {
    lazify
} = adone;

const __ = lazify({
    Bootstrap: "libp2p-bootstrap",
    Connection: ["libp2p-interfaces/src/connection", "Connection"],
    crypto: "libp2p-crypto",
    FloodSub: "libp2p-floodsub",
    GossipSub: "libp2p-gossipsub",
    KadDHT: "libp2p-kad-dht",
    PeerId: "peer-id",
    Node: "libp2p",
    MulticastDNS: "libp2p-mdns",
    record: "libp2p-record",
    createNode: () => __.Node.create,
    muxer: () => lazify({
        spdy: "libp2p-spdy",
        mplex: "libp2p-mplex"
    }),
    security: () => lazify({
        SECIO: "libp2p-secio",
        NOISE: ["libp2p-noise", "NOISE"]
    }),
    transport: () => lazify({
        TCP: "libp2p-tcp",
        WS: "libp2p-websockets",
        WebRTCDirect: "libp2p-webrtc-direct",
        WebRTCStar: "libp2p-webrtc-star"
    })
}, adone.asNamespace(exports), require);
