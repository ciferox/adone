adone.lazify({
    Connection: "./connection",
    CID: "./cid",
    circuit: "./circuit",
    Node: "./node",
    PeerId: "./peer_id",
    PeerInfo: "./peer_info",
    PeerBook: "./peer_book",
    MulticastDNS: "./mdns",
    Railing: "./railing",
    dht: "./dht",
    swarm: "./swarm",
    Ping: "./ping",
    crypto: "./crypto",
    transport: "./transports",
    multistream: "./multistream",
    multiplex: "./multiplex",
    spdy: "./spdy",
    record: "./record",
    secio: "./secio",
    identify: "./identify",
    floodsub: "./floodsub",
    Netron: "./netron"
}, adone.asNamespace(exports), require);

// export const crypto = require("libp2p-crypto");

// export const floodsub = {
//     FloodSub: require("libp2p-floodsub")
// };

// export const transport = {
//     TCP: require("libp2p-tcp")
// };

// export const spdy = require("libp2p-spdy");
// export const secio = require("libp2p-secio");

// export const Node = require("libp2p");

// export const swarm = {
//     Swarm: require("libp2p-swarm")
// };

// export const PeerInfo = require("peer-info");
// export const PeerId = require("peer-id");
// export const PeerBook = require("peer-book");
