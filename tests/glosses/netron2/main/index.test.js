const parallel = require("async/parallel");
const series = require("async/series");
const wrtc = require("wrtc");

const {
    multi,
    stream: { pull },
    netron2: { NetCore, secio, MulticastDNS, Railing, transport: { TCP, WS }, rendezvous, CID, circuit: { Circuit }, PeerInfo, PeerId, transport: { WebRTCStar, WSStar } },
    util
} = adone;


const createNetCore = function (multiaddrs, options = {}) {
    const peerId = PeerId.create({ bits: 1024 });
    const peer = PeerInfo.create(peerId);
    util.arrify(multiaddrs).map((ma) => peer.multiaddrs.add(ma));

    const config = {
        peer,
        transport: [
            new TCP(),
            new WS()
        ],
        muxer: options.muxer,
        crypto: [secio],
        discovery: [],
        dht: options.dht,
        relay: options.relay
    };

    if (options.mdns) {
        const mdns = new MulticastDNS(peer, "ipfs.local");
        config.discovery.push(mdns);
    }

    if (options.bootstrap) {
        const r = new Railing(options.bootstrap);
        config.discovery.push(r);
    }

    if (options.transport) {
        options.transport.forEach((t) => config.transport.push(t));
    }

    if (options.discovery) {
        options.discovery.forEach((d) => config.discovery.push(d));
    }

    return new NetCore(config);
};

const echo = function (protocol, conn) {
    pull(conn, conn);
};

describe("netron2", () => {
    describe("transports", () => {
        describe("TCP only", () => {
            let netCoreA;
            let netCoreB;

            before(async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0");
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0");
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            });

            after(async () => {
                await netCoreA.stop();
                await netCoreB.stop();
            });

            it("netCoreA.connect netCoreB using PeerInfo without proto (warmup)", async (done) => {
                await netCoreA.connect(netCoreB.peerInfo);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            cb();
                        }
                    ], done);
                };

                // Some time for Identify to finish
                setTimeout(check, 500);
            });

            it("netCoreA.connect netCoreB using PeerInfo", async (done) => {
                const conn = await netCoreA.connect(netCoreB.peerInfo, "/echo/1.0.0");

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

            it("netCoreA.disconnect netCoreB using PeerInfo (first)", async (done) => {
                await netCoreA.disconnect(netCoreB.peerInfo);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);

                            expect(Object.keys(netCoreB.swarm.muxedConns)).to.have.length(0);
                            cb();
                        }
                    ], done);
                };

                setTimeout(check, 500);
            });

            it("netCoreA.connect netCoreB using multiaddr", async (done) => {
                const conn = await netCoreA.connect(netCoreB.peerInfo.multiaddrs.toArray()[0], "/echo/1.0.0");
                const check = function () {
                    series([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);

                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);

                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(1);
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

            it("netCoreA.disconnect netCoreB using multiaddr (second)", async (done) => {
                await netCoreA.disconnect(netCoreB.peerInfo.multiaddrs.toArray()[0]);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);

                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);

                            expect(Object.keys(netCoreB.swarm.muxedConns)).to.have.length(0);
                            cb();
                        }
                    ], done);
                };

                setTimeout(check, 500);
            });

            it("netCoreA.connect netCoreB using PeerId", async (done) => {
                const conn = await netCoreA.connect(netCoreB.peerInfo.id, "/echo/1.0.0");
                // Some time for Identify to finish

                const check = function () {
                    series([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(1);
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

            it("netCoreA.disconnect netCoreB using PeerId (third)", async (done) => {
                await netCoreA.disconnect(netCoreB.peerInfo.multiaddrs.toArray()[0]);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreA.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreB.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreB.swarm.muxedConns)).to.have.length(0);
                            cb();
                        }
                    ], done);
                };

                setTimeout(check, 500);
            });
        });

        describe("TCP + WebSockets", () => {
            let netCoreTCP;
            let netCoreTCPnWS;
            let netCoreWS;

            before(async () => {
                netCoreTCP = createNetCore(["/ip4/0.0.0.0/tcp/0"]);
                netCoreTCP.handle("/echo/1.0.0", echo);
                await netCoreTCP.start();
                netCoreTCPnWS = createNetCore(["/ip4/0.0.0.0/tcp/0", "/ip4/127.0.0.1/tcp/25011/ws"]);
                netCoreTCPnWS.handle("/echo/1.0.0", echo);
                await netCoreTCPnWS.start();
                netCoreWS = createNetCore(["/ip4/127.0.0.1/tcp/25022/ws"]);
                netCoreWS.handle("/echo/1.0.0", echo);
                await netCoreWS.start();
            });

            after(async () => {
                await netCoreTCP.stop();
                await netCoreTCPnWS.stop();
                await netCoreWS.stop();
            });

            it("netCoreTCP.connect netCoreTCPnWS using PeerInfo", async (done) => {
                await netCoreTCP.connect(netCoreTCPnWS.peerInfo);
                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreTCP.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreTCP.swarm.muxedConns)).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreTCPnWS.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreTCPnWS.swarm.muxedConns)).to.have.length(1);
                            cb();
                        }
                    ], done);
                };

                // Some time for Identify to finish
                setTimeout(check, 500);
            });

            it("netCoreTCP.disconnect netCoreTCPnWS using PeerInfo", async (done) => {
                await netCoreTCP.disconnect(netCoreTCPnWS.peerInfo);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreTCP.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreTCP.swarm.muxedConns)).to.have.length(0);

                            cb();
                        },
                        (cb) => {
                            const peers = netCoreTCPnWS.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreTCPnWS.swarm.muxedConns)).to.have.length(0);
                            cb();
                        }
                    ], done);
                };

                setTimeout(check, 500);
            });

            it("netCoreTCPnWS.connect netCoreWS using PeerInfo", async (done) => {
                await netCoreTCPnWS.connect(netCoreWS.peerInfo);
                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreTCPnWS.peerBook.getAll();
                            assert.equal(peers.size, 2);
                            expect(Object.keys(netCoreTCPnWS.swarm.muxedConns)).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = netCoreWS.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreWS.swarm.muxedConns)).to.have.length(1);
                            cb();
                        }
                    ], done);
                };

                // Some time for Identify to finish
                setTimeout(check, 500);
            });

            it("netCoreTCPnWS.disconnect netCoreWS using PeerInfo", async (done) => {
                await netCoreTCPnWS.disconnect(netCoreWS.peerInfo);

                const check = function () {
                    parallel([
                        (cb) => {
                            const peers = netCoreTCPnWS.peerBook.getAll();
                            assert.equal(peers.size, 2);
                            expect(Object.keys(netCoreTCPnWS.swarm.muxedConns)).to.have.length(0);

                            cb();
                        },
                        (cb) => {
                            const peers = netCoreWS.peerBook.getAll();
                            assert.equal(peers.size, 1);
                            expect(Object.keys(netCoreWS.swarm.muxedConns)).to.have.length(0);
                            cb();
                        }
                    ], done);
                };

                setTimeout(check, 500);
            });

            // Until https://github.com/libp2p/js-libp2p/issues/46 is resolved
            // EverynetCore will be able to connect in WebSockets
            it.skip("netCoreTCP.connect netCoreWS using PeerInfo is unsuccesful", async () => {
                await netCoreTCP.connect(netCoreWS.peerInfo);
            });
        });

        describe.todo("TCP + WebSockets + WebRTCStar", () => {
            let netCoreAll;
            let netCoreTCP;
            let netCoreWS;
            let netCoreWStar;

            let ss;

            before(async () => {
                this.timeout(30000);

                await new Promise((resolve, reject) => {
                    WebRTCStar.sigServer.start({ port: 24642 }, (err, server) => {
                        if (err) {
                            return reject(err);
                        }
                        ss = server;
                        resolve();
                    });
                });

                const wstar = new WebRTCStar({ wrtc });
                netCoreAll = createNetCore(["/ip4/0.0.0.0/tcp/0", "/ip4/127.0.0.1/tcp/25011/ws", "/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star"], {
                    transport: [wstar],
                    discovery: [wstar.discovery]
                });
                netCoreAll.handle("/echo/1.0.0", echo);
                await netCoreAll.start();

                netCoreTCP = createNetCore(["/ip4/0.0.0.0/tcp/0"]);
                netCoreTCP.handle("/echo/1.0.0", echo);
                await netCoreTCP.start();

                netCoreWS = createNetCore(["/ip4/127.0.0.1/tcp/25022/ws"]);
                netCoreWS.handle("/echo/1.0.0", echo);
                await netCoreWS.start();

                const wstar2 = new WebRTCStar({ wrtc });

                netCoreWStar = createNetCore(["/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star"], {
                    transport: [wstar2],
                    discovery: [wstar2.discovery]
                });

                netCoreWStar.handle("/echo/1.0.0", echo);
                await netCoreWStar.start();
            });

            after(async (done) => {
                await Promise.all([
                    netCoreAll.stop(),
                    netCoreTCP.stop(),
                    netCoreWS.stop(),
                    netCoreWStar.stop()
                ]);
                ss.stop(done);
            });

            const check = function (otherNode, muxed, peers, callback) {
                let i = 1;
                [netCoreAll, otherNode].forEach((netCore) => {
                    assert.equal(netCore.peerBook.getAll().size, i-- ? peers : 1);
                    expect(Object.keys(netCore.swarm.muxedConns)).to.have.length(muxed);
                });
                callback();
            };

            it("netCoreAll.connect netCoreTCP using PeerInfo", async (done) => {
                await netCoreAll.connect(netCoreTCP.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreTCP, 1, 1, done), 500);
            });

            it("netCoreAll.disconnect netCoreTCP using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreTCP.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreTCP, 0, 1, done), 500);
            });

            it("netCoreAll.connect netCoreWS using PeerInfo", async (done) => {
                await netCoreAll.connect(netCoreWS.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWS, 1, 2, done), 500);
            });

            it("netCoreAll.disconnect netCoreWS using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreWS.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWS, 0, 2, done), 500);
            });

            it("netCoreAll.connect netCoreWStar using PeerInfo", async function (done) {
                this.timeout(40 * 1000);

                await netCoreAll.connect(netCoreWStar.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWStar, 1, 3, done), 500);
            });

            it("netCoreAll.disconnect netCoreWStar using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreWStar.peerInfo);
                setTimeout(() => check(netCoreWStar, 0, 3, done), 500);
            });
        });

        describe.todo("TCP + WebSockets + WebSocketStar", () => {
            let netCoreAll;
            let netCoreTCP;
            let netCoreWS;
            let netCoreWStar;

            let ss;

            before(async () => {
                await new Promise((resolve, reject) => {
                    rendezvous.start({ port: 24642 }, (err, server) => {
                        if (err) {
                            return reject(err);
                        }
                        ss = server;
                        resolve();
                    });
                });

                const wstar = new WSStar();
                netCoreAll = createNetCore([
                    "/ip4/0.0.0.0/tcp/0",
                    "/ip4/127.0.0.1/tcp/25011/ws",
                    "/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star"
                ], {
                        transport: [wstar],
                        discovery: [wstar.discovery]
                    });
                wstar.lazySetId(netCoreAll.peerInfo.id);
                netCoreAll.handle("/echo/1.0.0", echo);
                await netCoreAll.start();

                netCoreTCP = createNetCore(["/ip4/0.0.0.0/tcp/0"]);
                netCoreTCP.handle("/echo/1.0.0", echo);
                await netCoreTCP.start();

                netCoreWS = createNetCore(["/ip4/127.0.0.1/tcp/25022/ws"]);
                netCoreWS.handle("/echo/1.0.0", echo);
                await netCoreWS.start();

                const wstar2 = new WSStar({});

                netCoreWStar = createNetCore(["/ip4/127.0.0.1/tcp/24642/ws/p2p-websocket-star"], {
                    transport: [wstar2],
                    discovery: [wstar2.discovery]
                });
                wstar.lazySetId(netCoreWStar.peerInfo.id);
                netCoreWStar.handle("/echo/1.0.0", echo);
                await netCoreWStar.start();
            });

            after(async (done) => {
                await Promise.all([
                    netCoreAll.stop(),
                    netCoreTCP.stop(),
                    netCoreWS.stop(),
                    netCoreWStar.stop()
                ]);
                ss.stop(done);
            });

            const check = function (otherNode, muxed, peers, done) {
                let i = 1;
                [netCoreAll, otherNode].forEach((netCore) => {
                    assert.equal(netCore.peerBook.getAll().size, i-- ? peers : 1);
                    expect(Object.keys(netCore.swarm.muxedConns)).to.have.length(muxed);
                });
                done();
            };

            it("netCoreAll.connect netCoreTCP using PeerInfo", async (done) => {
                await netCoreAll.connect(netCoreTCP.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreTCP, 1, 1, done), 500);
            });

            it("netCoreAll.disconnect netCoreTCP using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreTCP.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreTCP, 0, 1, done), 500);
            });

            it("netCoreAll.connect netCoreWS using PeerInfo", async (done) => {
                await netCoreAll.connect(netCoreWS.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWS, 1, 2, done), 500);
            });

            it("netCoreAll.disconnect netCoreWS using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreWS.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWS, 0, 2, done), 500);
            });

            it("netCoreAll.connect netCoreWStar using PeerInfo", async (done) => {
                await netCoreAll.connect(netCoreWStar.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWStar, 1, 3, done), 500);
            });

            it("netCoreAll.disconnect netCoreWStar using PeerInfo", async (done) => {
                await netCoreAll.disconnect(netCoreWStar.peerInfo);
                // Some time for Identify to finish
                setTimeout(() => check(netCoreWStar, 0, 3, done), 500);
            });
        });
    });

    describe("stream muxing", () => {
        const test = async (netCoreA, netCoreB) => {
            const conn = await netCoreA.connect(netCoreB.peerInfo, "/echo/1.0.0");

            return new Promise((resolve, reject) => {
                pull(
                    pull.values([Buffer.from("hey")]),
                    conn,
                    pull.collect((err, data) => {
                        if (err) {
                            return reject(err);
                        }
                        expect(data).to.be.eql([Buffer.from("hey")]);
                        resolve();
                    })
                );
            });
        };

        const teardown = async (netCoreA, netCoreB) => {
            await netCoreA.stop();
            await netCoreB.stop();
        };

        it("spdy only", async function () {
            this.timeout(5 * 1000);

            let netCoreA;
            let netCoreB;

            const setup = async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy"]
                });

                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy"]
                });
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            };

            await setup();
            await test(netCoreA, netCoreB);
            await teardown(netCoreA, netCoreB);
        });

        it("multiplex only", async () => {
            let netCoreA;
            let netCoreB;

            const setup = async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["multiplex"]
                });
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["multiplex"]
                });
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            };

            await setup();
            await test(netCoreA, netCoreB);
            await teardown(netCoreA, netCoreB);
        });

        it("spdy + multiplex", async function () {
            this.timeout(5000);

            let netCoreA;
            let netCoreB;

            const setup = async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy", "multiplex"]
                });
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy", "multiplex"]
                });
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            };

            await setup();
            await test(netCoreA, netCoreB);
            await teardown(netCoreA, netCoreB);
        });

        it("spdy + multiplex switched order", async function () {
            this.timeout(5000);

            let netCoreA;
            let netCoreB;

            const setup = async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy", "multiplex"]
                });
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["multiplex", "spdy"]
                });
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            };

            await setup();
            await test(netCoreA, netCoreB);
            await teardown(netCoreA, netCoreB);
        });

        it("one without the other fails to establish a muxedConn", async function () {
            this.timeout(5000);

            let netCoreA;
            let netCoreB;

            const setup = async () => {
                netCoreA = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["spdy"]
                });
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    muxer: ["multiplex"]
                });
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            };

            await setup();
            // it will just 'warm up a conn'
            expect(Object.keys(netCoreA.swarm.muxers)).to.have.length(1);
            expect(Object.keys(netCoreB.swarm.muxers)).to.have.length(1);

            await netCoreA.connect(netCoreB.peerInfo);
            expect(Object.keys(netCoreA.swarm.muxedConns)).to.have.length(0);
            await teardown(netCoreA, netCoreB);
        });
    });

    describe("peer discovery", () => {
        let netCoreA;
        let netCoreB;
        let port = 24649;
        let ss;

        const setup = function (options) {
            before(async () => {
                port++;

                await new Promise((resolve, reject) => {
                    WebRTCStar.sigServer.start({ port }, (err, server) => {
                        if (err) {
                            return reject(err);
                        }
                        ss = server;
                        resolve();
                    });
                });

                netCoreA = createNetCore(["/ip4/0.0.0.0/tcp/0", `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`], options);
                netCoreA.handle("/echo/1.0.0", echo);
                await netCoreA.start();

                netCoreB = createNetCore(["/ip4/0.0.0.0/tcp/0", `/ip4/127.0.0.1/tcp/${port}/ws/p2p-webrtc-star`], options);
                netCoreB.handle("/echo/1.0.0", echo);
                await netCoreB.start();
            });

            after(async (done) => {
                await Promise.all([
                    netCoreA.stop(),
                    netCoreB.stop()
                ]);
                ss.stop(done);
            });
        };

        describe("MulticastDNS", () => {
            setup({ mdns: true });

            it("find a peer", function (done) {
                this.timeout(15 * 1000);

                netCoreA.once("peer:discovery", (peerInfo) => {
                    expect(netCoreB.peerInfo.id.asBase58()).to.eql(peerInfo.id.asBase58());
                    done();
                });
            });
        });

        // TODO needs a delay (this test is already long)
        describe.skip("WebRTCStar", () => {
            setup({ webRTCStar: true });

            it("find a peer", function (done) {
                this.timeout(15 * 1000);
                netCoreA.once("peer:discovery", (peerInfo) => {
                    expect(netCoreB.peerInfo.id.asBase58())
                        .to.eql(peerInfo.id.asBase58());
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
                netCoreA.once("peer:discovery", (peerInfo) => {
                    expect(netCoreB.peerInfo.id.asBase58())
                        .to.eql(peerInfo.id.asBase58());
                    done();
                });
            });
        });
    });

    describe(".peerRouting", () => {
        let netCoreA;
        let netCoreB;
        let netCoreC;
        let netCoreD;
        let netCoreE;

        before(async function () {
            this.timeout(5 * 1000);

            const getNetCore = async () => {
                const netCore = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    mdns: false,
                    dht: true
                });
                await netCore.start();
                return netCore;
            };

            netCoreA = await getNetCore();
            netCoreB = await getNetCore();
            netCoreC = await getNetCore();
            netCoreD = await getNetCore();
            netCoreE = await getNetCore();

            await Promise.all([
                netCoreA.connect(netCoreB.peerInfo),
                netCoreB.connect(netCoreC.peerInfo),
                netCoreC.connect(netCoreD.peerInfo),
                netCoreD.connect(netCoreE.peerInfo),
                netCoreE.connect(netCoreA.peerInfo)
            ]);
        });

        after(async () => {
            await Promise.all([
                netCoreA.stop(),
                netCoreB.stop(),
                netCoreC.stop(),
                netCoreD.stop(),
                netCoreE.stop()
            ]);
        });

        describe("el ring", () => {
            it("let kbucket get filled", (done) => {
                setTimeout(() => done(), 250);
            });

            it("netCoreA.connect by Id to netCore C", async () => {
                await netCoreA.connect(netCoreC.peerInfo.id);
            });

            it("netCoreB.connect by Id to netCore D", async () => {
                await netCoreB.connect(netCoreD.peerInfo.id);
            });

            it("netCoreC.connect by Id to netCore E", async () => {
                await netCoreC.connect(netCoreE.peerInfo.id);
            });

            it("netCoreB.peerRouting.findPeer(netCoreE.peerInfo.id)", (done) => {
                netCoreB.peerRouting.findPeer(netCoreE.peerInfo.id, (err, peerInfo) => {
                    assert.notExists(err);
                    expect(netCoreE.peerInfo.id.asBase58()).to.equal(peerInfo.id.asBase58());
                    done();
                });
            });
        });
    });

    describe(".contentRouting", () => {
        let netCoreA;
        let netCoreB;
        let netCoreC;
        let netCoreD;
        let netCoreE;

        before(async function () {
            this.timeout(5 * 1000);
            const getNetCore = async () => {
                const netCore = createNetCore("/ip4/0.0.0.0/tcp/0", {
                    mdns: false,
                    dht: true
                });
                await netCore.start();
                return netCore;
            };

            netCoreA = await getNetCore();
            netCoreB = await getNetCore();
            netCoreC = await getNetCore();
            netCoreD = await getNetCore();
            netCoreE = await getNetCore();

            await Promise.all([
                netCoreA.connect(netCoreB.peerInfo),
                netCoreB.connect(netCoreC.peerInfo),
                netCoreC.connect(netCoreD.peerInfo),
                netCoreD.connect(netCoreE.peerInfo),
                netCoreE.connect(netCoreA.peerInfo)
            ]);
        });

        after(async () => {
            await Promise.all([
                netCoreA.stop(),
                netCoreB.stop(),
                netCoreC.stop(),
                netCoreD.stop(),
                netCoreE.stop()
            ]);
        });

        describe("le ring", () => {
            const cid = new CID("QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL");

            it("let kbucket get filled", (done) => {
                setTimeout(() => done(), 250);
            });

            it("netCoreA.contentRouting.provide", (done) => {
                netCoreA.contentRouting.provide(cid, done);
            });

            it("netCoreE.contentRouting.findProviders for existing record", (done) => {
                netCoreE.contentRouting.findProviders(cid, 5000, (err, providers) => {
                    assert.notExists(err);
                    expect(providers).to.have.length.above(0);
                    done();
                });
            });

            it("netCoreC.contentRouting.findProviders for non existing record (timeout)", (done) => {
                const cid = new CID("QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSnnnn");

                netCoreE.contentRouting.findProviders(cid, 5000, (err, providers) => {
                    assert.notExists(err);
                    expect(providers).to.have.length(0);
                    done();
                });
            });
        });
    });

    describe.todo("circuit relay", () => {
        const handlerSpies = [];
        let relayNode1;
        let relayNode2;
        let netCoreWS1;
        let netCoreWS2;
        let netCoreTCP1;
        let netCoreTCP2;

        const setupNetCore = async function (addrs, options) {
            options = options || {};

            const netCore = createNetCore(addrs, options);
            netCore.handle("/echo/1.0.0", echo);
            await netCore.start();
            handlerSpies.push(spy(netCore.swarm.tm.transports[Circuit.tag].listeners[0].hopHandler, "handle"));
            return netCore;
        };

        before(async function () {
            this.timeout(20000);

            // set up passive relay
            relayNode1 = await setupNetCore([
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
                });

            // setup active relay
            relayNode2 = await setupNetCore([
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
                });

            // setup netCore with WS
            netCoreWS1 = await setupNetCore([
                "/ip4/0.0.0.0/tcp/0/ws"
            ], {
                    relay: {
                        enabled: true
                    }
                });

            // setup netCore with WS
            netCoreWS2 = await setupNetCore([
                "/ip4/0.0.0.0/tcp/0/ws"
            ], {
                    relay: {
                        enabled: true
                    }
                });

            // set up netCore with TCP and listening on relay1
            netCoreTCP1 = await setupNetCore([
                "/ip4/0.0.0.0/tcp/0",
                `/ipfs/${relayNode1.peerInfo.id.asBase58()}/p2p-circuit`
            ], {
                    relay: {
                        enabled: true
                    }
                });

            // set up netCore with TCP and listening on relay2 over TCP transport
            netCoreTCP2 = await setupNetCore([
                "/ip4/0.0.0.0/tcp/0",
                `/ip4/0.0.0.0/tcp/0/ipfs/${relayNode2.peerInfo.id.asBase58()}/p2p-circuit`
            ], {
                    relay: {
                        enabled: true
                    }
                });

            await netCoreWS1.connect(relayNode1.peerInfo);
            await netCoreWS1.connect(relayNode2.peerInfo);
            await netCoreTCP1.connect(relayNode1.peerInfo);
            await netCoreTCP2.connect(relayNode2.peerInfo);

            await adone.promise.delay(1500);
        });

        after(async () => {
            await Promise.all([
                relayNode1.stop(),
                relayNode2.stop(),
                netCoreWS1.stop(),
                netCoreWS2.stop(),
                netCoreTCP1.stop(),
                netCoreTCP2.stop()
            ]);
        });

        describe("any relay", function () {
            this.timeout(20 * 1000);

            it("should connect from WS1 to TCP1 over any R", async (done) => {
                const conn = await netCoreWS1.connect(netCoreTCP1.peerInfo, "/echo/1.0.0");

                pull(
                    pull.values(["hello"]),
                    conn,
                    pull.collect((err, result) => {
                        assert.notExists(err);
                        expect(result[0].toString()).to.equal("hello");
                        done();
                    })
                );
                // done();
            });

            it("should not connect - no R from WS2 to TCP1", async () => {
                await assert.throws(async () => netCoreWS2.connect(netCoreTCP2.peerInfo, "/echo/1.0.0"));
            });
        });

        describe("explicit relay", function () {
            this.timeout(20 * 1000);

            it("should connect from WS1 to TCP1 over R1", async (done) => {
                const conn = await netCoreWS1.connect(netCoreTCP1.peerInfo, "/echo/1.0.0");
                pull(
                    pull.values(["hello"]),
                    conn,
                    pull.collect((err, result) => {
                        assert.notExists(err);
                        expect(result[0].toString()).to.equal("hello");

                        const addr = multi.address.create(handlerSpies[0].args[2][0].dstPeer.addrs[0]).toString();
                        expect(addr).to.equal(`/ipfs/${netCoreTCP1.peerInfo.id.asBase58()}`);
                        done();
                    })
                );
            });

            it("should connect from WS1 to TCP2 over R2", async (done) => {
                const conn = await netCoreWS1.connect(netCoreTCP2.peerInfo, "/echo/1.0.0");
                pull(
                    pull.values(["hello"]),
                    conn,
                    pull.collect((err, result) => {
                        assert.notExists(err);
                        expect(result[0].toString()).to.equal("hello");

                        const addr = multi.address.create(handlerSpies[1].args[2][0].dstPeer.addrs[0]).toString();
                        expect(addr).to.equal(`/ipfs/${netCoreTCP2.peerInfo.id.asBase58()}`);
                        done();
                    })
                );
            });
        });
    });

    describe("multiaddr trim", () => {
        it("non used multiaddrs get trimmed", async () => {
            const netCore = createNetCore(["/ip4/0.0.0.0/tcp/999/wss/p2p-webrtc-direct", "/ip4/127.0.0.1/tcp/55555/ws", "/ip4/0.0.0.0/tcp/0/"
            ]);
            let multiaddrs = netCore.peerInfo.multiaddrs.toArray();
            // multiaddrs.forEach((ma) => console.log(ma.toString()))
            expect(multiaddrs).to.have.length(3);
            await netCore.start();

            multiaddrs = netCore.peerInfo.multiaddrs.toArray();
            // console.log('--')
            // multiaddrs.forEach((ma) => console.log(ma.toString()))

            expect(multiaddrs.length).to.at.least(2);
            expect(multiaddrs[0].toString()).to.match(/^\/ip4\/127\.0\.0\.1\/tcp\/[0-9]+\/ws\/ipfs\/\w+$/);
            await netCore.stop();
        });
    });
});
