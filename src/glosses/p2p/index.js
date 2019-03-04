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
    Switch: "./switch",
    Ping: "./ping",
    PubsubBaseProtocol: "./pubsub",
    FloodSub: "./floodsub",
    record: "./record",
    secio: "./secio",
    identify: "./identify",
    Circuit: "./circuit",

    DelegatedPeerRouter: "./delegated_peer_routing",
    DelegatedContentRouter: "./delegated_content_routing",

    Keychain: "./keychain",
    KadDHT: "./kad_dht",
    MulticastDNS: "./mdns",

    WebRTCStar: "./webrtc_star",
    WebsocketStar: "./websocket_star",
    WebsocketStarMulti: "./websocket_star_multi",
    rendezvous: "./websocket_star_rendezvous",
    
    // transports
    TCP: "./tcp",
    WS: "./websockets",

    // multiplexors
    spdy: "./spdy",
    multiplex: "./mplex",

    multiformat: "./multiformats"
}, adone.asNamespace(exports), require);
