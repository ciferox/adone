const {
    p2p: { transport: { TCP }, muxer: { spdy }, secio, Node }
} = adone;

class TestNode extends Node {
    constructor({ peerInfo, peerBook }) {
        const modules = {
            transport: [TCP],
            streamMuxer: [spdy],
            connEncryption: [secio]
        };

        peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/0");

        super({
            modules,
            peerInfo,
            peerBook
        });
    }
}

module.exports = TestNode;
