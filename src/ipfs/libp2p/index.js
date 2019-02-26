adone.lazify({
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

    Multiplex: "./mplex",
    Keychain: "./keychain",
    KadDHT: "./kad_dht",
    MulticastDNS: "./mdns",

    WebRTCStar: "./webrtc_star",
    WebsocketStar: "./websocket_star",
    WebsocketStarMulti: "./websocket_star_multi",
    // transports
    TCP: "./tcp",
    WS: "./websockets"
}, exports, require);
