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

        it("tm.add()", () => {
            swarmA.tm.add("tcp", new TCP());
            expect(Object.keys(swarmA.tm.transports).length).to.equal(1);

            swarmB.tm.add("tcp", new TCP());
            expect(Object.keys(swarmB.tm.transports).length).to.equal(1);
        });

        it("tm.listen()", async () => {
            await swarmA.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            await swarmB.tm.listen("tcp", {}, (conn) => pull(conn, conn));

            expect(peerA.multiaddrs.size).to.equal(1);
            expect(peerA.multiaddrs.has("/ip4/127.0.0.1/tcp/9888")).to.equal(true);

            expect(peerB.multiaddrs.size).to.equal(1);
            expect(peerB.multiaddrs.has("/ip4/127.0.0.1/tcp/9999")).to.equal(true);
        });

        it("tm.connect() to a multiaddr", async (done) => {
            dialPeers[0].multiaddrs.add("/ip4/127.0.0.1/tcp/9999");
            const conn = await swarmA.tm.connect("tcp", dialPeers[0]);

            pull(
                pull.values(["hey"]),
                conn,
                pull.onEnd(done)
            );
        });

        it("tm.connect() to set of multiaddr, only one is available", async (done) => {
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9910/ws"); // not valid on purpose
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9359");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9329");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9910");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9999");
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9309");

            const conn = await swarmA.tm.connect("tcp", dialPeers[1]);

            pull(
                pull.values(["hey"]),
                conn,
                pull.onEnd(done)
            );
        });

        it("tm.connect() to set of multiaddr, none is available", async () => {
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9910/ws"); // not valid on purpose
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9359");
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9329");

            const err = await assert.throws(async () => swarmA.tm.connect("tcp", dialPeers[2]));
            expect(err.errors).to.have.length(2);
        });

        it("tm.close()", async function () {
            this.timeout(2500);
            await Promise.all([
                swarmA.tm.close("tcp"),
                swarmB.tm.close("tcp")
            ]);
        });

        it("support port 0", async () => {
            const ma = "/ip4/127.0.0.1/tcp/0";
            peer.multiaddrs.add(ma);

            const swarm = new Swarm(peer, new PeerBook());

            swarm.tm.add("tcp", new TCP());
            await swarm.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            expect(peer.multiaddrs.size).to.equal(1);
            // should not have /tcp/0 anymore
            expect(peer.multiaddrs.has(ma)).to.equal(false);
            await swarm.close();
        });

        it("support addr /ip4/0.0.0.0/tcp/9050", async () => {
            const ma = "/ip4/0.0.0.0/tcp/9050";
            peer.multiaddrs.add(ma);
            const swarm = new Swarm(peer, new PeerBook());
            swarm.tm.add("tcp", new TCP());
            await swarm.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            expect(peer.multiaddrs.size >= 1).to.equal(true);
            expect(peer.multiaddrs.has(ma)).to.equal(false);
            await swarm.close();
        });

        it("support addr /ip4/0.0.0.0/tcp/0", async () => {
            const ma = "/ip4/0.0.0.0/tcp/0";
            peer.multiaddrs.add(ma);

            const swarm = new Swarm(peer, new PeerBook());
            swarm.tm.add("tcp", new TCP());
            await swarm.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            expect(peer.multiaddrs.size >= 1).to.equal(true);
            expect(peer.multiaddrs.has(ma)).to.equal(false);
            await swarm.close();
        });

        it("listen in several addrs", async function () {
            this.timeout(12000);

            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9002");
            peer.multiaddrs.add("/ip4/127.0.0.1/tcp/9003");

            const swarm = new Swarm(peer, new PeerBook());
            swarm.tm.add("tcp", new TCP());

            await swarm.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            expect(peer.multiaddrs.size).to.equal(3);
            await swarm.close();
        });

        it("handles EADDRINUSE error when trying to listen", async () => {
            const swarm1 = new Swarm(peerA, new PeerBook());

            swarm1.tm.add("tcp", new TCP());
            await swarm1.tm.listen("tcp", {}, (conn) => pull(conn, conn));
            // Add in-use (peerA) address to peerB
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9888");

            const swarm2 = new Swarm(peerB, new PeerBook());
            swarm2.tm.add("tcp", new TCP());

            const err = await assert.throws(async () => swarm2.tm.listen("tcp", {}, (conn) => pull(conn, conn)));
            expect(err.code).to.equal("EADDRINUSE");
            await swarm1.close();
            await swarm2.close();
        });
    });

    describe("transport - ws", () => {
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

        it("tm.add()", () => {
            swarmA.tm.add("ws", new WS());
            expect(Object.keys(swarmA.tm.transports).length).to.equal(1);

            swarmB.tm.add("ws", new WS());
            expect(Object.keys(swarmB.tm.transports).length).to.equal(1);
        });

        it("tm.listen()", async () => {
            await Promise.all([
                swarmA.tm.listen("ws", {}, (conn) => pull(conn, conn)),
                swarmB.tm.listen("ws", {}, (conn) => pull(conn, conn))
            ]);

            expect(peerA.multiaddrs.size).to.equal(1);
            expect(peerA.multiaddrs.has("/ip4/127.0.0.1/tcp/9888/ws")).to.equal(true);
            expect(peerB.multiaddrs.size).to.equal(1);
            expect(peerB.multiaddrs.has("/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC")).to.equal(true);
        });

        it("connect", async (done) => {
            dialPeers[0].multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/9999/ws"));
            const conn = await swarmA.tm.connect("ws", dialPeers[0]);

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

        it("connect (conn from callback)", async (done) => {
            dialPeers[1].multiaddrs.add("/ip4/127.0.0.1/tcp/9999/ws");

            const conn = await swarmA.tm.connect("ws", dialPeers[1]);
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

        it("connect to set of multiaddr, none is available", async () => {
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9320/ws");
            dialPeers[2].multiaddrs.add("/ip4/127.0.0.1/tcp/9359/ws");

            const err = await assert.throws(async () => swarmA.tm.connect("ws", dialPeers[2]));
            expect(err.errors).to.have.length(2);
        });

        it("close", async () => {
            await Promise.all([
                swarmA.tm.close("ws"),
                swarmB.tm.close("ws")
            ]);
        });
    });

    describe("circuit", () => {
        let swarmA; // TCP
        let peerA;
        let swarmB; // WS
        let peerB;
        let swarmC; // no transports
        let peerC; // just a peer
        let connectSpyA;

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

            swarmA.tm.add("tcp", new TCP());
            swarmA.tm.add("WebSockets", new WS());

            swarmB.tm.add("WebSockets", new WS());

            connectSpyA = spy(swarmA.tm, "connect");
        });

        after(async () => {
            await Promise.all([
                swarmA.close(),
                swarmB.close()
            ]);
        });

        it("enableCircuitRelay() - should enable circuit transport", () => {
            swarmA.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(swarmA.tm.transports).length).to.equal(3);

            swarmB.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(swarmB.tm.transports).length).to.equal(2);
        });

        it("should add to transport array", () => {
            assert.exists(swarmA.tm.transports.Circuit);
            assert.exists(swarmB.tm.transports.Circuit);
        });

        it("should add /p2p-curcuit addrs on listen", async () => {
            await Promise.all([
                swarmA.listen(),
                swarmB.listen()
            ]);
            expect(peerA.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
            expect(peerB.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
        });

        it("should connect circuit ony once", async () => {
            peerA.multiaddrs.clear();
            peerA.multiaddrs.add("/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star");
            await assert.throws(async () => swarmA.connect(peerC), /Circuit already tried!/);
            expect(connectSpyA.callCount).to.be.eql(1);
        });

        it("should connect circuit last", async () => {
            peerC.multiaddrs.clear();
            peerC.multiaddrs.add("/p2p-circuit/ipfs/ABCD");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9998/ipfs/ABCD");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9999/ws/ipfs/ABCD");
            await assert.throws(async () => swarmA.connect(peerC));
            expect(connectSpyA.lastCall.args[0]).to.be.eql("Circuit");
        });

        it("should not try circuit if no transports enabled", async () => {
            await assert.throws(async () => swarmC.connect(peerA), /No transports registered, connect not possible/);
        });

        it("should not connect circuit if other transport succeed", async () => {
            await swarmA.connect(peerB);
            // expect(connectSpyA.lastCall.args[0]).to.not.be.eql("Circuit");
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

        after(async function () {
            this.timeout(3000);
            await Promise.all([
                swarmA.close(),
                swarmB.close(),
                swarmD.close(),
                swarmE.close()
            ]);
        });

        it("add tcp", async () => {
            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/0");

            swarmA.tm.add("tcp", new TCP());
            swarmB.tm.add("tcp", new TCP());
            swarmC.tm.add("tcp", new TCP());

            await Promise.all([
                swarmA.tm.listen("tcp", {}, null),
                swarmB.tm.listen("tcp", {}, null)
            ]);
        });

        it.skip("add utp", () => { });

        it("add websockets", async () => {
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9012/ws");
            peerC.multiaddrs.add("/ip4/127.0.0.1/tcp/9022/ws");
            peerD.multiaddrs.add("/ip4/127.0.0.1/tcp/9032/ws");
            peerE.multiaddrs.add("/ip4/127.0.0.1/tcp/9042/ws");

            swarmB.tm.add("ws", new WS());
            swarmC.tm.add("ws", new WS());
            swarmD.tm.add("ws", new WS());
            swarmE.tm.add("ws", new WS());

            await Promise.all([
                swarmB.tm.listen("ws", {}, null),
                swarmD.tm.listen("ws", {}, null),
                swarmE.tm.listen("ws", {}, null)
            ]);
        });

        it("listen automatically", async () => {
            await swarmC.listen();
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

        it("warm up from A to B on tcp to tcp+ws", async () => {
            await Promise.all([
                new Promise((resolve) => {
                    swarmB.once("peer-mux-established", (peerInfo) => {
                        expect(peerInfo.id.asBase58()).to.equal(peerA.id.asBase58());
                        resolve();
                    });
                }),
                new Promise((resolve) => {
                    swarmA.once("peer-mux-established", (peerInfo) => {
                        expect(peerInfo.id.asBase58()).to.equal(peerB.id.asBase58());
                        resolve();
                    });
                }),
                swarmA.connect(peerB)
            ]);

            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
        });

        it("warm up a warmed up, from B to A", async () => {
            await swarmB.connect(peerA);
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
        });

        it("connect from tcp to tcp+ws, on protocol", async (done) => {
            swarmB.handle("/anona/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmA.connect(peerB, "/anona/1.0.0");
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("connect from ws to ws no proto", async () => {
            await swarmD.connect(peerE);
            expect(Object.keys(swarmD.muxedConns).length).to.equal(1);
        });

        it("connect from ws to ws", async (done) => {
            swarmE.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmD.connect(peerE, "/abacaxi/1.0.0");
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

        it("connect from tcp to tcp+ws (returned conn)", async (done) => {
            swarmB.handle("/grapes/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmA.connect(peerB, "/grapes/1.0.0");
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);

            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("connect from tcp+ws to tcp+ws", async (done) => {
            let i = 0;

            const check = function (err) {
                if (err) {
                    return done(err);
                }

                if (i++ === 2) {
                    done();
                }
            };

            swarmC.handle("/mamao/1.0.0", async (protocol, conn) => {
                pull(conn, conn);
                const peerInfo = await conn.getPeerInfo();
                assert.exists(peerInfo);
                check();
            });

            const conn = await swarmA.connect(peerC, "/mamao/1.0.0");
            const peerInfo = await conn.getPeerInfo();
            assert.exists(peerInfo);
            check();
            expect(Object.keys(swarmA.muxedConns).length).to.equal(2);

            assert.exists(peerC.isConnected);
            assert.exists(peerA.isConnected);

            pull(
                pull.empty(),
                conn,
                pull.onEnd(check)
            );
        });

        it("disconnect", (done) => {
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

            swarmA.disconnect(peerB).then(ready);
        });

        it("close a muxer emits event", async function () {
            this.timeout(2500);
            await Promise.all([
                swarmC.close(),
                new Promise((resolve) => swarmA.once("peer-mux-closed", resolve))
            ]);
        });
    });

    describe("high level API - 1st without stream multiplexing (on TCP)", () => {
        let swarmA;
        let peerA;
        let swarmB;
        let peerB;

        before(async () => {
            const infos = utils.createInfos(2);

            peerA = infos[0];
            peerB = infos[1];

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9002/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");

            swarmA = new Swarm(peerA, new PeerBook());
            swarmB = new Swarm(peerB, new PeerBook());

            swarmA.tm.add("tcp", new TCP());
            swarmB.tm.add("tcp", new TCP());

            await Promise.all([
                swarmA.tm.listen("tcp", {}, null),
                swarmB.tm.listen("tcp", {}, null)
            ]);
        });

        after(async () => {
            await Promise.all([
                swarmA.close(),
                swarmB.close()
            ]);
        });

        it("handle a protocol", () => {
            swarmB.handle("/bananas/1.0.0", (protocol, conn) => pull(conn, conn));
            expect(Object.keys(swarmB.protocols).length).to.equal(2);
        });

        it("connect on protocol", async (done) => {
            swarmB.handle("/pineapple/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmA.connect(peerB, "/pineapple/1.0.0");
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("connect to warm a conn", async () => {
            await swarmA.connect(peerB);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            const conn = await swarmA.connect(peerB, "/bananas/1.0.0");
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
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

        before(async () => {
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

            swarmA.tm.add("tcp", new TCP());
            swarmB.tm.add("tcp", new TCP());
            swarmC.tm.add("tcp", new TCP());

            await Promise.all([
                swarmA.tm.listen("tcp", {}, null),
                swarmB.tm.listen("tcp", {}, null),
                swarmC.tm.listen("tcp", {}, null)
            ]);
        });

        after(async () => {
            await Promise.all([
                swarmA.close(),
                swarmB.close()
            ]);
        });

        it("add", () => {
            swarmA.connection.addStreamMuxer(multiplex);
            swarmB.connection.addStreamMuxer(multiplex);
            swarmC.connection.addStreamMuxer(multiplex);
        });

        it("handle + connect on protocol", async (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            const conn = await swarmA.connect(peerB, "/abacaxi/1.0.0");
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("connect to warm conn", async () => {
            await swarmB.connect(peerA);
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            const conn = await swarmB.connect(peerA, "/papaia/1.0.0");
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("enable identify to reuse incomming muxed conn", async (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            await swarmC.connect(peerA);
            setTimeout(() => {
                expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                done();
            }, 500);
        });

        it("closing one side cleans out in the other", async (done) => {
            await swarmC.close();
            setTimeout(() => {
                expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
                done();
            }, 500);
        });
    });

    describe("secio conn upgrade (on TCP)", () => {
        let swarmA;
        let peerA;
        let swarmB;
        let peerB;
        let swarmC;
        let peerC;

        before(async () => {
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

            swarmA.tm.add("tcp", new TCP());
            swarmB.tm.add("tcp", new TCP());
            swarmC.tm.add("tcp", new TCP());

            await Promise.all([
                swarmA.tm.listen("tcp", {}, null),
                swarmB.tm.listen("tcp", {}, null),
                swarmC.tm.listen("tcp", {}, null)
            ]);
        });

        after(async function () {
            this.timeout(3000);
            await swarmA.close();
            await swarmB.close();
            await swarmC.close();
        });

        it("add", () => {
            swarmA.connection.addStreamMuxer(multiplex);
            swarmB.connection.addStreamMuxer(multiplex);
            swarmC.connection.addStreamMuxer(multiplex);
        });

        it("handle + connect on protocol", async (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmA.connect(peerB, "/abacaxi/1.0.0");
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("connect to warm conn", async () => {
            await swarmB.connect(peerA);
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await swarmB.connect(peerA, "/papaia/1.0.0");
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("enable identify to reuse incomming muxed conn", async (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            await swarmC.connect(peerA);
            setTimeout(() => {
                expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                done();
            }, 500);
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

        before(async () => {
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

            swarmA.tm.add("tcp", new TCP());
            swarmB.tm.add("tcp", new TCP());
            swarmC.tm.add("tcp", new TCP());
            swarmD.tm.add("tcp", new TCP());

            await Promise.all([
                swarmA.tm.listen("tcp", {}, null),
                swarmB.tm.listen("tcp", {}, null),
                swarmC.tm.listen("tcp", {}, null),
                swarmD.tm.listen("tcp", {}, null)
            ]);
        });

        after(async () => {
            await Promise.all([
                swarmA.close(),
                swarmB.close(),
                swarmD.close()
            ]);
        });

        it("add", () => {
            swarmA.connection.addStreamMuxer(spdy);
            swarmB.connection.addStreamMuxer(spdy);
            swarmC.connection.addStreamMuxer(spdy);
            swarmD.connection.addStreamMuxer(spdy);
        });

        it("handle + connect on protocol", async (done) => {
            swarmB.handle("/abacaxi/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            const conn = await swarmA.connect(peerB, "/abacaxi/1.0.0");
            expect(Object.keys(swarmA.muxedConns).length).to.equal(1);
            pull(pull.empty(), conn, pull.onEnd(done));
        });

        it("connect to warm conn", async () => {
            await swarmB.connect(peerA);
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            swarmA.handle("/papaia/1.0.0", (protocol, conn) => {
                pull(conn, conn);
            });

            const conn = await swarmB.connect(peerA, "/papaia/1.0.0");
            expect(Object.keys(swarmB.conns).length).to.equal(0);
            expect(Object.keys(swarmB.muxedConns).length).to.equal(1);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(done)
            );
        });

        it("enable identify to reuse incomming muxed conn", async (done) => {
            swarmA.connection.reuse();
            swarmC.connection.reuse();

            await swarmC.connect(peerA);
            setTimeout(() => {
                expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                done();
            }, 500);
        });

        it("with Identify, do getPeerInfo", async (done) => {
            swarmA.handle("/banana/1.0.0", async (protocol, conn) => {
                pull(conn, conn);
                const peerInfoC = await conn.getPeerInfo();
                expect(peerInfoC.id.asBase58()).to.equal(peerC.id.asBase58());
            });

            const conn = await swarmC.connect(peerA, "/banana/1.0.0");
            setTimeout(async () => {
                expect(Object.keys(swarmC.muxedConns).length).to.equal(1);
                expect(Object.keys(swarmA.muxedConns).length).to.equal(2);
                const peerInfoA = await conn.getPeerInfo();
                expect(peerInfoA.id.asBase58()).to.equal(peerA.id.asBase58());
                pull(pull.empty(), conn, pull.onEnd(done));
            }, 500);
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

            swarmA.connect(peerD, "/banana/1.0.0", (err, conn) => {
                assert.notExists(err);

                pull(
                    pull.empty(),
                    swarmD.muxedConns[peerA.id.asBase58()].conn
                );
                pull(conn, pull.onEnd(destroyed));
            });
        });

        // // This test is not possible as the raw conn is not exposed anymore
        // // TODO: create a similar version, but that spawns a swarm in a
        // // different proc
        // it.skip("blow up a socket, with WebSockets", (done) => {
        //     const peerE = new PeerInfo();
        //     const peerF = new PeerInfo();

        //     peerE.multiaddrs.add("/ip4/127.0.0.1/tcp/9110/ws");
        //     peerF.multiaddrs.add("/ip4/127.0.0.1/tcp/9120/ws");

        //     const swarmE = new Swarm(peerE, new PeerBook());
        //     const swarmF = new Swarm(peerF, new PeerBook());

        //     swarmE.tm.add("ws", new WS());
        //     swarmF.tm.add("ws", new WS());

        //     swarmE.connection.addStreamMuxer(spdy);
        //     swarmF.connection.addStreamMuxer(spdy);
        //     swarmE.connection.reuse();
        //     swarmF.connection.reuse();

        //     const close = function () {
        //         parallel([
        //             (cb) => swarmE.close(cb),
        //             (cb) => swarmF.close(cb)
        //         ], done);
        //     };

        //     const next = function () {
        //         let count = 0;
        //         const destroyed = () => ++count === 2 ? close() : null;

        //         swarmE.handle("/avocado/1.0.0", (protocol, conn) => {
        //             pull(
        //                 conn,
        //                 pull.onEnd(destroyed)
        //             );
        //         });

        //         swarmF.connect(peerE, "/avocado/1.0.0", (err, conn) => {
        //             assert.notExists(err);
        //             pull(
        //                 conn,
        //                 pull.onEnd(destroyed)
        //             );

        //             pull(
        //                 pull.empty(),
        //                 swarmF.muxedConns[peerE.id.asBase58()].conn
        //             );
        //         });
        //     };

        //     parallel([
        //         (cb) => swarmE.tm.listen("ws", {}, null, cb),
        //         (cb) => swarmF.tm.listen("ws", {}, null, cb)
        //     ], next);
        // });

        it("close one end, make sure the other does not blow", async () => {
            await swarmC.close();
            // to make sure it has time to propagate
            await adone.promise.delay(1000);
        });
    });

    describe("LimitDialer", () => {
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

        it("all failing", async () => {
            const dialer = new LimitDialer(2, 10);

            // mock transport
            const t1 = {
                async connect() {
                    await adone.promise.delay(1);
                    throw new Error("fail");
                }
            };

            const err = await assert.throws(async () => dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray()));
            expect(err.errors).to.have.length(3);
            expect(err.errors[0].message).to.eql("fail");
        });

        it("two success", async (done) => {
            const dialer = new LimitDialer(2, 10);

            // mock transport
            const t1 = {
                async connect(addr) {
                    const as = addr.toString();
                    if (as.match(/191/)) {
                        throw new Error("fail");
                    } else if (as.match(/192/)) {
                        await adone.promise.delay(2);
                        return {
                            source: pull.values([1]),
                            sink: pull.drain()
                        };
                    } else if (as.match(/193/)) {
                        await adone.promise.delay(2);
                        return {
                            source: pull.values([2]),
                            sink: pull.drain()
                        };
                    }
                }
            };

            const success = await dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray());
            const conn = success.conn;
            expect(success.multiaddr.toString()).to.equal("/ip4/192.168.0.1/tcp/9230");
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

    describe("transport - utp", () => {
        before((done) => {
            done();
        });
        it.skip("add", (done) => { });
        it.skip("listen", (done) => { });
        it.skip("connect", (done) => { });
        it.skip("close", (done) => { });
    });
});
