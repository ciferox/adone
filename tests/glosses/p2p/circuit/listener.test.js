
const nodes = require("./fixtures/nodes");
const waterfall = require("async/waterfall");
const multiaddr = require("multiaddr");

const {
    p2p: { Connection, PeerId, PeerInfo },
    stream: { pull2: pull },
    std: { path }
} = adone;
const { collect, values, handshake, lengthPrefixed: lp } = pull;

const srcPath = (...args) => path.join(adone.ROOT_PATH, "lib", "glosses", ...args);

const Listener = require(srcPath("p2p", "circuit", "listener"));
const proto = require(srcPath("p2p", "circuit", "protocol"));
const multicodec = require(srcPath("p2p", "circuit", "multicodec"));

const sinon = require("sinon");

describe("listener", () => {
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
