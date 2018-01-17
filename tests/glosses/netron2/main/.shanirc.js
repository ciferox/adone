const parallel = require("async/parallel");
const rawPeer = require("./test-peer.json");

const {
    netron2: { rendezvous, PeerInfo, PeerId, transport: { WebRTCStar } },
    stream: { pull }
} = adone;

import TestNode from "./node";

let wrtcRendezvous;
let wsRendezvous;
let node;

export default async (ctx) => {
    ctx.before((done) => {
        parallel([
            (cb) => {
                WebRTCStar.sigServer.start({
                    port: 15555
                    // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
                }, (err, server) => {
                    if (err) {
                        return cb(err);
                    }
                    
                    wrtcRendezvous = server;
                    cb();
                });
            },
            (cb) => {
                rendezvous.start({
                    port: 14444,
                    refreshPeerListIntervalMS: 1000,
                    strictMultiaddr: false,
                    cryptoChallenge: true
                }, (err, _server) => {
                    if (err) {
                        return cb(err);
                    }
                    
                    wsRendezvous = _server;
                    cb();
                });
            },
            (cb) => {
                try {
                    const peerId = PeerId.createFromJSON(rawPeer);
                    const peer = new PeerInfo(peerId);

                    peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9200/ws");

                    node = new TestNode(peer);
                    node.handle("/echo/1.0.0", (protocol, conn) => pull(conn, conn));
                    node.start(cb);
                } catch (err) {
                    cb(err);
                }
            }
        ], done);
    });

    ctx.after((done) => {
        setTimeout(() => parallel(
            [node, wrtcRendezvous, wsRendezvous].map((s) => {
                return (cb) => s.stop(cb);
            }), done), 2000);
    });
};
