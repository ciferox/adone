const nodes = require("./fixtures/nodes");
const multiaddr = require("multiaddr");
const waterfall = require("async/waterfall");

const sinon = require("sinon");

const {
    p2p: { Connection, PeerId, PeerInfo, stream: { pull: { pull }, protocolBuffers: pb } },
    std: { path }
} = adone;

const srcPath = (...args) => path.join(adone.ROOT_PATH, "lib", "glosses", ...args);

const values = require(srcPath("p2p", "streams", "pull/sources/values"));
const asyncMap = require(srcPath("p2p", "streams", "pull/throughs/async-map"));
const pair = require(srcPath("p2p", "streams", "pair/duplex"));

const Dialer = require(srcPath("p2p", "circuit", "circuit/dialer"));
const proto = require(srcPath("p2p", "circuit", "protocol"));
const utilsFactory = require(srcPath("p2p", "circuit", "circuit/utils"));

describe("dialer tests", () => {
    describe(".dial", () => {
        const dialer = sinon.createStubInstance(Dialer);

        beforeEach(() => {
            dialer.relayPeers = new Map();
            dialer.relayPeers.set(nodes.node2.id, new Connection());
            dialer.relayPeers.set(nodes.node3.id, new Connection());
            dialer.dial.callThrough();
        });

        afterEach(() => {
            dialer._dialPeer.reset();
        });

        it("fail on non circuit addr", () => {
            const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`);
            expect(() => dialer.dial(dstMa, (err) => {
                err.to.match(/invalid circuit address/);
            }));
        });

        it("dial a peer", (done) => {
            const dstMa = multiaddr(`/p2p-circuit/ipfs/${nodes.node3.id}`);
            dialer._dialPeer.callsFake((dstMa, relay, callback) => {
                return callback(null, dialer.relayPeers.get(nodes.node3.id));
            });

            dialer.dial(dstMa, (err, conn) => {
                expect(err).to.not.exist();
                expect(conn).to.be.an.instanceOf(Connection);
                done();
            });
        });

        it("dial a peer over the specified relay", (done) => {
            const dstMa = multiaddr(`/ipfs/${nodes.node3.id}/p2p-circuit/ipfs/${nodes.node4.id}`);
            dialer._dialPeer.callsFake((dstMa, relay, callback) => {
                expect(relay.toString()).to.equal(`/ipfs/${nodes.node3.id}`);
                return callback(null, new Connection());
            });

            dialer.dial(dstMa, (err, conn) => {
                expect(err).to.not.exist();
                expect(conn).to.be.an.instanceOf(Connection);
                done();
            });
        });
    });

    describe(".canHop", () => {
        const dialer = sinon.createStubInstance(Dialer);

        let fromConn = null;
        const peer = new PeerInfo(PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA"));

        let p = null;
        beforeEach(() => {
            p = pair();
            fromConn = new Connection(p[0]);

            dialer.relayPeers = new Map();
            dialer.relayConns = new Map();
            dialer.utils = utilsFactory({});
            dialer.canHop.callThrough();
            dialer._dialRelayHelper.callThrough();
        });

        afterEach(() => {
            dialer._dialRelay.reset();
        });

        it("should handle successful CAN_HOP", (done) => {
            dialer._dialRelay.callsFake((_, cb) => {
                pull(
                    values([{
                        type: proto.CircuitRelay.type.HOP,
                        code: proto.CircuitRelay.Status.SUCCESS
                    }]),
                    pb.encode(proto.CircuitRelay),
                    p[1]
                );
                cb(null, fromConn);
            });

            dialer.canHop(peer, (err) => {
                expect(err).to.not.exist();
                expect(dialer.relayPeers.has(peer.id.toB58String())).to.be.ok();
                done();
            });
        });

        it("should handle failed CAN_HOP", (done) => {
            dialer._dialRelay.callsFake((_, cb) => {
                pull(
                    values([{
                        type: proto.CircuitRelay.type.HOP,
                        code: proto.CircuitRelay.Status.HOP_CANT_SPEAK_RELAY
                    }]),
                    pb.encode(proto.CircuitRelay),
                    p[1]
                );
                cb(null, fromConn);
            });

            dialer.canHop(peer, (err) => {
                expect(err).to.exist();
                expect(dialer.relayPeers.has(peer.id.toB58String())).not.to.be.ok();
                done();
            });
        });
    });

    describe("._dialPeer", () => {
        const dialer = sinon.createStubInstance(Dialer);

        beforeEach(() => {
            dialer.relayPeers = new Map();
            dialer.relayPeers.set(nodes.node1.id, new Connection());
            dialer.relayPeers.set(nodes.node2.id, new Connection());
            dialer.relayPeers.set(nodes.node3.id, new Connection());
            dialer._dialPeer.callThrough();
        });

        afterEach(() => {
            dialer._negotiateRelay.reset();
        });

        it("should dial a peer over any relay", (done) => {
            const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`);
            dialer._negotiateRelay.callsFake((conn, dstMa, callback) => {
                if (conn === dialer.relayPeers.get(nodes.node3.id)) {
                    return callback(null, dialer.relayPeers.get(nodes.node3.id));
                }

                callback(new Error("error"));
            });

            dialer._dialPeer(dstMa, (err, conn) => {
                expect(err).to.not.exist();
                expect(conn).to.be.an.instanceOf(Connection);
                expect(conn).to.deep.equal(dialer.relayPeers.get(nodes.node3.id));
                done();
            });
        });

        it("should fail dialing a peer over any relay", (done) => {
            const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`);
            dialer._negotiateRelay.callsFake((conn, dstMa, callback) => {
                callback(new Error("error"));
            });

            dialer._dialPeer(dstMa, (err, conn) => {
                expect(conn).to.be.undefined();
                expect(err).to.not.be.null();
                expect(err).to.equal("no relay peers were found or all relays failed to dial");
                done();
            });
        });
    });

    describe("._negotiateRelay", () => {
        const dialer = sinon.createStubInstance(Dialer);
        const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`);

        let conn = null;
        let peer = null;
        let p = null;
        const callback = sinon.stub();

        beforeEach((done) => {
            waterfall([
                (cb) => PeerId.createFromJSON(nodes.node4, cb),
                (peerId, cb) => PeerInfo.create(peerId, cb),
                (peer, cb) => {
                    peer.multiaddrs.add("/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
                    dialer.swarm = {
                        _peerInfo: peer
                    };
                    cb();
                },
                (cb) => {
                    dialer.utils = utilsFactory({});
                    dialer.relayConns = new Map();
                    dialer._negotiateRelay.callThrough();
                    dialer._dialRelayHelper.callThrough();
                    peer = new PeerInfo(PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"));
                    p = pair();
                    conn = new Connection(p[1]);
                    cb();
                }
            ], done);
        });

        afterEach(() => {
            callback.reset();
        });

        it("should write the correct dst addr", (done) => {
            dialer._dialRelay.callsFake((_, cb) => {
                pull(
                    p[0],
                    pb.decode(proto.CircuitRelay),
                    asyncMap((msg, cb) => {
                        expect(msg.dstPeer.addrs[0]).to.deep.equal(dstMa.buffer);
                        cb(null, {
                            type: proto.CircuitRelay.Type.STATUS,
                            code: proto.CircuitRelay.Status.SUCCESS
                        });
                    }),
                    pb.encode(proto.CircuitRelay),
                    p[0]
                );
                cb(null, conn);
            });

            dialer._negotiateRelay(peer, dstMa, done);
        });

        it("should negotiate relay", (done) => {
            dialer._dialRelay.callsFake((_, cb) => {
                pull(
                    p[0],
                    pb.decode(proto.CircuitRelay),
                    asyncMap((msg, cb) => {
                        expect(msg.dstPeer.addrs[0]).to.deep.equal(dstMa.buffer);
                        cb(null, {
                            type: proto.CircuitRelay.Type.STATUS,
                            code: proto.CircuitRelay.Status.SUCCESS
                        });
                    }),
                    pb.encode(proto.CircuitRelay),
                    p[0]
                );
                cb(null, conn);
            });

            dialer._negotiateRelay(peer, dstMa, (err, conn) => {
                expect(err).to.not.exist();
                expect(conn).to.be.instanceOf(Connection);
                done();
            });
        });

        it("should fail with an invalid peer id", (done) => {
            const dstMa = multiaddr("/ip4/127.0.0.1/tcp/4001");
            dialer._dialRelay.callsFake((_, cb) => {
                pull(
                    p[0],
                    pb.decode(proto.CircuitRelay),
                    asyncMap((msg, cb) => {
                        expect(msg.dstPeer.addrs[0]).to.deep.equal(dstMa.buffer);
                        cb(null, {
                            type: proto.CircuitRelay.Type.STATUS,
                            code: proto.CircuitRelay.Status.SUCCESS
                        });
                    }),
                    pb.encode(proto.CircuitRelay),
                    p[0]
                );
                cb(null, conn);
            });

            dialer._negotiateRelay(peer, dstMa, (err, conn) => {
                expect(err).to.exist();
                expect(conn).to.not.exist();
                done();
            });
        });

        it("should handle failed relay negotiation", (done) => {
            dialer._dialRelay.callsFake((_, cb) => {
                cb(null, conn);
                pull(
                    values([{
                        type: proto.CircuitRelay.Type.STATUS,
                        code: proto.CircuitRelay.Status.MALFORMED_MESSAGE
                    }]),
                    pb.encode(proto.CircuitRelay),
                    p[0]
                );
            });

            dialer._negotiateRelay(peer, dstMa, (err, conn) => {
                expect(err).to.not.be.null();
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.be.equal("Got 400 error code trying to dial over relay");
                done();
            });
        });
    });
});
