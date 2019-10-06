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
        mplex: "libp2p-mplex",
        pullMplex: "pull-mplex"
    }),
    transport: () => lazify({
        TCP: "libp2p-tcp",
        WS: "libp2p-websockets"
    })
}, adone.asNamespace(exports), require);

// const __ = lazify({
//     Connection: "./connection",
//     Node: "./node",
//     PeerId: "./peer_id",
//     PeerInfo: "./peer_info",
//     PeerBook: "./peer_book",
//     Bootstrap: "./bootstrap",
//     crypto: "./crypto",
//     cryptoSecp256k1: "./crypto_secp256k1",
//     // ConnectionManager: "./connection_manager",
//     // Ping: "./ping",
//     PubsubBaseProtocol: "./pubsub",
//     FloodSub: "./floodsub",
//     record: "./record",
//     secio: "./secio",
//     // identify: "./identify",
//     // Circuit: "./circuit",

//     Switch: "./node/switch",
//     // Protector: "./pnet",

//     DelegatedPeerRouter: "./delegated_peer_routing",
//     DelegatedContentRouter: "./delegated_content_routing",

//     Keychain: "./keychain",
//     KadDHT: "./kad_dht",
//     MulticastDNS: "./mdns",

//     rendezvous: "./websocket_star_rendezvous",

//     transport: "./transports",
//     muxer: "./muxers",
//     util: "./utils"
// }, adone.asNamespace(exports), require);

// const {
//     async: { nextTick }
// } = adone;

// /**
//  * Like `new Libp2p(options)` except it will create a `PeerInfo`
//  * instance if one is not provided in options.
//  * @param {object} options Libp2p configuration options
//  * @param {function(Error, Libp2p)} callback
//  * @returns {void}
//  */
// export const createLibp2p = (options, callback) => {
//     if (options.peerInfo) {
//         return nextTick(callback, null, new __.Node(options));
//     }
//     __.PeerInfo.create((err, peerInfo) => {
//         if (err) {
//             return callback(err);
//         }
//         options.peerInfo = peerInfo;
//         callback(null, new __.Node(options));
//     });
// };
