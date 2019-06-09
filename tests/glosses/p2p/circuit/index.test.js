const nodes = require("./fixtures/nodes");
const sinon = require("sinon");

const {
    async: { waterfall },
    multiformat: { multiaddr },
    p2p: { Connection, PeerId, PeerInfo },
    stream: { pull }
} = adone;
const { collect, handshake, lengthPrefixed: lp, values, asyncMap, pair, protocolBuffers: pb } = pull;

const srcPath = (...args) => adone.getPath("lib", "glosses", ...args);

describe("p2p", "circuit", () => {
    describe("dialer tests", () => {
        const Dialer = require(srcPath("p2p", "circuit", "circuit/dialer"));
        const proto = require(srcPath("p2p", "circuit", "protocol"));
        const utilsFactory = require(srcPath("p2p", "circuit", "circuit/utils"));

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
                p = pair.duplex();
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
                        p = pair.duplex();
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

    describe("relay", () => {
        const Hop = require(srcPath("p2p", "circuit", "circuit/hop"));
        const proto = require(srcPath("p2p", "circuit", "protocol"));
        const StreamHandler = require(srcPath("p2p", "circuit", "circuit/stream-handler"));

        describe(".handle", () => {
            let relay;
            let swarm;
            let fromConn;
            let stream;
            let shake;

            beforeEach((done) => {
                stream = handshake({ timeout: 1000 * 60 });
                shake = stream.handshake;
                fromConn = new Connection(stream);
                const peerInfo = new PeerInfo(PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA"));
                fromConn.setPeerInfo(peerInfo);

                const peers = {
                    QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE:
                        new PeerInfo(PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")),
                    QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA:
                        new PeerInfo(PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA")),
                    QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy:
                        new PeerInfo(PeerId.createFromB58String("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"))
                };

                Object.keys(peers).forEach((key) => {
                    peers[key]._connectedMultiaddr = true;
                }); // make it truthy

                waterfall([
                    (cb) => PeerId.createFromJSON(nodes.node4, cb),
                    (peerId, cb) => PeerInfo.create(peerId, cb),
                    (peer, cb) => {
                        peer.multiaddrs.add("/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
                        swarm = {
                            _peerInfo: peer,
                            conns: {
                                QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection(),
                                QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA: new Connection(),
                                QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy: new Connection()
                            },
                            _peerBook: {
                                get: (peer) => {
                                    if (!peers[peer]) {
                                        throw new Error();
                                    }

                                    return peers[peer];
                                }
                            }
                        };

                        cb();
                    }
                ], () => {
                    relay = new Hop(swarm, { enabled: true });
                    relay._circuit = sinon.stub();
                    relay._circuit.callsArgWith(2, null, new Connection());
                    done();
                });
            });

            afterEach(() => {
                relay._circuit.reset();
            });

            it("should handle a valid circuit request", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                        addrs: [multiaddr("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                        addrs: [multiaddr("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                    }
                };

                relay.on("circuit:success", () => {
                    expect(relay._circuit.calledWith(sinon.match.any, relayMsg)).to.be.ok();
                    done();
                });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });

            it("should handle a request to passive circuit", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                        addrs: [multiaddr("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").id,
                        addrs: [multiaddr("/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").buffer]
                    }
                };

                relay.active = false;
                lp.decodeFromReader(
                    shake,
                    (err, msg) => {
                        expect(err).to.not.exist();

                        const response = proto.CircuitRelay.decode(msg);
                        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_NO_CONN_TO_DST);
                        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS);
                        done();
                    });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });

            it("should handle a request to active circuit", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                        addrs: [multiaddr("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").id,
                        addrs: [multiaddr("/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").buffer]
                    }
                };

                relay.active = true;
                relay.on("circuit:success", () => {
                    expect(relay._circuit.calledWith(sinon.match.any, relayMsg)).to.be.ok();
                    done();
                });

                relay.on("circuit:error", (err) => {
                    done(err);
                });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });

            it("not dial to self", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                        addrs: [multiaddr("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                        addrs: [multiaddr("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                    }
                };

                lp.decodeFromReader(
                    shake,
                    (err, msg) => {
                        expect(err).to.not.exist();

                        const response = proto.CircuitRelay.decode(msg);
                        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF);
                        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS);
                        done();
                    });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });

            it("fail on invalid src address", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: "sdfkjsdnfkjdsb",
                        addrs: ["sdfkjsdnfkjdsb"]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                        addrs: [multiaddr("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                    }
                };

                lp.decodeFromReader(
                    shake,
                    (err, msg) => {
                        expect(err).to.not.exist();

                        const response = proto.CircuitRelay.decode(msg);
                        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID);
                        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS);
                        done();
                    });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });

            it("fail on invalid dst address", (done) => {
                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                        addrs: [multiaddr("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                    },
                    dstPeer: {
                        id: PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                        addrs: ["sdfkjsdnfkjdsb"]
                    }
                };

                lp.decodeFromReader(
                    shake,
                    (err, msg) => {
                        expect(err).to.not.exist();

                        const response = proto.CircuitRelay.decode(msg);
                        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID);
                        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS);
                        done();
                    });

                relay.handle(relayMsg, new StreamHandler(fromConn));
            });
        });

        describe("._circuit", () => {
            let relay;
            let swarm;
            let srcConn;
            let dstConn;
            let srcStream;
            let dstStream;
            let srcShake;
            let dstShake;

            before((done) => {
                srcStream = handshake({ timeout: 1000 * 60 });
                srcShake = srcStream.handshake;
                srcConn = new Connection(srcStream);
                dstStream = handshake({ timeout: 1000 * 60 });
                dstShake = dstStream.handshake;
                dstConn = new Connection(dstStream);
                const peerInfo = new PeerInfo(PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA"));
                srcConn.setPeerInfo(peerInfo);

                const peers = {
                    QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE:
                        new PeerInfo(PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")),
                    QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA:
                        new PeerInfo(PeerId.createFromB58String("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA")),
                    QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy:
                        new PeerInfo(PeerId.createFromB58String("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"))
                };

                Object.keys(peers).forEach((key) => {
                    peers[key]._connectedMultiaddr = true;
                }); // make it truthy

                waterfall([
                    (cb) => PeerId.createFromJSON(nodes.node4, cb),
                    (peerId, cb) => PeerInfo.create(peerId, cb),
                    (peer, cb) => {
                        peer.multiaddrs.add("/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
                        swarm = {
                            _peerInfo: peer,
                            conns: {
                                QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection(),
                                QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA: new Connection(),
                                QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy: new Connection()
                            },
                            _peerBook: {
                                get: (peer) => {
                                    if (!peers[peer]) {
                                        throw new Error();
                                    }

                                    return peers[peer];
                                }
                            }
                        };

                        cb();
                    }
                ], () => {
                    relay = new Hop(swarm, { enabled: true });
                    relay._dialPeer = sinon.stub();
                    relay._dialPeer.callsArgWith(1, null, dstConn);

                    done();
                });
            });

            after(() => relay._dialPeer.reset());

            describe("should correctly dial destination node", () => {
                const msg = {
                    type: proto.CircuitRelay.Type.STOP,
                    srcPeer: {
                        id: Buffer.from("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA"),
                        addrs: [Buffer.from("dsfsdfsdf")]
                    },
                    dstPeer: {
                        id: Buffer.from("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"),
                        addrs: [Buffer.from("sdflksdfndsklfnlkdf")]
                    }
                };

                before(() => {
                    relay._circuit(
                        new StreamHandler(srcConn),
                        msg,
                        (err) => {
                            expect(err).to.not.exist();
                        });
                });

                it("should respond with SUCCESS to source node", (done) => {
                    lp.decodeFromReader(
                        srcShake,
                        (err, msg) => {
                            expect(err).to.not.exist();

                            const response = proto.CircuitRelay.decode(msg);
                            expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS);
                            expect(response.code).to.equal(proto.CircuitRelay.Status.SUCCESS);
                            done();
                        });
                });

                it("should send STOP message to destination node", (done) => {
                    lp.decodeFromReader(
                        dstShake,
                        (err, _msg) => {
                            expect(err).to.not.exist();

                            const response = proto.CircuitRelay.decode(_msg);
                            expect(response.type).to.deep.equal(msg.type);
                            expect(response.srcPeer).to.deep.equal(msg.srcPeer);
                            expect(response.dstPeer).to.deep.equal(msg.dstPeer);
                            done();
                        });
                });

                it("should create circuit", (done) => {
                    pull(
                        values([proto.CircuitRelay.encode({
                            type: proto.CircuitRelay.Type.STATUS,
                            code: proto.CircuitRelay.Status.SUCCESS
                        })]),
                        lp.encode(),
                        collect((err, encoded) => {
                            expect(err).to.not.exist();

                            encoded.forEach((e) => dstShake.write(e));
                            pull(
                                values([Buffer.from("hello")]),
                                lp.encode(),
                                collect((err, encoded) => {
                                    expect(err).to.not.exist();

                                    encoded.forEach((e) => srcShake.write(e));
                                    lp.decodeFromReader(
                                        dstShake,
                                        (err, _msg) => {
                                            expect(err).to.not.exist();
                                            expect(_msg.toString()).to.equal("hello");

                                            done();
                                        });
                                })
                            );
                        })
                    );
                });
            });

            describe("should fail creating circuit", () => {
                const msg = {
                    type: proto.CircuitRelay.Type.STOP,
                    srcPeer: {
                        id: Buffer.from("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA"),
                        addrs: [Buffer.from("dsfsdfsdf")]
                    },
                    dstPeer: {
                        id: Buffer.from("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"),
                        addrs: [Buffer.from("sdflksdfndsklfnlkdf")]
                    }
                };

                it("should not create circuit", (done) => {
                    relay._circuit(
                        new StreamHandler(srcConn),
                        msg,
                        (err) => {
                            expect(err).to.exist();
                            expect(err).to.match(/Unable to create circuit!/);
                            done();
                        });

                    pull(
                        values([proto.CircuitRelay.encode({
                            type: proto.CircuitRelay.Type.STATUS,
                            code: proto.CircuitRelay.Status.STOP_RELAY_REFUSED
                        })]),
                        lp.encode(),
                        collect((err, encoded) => {
                            expect(err).to.not.exist();

                            encoded.forEach((e) => dstShake.write(e));
                        })
                    );
                });
            });
        });
    });

    describe("listener", () => {
        const Listener = require(srcPath("p2p", "circuit", "listener"));
        const proto = require(srcPath("p2p", "circuit", "protocol"));
        const multicodec = require(srcPath("p2p", "circuit", "multicodec"));

        describe("listen", () => {
            let swarm = null;
            let handlerSpy = null;
            let listener = null;
            let stream = null;
            let shake = null;
            let conn = null;

            beforeEach((done) => {
                stream = handshake({ timeout: 1000 * 60 });
                shake = stream.handshake;
                conn = new Connection(stream);
                conn.setPeerInfo(new PeerInfo(PeerId
                    .createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")));

                waterfall([
                    (cb) => PeerId.createFromJSON(nodes.node4, cb),
                    (peerId, cb) => PeerInfo.create(peerId, cb),
                    (peer, cb) => {
                        swarm = {
                            _peerInfo: peer,
                            handle: sinon.spy((proto, h) => {
                                handlerSpy = sinon.spy(h);
                            }),
                            conns: {
                                QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
                            }
                        };

                        listener = Listener(swarm, {}, () => { });
                        listener.listen();
                        cb();
                    }
                ], done);
            });

            afterEach(() => {
                listener = null;
            });

            it("should handle HOP", (done) => {
                handlerSpy(multicodec.relay, conn);

                const relayMsg = {
                    type: proto.CircuitRelay.Type.HOP,
                    srcPeer: {
                        id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                        addrs: ["/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"]
                    },
                    dstPeer: {
                        id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                        addrs: ["/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"]
                    }
                };

                listener.hopHandler.handle = (message, conn) => {
                    expect(message.type).to.equal(proto.CircuitRelay.Type.HOP);

                    expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                    expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                    expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                    expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                    done();
                };

                pull(
                    values([proto.CircuitRelay.encode(relayMsg)]),
                    lp.encode(),
                    collect((err, encoded) => {
                        expect(err).to.not.exist();
                        encoded.forEach((e) => shake.write(e));
                    })
                );
            });

            it("should handle STOP", (done) => {
                handlerSpy(multicodec.relay, conn);

                const relayMsg = {
                    type: proto.CircuitRelay.Type.STOP,
                    srcPeer: {
                        id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                        addrs: ["/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"]
                    },
                    dstPeer: {
                        id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                        addrs: ["/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"]
                    }
                };

                listener.stopHandler.handle = (message, conn) => {
                    expect(message.type).to.equal(proto.CircuitRelay.Type.STOP);

                    expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                    expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                    expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                    expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                    done();
                };

                pull(
                    values([proto.CircuitRelay.encode(relayMsg)]),
                    lp.encode(),
                    collect((err, encoded) => {
                        expect(err).to.not.exist();
                        encoded.forEach((e) => shake.write(e));
                    })
                );
            });

            it("should emit 'connection'", (done) => {
                handlerSpy(multicodec.relay, conn);

                const relayMsg = {
                    type: proto.CircuitRelay.Type.STOP,
                    srcPeer: {
                        id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                        addrs: ["/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"]
                    },
                    dstPeer: {
                        id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                        addrs: ["/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"]
                    }
                };

                listener.stopHandler.handle = (message, sh) => {
                    const newConn = new Connection(sh.rest());
                    listener.stopHandler.emit("connection", newConn);
                };

                listener.on("connection", (conn) => {
                    expect(conn).to.be.instanceof(Connection);
                    done();
                });

                pull(
                    values([proto.CircuitRelay.encode(relayMsg)]),
                    lp.encode(),
                    collect((err, encoded) => {
                        expect(err).to.not.exist();
                        encoded.forEach((e) => shake.write(e));
                    })
                );
            });

            it("should handle CAN_HOP", (done) => {
                handlerSpy(multicodec.relay, conn);

                const relayMsg = {
                    type: proto.CircuitRelay.Type.CAN_HOP,
                    srcPeer: {
                        id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                        addrs: ["/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"]
                    },
                    dstPeer: {
                        id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                        addrs: ["/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"]
                    }
                };

                listener.hopHandler.handle = (message, conn) => {
                    expect(message.type).to.equal(proto.CircuitRelay.Type.CAN_HOP);

                    expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                    expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                    expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                    expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                    done();
                };

                pull(
                    values([proto.CircuitRelay.encode(relayMsg)]),
                    lp.encode(),
                    collect((err, encoded) => {
                        expect(err).to.not.exist();
                        encoded.forEach((e) => shake.write(e));
                    })
                );
            });

            it("should handle invalid message correctly", function (done) {
                handlerSpy(multicodec.relay, conn);

                const relayMsg = {
                    type: 100000,
                    srcPeer: {
                        id: Buffer.from("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE"),
                        addrs: [multiaddr("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                    },
                    dstPeer: {
                        id: Buffer.from("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"),
                        addrs: [multiaddr("/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy").buffer]
                    }
                };

                pull(
                    values([Buffer.from([relayMsg])]),
                    lp.encode(),
                    collect((err, encoded) => {
                        expect(err).to.not.exist();
                        encoded.forEach((e) => shake.write(e));
                    }),
                    lp.decodeFromReader(shake, { maxLength: this.maxLength }, (err, msg) => {
                        expect(err).to.not.exist();
                        expect(proto.CircuitRelay.decode(msg).type).to.equal(proto.CircuitRelay.Type.STATUS);
                        expect(proto.CircuitRelay.decode(msg).code).to.equal(proto.CircuitRelay.Status.MALFORMED_MESSAGE);
                        done();
                    })
                );
            });
        });

        describe("getAddrs", () => {
            let swarm = null;
            let listener = null;
            let peerInfo = null;

            beforeEach((done) => {
                waterfall([
                    (cb) => PeerId.createFromJSON(nodes.node4, cb),
                    (peerId, cb) => PeerInfo.create(peerId, cb),
                    (peer, cb) => {
                        swarm = {
                            _peerInfo: peer
                        };

                        peerInfo = peer;
                        listener = Listener(swarm, {}, () => { });
                        cb();
                    }
                ], done);
            });

            afterEach(() => {
                peerInfo = null;
            });

            it("should return correct addrs", () => {
                peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/4002");
                peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/4003/ws");

                listener.getAddrs((err, addrs) => {
                    expect(err).to.not.exist();
                    expect(addrs).to.deep.equal([
                        multiaddr("/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"),
                        multiaddr("/p2p-circuit/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy")]);
                });
            });

            it("don't return default addrs in an explicit p2p-circuit addres", () => {
                peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/4003/ws");
                peerInfo.multiaddrs.add("/p2p-circuit/ip4/0.0.0.0/tcp/4002");
                listener.getAddrs((err, addrs) => {
                    expect(err).to.not.exist();
                    expect(addrs[0]
                        .toString())
                        .to.equal("/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy");
                });
            });
        });
    });

    describe("protocol", () => {
        const proto = require(srcPath("p2p", "circuit", "protocol"));

        let msgObject = null;
        let message = null;

        before(() => {
            msgObject = {
                type: proto.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: Buffer.from("QmSource"),
                    addrs: [
                        multiaddr("/p2p-circuit/ipfs/QmSource").buffer,
                        multiaddr("/p2p-circuit/ip4/0.0.0.0/tcp/9000/ipfs/QmSource").buffer,
                        multiaddr("/ip4/0.0.0.0/tcp/9000/ipfs/QmSource").buffer
                    ]
                },
                dstPeer: {
                    id: Buffer.from("QmDest"),
                    addrs: [
                        multiaddr("/p2p-circuit/ipfs/QmDest").buffer,
                        multiaddr("/p2p-circuit/ip4/1.1.1.1/tcp/9000/ipfs/QmDest").buffer,
                        multiaddr("/ip4/1.1.1.1/tcp/9000/ipfs/QmDest").buffer
                    ]
                }
            };

            const buff = proto.CircuitRelay.encode(msgObject);
            message = proto.CircuitRelay.decode(buff);
        });

        it("should source and dest", () => {
            expect(message.srcPeer).to.deep.equal(msgObject.srcPeer);
            expect(message.dstPeer).to.deep.equal(msgObject.dstPeer);
        });

        it("should encode message", () => {
            expect(message.message).to.deep.equal(msgObject.message);
        });
    });

    describe("stop", () => {
        const Stop = require(srcPath("p2p", "circuit", "circuit/stop"));
        const StreamHandler = require(srcPath("p2p", "circuit", "circuit/stream-handler"));
        const proto = require(srcPath("p2p", "circuit", "protocol"));

        describe("handle relayed connections", () => {
            let stopHandler;

            let swarm;
            let conn;
            let stream;

            beforeEach((done) => {
                stream = handshake({ timeout: 1000 * 60 });
                conn = new Connection(stream);
                const peerId = PeerId.createFromB58String("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE");
                conn.setPeerInfo(new PeerInfo(peerId));

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
                    type: proto.CircuitRelay.Type.STOP,
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
                    type: proto.CircuitRelay.Type.STOP,
                    srcPeer: {
                        id: "QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE",
                        addrs: ["dsfsdfsdf"]
                    },
                    dstPeer: {
                        id: "QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy",
                        addrs: ["sdflksdfndsklfnlkdf"]
                    }
                }, new StreamHandler(conn), (conn) => {
                    expect(conn).to.not.exist();
                    done();
                });
            });
        });
    });
});
