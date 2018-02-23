const nodes = require("./fixtures/nodes");

const {
    crypto: { Identity },
    net: { p2p: { Connection, PeerInfo } },
    stream: { pull }
} = adone;

const { Stop, StreamHandler, protocol } = adone.private(adone.net.p2p.circuit);

describe("circuit", "stop", () => {
    describe("handle relayed connections", () => {
        let stopHandler;

        let sw;
        let conn;
        let stream;

        beforeEach(() => {
            stream = pull.handshake({ timeout: 1000 * 60 });
            conn = new Connection(stream);
            conn.setPeerInfo(new PeerInfo(Identity.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")));

            const peerId = Identity.createFromJSON(nodes.node4);
            const peer = PeerInfo.create(peerId);
            peer.multiaddrs.add("/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
            sw = {
                _peerInfo: peer,
                conns: {
                    QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
                }
            };

            stopHandler = new Stop(sw);
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
