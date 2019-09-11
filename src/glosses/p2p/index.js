const __ = adone.lazify({
    Connection: "./connection",
    Node: "./node",
    PeerId: "./peer_id",
    PeerInfo: "./peer_info",
    PeerBook: "./peer_book",
    Bootstrap: "./bootstrap",
    crypto: "./crypto",
    cryptoSecp256k1: "./crypto_secp256k1",
    // ConnectionManager: "./connection_manager",
    // Ping: "./ping",
    PubsubBaseProtocol: "./pubsub",
    FloodSub: "./floodsub",
    record: "./record",
    secio: "./secio",
    // identify: "./identify",
    // Circuit: "./circuit",

    Switch: "./node/switch",
    // Protector: "./pnet",

    DelegatedPeerRouter: "./delegated_peer_routing",
    DelegatedContentRouter: "./delegated_content_routing",

    Keychain: "./keychain",
    KadDHT: "./kad_dht",
    MulticastDNS: "./mdns",

    rendezvous: "./websocket_star_rendezvous",

    transport: "./transports",
    muxer: "./muxers"
}, adone.asNamespace(exports), require);

const {
    async: { nextTick }
} = adone;

/**
 * Like `new Libp2p(options)` except it will create a `PeerInfo`
 * instance if one is not provided in options.
 * @param {object} options Libp2p configuration options
 * @param {function(Error, Libp2p)} callback
 * @returns {void}
 */
export const createLibp2p = (options, callback) => {
    if (options.peerInfo) {
        return nextTick(callback, null, new __.Node(options));
    }
    __.PeerInfo.create((err, peerInfo) => {
        if (err) {
            return callback(err)
        }
        options.peerInfo = peerInfo;
        callback(null, new __.Node(options));
    });
};
