adone.lazify({
    Connection: "./connection",
    Node: "./node",
    PeerId: "./peer_id",
    PeerInfo: "./peer_info",
    PeerBook: "./peer_book",
    Bootstrap: "./bootstrap",
    crypto: "./crypto",
    cryptoSecp256k1: "./crypto_secp256k1",
    ConnectionManager: "./connection_manager",
    Ping: "./ping",
    PubsubBaseProtocol: "./pubsub",
    FloodSub: "./floodsub",
    record: "./record",
    secio: "./secio",
    identify: "./identify",
    Circuit: "./circuit",

    Switch: "./switch",
    Protector: "./pnet",

    DelegatedPeerRouter: "./delegated_peer_routing",
    DelegatedContentRouter: "./delegated_content_routing",

    Keychain: "./keychain",
    KadDHT: "./kad_dht",
    MulticastDNS: "./mdns",

    rendezvous: "./websocket_star_rendezvous",
    
    transport: "./transports",
    muxer: "./muxers"
}, adone.asNamespace(exports), require);
