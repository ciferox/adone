const {
    p2p: { KadDHT, transport: { TCP }, muxer: { spdy }, secio, Node }
} = adone;

class TestNode extends Node {
    constructor({ peerInfo, peerBook }) {
        const modules = {
            transport: [TCP],
            streamMuxer: [spdy],
            connEncryption: [secio],
            dht: KadDHT
        };

        super({
            modules,
            peerInfo,
            peerBook
        });
    }
}

module.exports = TestNode;
