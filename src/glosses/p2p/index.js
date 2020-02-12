const {
    lazify
} = adone;

const __ = lazify({
    Bootstrap: "libp2p-bootstrap",
    Connection: ["interface-connection", "Connection"],
    crypto: "libp2p-crypto",
    cryptoSecp256k1: "libp2p-crypto-secp256k1",
    FloodSub: "libp2p-floodsub",
    GossipSub: "libp2p-gossipsub",
    KadDHT: "libp2p-kad-dht",
    PeerId: "peer-id",
    PeerInfo: "peer-info",
    PeerBook: "peer-book",
    Node: "libp2p",
    MulticastDNS: "libp2p-mdns",
    record: "libp2p-record",
    secio: "libp2p-secio",
    createLibp2p: () => __.Node.createLibp2p,
    muxer: () => lazify({
        spdy: "libp2p-spdy",
        mplex: "libp2p-mplex"
    }),
    transport: () => lazify({
        TCP: "libp2p-tcp",
        WS: "libp2p-websockets"
    })
}, adone.asNamespace(exports), require);
