const parallel = require("async/parallel");
const utils = require("./utils");

const {
    multi,
    netron2: { spdy, secio, multiplex, swarm: { Swarm }, PeerInfo, PeerBook, transport: { TCP, WS } },
    stream: { pull }
} = adone;

const { LimitDialer } = adone.private(adone.netron2.swarm);


describe("netron2", "swarm", () => {
    describe("create Swarm instance", () => {
        it("throws on missing peerInfo", () => {
            expect(() => new Swarm()).to.throw(/You must provide a `peerInfo`/);
        });
    });

    describe("transport - tcp", () => {
        let swarmA;
        let swarmB;
        let peerA;
        let peerB;
        let dialPeers;

        before(() => {
            const infos = utils.createInfos(5);
            peerA = infos[0];
            peerB = infos[1];
            dialPeers = infos.slice(2);

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9888");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9999");
            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
        });

        let peer;
        beforeEach(function () {
            this.timeout(20000); // hook fails with timeout for a number of tests
            peer = PeerInfo.create();
        });

        it(".transport.add", (done) => {
            swarmA.transport.add("tcp", new TCP());
            expect(Object.keys(swarmA.transports).length).to.equal(1);

            swarmB.transport.add("tcp", new TCP(), () => {
                expect(Object.keys(swarmB.transports).length).to.equal(1);
                done();
            });
        });

        it(".transport.listen", (done) => {
            let count = 0;
            const ready = function () {
                if (++count === 2) {
                    expect(peerA.multiaddrs.size).to.equal(1);
                    expect(peerA.multiaddrs.has("/ip4/127.0.0.1/tcp/9888")).to.equal(true);

                    expect(peerB.multiaddrs.size).to.equal(1);
                    expect(peerB.multiaddrs.has("/ip4/127.0.0.1/tcp/9999")).to.equal(true);
                    done();
                }
            };
            swarmA.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
            swarmB.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
        });

        it(".transport.dial to a multiaddr", (done) => {
            dialPeers[0].multiaddrs.add("/ip4/127.0.0.1/tcp/9999");
            const conn = swarmA.transport.dial("tcp", dialPeers[0], (err, conn) => {
                assert.notExists(err);
            });

            pull(
                pull.values(["hey"]),
                conn,
                pull.onEnd(done)
            );
        });

        it(".transport.dial to set of multiaddr, only one is available", (done) => {
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9910/ws"); // not valid on purpose
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9359");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9329");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9910");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9999");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9309");

            const conn = swarmA.transport.dial("tcp", dialPeers[1], (err, conn) => {
                assert.notExists(err);
            });

            pull(
                pull.values(["hey"]),
                conn,
                pull.onEnd(done)
            );
        });

        it(".transport.dial to set of multiaddr, none is available", (done) => {
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9910/ws"); // not valid on purpose
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9359");
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9329");

            swarmA.transport.dial("tcp", dialPeers[2], (err, conn) => {
                assert.exists(err);
                expect(err.errors).to.have.length(2);
                assert.notExists(conn);
                done();
            });
        });

        it(".close", function (done) {
            this.timeout(2500);
            parallel([
                (cb) => swarmA.transport.close("tcp", cb),
                (cb) => swarmB.transport.close("tcp", cb)
            ], done);
        });

        it("support port 0", (done) => {
            const ma = "/ip4/127.0.0.1/tcp/0";
            peer.multiaddrs.add(ma);

            const swarm = new Swarm(peer, new PeerBook());

            swarm.transport.add("tcp", new TCP());
            const ready = function () {
                expect(peer.multiaddrs.size).to.equal(1);
                // should not have /tcp/0 anymore
                expect(peer.multiaddrs.has(ma)).to.equal(false);
                swarm.close(done);
            };
            swarm.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
        });

        it("support addr /ip4/0.0.0.0/tcp/9050", (done) => {
            const ma = "/ip4/0.0.0.0/tcp/9050";
            peer.multiaddrs.add(ma);
            const swarm = new Swarm(peer, new PeerBook());
            swarm.transport.add("tcp", new TCP());
            const ready = function () {
                expect(peer.multiaddrs.size >= 1).to.equal(true);
                expect(peer.multiaddrs.has(ma)).to.equal(false);
                swarm.close(done);
            };
            swarm.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
        });

        it("support addr /ip4/0.0.0.0/tcp/0", (done) => {
            const ma = "/ip4/0.0.0.0/tcp/0";
            peer.multiaddrs.add(ma);

            const swarm = new Swarm(peer, new PeerBook());
            swarm.transport.add("tcp", new TCP());
            const ready = function () {
                expect(peer.multiaddrs.size >= 1).to.equal(true);
                expect(peer.multiaddrs.has(ma)).to.equal(false);
                swarm.close(done);
            };
            swarm.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
        });

        it("listen in several addrs", function (done) {
            this.timeout(12000);

            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9002");
            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9003");

            const swarm = new Swarm(peer, new PeerBook());
            swarm.transport.add("tcp", new TCP());

            const ready = function () {
                expect(peer.multiaddrs.size).to.equal(3);
                swarm.close(done);
            };
            swarm.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);


        });

        it("handles EADDRINUSE error when trying to listen", (done) => {
            const swarm1 = new Swarm(peerA, new PeerBook());
            let swarm2;

            swarm1.transport.add("tcp", new TCP());
            swarm1.transport.listen("tcp", {}, (conn) => pull(conn, conn), () => {
                // Add in-use (peerA) address to peerB
                peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9888");

                swarm2 = new Swarm(peerB, new PeerBook());
                swarm2.transport.add("tcp", new TCP());

                const ready = function (err) {
                    assert.exists(err);
                    expect(err.code).to.equal("EADDRINUSE");
                    swarm1.close(() => swarm2.close(done));
                };
                swarm2.transport.listen("tcp", {}, (conn) => pull(conn, conn), ready);
            });
        });
    });

    describe("transport - websockets", () => {
        let swarmA;
        let swarmB;
        let peerA;
        let peerB;
        let dialPeers;

        before(() => {
            const infos = utils.createInfos(5);
            peerA = infos[0];
            peerB = infos[1];
            dialPeers = infos.slice(2);

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9888/ws");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
        });

        it("add", (done) => {
            swarmA.transport.add("ws", new WS());
            expect(Object.keys(swarmA.transports).length).to.equal(1);

            swarmB.transport.add("ws", new WS(), () => {
                expect(Object.keys(swarmB.transports).length).to.equal(1);
                done();
            });
        });

        it("listen", (done) => {
            parallel([
                (cb) => swarmA.transport.listen("ws", {}, (conn) => pull(conn, conn), cb),
                (cb) => swarmB.transport.listen("ws", {}, (conn) => pull(conn, conn), cb)
            ], () => {
                expect(peerA.multiaddrs.size).to.equal(1);
                expect(peerA.multiaddrs.has("/ip4/127.0.0.1/tcp/9888/ws")).to.equal(true);
                expect(peerB.multiaddrs.size).to.equal(1);
                expect(peerB.multiaddrs.has("/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC")).to.equal(true);
                done();
            });
        });

        it("dial", (done) => {
            dialPeers[0].multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/9999/ws"));
            const conn = swarmA.transport.dial("ws", dialPeers[0], (err, conn) => {
                assert.notExists(err);
            });

            const s = pull.goodbye({
                source: pull.values([Buffer.from("hey")]),
                sink: pull.collect((err, data) => {
                    assert.notExists(err);
                    expect(data).to.be.eql([Buffer.from("hey")]);
                    done();
                })
            });
            pull(s, conn, s);
        });

        it("dial (conn from callback)", (done) => {
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9999/ws");

            swarmA.transport.dial("ws", dialPeers[1], (err, conn) => {
                assert.notExists(err);

                const s = pull.goodbye({
                    source: pull.values([Buffer.from("hey")]),
                    sink: pull.collect((err, data) => {
                        assert.notExists(err);
                        expect(data).to.be.eql([Buffer.from("hey")]);
                        done();
                    })
                });
                pull(s, conn, s);
            });
        });

        it("dial to set of multiaddr, none is available", (done) => {
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9320/ws");
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9359/ws");

            swarmA.transport.dial("ws", dialPeers[2], (err, conn) => {
                assert.exists(err);
                expect(err.errors).to.have.length(2);
                assert.notExists(conn);
                done();
            });
        });

        it("close", (done) => {
            parallel([
                (cb) => swarmA.transport.close("ws", cb),
                (cb) => swarmB.transport.close("ws", cb)
            ], done);
        });
    });

    describe("circuit", () => {
        let swarmA; // TCP
        let peerA;
        let swarmB; // WS
        let peerB;
        let swarmC; // no transports
        let peerC; // just a peer
        let dialSpyA;

        before(() => {
            const infos = utils.createInfos(3);
            peerA = infos[0];
            peerB = infos[1];
            peerC = infos[2];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002/ws");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
            swarmC = new Swarm(peerC, new PeerBook());

            swarmA.transport.add("tcp", new TCP());
            swarmA.transport.add("WebSockets", new WS());

            swarmB.transport.add("WebSockets", new WS());

            dialSpyA = spy(swarmA.transport, "dial");
        });

        after((done) => {
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb)
            ], done);
        });

        it(".enableCircuitRelay - should enable circuit transport", () => {
            swarmA.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(swarmA.transports).length).to.equal(3);

            swarmB.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(swarmB.transports).length).to.equal(2);
        });

        it("should add to transport array", () => {
            assert.exists(swarmA.transports.Circuit);
            assert.exists(swarmB.transports.Circuit);
        });

        it("should add /p2p-curcuit addrs on listen", (done) => {
            parallel([
                (cb) => swarmA.listen(cb),
                (cb) => swarmB.listen(cb)
            ], (err) => {
                assert.notExists(err);
                expect(peerA.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
                expect(peerB.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
                done();
            });
        });

        it("should dial circuit ony once", (done) => {
            peerA.multiaddrs.clear();
            peerA.multiaddrs.add("/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star");
            swarmA.dial(peerC, (err, conn) => {
                assert.exists(err);
                expect(err).to.match(/Circuit already tried!/);
                assert.notExists(conn);
                expect(dialSpyA.callCount).to.be.eql(1);
                done();
            });
        });

        it("should dial circuit last", (done) => {
            peerC.multiaddrs.clear();
            peerC.multiaddrs.add("/p2p-circuit/ipfs/ABCD");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9998/ipfs/ABCD");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9999/ws/ipfs/ABCD");
            swarmA.dial(peerC, (err, conn) => {
                assert.exists(err);
                assert.notExists(conn);
                expect(dialSpyA.lastCall.args[0]).to.be.eql("Circuit");
                done();
            });
        });

        it("should not try circuit if no transports enabled", (done) => {
            swarmC.dial(peerA, (err, conn) => {
                assert.exists(err);
                assert.notExists(conn);

                expect(err).to.match(/No transports registered, dial not possible/);
                done();
            });
        });

        it("should not dial circuit if other transport succeed", (done) => {
            swarmA.dial(peerB, (err) => {
                assert.notExists(err);
                expect(dialSpyA.lastCall.args[0]).to.not.be.eql("Circuit");
                done();
            });
        });
    });

    describe("high level API - with everything mixed all together!", () => {
        let swarmA; // tcp
        let peerA;
        let swarmB; // tcp+ws
        let peerB;
        let swarmC; // tcp+ws
        let peerC;
        let swarmD; // ws
        let peerD;
        let swarmE; // ws
        let peerE;

        before(() => {
            const infos = utils.createInfos(5);

            peerA = infos[0];
            peerB = infos[1];
            peerC = infos[2];
            peerD = infos[3];
            peerE = infos[4];

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
            swarmC = new Swarm(peerC, new PeerBook());
            swarmD = new Swarm(peerD, new PeerBook());
            swarmE = new Swarm(peerE, new PeerBook());
        });

        after(function (done) {
            this.timeout(3000);
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb),
                (cb) => swarmD.close(cb),
                (cb) => swarmE.close(cb)
            ], done);
        });

        it("add tcp", (done) => {
            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/0");

            swarmA.transport.add("tcp", new TCP());
            swarmB.transport.add("tcp", new TCP());
            swarmC.transport.add("tcp", new TCP());

            parallel([
                (cb) => swarmA.transport.listen("tcp", {}, null, cb),
                (cb) => swarmB.transport.listen("tcp", {}, null, cb)
            ], done);
        });

        it.skip("add utp", () => { });

        it("add websockets", (done) => {
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9012/ws");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9022/ws");
            peerD.multiaddrs.add("/ip4/127.0.0.1/tcp/9032/ws");
            peerE.multiaddrs.add("/ip4/127.0.0.1/tcp/9042/ws");

            swarmB.transport.add("ws", new WS());
            swarmC.transport.add("ws", new WS());
            swarmD.transport.add("ws", new WS());
            swarmE.transport.add("ws", new WS());

            parallel([
                (cb) => swarmB.transport.listen("ws", {}, null, cb),
                (cb) => swarmD.transport.listen("ws", {}, null, cb),
                (cb) => swarmE.transport.listen("ws", {}, null, cb)
            ], done);
        });

        it("listen automatically", (done) => {
            swarmC.listen(done);
        });

        it("add spdy", () => {
            swarmA.connection.addStreamMuxer(spdy);
            swarmB.connection.addStreamMuxer(spdy);
            swarmC.connection.addStreamMuxer(spdy);
            swarmD.connection.addStreamMuxer(spdy);
            swarmE.connection.addStreamMuxer(spdy);

            swarmA.connection.reuse();
            swarmB.connection.reuse();
            swarmC.connection.reuse();
            swarmD.connection.reuse();
            swarmE.connection.reuse();
        });

        it.skip("add multiplex", () => { });

        it("warm up from A to B on tcp to tcp+ws", (done) => {
            parallel([
                (cb) => swarmB.once("peer-mux-established", (peerInfo) => {
                    expect(peerInfo.id.toB58String()).to.equal(peerA.id.toB58String());
                    cb();
                }),
                (cb) => swarmA.once("peer-mux-established", (peerInfo) => {
                    expect(peerInfo.id.toB58String()).to.equal(peerB.id.toB58String());
                    cb();
                }),
                (cb) => swarmA.dial(peerB, (err) => {
                    assert.notExists(err);
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                    cb();
                })
            ], done);
        });

        it("warm up a warmed up, from B to A", (done) => {
            swarmB.dial(peerA, (err) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                done();
            });
        });

        it("dial from tcp to tcp+ws, on protocol", (done) => {
            swarmB.handle("/anona/1.0.0", (protocol, conn) => pull(conn, conn));

            swarmA.dial(peerB, "/anona/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("dial from ws to ws no proto", (done) => {
            swarmD.dial(peerE, (err) => {
                assert.notExists(err);
                expect(Object.keys(swarmD.muxedConns).length).to.equal(1);
                done();
            });
        });

        it("dial from ws to ws", (done) => {
            swarmE.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            swarmD.dial(peerE, "/abacaxi/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmD.muxedConns).length).to.equal(1);

                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd((err) => {
                        assert.notExists(err);
                        setTimeout(() => {
                            expect(Object.keys(swarmE.muxedConns).length).to.equal(1);
                            done();
                        }, 1000);
                    })
                );
            });
        });

        it("dial from tcp to tcp+ws (returned conn)", (done) => {
            swarmB.handle("/grapes/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = swarmA.dial(peerB, "/grapes/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
            });

            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("dial from tcp+ws to tcp+ws", (done) => {
            let i = 0;

            const check = function (err) {
                if (err) {
                    return done(err);
                }

                if (i++ === 2) {
                    done();
                }
            };

            swarmC.handle("/mamao/1.0.0", (protocol, conn) => {
                conn.getPeerInfo((err, peerInfo) => {
                    assert.notExists(err);
                    assert.exists(peerInfo);
                    check();
                });

                pull(conn, conn);
            });

            swarmA.dial(peerC, "/mamao/1.0.0", (err, conn) => {
                assert.notExists(err);

                conn.getPeerInfo((err, peerInfo) => {
                    assert.notExists(err);
                    assert.exists(peerInfo);
                    check();
                });
                expect(Object.keys(swarmA.muxedConns).length).to.equal(2);

                assert.exists(peerC.isConnected);
                assert.exists(peerA.isConnected);

                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(check)
                );
            });
        });

        it("hangUp", (done) => {
            let count = 0;
            const ready = () => ++count === 3 ? done() : null;

            swarmB.once("peer-mux-closed", (peerInfo) => {
                expect(Object.keys(swarmB.muxedConns).length).to.equal(0);
                assert.notExists(peerB.isConnected());
                ready();
            });

            swarmA.once("peer-mux-closed", (peerInfo) => {
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                assert.notExists(peerA.isConnected());
                ready();
            });

            swarmA.hangUp(peerB, (err) => {
                assert.notExists(err);
                ready();
            });
        });

        it("close a muxer emits event", function (done) {
            this.timeout(2500);
            parallel([
                (cb) => swarmC.close(cb),
                (cb) => swarmA.once("peer-mux-closed", (peerInfo) => cb())
            ], done);
        });
    });

    describe("high level API - 1st without stream multiplexing (on TCP)", () => {
        let swarmA;
        let peerA;
        let swarmB;
        let peerB;

        before((done) => {
            const infos = utils.createInfos(2);

            peerA = infos[0];
            peerB = infos[1];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());

            swarmA.transport.add("tcp", new TCP());
            swarmB.transport.add("tcp", new TCP());

            parallel([
                (cb) => swarmA.transport.listen("tcp", {}, null, cb),
                (cb) => swarmB.transport.listen("tcp", {}, null, cb)
            ], done);
        });

        after((done) => {
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb)
            ], done);
        });

        it("handle a protocol", (done) => {
            swarmB.handle("/bananas/1.0.0", (protocol, conn) => pull(conn, conn));
            expect(Object.keys(swarmB.protocols).length).to.equal(2);
            done();
        });

        it("dial on protocol", (done) => {
            swarmB.handle("/pineapple/1.0.0", (protocol, conn) => pull(conn, conn));

            swarmA.dial(peerB, "/pineapple/1.0.0", (err, conn) => {
                assert.notExists(err);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("dial on protocol (returned conn)", (done) => {
            swarmB.handle("/apples/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = swarmA.dial(peerB, "/apples/1.0.0", (err) => {
                assert.notExists(err);
            });

            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("dial to warm a conn", (done) => {
            swarmA.dial(peerB, done);
        });

        it("dial on protocol, reuse warmed conn", (done) => {
            swarmA.dial(peerB, "/bananas/1.0.0", (err, conn) => {
                assert.notExists(err);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("unhandle", () => {
            const proto = "/bananas/1.0.0";
            swarmA.unhandle(proto);
            assert.notExists(swarmA.protocols[proto]);
        });
    });

    describe("stream muxing with multiplex (on TCP)", () => {
        let swarmA;
        let peerA;
        let swarmB;
        let peerB;
        let swarmC;
        let peerC;

        before((done) => {
            const infos = utils.createInfos(3);

            peerA = infos[0];
            peerB = infos[1];
            peerC = infos[2];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9003");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
            swarmC = new Swarm(peerC, new PeerBook());

            swarmA.transport.add("tcp", new TCP());
            swarmB.transport.add("tcp", new TCP());
            swarmC.transport.add("tcp", new TCP());

            parallel([
                (cb) => swarmA.transport.listen("tcp", {}, null, cb),
                (cb) => swarmB.transport.listen("tcp", {}, null, cb),
                (cb) => swarmC.transport.listen("tcp", {}, null, cb)
            ], done);
        });

        after((done) => {
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb)
            ], done);
        });

        it("add", (done) => {
            swarmA.connection.addStreamMuxer(multiplex);
            swarmB.connection.addStreamMuxer(multiplex);
            swarmC.connection.addStreamMuxer(multiplex);
            done();
        });

        it("handle + dial on protocol", (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            swarmA.dial(peerB, "/abacaxi/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("dial to warm conn", (done) => {
            swarmB.dial(peerA, (err) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                done();
            });
        });

        it("dial on protocol, reuse warmed conn", (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            swarmB.dial(peerA, "/papaia/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("enable identify to reuse incomming muxed conn", (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            swarmC.dial(peerA, (err) => {
                assert.notExists(err);
                setTimeout(() => {
                    expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                    done();
                }, 500);
            });
        });

        it("closing one side cleans out in the other", (done) => {
            swarmC.close((err) => {
                assert.notExists(err);
                setTimeout(() => {
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                    done();
                }, 500);
            });
        });
    });

    describe("secio conn upgrade (on TCP)", () => {
        let swarmA;
        let peerA;
        let swarmB;
        let peerB;
        let swarmC;
        let peerC;

        before((done) => {
            const infos = utils.createInfos(3);
            peerA = infos[0];
            peerB = infos[1];
            peerC = infos[2];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9003");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
            swarmC = new Swarm(peerC, new PeerBook());

            swarmA.connection.crypto(secio.tag, secio.encrypt);
            swarmB.connection.crypto(secio.tag, secio.encrypt);
            swarmC.connection.crypto(secio.tag, secio.encrypt);

            swarmA.transport.add("tcp", new TCP());
            swarmB.transport.add("tcp", new TCP());
            swarmC.transport.add("tcp", new TCP());

            parallel([
                (cb) => swarmA.transport.listen("tcp", {}, null, cb),
                (cb) => swarmB.transport.listen("tcp", {}, null, cb),
                (cb) => swarmC.transport.listen("tcp", {}, null, cb)
            ], done);
        });

        after(function (done) {
            this.timeout(3000);
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb),
                (cb) => swarmC.close(cb)
            ], done);
        });

        it("add", () => {
            swarmA.connection.addStreamMuxer(multiplex);
            swarmB.connection.addStreamMuxer(multiplex);
            swarmC.connection.addStreamMuxer(multiplex);
        });

        it("handle + dial on protocol", (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            swarmA.dial(peerB, "/abacaxi/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("dial to warm conn", (done) => {
            swarmB.dial(peerA, (err) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                done();
            });
        });

        it("dial on protocol, reuse warmed conn", (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => pull(conn, conn));

            swarmB.dial(peerA, "/papaia/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("enable identify to reuse incomming muxed conn", (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            swarmC.dial(peerA, (err) => {
                assert.notExists(err);
                setTimeout(() => {
                    expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                    done();
                }, 500);
            });
        });

        it("switch back to plaintext if no arguments passed in", () => {
            swarmA.connection.crypto();
            expect(swarmA.crypto.tag).to.eql("/plaintext/1.0.0");
        });
    });

    describe("stream muxing with spdy (on TCP)", function () {
        this.timeout(5000);

        let swarmA;
        let peerA;
        let swarmB;
        let peerB;
        let swarmC;
        let peerC;
        let swarmD;
        let peerD;

        before((done) => {
            const infos = utils.createInfos(4);
            peerA = infos[0];
            peerB = infos[1];
            peerC = infos[2];
            peerD = infos[3];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9003");
            peerD.multiaddrs.add("/ip4/127.0.0.1/tcp/9004");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());
            swarmC = new Swarm(peerC, new PeerBook());
            swarmD = new Swarm(peerD, new PeerBook());

            swarmA.transport.add("tcp", new TCP());
            swarmB.transport.add("tcp", new TCP());
            swarmC.transport.add("tcp", new TCP());
            swarmD.transport.add("tcp", new TCP());

            parallel([
                (cb) => swarmA.transport.listen("tcp", {}, null, cb),
                (cb) => swarmB.transport.listen("tcp", {}, null, cb),
                (cb) => swarmC.transport.listen("tcp", {}, null, cb),
                (cb) => swarmD.transport.listen("tcp", {}, null, cb)
            ], done);
        });

        after((done) => {
            parallel([
                (cb) => swarmA.close(cb),
                (cb) => swarmB.close(cb),
                (cb) => swarmD.close(cb)
            ], done);
        });

        it("add", () => {
            swarmA.connection.addStreamMuxer(spdy);
            swarmB.connection.addStreamMuxer(spdy);
            swarmC.connection.addStreamMuxer(spdy);
            swarmD.connection.addStreamMuxer(spdy);
        });

        it("handle + dial on protocol", (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            swarmA.dial(peerB, "/abacaxi/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                pull(pull.empty(), conn, pull.onEnd(done));
            });
        });

        it("dial to warm conn", (done) => {
            swarmB.dial(peerA, (err) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                done();
            });
        });

        it("dial on protocol, reuse warmed conn", (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            swarmB.dial(peerA, "/papaia/1.0.0", (err, conn) => {
                assert.notExists(err);
                expect(Object.keys(swarmB.conns).length).to.equal(0);
                expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(done)
                );
            });
        });

        it("enable identify to reuse incomming muxed conn", (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            swarmC.dial(peerA, (err) => {
                assert.notExists(err);
                setTimeout(() => {
                    expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                    done();
                }, 500);
            });
        });

        it("with Identify, do getPeerInfo", (done) => {
            swarmA.handle("/banana/1.0.0", (protocol, conn) => {
                conn.getPeerInfo((err, peerInfoC) => {
                    assert.notExists(err);
                    expect(peerInfoC.id.toB58String()).to.equal(peerC.id.toB58String());
                });

                pull(conn, conn);
            });

            swarmC.dial(peerA, "/banana/1.0.0", (err, conn) => {
                assert.notExists(err);
                setTimeout(() => {
                    expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                    expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                    conn.getPeerInfo((err, peerInfoA) => {
                        assert.notExists(err);
                        expect(peerInfoA.id.toB58String()).to.equal(peerA.id.toB58String());
                        pull(pull.empty(), conn, pull.onEnd(done));
                    });
                }, 500);
            });
        });

        // This test is not possible as the raw conn is not exposed anymore
        // TODO: create a similar version, but that spawns a swarm in a
        // different proc
        it.skip("make sure it does not blow up when the socket is closed", (done) => {
            swarmD.connection.reuse();

            let count = 0;
            const destroyed = () => ++count === 2 ? done() : null;

            swarmD.handle("/banana/1.0.0", (protocol, conn) => {
                pull(
                    conn,
                    pull.onEnd(destroyed)
                );
            });

            swarmA.dial(peerD, "/banana/1.0.0", (err, conn) => {
                assert.notExists(err);

                pull(
                    pull.empty(),
                    swarmD.muxedConns[peerA.id.toB58String()].conn
                );
                pull(conn, pull.onEnd(destroyed));
            });
        });

        // This test is not possible as the raw conn is not exposed anymore
        // TODO: create a similar version, but that spawns a swarm in a
        // different proc
        it.skip("blow up a socket, with WebSockets", (done) => {
            const peerE = new PeerInfo();
            const peerF = new PeerInfo();

            peerE.multiaddrs.add("/ip4/127.0.0.1/tcp/9110/ws");
            peerF.multiaddrs.add("/ip4/127.0.0.1/tcp/9120/ws");

            const swarmE = new Swarm(peerE, new PeerBook());
            const swarmF = new Swarm(peerF, new PeerBook());

            swarmE.transport.add("ws", new WS());
            swarmF.transport.add("ws", new WS());

            swarmE.connection.addStreamMuxer(spdy);
            swarmF.connection.addStreamMuxer(spdy);
            swarmE.connection.reuse();
            swarmF.connection.reuse();

            const close = function () {
                parallel([
                    (cb) => swarmE.close(cb),
                    (cb) => swarmF.close(cb)
                ], done);
            };

            const next = function () {
                let count = 0;
                const destroyed = () => ++count === 2 ? close() : null;

                swarmE.handle("/avocado/1.0.0", (protocol, conn) => {
                    pull(
                        conn,
                        pull.onEnd(destroyed)
                    );
                });

                swarmF.dial(peerE, "/avocado/1.0.0", (err, conn) => {
                    assert.notExists(err);
                    pull(
                        conn,
                        pull.onEnd(destroyed)
                    );

                    pull(
                        pull.empty(),
                        swarmF.muxedConns[peerE.id.toB58String()].conn
                    );
                });
            };

            parallel([
                (cb) => swarmE.transport.listen("ws", {}, null, cb),
                (cb) => swarmF.transport.listen("ws", {}, null, cb)
            ], next);
        });

        it("close one end, make sure the other does not blow", (done) => {
            swarmC.close((err) => {
                if (err) {
                    throw err;
                }
                // to make sure it has time to propagate
                setTimeout(done, 1000);
            });
        });
    });

    describe("netron2", "Swarm", "LimitDialer", () => {
        let peers;

        before(() => {
            const infos = utils.createInfos(5);
            peers = infos;

            peers.forEach((peer, i) => {
                peer.multiaddrs.add(multi.address.create(`/ip4/191.0.0.1/tcp/123${i}`));
                peer.multiaddrs.add(multi.address.create(`/ip4/192.168.0.1/tcp/923${i}`));
                peer.multiaddrs.add(multi.address.create(`/ip4/193.168.0.99/tcp/923${i}`));
            });
        });

        it("all failing", (done) => {
            const dialer = new LimitDialer(2, 10);

            // mock transport
            const t1 = {
                dial(addr, cb) {
                    setTimeout(() => cb(new Error("fail")), 1);
                    return {};
                }
            };

            dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray(), (err, conn) => {
                assert.exists(err);
                expect(err.errors).to.have.length(3);
                expect(err.errors[0].message).to.eql("fail");
                assert.notExists(conn);
                done();
            });
        });

        it("two success", (done) => {
            const dialer = new LimitDialer(2, 10);

            // mock transport
            const t1 = {
                dial(addr, cb) {
                    const as = addr.toString();
                    if (as.match(/191/)) {
                        setImmediate(() => cb(new Error("fail")));
                        return {};
                    } else if (as.match(/192/)) {
                        setTimeout(cb, 2);
                        return {
                            source: pull.values([1]),
                            sink: pull.drain()
                        };
                    } else if (as.match(/193/)) {
                        setTimeout(cb, 8);
                        return {
                            source: pull.values([2]),
                            sink: pull.drain()
                        };
                    }
                }
            };

            dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray(), (err, success) => {
                const conn = success.conn;
                expect(success.multiaddr.toString()).to.equal("/ip4/192.168.0.1/tcp/9230");
                assert.notExists(err);
                pull(
                    conn,
                    pull.collect((err, res) => {
                        assert.notExists(err);
                        expect(res).to.be.eql([1]);
                        done();
                    })
                );
            });
        });
    });

    describe("transport - utp", () => {
        before((done) => {
            done();
        });
        it.skip("add", (done) => { });
        it.skip("listen", (done) => { });
        it.skip("dial", (done) => { });
        it.skip("close", (done) => { });
    });
});
