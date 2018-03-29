adone.definePredicates({
    p2pPeerInfo: "P2P_PEER_INFO",
    p2pCore: "P2P_CORE"
});

adone.lazify({
    Connection: "./connection",
    CID: "./cid",
    circuit: "./circuit",
    Core: "./core",
    PeerInfo: "./peer_info",
    PeerBook: "./peer_book",
    MulticastDNS: "./mdns",
    Railing: "./railing",
    dht: "./dht",
    switch: "./switch",
    Ping: "./ping",
    transport: "./transports",
    multistream: "./multistream",
    muxer: "./muxers",
    record: "./record",
    secio: "./secio",
    identify: "./identify",
    floodsub: "./floodsub",
    rendezvous: "./ws_star_rendezvous",
    KBucket: "./k_bucket"
}, adone.asNamespace(exports), require);
