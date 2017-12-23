const nodes = require("./fixtures/nodes");
const waterfall = require("async/waterfall");

const {
    netron2: { Connection, PeerInfo, PeerId },
    stream: { pull }
} = adone;

const { Stop, StreamHandler, protocol } = adone.private(adone.netron2.circuit);


describe("stop", () => {
    describe("handle relayed connections", () => {
        let stopHandler;

        let swarm;
        let conn;
        let stream;

        beforeEach((done) => {
            stream = pull.handshake({ timeout: 1000 * 60 });
            conn = new Connection(stream);
            conn.setPeerInfo(new PeerInfo(PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")));

            waterfall([
                (cb) => PeerId.createFromJSON(nodes.node4, cb),
                (peerId, cb) => PeerInfo.create(peerId, cb),
                (peer, cb) => {
                    peer.multiaddrs.add("/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
                    swarm = {
                        _peerInfo: peer,
                        conns: {
                            QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
                        }
                    };

                    stopHandler = new Stop(swarm);
                    cb();
                }
            ], done);
        });

        it("handle request with a valid multiaddr", (done) => {
            stopHandler.handle({
                type: protocol.CircuitRelay.Type.STOP,
                srcPeer: {
                    id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                    addrs: ["/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"]
                },
                dstPeer: {
                    id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                    addrs: ["/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"]
                }
            }, new StreamHandler(conn), (conn) => { // multistream handler doesn't expect errors...
                expect(conn).to.be.instanceOf(Connection);
                done();
            });
        });

        it("handle request with invalid multiaddr", (done) => {
            stopHandler.handle({
                type: protocol.CircuitRelay.Type.STOP,
                srcPeer: {
                    id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                    addrs: ["dsfsdfsdf"]
                },
                dstPeer: {
                    id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                    addrs: ["sdflksdfndsklfnlkdf"]
                }
            }, new StreamHandler(conn), (conn) => {
                assert.notExists(conn);
                done();
            });
        });
    });
});
