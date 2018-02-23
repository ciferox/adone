const parallel = require("async/parallel");
const rawPeer = require("./test-peer.json");

const {
    crypto: { Identity },
    net: { p2p: { Core, rendezvous, transport: { WebRTCStar } } },
    stream: { pull }
} = adone;

let wrtcRendezvous;
let wsRendezvous;
let node;

export default async (ctx) => {
    //     ctx.before((done) => {
    //         parallel([
    //             (cb) => {
    //                 WebRTCStar.sigServer.start({
    //                     port: 15555
    //                     // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
    //                 }, (err, server) => {
    //                     if (err) {
    //                         return cb(err);
    //                     }

    //                     wrtcRendezvous = server;
    //                     cb();
    //                 });
    //             },
    //             (cb) => {
    //                 rendezvous.start({
    //                     port: 14444,
    //                     refreshPeerListIntervalMS: 1000,
    //                     strictMultiaddr: false,
    //                     cryptoChallenge: true
    //                 }, (err, _server) => {
    //                     if (err) {
    //                         return cb(err);
    //                     }

    //                     wsRendezvous = _server;
    //                     cb();
    //                 });
    //             },
    //             (cb) => {
    //                 try {
    //                     const peerId = Identity.createFromJSON(rawPeer);
    //                     const peer = new PeerInfo(peerId);

    //                     peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9200/ws");

    //                     node = new Core({
    //                         peer,
    //                         transport: ["tcp", "ws"]
    //                     });
    //                     node.handle("/echo/1.0.0", (protocol, conn) => pull(conn, conn));
    //                     node.start().then(cb);
    //                     // cb();
    //                 } catch (err) {
    //                     adone.logError(err);
    //                     cb(err);
    //                 }
    //             }
    //         ], done);
    //     });

    //     ctx.after(async (done) => {
    //         await adone.promise.delay(2000);
    //         await node.stop();
    //         parallel(
    //             [wrtcRendezvous, wsRendezvous].map((s) => {
    //                 return (cb) => s.stop(cb);
    //             }),
    //             done);
    //     });
};
