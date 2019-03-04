const {
    p2p: { TCP, spdy, secio, Node }
} = adone;

class TestNode extends Node {
    constructor({ peerInfo, peerBook }) {
        const modules = {
            transport: [TCP],
            streamMuxer: [spdy],
            connEncryption: [secio]
        };

        super({
            modules,
            peerInfo,
            peerBook
        });
    }
}

module.exports = TestNode;
