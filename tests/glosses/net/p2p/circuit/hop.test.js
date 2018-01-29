const nodes = require("./fixtures/nodes");

const {
    multi,
    net: { p2p: { Connection, PeerInfo, PeerId } },
    stream: { pull }
} = adone;
const { StreamHandler, Hop, protocol } = adone.private(adone.net.p2p.circuit);

describe("circuit", "relay", () => {
    describe("should handle circuit requests", () => {
        let relay;
        let swarm;
        let fromConn;
        let stream;
        let shake;

        beforeEach(() => {
            stream = pull.handshake({ timeout: 1000 * 60 });
            shake = stream.handshake;
            fromConn = new Connection(stream);
            fromConn.setPeerInfo(new PeerInfo(PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA")));

            const peers = {
                QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE:
                    new PeerInfo(PeerId.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE")),
                QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA:
                    new PeerInfo(PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA")),
                QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy:
                    new PeerInfo(PeerId.createFromBase58("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy"))
            };

            Object.keys(peers).forEach((key) => {
                peers[key]._connectedMultiaddr = true;
            }); // make it truthy

            const peerId = PeerId.createFromJSON(nodes.node4);
            const peer = PeerInfo.create(peerId);
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

            relay = new Hop(swarm, { enabled: true });
            relay._circuit = stub();
            relay._circuit.callsArg(2, null, new Connection());
        });

        afterEach(() => {
            relay._circuit.reset();
        });

        it("should handle a valid circuit request", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: PeerId.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                    addrs: [multi.address.create("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                    addrs: [multi.address.create("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                }
            };

            relay.on("circuit:success", () => {
                assert.ok(relay._circuit.calledWith(match.any, relayMsg));
                done();
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });

        it("should handle a request to passive circuit", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                    addrs: [multi.address.create("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").id,
                    addrs: [multi.address.create("/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").buffer]
                }
            };

            relay.active = false;
            pull.lengthPrefixed.decodeFromReader(shake, (err, msg) => {
                assert.null(err);

                const response = protocol.CircuitRelay.decode(msg);
                expect(response.code).to.equal(protocol.CircuitRelay.Status.HOP_NO_CONN_TO_DST);
                expect(response.type).to.equal(protocol.CircuitRelay.Type.STATUS);
                done();
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });

        it("should handle a request to active circuit", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                    addrs: [multi.address.create("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").id,
                    addrs: [multi.address.create("/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe").buffer]
                }
            };

            relay.active = true;
            relay.on("circuit:success", () => {
                assert.ok(relay._circuit.calledWith(match.any, relayMsg));
                done();
            });

            relay.on("circuit:error", (err) => {
                done(err);
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });

        it("not connect to self", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: PeerId.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                    addrs: [multi.address.create("/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").buffer]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy").id,
                    addrs: [multi.address.create("/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy").buffer]
                }
            };

            pull.lengthPrefixed.decodeFromReader(shake, (err, msg) => {
                assert.null(err);

                const response = protocol.CircuitRelay.decode(msg);
                expect(response.code).to.equal(protocol.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF);
                expect(response.type).to.equal(protocol.CircuitRelay.Type.STATUS);
                done();
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });

        it("fail on invalid src address", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: "sdfkjsdnfkjdsb",
                    addrs: ["sdfkjsdnfkjdsb"]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                    addrs: [multi.address.create("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                }
            };

            pull.lengthPrefixed.decodeFromReader(shake, (err, msg) => {
                assert.null(err);

                const response = protocol.CircuitRelay.decode(msg);
                expect(response.code).to.equal(protocol.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID);
                expect(response.type).to.equal(protocol.CircuitRelay.Type.STATUS);
                done();
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });

        it("fail on invalid dst address", (done) => {
            const relayMsg = {
                type: protocol.CircuitRelay.Type.HOP,
                srcPeer: {
                    id: PeerId.createFromBase58("QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").id,
                    addrs: [multi.address.create("/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA").buffer]
                },
                dstPeer: {
                    id: PeerId.createFromBase58("QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE").id,
                    addrs: ["sdfkjsdnfkjdsb"]
                }
            };

            pull.lengthPrefixed.decodeFromReader(shake, (err, msg) => {
                assert.null(err);

                const response = protocol.CircuitRelay.decode(msg);
                expect(response.code).to.equal(protocol.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID);
                expect(response.type).to.equal(protocol.CircuitRelay.Type.STATUS);
                done();
            });

            relay.handle(relayMsg, new StreamHandler(fromConn));
        });
    });
});
