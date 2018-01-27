const nodes = require("./fixtures/nodes");

const {
    multi,
    netron2: { Connection, PeerInfo, PeerId },
    stream: { pull }
} = adone;

const { protocol, Listener, multicodec } = adone.private(adone.netron2.circuit);

describe("netron2", "circuit", "listener", () => {
    describe("listen", () => {
        let swarm = null;
        let handlerSpy = null;
        let listener = null;
        let stream = null;
        let shake = null;
        let conn = null;

        beforeEach(() => {
            stream = pull.handshake({ timeout: 1000 * 60 });
            shake = stream.handshake;
            conn = new Connection(stream);
            conn.setPeerInfo(new PeerInfo(PeerId.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")));

            const peerId = PeerId.createFromJSON(nodes.node4);
            const peer = PeerInfo.create(peerId);
            swarm = {
                _peerInfo: peer,
                handle: spy((proto, h) => {
                    handlerSpy = spy(h);
                }),
                conns: {
                    QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
                }
            };

            listener = new Listener(swarm, {}, () => { });
            listener.listen();
        });

        afterEach(() => {
            listener = null;
        });

        it("should handle HOP", (done) => {
            handlerSpy(multicodec.relay, conn);

            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
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
                expect(message.type).to.equal(protocol.CircuitRelay.Type.HOP);

                expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                done();
            };

            pull(
                pull.values([protocol.CircuitRelay.encode(relayMsg)]),
                pull.lengthPrefixed.encode(),
                pull.collect((err, encoded) => {
                    assert.null(err);
                    encoded.forEach((e) => shake.write(e));
                })
            );
        });

        it("should handle STOP", (done) => {
            handlerSpy(multicodec.relay, conn);

            const relayMsg = {
                type: protocol.CircuitRelay.Type.STOP,
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
                expect(message.type).to.equal(protocol.CircuitRelay.Type.STOP);

                expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                done();
            };

            pull(
                pull.values([protocol.CircuitRelay.encode(relayMsg)]),
                pull.lengthPrefixed.encode(),
                pull.collect((err, encoded) => {
                    assert.null(err);
                    encoded.forEach((e) => shake.write(e));
                })
            );
        });

        it("should handle CAN_HOP", (done) => {
            handlerSpy(multicodec.relay, conn);

            const relayMsg = {
                type: protocol.CircuitRelay.Type.CAN_HOP,
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
                expect(message.type).to.equal(protocol.CircuitRelay.Type.CAN_HOP);

                expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id);
                expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0]);

                expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id);
                expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0]);

                done();
            };

            pull(
                pull.values([protocol.CircuitRelay.encode(relayMsg)]),
                pull.lengthPrefixed.encode(),
                pull.collect((err, encoded) => {
                    assert.null(err);
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
                    addrs: [multi.address.create("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                },
                dstPeer: {
                    id: Buffer.from("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"),
                    addrs: [multi.address.create("/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy").buffer]
                }
            };

            pull(
                pull.values([Buffer.from([relayMsg])]),
                pull.lengthPrefixed.encode(),
                pull.collect((err, encoded) => {
                    assert.null(err);
                    encoded.forEach((e) => shake.write(e));
                }),
                pull.lengthPrefixed.decodeFromReader(shake, { maxLength: this.maxLength }, (err, msg) => {
                    assert.null(err);
                    expect(protocol.CircuitRelay.decode(msg).type).to.equal(protocol.CircuitRelay.Type.STATUS);
                    expect(protocol.CircuitRelay.decode(msg).code).to.equal(protocol.CircuitRelay.Status.MALFORMED_MESSAGE);
                    done();
                })
            );
        });
    });

    describe("getAddrs", () => {
        let swarm = null;
        let listener = null;
        let peerInfo = null;

        beforeEach(() => {
            const peerId = PeerId.createFromJSON(nodes.node4);
            const peer = PeerInfo.create(peerId);
            swarm = {
                _peerInfo: peer
            };

            peerInfo = peer;
            listener = new Listener(swarm, {}, () => { });
        });

        afterEach(() => {
            peerInfo = null;
        });

        it("should return correct addrs", () => {
            peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/4002");
            peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/4003/ws");

            const addrs = listener.getAddrs();
            expect(addrs).to.deep.equal([
                multi.address.create("/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"),
                multi.address.create("/p2p-circuit/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy")
            ]);
        });

        it("don't return default addrs in an explicit p2p-circuit addres", () => {
            peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/4003/ws");
            peerInfo.multiaddrs.add("/p2p-circuit/ip4/0.0.0.0/tcp/4002");
            const addrs = listener.getAddrs();
            expect(addrs[0].toString()).to.equal("/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy");
        });
    });
});
