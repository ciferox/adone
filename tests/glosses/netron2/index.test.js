const parallel = require("async/parallel");
const series = require("async/series");
const wrtc = require("wrtc");
const waterfall = require("async/waterfall");

const {
    is,
    multi,
    stream: { pull },
    netron2: { rendezvous, CID, circuit: { Circuit }, Node, secio, multiplex, MulticastDNS, PeerInfo, PeerId, spdy, dht: { KadDHT }, Railing, transport: { TCP, WS, WebRTCStar, WSStar } },
    vendor: { lodash: { times: _times } }
} = adone;

const mapMuxers = function (list) {
    return list.map((pref) => {
        if (!is.string(pref)) {
            return pref;
        }
        switch (pref.trim().toLowerCase()) {
            case "spdy": return spdy;
            case "multiplex": return multiplex;
            default:
                throw new Error(`${pref} muxer not available`);
        }
    });
};

const getMuxers = function (muxers) {
    const muxerPrefs = process.env.LIBP2P_MUXER;
    if (muxerPrefs && !muxers) {
        return mapMuxers(muxerPrefs.split(","));
    } else if (muxers) {
        return mapMuxers(muxers);
    }
    return [multiplex, spdy];
};

class TestNode extends Node {
    constructor(peerInfo, peerBook, options) {
        options = options || {};

        const modules = {
            transport: [
                new TCP(),
                new WS()
            ],
            connection: {
                muxer: getMuxers(options.muxer),
                crypto: [secio]
            },
            discovery: []
        };

        if (options.dht) {
            modules.DHT = KadDHT;
        }

        if (options.mdns) {
            const mdns = new MulticastDNS(peerInfo, "ipfs.local");
            modules.discovery.push(mdns);
        }

        if (options.bootstrap) {
            const r = new Railing(options.bootstrap);
            modules.discovery.push(r);
        }

        if (options.modules && options.modules.transport) {
            options.modules.transport.forEach((t) => modules.transport.push(t));
        }

        if (options.modules && options.modules.discovery) {
            options.modules.discovery.forEach((d) => modules.discovery.push(d));
        }

        super(modules, peerInfo, peerBook, options);
    }
}

const createNode = function (multiaddrs, options) {
    options = options || {};

    if (!is.array(multiaddrs)) {
        multiaddrs = [multiaddrs];
    }

    const peerId = PeerId.create({ bits: 1024 });
    const peerInfo = PeerInfo.create(peerId);
    multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma));
    return new TestNode(peerInfo, undefined, options);
};

const echo = function (protocol, conn) {
    pull(conn, conn);
};

describe("netron2", () => {
    describe("transports", () => {
        describe("TCP only", () => {
            let nodeA;
            let nodeB;

            before((done) => {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0");
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode("/ip4/0.0.0.0/tcp/0");
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], done);
            });

            after((done) => {
                parallel([
                    (cb) => nodeA.stop(cb),
                    (cb) => nodeB.stop(cb)
                ], done);
            });

            it("nodeA.dial nodeB using PeerInfo without proto (warmup)", (done) => {
                nodeA.dial(nodeB.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                assert.notExists(err);
                                expect(Object.keys(peers)).to.have.length(1);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                assert.notExists(err);
                                expect(Object.keys(peers)).to.have.length(1);
                                cb();
                            }
                        ], done);
                    };

                    // Some time for Identify to finish
                    setTimeout(check, 500);
                });
            });

            it("nodeA.dial nodeB using PeerInfo", (done) => {
                nodeA.dial(nodeB.peerInfo, "/echo/1.0.0", (err, conn) => {
                    assert.notExists(err);

                    pull(
                        pull.values([Buffer.from("hey")]),
                        conn,
                        pull.collect((err, data) => {
                            assert.notExists(err);
                            expect(data).to.be.eql([Buffer.from("hey")]);
                            done();
                        })
                    );
                });
            });

            it("nodeA.hangUp nodeB using PeerInfo (first)", (done) => {
                nodeA.hangUp(nodeB.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);

                                expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0);
                                cb();
                            }
                        ], done);
                    };

                    setTimeout(check, 500);
                });
            });

            it("nodeA.dial nodeB using multiaddr", (done) => {
                nodeA.dial(nodeB.peerInfo.multiaddrs.toArray()[0], "/echo/1.0.0", (err, conn) => {
                    const check = function () {
                        assert.notExists(err);
                        series([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);

                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);

                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1);
                                cb();
                            }
                        ], () => {
                            pull(
                                pull.values([Buffer.from("hey")]),
                                conn,
                                pull.collect((err, data) => {
                                    assert.notExists(err);
                                    expect(data).to.be.eql([Buffer.from("hey")]);
                                    done();
                                })
                            );
                        });
                    };

                    // Some time for Identify to finish
                    setTimeout(check, 500);
                });
            });

            it("nodeA.hangUp nodeB using multiaddr (second)", (done) => {
                nodeA.hangUp(nodeB.peerInfo.multiaddrs.toArray()[0], (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);

                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);

                                expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0);
                                cb();
                            }
                        ], done);
                    };

                    setTimeout(check, 500);
                });
            });

            it("nodeA.dial nodeB using PeerId", (done) => {
                nodeA.dial(nodeB.peerInfo.id, "/echo/1.0.0", (err, conn) => {
                    // Some time for Identify to finish

                    const check = function () {
                        assert.notExists(err);
                        series([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(1);
                                cb();
                            }
                        ], () => {
                            pull(
                                pull.values([Buffer.from("hey")]),
                                conn,
                                pull.collect((err, data) => {
                                    assert.notExists(err);
                                    expect(data).to.eql([Buffer.from("hey")]);
                                    done();
                                })
                            );
                        });
                    };

                    setTimeout(check, 500);
                });
            });

            it("nodeA.hangUp nodeB using PeerId (third)", (done) => {
                nodeA.hangUp(nodeB.peerInfo.multiaddrs.toArray()[0], (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeA.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeB.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeB.swarm.muxedConns)).to.have.length(0);
                                cb();
                            }
                        ], done);
                    };

                    setTimeout(check, 500);
                });
            });
        });

        describe("TCP + WebSockets", () => {
            let nodeTCP;
            let nodeTCPnWS;
            let nodeWS;

            before((done) => {
                parallel([
                    (cb) => {
                        nodeTCP = createNode(["/ip4/0.0.0.0/tcp/0"]);
                        nodeTCP.handle("/echo/1.0.0", echo);
                        nodeTCP.start(cb);
                    },
                    (cb) => {
                        nodeTCPnWS = createNode(["/ip4/0.0.0.0/tcp/0", "/ip4/127.0.0.1/tcp/25011/ws"]);
                        nodeTCPnWS.handle("/echo/1.0.0", echo);
                        nodeTCPnWS.start(cb);
                    },
                    (cb) => {
                        nodeWS = createNode(["/ip4/127.0.0.1/tcp/25022/ws"]);
                        nodeWS.handle("/echo/1.0.0", echo);
                        nodeWS.start(cb);
                    }
                ], done);
            });

            after((done) => {
                parallel([
                    (cb) => nodeTCP.stop(cb),
                    (cb) => nodeTCPnWS.stop(cb),
                    (cb) => nodeWS.stop(cb)
                ], done);
            });

            it("nodeTCP.dial nodeTCPnWS using PeerInfo", (done) => {
                nodeTCP.dial(nodeTCPnWS.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeTCP.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeTCP.swarm.muxedConns)).to.have.length(1);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeTCPnWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeTCPnWS.swarm.muxedConns)).to.have.length(1);
                                cb();
                            }
                        ], done);
                    };

                    // Some time for Identify to finish
                    setTimeout(check, 500);
                });
            });

            it("nodeTCP.hangUp nodeTCPnWS using PeerInfo", (done) => {
                nodeTCP.hangUp(nodeTCPnWS.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeTCP.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeTCP.swarm.muxedConns)).to.have.length(0);

                                cb();
                            },
                            (cb) => {
                                const peers = nodeTCPnWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeTCPnWS.swarm.muxedConns)).to.have.length(0);
                                cb();
                            }
                        ], done);
                    };

                    setTimeout(check, 500);
                });
            });

            it("nodeTCPnWS.dial nodeWS using PeerInfo", (done) => {
                nodeTCPnWS.dial(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeTCPnWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(2);
                                expect(Object.keys(nodeTCPnWS.swarm.muxedConns)).to.have.length(1);
                                cb();
                            },
                            (cb) => {
                                const peers = nodeWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeWS.swarm.muxedConns)).to.have.length(1);
                                cb();
                            }
                        ], done);
                    };

                    // Some time for Identify to finish
                    setTimeout(check, 500);
                });
            });

            it("nodeTCPnWS.hangUp nodeWS using PeerInfo", (done) => {
                nodeTCPnWS.hangUp(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);

                    const check = function () {
                        parallel([
                            (cb) => {
                                const peers = nodeTCPnWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(2);
                                expect(Object.keys(nodeTCPnWS.swarm.muxedConns)).to.have.length(0);

                                cb();
                            },
                            (cb) => {
                                const peers = nodeWS.peerBook.getAll();
                                expect(Object.keys(peers)).to.have.length(1);
                                expect(Object.keys(nodeWS.swarm.muxedConns)).to.have.length(0);
                                cb();
                            }
                        ], done);
                    };

                    setTimeout(check, 500);
                });
            });

            // Until https://github.com/libp2p/js-libp2p/issues/46 is resolved
            // Everynode will be able to dial in WebSockets
            it.skip("nodeTCP.dial nodeWS using PeerInfo is unsuccesful", (done) => {
                nodeTCP.dial(nodeWS.peerInfo, (err) => {
                    assert.exists(err);
                    done();
                });
            });
        });

        describe.todo("TCP + WebSockets + WebRTCStar", () => {
            let nodeAll;
            let nodeTCP;
            let nodeWS;
            let nodeWStar;

            let ss;

            before(function (done) {
                this.timeout(30000);

                parallel([
                    (cb) => {
                        WebRTCStar.sigServer.start({ port: 24642 }, (err, server) => {
                            assert.notExists(err);
                            ss = server;
                            cb();
                        });
                    },
                    (cb) => {
                        const wstar = new WebRTCStar({ wrtc });
                        nodeAll = createNode(["/ip4/0.0.0.0/tcp/0", "/ip4/127.0.0.1/tcp/25011/ws", "/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star"], {
                            modules: {
                                transport: [wstar],
                                discovery: [wstar.discovery]
                            }
                        });
                        nodeAll.handle("/echo/1.0.0", echo);
                        nodeAll.start(cb);
                    },
                    (cb) => {
                        nodeTCP = createNode(["/ip4/0.0.0.0/tcp/0"]);
                        nodeTCP.handle("/echo/1.0.0", echo);
                        nodeTCP.start(cb);
                    },
                    (cb) => {
                        nodeWS = createNode(["/ip4/127.0.0.1/tcp/25022/ws"]);
                        nodeWS.handle("/echo/1.0.0", echo);
                        nodeWS.start(cb);
                    },
                    (cb) => {
                        const wstar = new WebRTCStar({ wrtc });

                        nodeWStar = createNode(["/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star"], {
                            modules: {
                                transport: [wstar],
                                discovery: [wstar.discovery]
                            }
                        });

                        nodeWStar.handle("/echo/1.0.0", echo);
                        nodeWStar.start(cb);
                    }
                ], done);
            });

            after((done) => {
                parallel([
                    (cb) => nodeAll.stop(cb),
                    (cb) => nodeTCP.stop(cb),
                    (cb) => nodeWS.stop(cb),
                    (cb) => nodeWStar.stop(cb),
                    (cb) => ss.stop(cb)
                ], done);
            });

            const check = function (otherNode, muxed, peers, callback) {
                let i = 1;
                [nodeAll, otherNode].forEach((node) => {
                    expect(Object.keys(node.peerBook.getAll())).to.have.length(i-- ? peers : 1);
                    expect(Object.keys(node.swarm.muxedConns)).to.have.length(muxed);
                });
                callback();
            };

            it("nodeAll.dial nodeTCP using PeerInfo", (done) => {
                nodeAll.dial(nodeTCP.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeTCP, 1, 1, done), 500);
                });
            });

            it("nodeAll.hangUp nodeTCP using PeerInfo", (done) => {
                nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeTCP, 0, 1, done), 500);
                });
            });

            it("nodeAll.dial nodeWS using PeerInfo", (done) => {
                nodeAll.dial(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWS, 1, 2, done), 500);
                });
            });

            it("nodeAll.hangUp nodeWS using PeerInfo", (done) => {
                nodeAll.hangUp(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWS, 0, 2, done), 500);
                });
            });

            it("nodeAll.dial nodeWStar using PeerInfo", function (done) {
                this.timeout(40 * 1000);

                nodeAll.dial(nodeWStar.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWStar, 1, 3, done), 500);
                });
            });

            it("nodeAll.hangUp nodeWStar using PeerInfo", (done) => {
                nodeAll.hangUp(nodeWStar.peerInfo, (err) => {
                    assert.notExists(err);
                    setTimeout(() => check(nodeWStar, 0, 3, done), 500);
                });
            });
        });

        describe.todo("TCP + WebSockets + WebSocketStar", () => {
            let nodeAll;
            let nodeTCP;
            let nodeWS;
            let nodeWStar;

            let ss;

            before((done) => {
                parallel([
                    (cb) => {
                        rendezvous.start({ port: 24642 }, (err, server) => {
                            assert.notExists(err);
                            ss = server;
                            cb();
                        });
                    },
                    (cb) => {
                        const wstar = new WSStar();
                        nodeAll = createNode(["/ip4/0.0.0.0/tcp/0", "/ip4/127.0.0.1/tcp/25011/ws", "/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star"
                        ], {
                                modules: {
                                    transport: [wstar],
                                    discovery: [wstar.discovery]
                                }
                            });
                        wstar.lazySetId(nodeAll.peerInfo.id);
                        nodeAll.handle("/echo/1.0.0", echo);
                        nodeAll.start(cb);

                    },
                    (cb) => {
                        nodeTCP = createNode(["/ip4/0.0.0.0/tcp/0"]);
                        nodeTCP.handle("/echo/1.0.0", echo);
                        nodeTCP.start(cb);
                    },
                    (cb) => {
                        nodeWS = createNode(["/ip4/127.0.0.1/tcp/25022/ws"]);
                        nodeWS.handle("/echo/1.0.0", echo);
                        nodeWS.start(cb);
                    },
                    (cb) => {
                        const wstar = new WSStar({});

                        nodeWStar = createNode(["/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star"], {
                            modules: {
                                transport: [wstar],
                                discovery: [wstar.discovery]
                            }
                        });
                        wstar.lazySetId(nodeWStar.peerInfo.id);
                        nodeWStar.handle("/echo/1.0.0", echo);
                        nodeWStar.start(cb);
                    }
                ], done);
            });

            after((done) => {
                parallel([
                    (cb) => nodeAll.stop(cb),
                    (cb) => nodeTCP.stop(cb),
                    (cb) => nodeWS.stop(cb),
                    (cb) => nodeWStar.stop(cb),
                    (cb) => ss.stop(cb)
                ], done);
            });

            const check = function (otherNode, muxed, peers, done) {
                let i = 1;
                [nodeAll, otherNode].forEach((node) => {
                    expect(Object.keys(node.peerBook.getAll())).to.have.length(i-- ? peers : 1);
                    expect(Object.keys(node.swarm.muxedConns)).to.have.length(muxed);
                });
                done();
            };

            it("nodeAll.dial nodeTCP using PeerInfo", (done) => {
                nodeAll.dial(nodeTCP.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeTCP, 1, 1, done), 500);
                });
            });

            it("nodeAll.hangUp nodeTCP using PeerInfo", (done) => {
                nodeAll.hangUp(nodeTCP.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeTCP, 0, 1, done), 500);
                });
            });

            it("nodeAll.dial nodeWS using PeerInfo", (done) => {
                nodeAll.dial(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWS, 1, 2, done), 500);
                });
            });

            it("nodeAll.hangUp nodeWS using PeerInfo", (done) => {
                nodeAll.hangUp(nodeWS.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWS, 0, 2, done), 500);
                });
            });

            it("nodeAll.dial nodeWStar using PeerInfo", (done) => {
                nodeAll.dial(nodeWStar.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWStar, 1, 3, done), 500);
                });
            });

            it("nodeAll.hangUp nodeWStar using PeerInfo", (done) => {
                nodeAll.hangUp(nodeWStar.peerInfo, (err) => {
                    assert.notExists(err);
                    // Some time for Identify to finish
                    setTimeout(() => check(nodeWStar, 0, 3, done), 500);
                });
            });
        });
    });

    describe("stream muxing", () => {
        const test = function (nodeA, nodeB, callback) {
            nodeA.dial(nodeB.peerInfo, "/echo/1.0.0", (err, conn) => {
                assert.notExists(err);

                pull(
                    pull.values([Buffer.from("hey")]),
                    conn,
                    pull.collect((err, data) => {
                        assert.notExists(err);
                        expect(data).to.be.eql([Buffer.from("hey")]);
                        callback();
                    })
                );
            });
        };

        const teardown = function (nodeA, nodeB, callback) {
            parallel([
                (cb) => nodeA.stop(cb),
                (cb) => nodeB.stop(cb)
            ], callback);
        };

        it("spdy only", function (done) {
            this.timeout(5 * 1000);

            let nodeA;
            let nodeB;

            const setup = function (callback) {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy"]
                        });

                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy"]
                        });
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], callback);
            };

            series([
                (cb) => setup(cb),
                (cb) => test(nodeA, nodeB, cb),
                (cb) => teardown(nodeA, nodeB, cb)
            ], done);
        });

        it("multiplex only", (done) => {
            let nodeA;
            let nodeB;

            const setup = function (callback) {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["multiplex"]
                        });
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["multiplex"]
                        });
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], callback);
            };

            series([
                (cb) => setup(cb),
                (cb) => test(nodeA, nodeB, cb),
                (cb) => teardown(nodeA, nodeB, cb)
            ], done);
        });

        it("spdy + multiplex", function (done) {
            this.timeout(5000);

            let nodeA;
            let nodeB;

            const setup = function (callback) {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy", "multiplex"]
                        });
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy", "multiplex"]
                        });
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], callback);
            };

            series([
                (cb) => setup(cb),
                (cb) => test(nodeA, nodeB, cb),
                (cb) => teardown(nodeA, nodeB, cb)
            ], done);
        });

        it("spdy + multiplex switched order", function (done) {
            this.timeout(5000);

            let nodeA;
            let nodeB;

            const setup = function (callback) {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy", "multiplex"]
                        });
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["multiplex", "spdy"]
                        });
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], callback);
            };

            series([
                (cb) => setup(cb),
                (cb) => test(nodeA, nodeB, cb),
                (cb) => teardown(nodeA, nodeB, cb)
            ], done);
        });

        it("one without the other fails to establish a muxedConn", function (done) {
            this.timeout(5000);

            let nodeA;
            let nodeB;

            const setup = function (callback) {
                parallel([
                    (cb) => {
                        nodeA = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["spdy"]
                        });
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {

                        nodeB = createNode("/ip4/0.0.0.0/tcp/0", {
                            muxer: ["multiplex"]
                        });
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], callback);
            };

            series([
                (cb) => setup(cb),
                (cb) => {
                    // it will just 'warm up a conn'
                    expect(Object.keys(nodeA.swarm.muxers)).to.have.length(1);
                    expect(Object.keys(nodeB.swarm.muxers)).to.have.length(1);

                    nodeA.dial(nodeB.peerInfo, (err) => {
                        assert.notExists(err);
                        expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0);
                        cb();
                    });
                },
                (cb) => teardown(nodeA, nodeB, cb)
            ], done);
        });
    });

    describe("peer discovery", () => {
        let nodeA;
        let nodeB;
        let port = 24649;
        let ss;

        const setup = function (options) {
            before((done) => {
                port++;
                parallel([
                    (cb) => {
                        WebRTCStar.sigServer.start({ port }, (err, server) => {
                            assert.notExists(err);
                            ss = server;
                            cb();
                        });
                    },
                    (cb) => {
                        nodeA = createNode(["/ip4/0.0.0.0/tcp/0", `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`], options);
                        nodeA.handle("/echo/1.0.0", echo);
                        nodeA.start(cb);
                    },
                    (cb) => {
                        nodeB = createNode(["/ip4/0.0.0.0/tcp/0", `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`], options);
                        nodeB.handle("/echo/1.0.0", echo);
                        nodeB.start(cb);
                    }
                ], done);
            });

            after((done) => {
                parallel([
                    (cb) => nodeA.stop(cb),
                    (cb) => nodeB.stop(cb),
                    (cb) => ss.stop(cb)
                ], done);
            });
        };

        describe("MulticastDNS", () => {
            setup({ mdns: true });

            it("find a peer", function (done) {
                this.timeout(15 * 1000);

                nodeA.once("peer:discovery", (peerInfo) => {
                    expect(nodeB.peerInfo.id.toB58String())
                        .to.eql(peerInfo.id.toB58String());
                    done();
                });
            });
        });

        // TODO needs a delay (this test is already long)
        describe.skip("WebRTCStar", () => {
            setup({ webRTCStar: true });

            it("find a peer", function (done) {
                this.timeout(15 * 1000);
                nodeA.once("peer:discovery", (peerInfo) => {
                    expect(nodeB.peerInfo.id.toB58String())
                        .to.eql(peerInfo.id.toB58String());
                    done();
                });
            });
        });

        describe.todo("MulticastDNS + WebRTCStar", () => {
            setup({
                webRTCStar: true,
                mdns: true
            });

            it("find a peer", function (done) {
                this.timeout(15 * 1000);
                nodeA.once("peer:discovery", (peerInfo) => {
                    expect(nodeB.peerInfo.id.toB58String())
                        .to.eql(peerInfo.id.toB58String());
                    done();
                });
            });
        });
    });

    describe(".peerRouting", () => {
        let nodeA;
        let nodeB;
        let nodeC;
        let nodeD;
        let nodeE;

        before(function (done) {
            this.timeout(5 * 1000);

            const tasks = _times(5, () => (cb) => {
                const node = createNode("/ip4/0.0.0.0/tcp/0", {
                    mdns: false,
                    dht: true
                });
                node.start((err) => cb(err, node));
            });

            parallel(tasks, (err, nodes) => {
                assert.notExists(err);
                nodeA = nodes[0];
                nodeB = nodes[1];
                nodeC = nodes[2];
                nodeD = nodes[3];
                nodeE = nodes[4];

                parallel([
                    (cb) => nodeA.dial(nodeB.peerInfo, cb),
                    (cb) => nodeB.dial(nodeC.peerInfo, cb),
                    (cb) => nodeC.dial(nodeD.peerInfo, cb),
                    (cb) => nodeD.dial(nodeE.peerInfo, cb),
                    (cb) => nodeE.dial(nodeA.peerInfo, cb)
                ], done);
            });
        });

        after((done) => {
            parallel([
                (cb) => nodeA.stop(cb),
                (cb) => nodeB.stop(cb),
                (cb) => nodeC.stop(cb),
                (cb) => nodeD.stop(cb),
                (cb) => nodeE.stop(cb)
            ], done);
        });

        describe("el ring", () => {
            it("let kbucket get filled", (done) => {
                setTimeout(() => done(), 250);
            });

            it("nodeA.dial by Id to node C", (done) => {
                nodeA.dial(nodeC.peerInfo.id, (err) => {
                    assert.notExists(err);
                    done();
                });
            });

            it("nodeB.dial by Id to node D", (done) => {
                nodeB.dial(nodeD.peerInfo.id, (err) => {
                    assert.notExists(err);
                    done();
                });
            });

            it("nodeC.dial by Id to node E", (done) => {
                nodeC.dial(nodeE.peerInfo.id, (err) => {
                    assert.notExists(err);
                    done();
                });
            });

            it("nodeB.peerRouting.findPeer(nodeE.peerInfo.id)", (done) => {
                nodeB.peerRouting.findPeer(nodeE.peerInfo.id, (err, peerInfo) => {
                    assert.notExists(err);
                    expect(nodeE.peerInfo.id.toB58String()).to.equal(peerInfo.id.toB58String());
                    done();
                });
            });
        });
    });

    describe(".contentRouting", () => {
        let nodeA;
        let nodeB;
        let nodeC;
        let nodeD;
        let nodeE;

        before(function (done) {
            this.timeout(5 * 1000);
            const tasks = _times(5, () => (cb) => {
                const node = createNode("/ip4/0.0.0.0/tcp/0", {
                    mdns: false,
                    dht: true
                });
                node.start((err) => cb(err, node));
            });

            parallel(tasks, (err, nodes) => {
                assert.notExists(err);
                nodeA = nodes[0];
                nodeB = nodes[1];
                nodeC = nodes[2];
                nodeD = nodes[3];
                nodeE = nodes[4];

                parallel([
                    (cb) => nodeA.dial(nodeB.peerInfo, cb),
                    (cb) => nodeB.dial(nodeC.peerInfo, cb),
                    (cb) => nodeC.dial(nodeD.peerInfo, cb),
                    (cb) => nodeD.dial(nodeE.peerInfo, cb),
                    (cb) => nodeE.dial(nodeA.peerInfo, cb)
                ], done);
            });
        });

        after((done) => {
            parallel([
                (cb) => nodeA.stop(cb),
                (cb) => nodeB.stop(cb),
                (cb) => nodeC.stop(cb),
                (cb) => nodeD.stop(cb),
                (cb) => nodeE.stop(cb)
            ], done);
        });

        describe("le ring", () => {
            const cid = new CID("QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL");

            it("let kbucket get filled", (done) => {
                setTimeout(() => done(), 250);
            });

            it("nodeA.contentRouting.provide", (done) => {
                nodeA.contentRouting.provide(cid, done);
            });

            it("nodeE.contentRouting.findProviders for existing record", (done) => {
                nodeE.contentRouting.findProviders(cid, 5000, (err, providers) => {
                    assert.notExists(err);
                    expect(providers).to.have.length.above(0);
                    done();
                });
            });

            it("nodeC.contentRouting.findProviders for non existing record (timeout)", (done) => {
                const cid = new CID("QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSnnnn");

                nodeE.contentRouting.findProviders(cid, 5000, (err, providers) => {
                    assert.notExists(err);
                    expect(providers).to.have.length(0);
                    done();
                });
            });
        });
    });

    describe("circuit relay", () => {
        const handlerSpies = [];
        let relayNode1;
        let relayNode2;
        let nodeWS1;
        let nodeWS2;
        let nodeTCP1;
        let nodeTCP2;

        const setupNode = function (addrs, options, cb) {
            if (is.function(options)) {
                cb = options;
                options = {};
            }

            options = options || {};

            const node = createNode(addrs, options);
            node.handle("/echo/1.0.0", echo);
            return node.start((err) => {
                assert.notExists(err);

                handlerSpies.push(spy(node.swarm.transports[Circuit.tag].listeners[0].hopHandler, "handle"));
                cb(node);
            });
        };

        before(function (done) {
            this.timeout(20000);

            waterfall([
                // set up passive relay
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0/ws",
                    "/ip4/0.0.0.0/tcp/0"
                ], {
                        relay: {
                            enabled: true,
                            hop: {
                                enabled: true,
                                active: false // passive relay
                            }
                        }
                    }, (node) => {
                        relayNode1 = node;
                        cb();
                    }),
                // setup active relay
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0/ws",
                    "/ip4/0.0.0.0/tcp/0"
                ], {
                        relay: {
                            enabled: true,
                            hop: {
                                enabled: true,
                                active: false // passive relay
                            }
                        }
                    }, (node) => {
                        relayNode2 = node;
                        cb();
                    }),
                // setup node with WS
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0/ws"
                ], {
                        relay: {
                            enabled: true
                        }
                    }, (node) => {
                        nodeWS1 = node;
                        cb();
                    }),
                // setup node with WS
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0/ws"
                ], {
                        relay: {
                            enabled: true
                        }
                    }, (node) => {
                        nodeWS2 = node;
                        cb();
                    }),
                // set up node with TCP and listening on relay1
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0",
                    `/ipfs/${relayNode1.peerInfo.id.toB58String()}/p2p-circuit`
                ], {
                        relay: {
                            enabled: true
                        }
                    }, (node) => {
                        nodeTCP1 = node;
                        cb();
                    }),
                // set up node with TCP and listening on relay2 over TCP transport
                (cb) => setupNode([
                    "/ip4/0.0.0.0/tcp/0",
                    `/ip4/0.0.0.0/tcp/0/ipfs/${relayNode2.peerInfo.id.toB58String()}/p2p-circuit`
                ], {
                        relay: {
                            enabled: true
                        }
                    }, (node) => {
                        nodeTCP2 = node;
                        cb();
                    })
            ], (err) => {
                assert.notExists(err);

                series([
                    (cb) => nodeWS1.dial(relayNode1.peerInfo, cb),
                    (cb) => nodeWS1.dial(relayNode2.peerInfo, cb),
                    (cb) => nodeTCP1.dial(relayNode1.peerInfo, cb),
                    (cb) => nodeTCP2.dial(relayNode2.peerInfo, cb)
                ], done);
            });
        });

        after((done) => {
            parallel([
                (cb) => relayNode1.stop(cb),
                (cb) => relayNode2.stop(cb),
                (cb) => nodeWS1.stop(cb),
                (cb) => nodeWS2.stop(cb),
                (cb) => nodeTCP1.stop(cb),
                (cb) => nodeTCP2.stop(cb)
            ], done);
        });

        describe("any relay", function () {
            this.timeout(20 * 1000);

            it("should dial from WS1 to TCP1 over any R", (done) => {
                nodeWS1.dial(nodeTCP1.peerInfo, "/echo/1.0.0", (err, conn) => {
                    assert.notExists(err);
                    assert.exists(conn);

                    pull(
                        pull.values(["hello"]),
                        conn,
                        pull.collect((err, result) => {
                            assert.notExists(err);
                            expect(result[0].toString()).to.equal("hello");
                            done();
                        })
                    );
                });
            });

            it("should not dial - no R from WS2 to TCP1", (done) => {
                nodeWS2.dial(nodeTCP2.peerInfo, "/echo/1.0.0", (err, conn) => {
                    assert.exists(err);
                    assert.notExists(conn);
                    done();
                });
            });
        });

        describe("explicit relay", function () {
            this.timeout(20 * 1000);

            it("should dial from WS1 to TCP1 over R1", (done) => {
                nodeWS1.dial(nodeTCP1.peerInfo, "/echo/1.0.0", (err, conn) => {
                    assert.notExists(err);
                    assert.exists(conn);

                    pull(
                        pull.values(["hello"]),
                        conn,
                        pull.collect((err, result) => {
                            assert.notExists(err);
                            expect(result[0].toString()).to.equal("hello");

                            const addr = multi.address.create(handlerSpies[0].args[2][0].dstPeer.addrs[0]).toString();
                            expect(addr).to.equal(`/ipfs/${nodeTCP1.peerInfo.id.toB58String()}`);
                            done();
                        })
                    );
                });
            });

            it("should dial from WS1 to TCP2 over R2", (done) => {
                nodeWS1.dial(nodeTCP2.peerInfo, "/echo/1.0.0", (err, conn) => {
                    assert.notExists(err);
                    assert.exists(conn);

                    pull(
                        pull.values(["hello"]),
                        conn,
                        pull.collect((err, result) => {
                            assert.notExists(err);
                            expect(result[0].toString()).to.equal("hello");

                            const addr = multi.address.create(handlerSpies[1].args[2][0].dstPeer.addrs[0]).toString();
                            expect(addr).to.equal(`/ipfs/${nodeTCP2.peerInfo.id.toB58String()}`);
                            done();
                        })
                    );
                });
            });
        });
    });

    describe("multiaddr trim", () => {
        it("non used multiaddrs get trimmed", (done) => {
            let node;

            series([
                (cb) => {
                    node = createNode(["/ip4/0.0.0.0/tcp/999/wss/p2p-webrtc-direct", "/ip4/127.0.0.1/tcp/55555/ws", "/ip4/0.0.0.0/tcp/0/"
                    ]);
                    const multiaddrs = node.peerInfo.multiaddrs.toArray();
                    // multiaddrs.forEach((ma) => console.log(ma.toString()))
                    expect(multiaddrs).to.have.length(3);
                    cb();
                },
                (cb) => node.start(cb)
            ], (err) => {
                assert.notExists(err);

                const multiaddrs = node.peerInfo.multiaddrs.toArray();
                // console.log('--')
                // multiaddrs.forEach((ma) => console.log(ma.toString()))

                expect(multiaddrs.length).to.at.least(2);
                expect(multiaddrs[0].toString()).to.match(/^\/ip4\/127\.0\.0\.1\/tcp\/[0-9]+\/ws\/ipfs\/\w+$/);
                node.stop(done);
            });
        });
    });
});
