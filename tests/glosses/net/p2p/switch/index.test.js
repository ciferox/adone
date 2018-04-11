import { createInfos, tryEcho } from "./utils";

const {
    multi,
    net: { p2p: { secio, muxer: { mplex/*, spdy*/ }, switch: { Switch }, PeerBook, transport: { TCP, WS } } },
    stream: { pull }
} = adone;

const { LimitDialer } = adone.private(adone.net.p2p.switch);


describe("switch", () => {
    describe("create Switch instance", () => {
        it("throws on missing peerInfo", () => {
            expect(() => new Switch()).to.throw(/You must provide a `peerInfo`/);
        });
    });

    describe("transports", () => {
        const transports = [
            {
                name: "TCP", C: TCP, maGen: (port) => `//ip4/127.0.0.1//tcp/${port}`
            },
            {
                name: "WS", C: WS, maGen: (port) => `//ip4/127.0.0.1//tcp/${port}//ws`
            }
            // { n: 'UTP', C: UTP, maGen: (port) => { return `//ip4/127.0.0.1//udp/${port}//utp` } }
        ];

        for (const t of transports) {
            describe(t.name, () => {
                let switchA;
                let switchB;
                let peerA;
                let peerB;
                let morePeerInfo;

                before(() => {
                    const infos = createInfos(9);
                    peerA = infos[0];
                    peerB = infos[1];
                    morePeerInfo = infos.slice(2);

                    peerA.multiaddrs.add(t.maGen(9888));
                    peerB.multiaddrs.add(t.maGen(9999));
                    switchA = new Switch(peerA, new PeerBook());
                    switchB = new Switch(peerB, new PeerBook());
                });

                after(async () => {
                    await switchB.stop();
                });

                it("tm.add()", () => {
                    switchA.tm.add(t.name, new t.C());
                    expect(Object.keys(switchA.tm.transports).length).to.equal(1);

                    switchB.tm.add(t.name, new t.C());
                    expect(Object.keys(switchB.tm.transports).length).to.equal(1);
                });

                it("tm.listen()", async () => {
                    await Promise.all([
                        switchA.tm.listen(t.name, {}, (conn) => pull(conn, conn)),
                        switchB.tm.listen(t.name, {}, (conn) => pull(conn, conn))
                    ]);
                    expect(switchA._peerInfo.multiaddrs.size).to.equal(1);
                    expect(switchB._peerInfo.multiaddrs.size).to.equal(1);
                });

                it("tm.connect() to a multiaddr", async (done) => {
                    const peer = morePeerInfo[0];
                    peer.multiaddrs.add(t.maGen(9999));

                    await adone.promise.delay(300);

                    const conn = await switchA.tm.connect(t.name, peer);
                    tryEcho(conn, done);
                });

                it("tm.connect() to set of multiaddr, only one is available", async (done) => {
                    const peer = morePeerInfo[1];
                    peer.multiaddrs.add(t.maGen(9359));
                    peer.multiaddrs.add(t.maGen(9329));
                    peer.multiaddrs.add(t.maGen(9910));
                    peer.multiaddrs.add(t.maGen(9999));
                    peer.multiaddrs.add(t.maGen(9309));

                    // addr not supported added on purpose
                    peer.multiaddrs.add("//ip4/1.2.3.4//tcp/3456//ws//p2p-webrtc-star");

                    const conn = await switchA.tm.connect(t.name, peer);

                    tryEcho(conn, done);
                });

                it("tm.connect() to set of multiaddr, none is available", async () => {
                    const peer = morePeerInfo[2];
                    peer.multiaddrs.add(t.maGen(9359));
                    peer.multiaddrs.add(t.maGen(9329));
                    // addr not supported added on purpose
                    peer.multiaddrs.add("//ip4/1.2.3.4//tcp/3456//ws//p2p-webrtc-star");

                    const err = await assert.throws(async () => switchA.tm.connect(t.name, peer));
                    expect(err.errors).to.have.length(2);
                });

                it("tm.close()", async function () {
                    this.timeout(2500);
                    await Promise.all([
                        switchA.tm.close(t.name),
                        switchB.tm.close(t.name)
                    ]);
                });

                it("support port 0", async () => {
                    const ma = t.maGen(0);
                    const peer = morePeerInfo[3];
                    peer.multiaddrs.add(ma);

                    const sw = new Switch(peer, new PeerBook());
                    sw.tm.add(t.name, new t.C());
                    await sw.tm.listen(t.name, {}, (conn) => pull(conn, conn));
                    expect(peer.multiaddrs.size).to.equal(1);
                    // should not have //tcp/0 anymore
                    expect(peer.multiaddrs.has(ma)).to.equal(false);
                    await sw.stop();
                });

                it("support addr 0.0.0.0", async () => {
                    const ma = t.maGen(9050).replace("127.0.0.1", "0.0.0.0");
                    const peer = morePeerInfo[4];
                    peer.multiaddrs.add(ma);

                    const sw = new Switch(peer, new PeerBook());
                    sw.tm.add(t.name, new t.C());
                    await sw.tm.listen(t.name, {}, (conn) => pull(conn, conn));
                    expect(peer.multiaddrs.size >= 1).to.equal(true);
                    expect(peer.multiaddrs.has(ma)).to.equal(false);
                    await sw.stop();
                });

                it("support addr 0.0.0.0:0", async () => {
                    const ma = t.maGen(0).replace("127.0.0.1", "0.0.0.0");
                    const peer = morePeerInfo[5];
                    peer.multiaddrs.add(ma);

                    const sw = new Switch(peer, new PeerBook());
                    sw.tm.add(t.name, new t.C());
                    await sw.tm.listen(t.name, {}, (conn) => pull(conn, conn));
                    expect(peer.multiaddrs.size >= 1).to.equal(true);
                    expect(peer.multiaddrs.has(ma)).to.equal(false);
                    await sw.stop();
                });

                it("listen in several addrs", async function () {
                    this.timeout(12000);
                    const peer = morePeerInfo[6];

                    peer.multiaddrs.add(t.maGen(9001));
                    peer.multiaddrs.add(t.maGen(9002));
                    peer.multiaddrs.add(t.maGen(9003));

                    const sw = new Switch(peer, new PeerBook());
                    sw.tm.add(t.name, new t.C());
                    await sw.tm.listen(t.name, {}, (conn) => pull(conn, conn));

                    expect(peer.multiaddrs.size).to.equal(3);
                    await sw.stop();
                });

                it("handles EADDRINUSE error when trying to listen", async () => {
                    const switch1 = new Switch(switchA._peerInfo, new PeerBook());

                    switch1.tm.add(t.name, new t.C());
                    await switch1.tm.listen(t.name, {}, (conn) => pull(conn, conn));
                    // Add in-use (peerA) address to peerB
                    switchB._peerInfo.multiaddrs.add(t.maGen(9888));

                    const switch2 = new Switch(switchB._peerInfo, new PeerBook());
                    switch2.tm.add(t.name, new t.C());
                    const err = await assert.throws(async () => switch2.tm.listen(t.name, {}, (conn) => pull(conn, conn)));
                    expect(err.code).to.equal("EADDRINUSE");
                    await switch1.stop();
                    await switch2.stop();
                });
            });
        }
    });

    describe("circuit", () => {
        let switchA; // TCP
        let switchB; // WS
        let switchC; // no transports
        let connectSpyA;

        before(() => {
            const infos = createInfos(3);
            const peerA = infos[0];
            const peerB = infos[1];
            const peerC = infos[2];

            peerA.multiaddrs.add("//ip4/127.0.0.1//tcp/9001");
            peerB.multiaddrs.add("//ip4/127.0.0.1//tcp/9002//ws");

            switchA = new Switch(peerA, new PeerBook());
            switchB = new Switch(peerB, new PeerBook());
            switchC = new Switch(peerC, new PeerBook());

            switchA.tm.add("tcp", new TCP());
            switchA.tm.add("ws", new WS());
            switchB.tm.add("ws", new WS());

            connectSpyA = spy(switchA.tm, "connect");
        });

        after(async () => {
            await Promise.all([
                switchA.stop(),
                switchB.stop()
            ]);
        });

        it("enableCircuitRelay()", () => {
            switchA.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(switchA.tm.transports).length).to.equal(3);

            switchB.connection.enableCircuitRelay({
                enabled: true
            });
            expect(Object.keys(switchB.tm.transports).length).to.equal(2);
        });

        it("should add to transport array", () => {
            assert.exists(switchA.tm.transports.Circuit);
            assert.exists(switchB.tm.transports.Circuit);
        });

        it("should add /p2p-curcuit addrs on listen", async () => {
            await Promise.all([
                switchA.start(),
                switchB.start()
            ]);
            expect(switchA._peerInfo.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
            expect(switchB._peerInfo.multiaddrs.toArray().filter((a) => a.toString().includes("/p2p-circuit")).length).to.be.eql(2);
        });

        it("should connect circuit ony once", async () => {
            switchA._peerInfo.multiaddrs.clear();
            switchA._peerInfo.multiaddrs.add("//dns4/wrtc-star.discovery.libp2p.io//tcp/443//wss//p2p-webrtc-star");
            await assert.throws(async () => switchA.connect(switchC._peerInfo), /Circuit already tried!/);
            expect(connectSpyA.callCount).to.be.eql(1);
        });

        it("connect circuit last", async () => {
            const peerC = switchC._peerInfo;
            peerC.multiaddrs.clear();
            peerC.multiaddrs.add("//p2p-circuit//p2p/ABCD");
            peerC.multiaddrs.add("//ip4/127.0.0.1//tcp/9998//p2p/ABCD");
            peerC.multiaddrs.add("//ip4/127.0.0.1//tcp/9999//ws//p2p/ABCD");

            await assert.throws(async () => switchA.connect(peerC));
            expect(connectSpyA.lastCall.args[0]).to.be.eql("Circuit");
        });

        it("should not try circuit if no transports enabled", async () => {
            await assert.throws(async () => switchC.connect(switchA._peerInfo), /No transports registered, connect not possible/);
        });

        it("should not connect circuit if other transport succeed", async () => {
            await switchA.connect(switchB._peerInfo);
            expect(connectSpyA.lastCall.args[0]).to.not.be.eql("Circuit");
        });
    });

    describe("stream multiplexing", () => {
        const muxers = [
            mplex,
            // spdy
        ];

        const maGen = (port) => `//ip4/127.0.0.1//tcp/${port}`;

        for (const muxer of muxers) {
            describe(muxer.multicodec, () => {
                let switchA;
                let switchB;
                let switchC;

                before(async () => {
                    const infos = createInfos(3);

                    const peerA = infos[0];
                    const peerB = infos[1];
                    const peerC = infos[2];

                    peerA.multiaddrs.add(maGen(9001));
                    peerB.multiaddrs.add(maGen(9002));
                    peerC.multiaddrs.add(maGen(9003));

                    switchA = new Switch(peerA, new PeerBook());
                    switchB = new Switch(peerB, new PeerBook());
                    switchC = new Switch(peerC, new PeerBook());

                    switchA.tm.add("tcp", new TCP());
                    switchB.tm.add("tcp", new TCP());
                    switchC.tm.add("tcp", new TCP());

                    await Promise.all([
                        switchA.tm.listen("tcp", {}, null),
                        switchB.tm.listen("tcp", {}, null),
                        switchC.tm.listen("tcp", {}, null)
                    ]);
                });

                after(async () => {
                    await Promise.all([
                        switchA.stop(),
                        switchB.stop()
                    ]);
                });

                it("switch.connection.addStreamMuxer()", () => {
                    switchA.connection.addStreamMuxer(mplex);
                    switchB.connection.addStreamMuxer(mplex);
                    switchC.connection.addStreamMuxer(mplex);
                });

                it("handle + connect on protocol", async (done) => {
                    switchB.handle("/abacaxi/1.0.0", (protocol, conn) => {
                        pull(conn, conn);
                    });

                    const conn = await switchA.connect(switchB._peerInfo, "/abacaxi/1.0.0");
                    expect(Object.keys(switchA.muxedConns).length).to.equal(1);
                    tryEcho(conn, done);
                });

                it("connect to warm conn", async () => {
                    await switchB.connect(switchA._peerInfo);
                    expect(Object.keys(switchB.conns).length).to.equal(0);
                    expect(Object.keys(switchB.muxedConns).length).to.equal(1);
                });

                it("connect on protocol, reuse warmed conn", async (done) => {
                    switchA.handle("/papaia/1.0.0", (protocol, conn) => {
                        pull(conn, conn);
                    });

                    const conn = await switchB.connect(switchA._peerInfo, "/papaia/1.0.0");
                    expect(Object.keys(switchB.conns).length).to.equal(0);
                    expect(Object.keys(switchB.muxedConns).length).to.equal(1);
                    tryEcho(conn, done);
                });

                it("enable identify to reuse incomming muxed conn", async () => {
                    switchA.connection.reuse();
                    switchC.connection.reuse();

                    await switchC.connect(switchA._peerInfo);
                    await adone.promise.delay(500);
                    expect(Object.keys(switchC.muxedConns).length).to.equal(1);
                    expect(Object.keys(switchA.muxedConns).length).to.equal(2);
                });

                it("with Identify enabled, do getPeerInfo", async (done) => {
                    switchA.handle("/banana/1.0.0", async (protocol, conn) => {
                        pull(conn, conn);
                        const pi = await conn.getPeerInfo();
                        expect(switchC._peerInfo.id.asBase58()).to.equal(pi.id.asBase58());
                    });

                    const conn = await switchC.connect(switchA._peerInfo, "/banana/1.0.0");
                    await adone.promise.delay(500);
                    expect(Object.keys(switchC.muxedConns).length).to.equal(1);
                    expect(Object.keys(switchA.muxedConns).length).to.equal(2);

                    const pi = await conn.getPeerInfo();
                    expect(switchA._peerInfo.id.asBase58()).to.equal(pi.id.asBase58());
                    tryEcho(conn, done);
                });

                it("closing one side cleans out in the other", async (done) => {
                    await switchC.stop();
                    setTimeout(() => {
                        expect(Object.keys(switchA.muxedConns).length).to.equal(1);
                        done();
                    }, 500);
                });
            });
        }
    });

    describe("no stream multiplexing", () => {
        let switchA;
        let switchB;

        before(async () => {
            const infos = createInfos(2);

            const peerA = infos[0];
            const peerB = infos[1];

            peerA.multiaddrs.add("//ip4/127.0.0.1//tcp/9001");
            peerB.multiaddrs.add("//ip4/127.0.0.1//tcp/9002//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");

            switchA = new Switch(peerA, new PeerBook());
            switchB = new Switch(peerB, new PeerBook());

            switchA.tm.add("tcp", new TCP());
            switchB.tm.add("tcp", new TCP());

            await Promise.all([
                switchA.tm.listen("tcp", {}, null),
                switchB.tm.listen("tcp", {}, null)
            ]);
        });

        after(async () => {
            await Promise.all([
                switchA.stop(),
                switchB.stop()
            ]);
        });

        it("handle a protocol", () => {
            switchB.handle("/bananas/1.0.0", (protocol, conn) => pull(conn, conn));
            expect(Object.keys(switchB.protocols).length).to.equal(2);
        });

        it("connect on protocol", async (done) => {
            switchB.handle("/pineapple/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchA.connect(switchB._peerInfo, "/pineapple/1.0.0");
            tryEcho(conn, done);
        });

        it("dial on protocol (returned conn)", async (done) => {
            switchB.handle("/apples/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchA.connect(switchB._peerInfo, "/apples/1.0.0");

            tryEcho(conn, done);
        });

        it("connect to warm a conn", async () => {
            await switchA.connect(switchB._peerInfo);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            const conn = await switchA.connect(switchB._peerInfo, "/bananas/1.0.0");
            tryEcho(conn, done);
        });

        it("unhandle", () => {
            const proto = "/bananas/1.0.0";
            switchA.unhandle(proto);
            assert.notExists(switchA.protocols[proto]);
        });
    });

    describe("multiplexing (everything all together)", () => {
        let switchA; // tcp
        let switchB; // tcp+ws
        let switchC; // tcp+ws
        let switchD; // ws
        let switchE; // ws

        before(() => {
            const infos = createInfos(5);

            const peerA = infos[0];
            const peerB = infos[1];
            const peerC = infos[2];
            const peerD = infos[3];
            const peerE = infos[4];

            switchA = new Switch(peerA, new PeerBook());
            switchB = new Switch(peerB, new PeerBook());
            switchC = new Switch(peerC, new PeerBook());
            switchD = new Switch(peerD, new PeerBook());
            switchE = new Switch(peerE, new PeerBook());
        });

        after(async function () {
            this.timeout(3000);
            await Promise.all([
                switchA.stop(),
                switchB.stop(),
                switchD.stop(),
                switchE.stop()
            ]);
        });

        it("add tcp", async () => {
            switchA._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/10100");
            switchB._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/10200");
            switchC._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/10300");

            switchA.tm.add("tcp", new TCP());
            switchB.tm.add("tcp", new TCP());
            switchC.tm.add("tcp", new TCP());

            await Promise.all([
                switchA.tm.listen("tcp", {}, null),
                switchB.tm.listen("tcp", {}, null)
            ]);
        });

        it("add websockets", async () => {
            switchB._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/9012//ws");
            switchC._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/9022//ws");
            switchD._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/9032//ws");
            switchE._peerInfo.multiaddrs.add("//ip4/127.0.0.1//tcp/9042//ws");

            switchB.tm.add("ws", new WS());
            switchC.tm.add("ws", new WS());
            switchD.tm.add("ws", new WS());
            switchE.tm.add("ws", new WS());

            await Promise.all([
                switchB.tm.listen("ws", {}, null),
                switchD.tm.listen("ws", {}, null),
                switchE.tm.listen("ws", {}, null)
            ]);
        });

        it("listen automatically", async () => {
            await switchC.start();
        });

        // it("add spdy and enable identify", () => {
        it("add mplex and enable identify", () => {
            switchA.connection.addStreamMuxer(mplex);
            switchB.connection.addStreamMuxer(mplex);
            switchC.connection.addStreamMuxer(mplex);
            switchD.connection.addStreamMuxer(mplex);
            switchE.connection.addStreamMuxer(mplex);

            switchA.connection.reuse();
            switchB.connection.reuse();
            switchC.connection.reuse();
            switchD.connection.reuse();
            switchE.connection.reuse();
        });

        it("warm up from A to B on tcp to tcp+ws", async () => {
            await Promise.all([
                new Promise((resolve) => {
                    switchB.once("peer:mux:established", (peerInfo) => {
                        expect(peerInfo.id.asBase58()).to.equal(switchA._peerInfo.id.asBase58());
                        resolve();
                    });
                }),
                new Promise((resolve) => {
                    switchA.once("peer:mux:established", (peerInfo) => {
                        expect(peerInfo.id.asBase58()).to.equal(switchB._peerInfo.id.asBase58());
                        resolve();
                    });
                }),
                switchA.connect(switchB._peerInfo)
            ]);

            expect(Object.keys(switchA.muxedConns).length).to.equal(1);
        });

        it("warm up a warmed up, from B to A", async () => {
            await switchB.connect(switchA._peerInfo);
            expect(Object.keys(switchA.muxedConns).length).to.equal(1);
        });

        it("connect from tcp to tcp+ws, on protocol", async (done) => {
            switchB.handle("/anona/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchA.connect(switchB._peerInfo, "/anona/1.0.0");
            expect(Object.keys(switchA.muxedConns).length).to.equal(1);
            tryEcho(conn, done);
        });

        it("connect from ws to ws no proto", async () => {
            await switchD.connect(switchE._peerInfo);
            expect(Object.keys(switchD.muxedConns).length).to.equal(1);
        });

        it("connect from ws to ws", async (done) => {
            switchE.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchD.connect(switchE._peerInfo, "/abacaxi/1.0.0");
            expect(Object.keys(switchD.muxedConns).length).to.equal(1);

            tryEcho(conn, () => setTimeout(() => {
                expect(Object.keys(switchE.muxedConns).length).to.equal(1);
                done();
            }, 1000));
        });

        it("connect from tcp to tcp+ws (returned conn)", async (done) => {
            switchB.handle("/grapes/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchA.connect(switchB._peerInfo, "/grapes/1.0.0");
            expect(Object.keys(switchA.muxedConns).length).to.equal(1);

            tryEcho(conn, done);
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

            switchC.handle("/mamao/1.0.0", async (protocol, conn) => {
                pull(conn, conn);
                const peerInfo = await conn.getPeerInfo();
                assert.exists(peerInfo);
                check();
            });

            const conn = await switchA.connect(switchC._peerInfo, "/mamao/1.0.0");
            const peerInfo = await conn.getPeerInfo();
            assert.exists(peerInfo);
            check();

            assert.lengthOf(Object.keys(switchA.muxedConns), 2);
            assert.exists(switchC._peerInfo.isConnected);
            assert.exists(switchA._peerInfo.isConnected);

            tryEcho(conn, done);
        });

        it("disconnect", (done) => {
            let count = 0;
            const ready = () => ++count === 3 ? done() : null;

            switchB.once("peer:mux:closed", (peerInfo) => {
                expect(Object.keys(switchB.muxedConns).length).to.equal(0);
                assert.notExists(switchB._peerInfo.isConnected());
                ready();
            });

            switchA.once("peer:mux:closed", (peerInfo) => {
                expect(Object.keys(switchA.muxedConns).length).to.equal(1);
                assert.notExists(switchA._peerInfo.isConnected());
                ready();
            });

            switchA.disconnect(switchB._peerInfo).then(ready);
        });

        it("close a muxer emits event", async function (done) {
            this.timeout(5000);
            await adone.promise.delay(500);
            switchA.once("peer:mux:closed", () => {
                done();
            });
            await switchC.stop();
        });
    });

    describe("secio", () => {
        let switchA;
        let switchB;
        let switchC;

        before(async () => {
            const infos = createInfos(3);
            const peerA = infos[0];
            const peerB = infos[1];
            const peerC = infos[2];

            peerA.multiaddrs.add("//ip4/127.0.0.1//tcp/9001");
            peerB.multiaddrs.add("//ip4/127.0.0.1//tcp/9002");
            peerC.multiaddrs.add("//ip4/127.0.0.1//tcp/9003");

            switchA = new Switch(peerA, new PeerBook());
            switchB = new Switch(peerB, new PeerBook());
            switchC = new Switch(peerC, new PeerBook());

            switchA.tm.add("tcp", new TCP());
            switchB.tm.add("tcp", new TCP());
            switchC.tm.add("tcp", new TCP());

            switchA.connection.crypto(secio.tag, secio.encrypt);
            switchB.connection.crypto(secio.tag, secio.encrypt);
            switchC.connection.crypto(secio.tag, secio.encrypt);

            switchA.connection.addStreamMuxer(mplex);
            switchB.connection.addStreamMuxer(mplex);
            switchC.connection.addStreamMuxer(mplex);

            await Promise.all([
                switchA.tm.listen("tcp", {}, null),
                switchB.tm.listen("tcp", {}, null),
                switchC.tm.listen("tcp", {}, null)
            ]);
        });

        after(async function () {
            this.timeout(3000);
            await switchA.stop();
            await switchB.stop();
            await switchC.stop();
        });

        it("handle + connect on protocol", async (done) => {
            switchB.handle("/abacaxi/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchA.connect(switchB._peerInfo, "/abacaxi/1.0.0");
            expect(Object.keys(switchA.muxedConns).length).to.equal(1);
            tryEcho(conn, done);
        });

        it("connect to warm conn", async () => {
            await switchB.connect(switchA._peerInfo);
            expect(Object.keys(switchB.conns).length).to.equal(0);
            expect(Object.keys(switchB.muxedConns).length).to.equal(1);
        });

        it("connect on protocol, reuse warmed conn", async (done) => {
            switchA.handle("/papaia/1.0.0", (protocol, conn) => pull(conn, conn));

            const conn = await switchB.connect(switchA._peerInfo, "/papaia/1.0.0");
            expect(Object.keys(switchB.conns).length).to.equal(0);
            expect(Object.keys(switchB.muxedConns).length).to.equal(1);
            tryEcho(conn, done);
        });

        it("enable identify to reuse incomming muxed conn", async () => {
            switchA.connection.reuse();
            switchC.connection.reuse();

            await switchC.connect(switchA._peerInfo);
            await adone.promise.delay(500);
            expect(Object.keys(switchC.muxedConns).length).to.equal(1);
            expect(Object.keys(switchA.muxedConns).length).to.equal(2);
        });

        it("switch back to plaintext if no arguments passed in", () => {
            switchA.connection.crypto();
            expect(switchA.crypto.tag).to.eql("/plaintext/1.0.0");
        });
    });

    describe("LimitDialer", () => {
        let peers;

        before(() => {
            const infos = createInfos(5);
            peers = infos;

            peers.forEach((peer, i) => {
                peer.multiaddrs.add(multi.address.create(`//ip4/191.0.0.1//tcp/123${i}`));
                peer.multiaddrs.add(multi.address.create(`//ip4/192.168.0.1//tcp/923${i}`));
                peer.multiaddrs.add(multi.address.create(`//ip4/193.168.0.99//tcp/923${i}`));
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
            expect(success.multiaddr.toString()).to.equal("//ip4/192.168.0.1//tcp/9230");
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

    describe("stats", () => {
        const selectOther = function (array, index) {
            const useIndex = (index + 1) % array.length;
            return array[useIndex];
        };

        const setup = async () => {
            const infos = createInfos(2);
            const options = {
                stats: {
                    computeThrottleTimeout: 100
                }
            };

            const peerA = infos[0];
            const peerB = infos[1];

            peerA.multiaddrs.add("//ip4/127.0.0.1//tcp/0");
            peerB.multiaddrs.add("//ip4/127.0.0.1//tcp/0");

            const switchA = new Switch(peerA, new PeerBook(), options);
            const switchB = new Switch(peerB, new PeerBook(), options);

            switchA.tm.add("tcp", new TCP());
            switchB.tm.add("tcp", new TCP());

            switchA.connection.crypto(secio.tag, secio.encrypt);
            switchB.connection.crypto(secio.tag, secio.encrypt);

            switchA.connection.addStreamMuxer(mplex);
            switchB.connection.addStreamMuxer(mplex);

            await switchA.tm.listen("tcp", {}, null);
            await switchB.tm.listen("tcp", {}, null);

            const echo = (protocol, conn) => pull(conn, conn);
            switchB.handle("/echo/1.0.0", echo);
            switchA.handle("/echo/1.0.0", echo);

            await Promise.all([
                new Promise(async (resolve) => {
                    const conn = await switchA.connect(switchB._peerInfo, "/echo/1.0.0");
                    tryEcho(conn, resolve);
                }),
                new Promise(async (resolve) => {
                    const conn = await switchB.connect(switchA._peerInfo, "/echo/1.0.0");
                    tryEcho(conn, resolve);
                })
            ]);

            return new Promise((resolve) => {
                // wait until stats are processed
                let pending = 12;

                const waitForUpdate = function () {
                    if (--pending === 0) {
                        switchA.stats.removeListener("update", waitForUpdate);
                        switchB.stats.removeListener("update", waitForUpdate);
                        resolve([switchA, switchB]);
                    }
                };

                switchA.stats.on("update", waitForUpdate);
                switchB.stats.on("update", waitForUpdate);
            });
        };

        const teardown = async (switches) => {
            for (const swtch of switches) {
                await swtch.stop(); // eslint-disable-line
            }
        };

        it("both nodes have some global stats", async () => {
            const switches = await setup();

            switches.forEach((swtch) => {
                const snapshot = swtch.stats.global.snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("2426");
                expect(snapshot.dataSent.toString()).to.equal("2426");
            });

            await teardown(switches);
        });

        it("both nodes know the transports", async () => {
            const switches = await setup();
            const expectedTransports = [
                "tcp"
            ];

            switches.forEach((swtch) => expect(swtch.stats.transports().sort()).to.deep.equal(expectedTransports));
            await teardown(switches);
        });

        it("both nodes know the protocols", async () => {
            const switches = await setup();
            const expectedProtocols = [
                "/echo/1.0.0",
                "/mplex/6.7.0",
                "/secio/1.0.0"
            ];

            switches.forEach((swtch) => {
                expect(swtch.stats.protocols().sort()).to.deep.equal(expectedProtocols);
            });

            await teardown(switches);
        });

        it("both nodes know about each other", async () => {
            const switches = await setup();
            switches.forEach(
                (swtch, index) => {
                    const otherSwitch = selectOther(switches, index);
                    expect(swtch.stats.peers().sort()).to.deep.equal([otherSwitch._peerInfo.id.asBase58()]);
                });
            await teardown(switches);
        });

        it("both have transport-specific stats", async () => {
            const switches = await setup();
            switches.forEach((swtch) => {
                const snapshot = swtch.stats.forTransport("tcp").snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("2426");
                expect(snapshot.dataSent.toString()).to.equal("2426");
            });
            await teardown(switches);
        });

        it("both have protocol-specific stats", async () => {
            const switches = await setup();
            switches.forEach((swtch) => {
                const snapshot = swtch.stats.forProtocol("/echo/1.0.0").snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("4");
                expect(snapshot.dataSent.toString()).to.equal("4");
            });
            await teardown(switches);
        });

        it("both have peer-specific stats", async () => {
            const switches = await setup();
            switches.forEach((swtch, index) => {
                const other = selectOther(switches, index);
                const snapshot = swtch.stats.forPeer(other._peerInfo.id.asBase58()).snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("2426");
                expect(snapshot.dataSent.toString()).to.equal("2426");
            });
            await teardown(switches);
        });

        it("both have moving average stats for peer", async () => {
            const switches = await setup();
            switches.forEach((swtch, index) => {
                const other = selectOther(switches, index);
                const ma = swtch.stats.forPeer(other._peerInfo.id.asBase58()).movingAverages;
                const intervals = [60000, 300000, 900000];
                intervals.forEach((interval) => {
                    const average = ma.dataReceived[interval].movingAverage();
                    expect(average).to.be.above(0).below(100);
                });
            });
            await teardown(switches);
        });

        it("retains peer after disconnect", async () => {
            const switches = await setup();
            let index = -1;
            for (const swtch of switches) {
                // swtch.once("peer-mux-closed", () => cb());
                index++;
                await swtch.disconnect(selectOther(switches, index)._peerInfo);
            }

            switches.forEach((swtch, index) => {
                const other = selectOther(switches, index);
                const snapshot = swtch.stats.forPeer(other._peerInfo.id.asBase58()).snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("2426");
                expect(snapshot.dataSent.toString()).to.equal("2426");
            });

            await teardown(switches);
        });

        it("retains peer after reconnect", async () => {
            const switches = await setup();

            let index = -1;
            for (const swtch of switches) {
                // swtch.once("peer-mux-closed", () => cb());
                index++;
                await swtch.disconnect(selectOther(switches, index)._peerInfo);
            }

            index = -1;
            for (const swtch of switches) {
                index++;
                const other = selectOther(switches, index);
                const conn = await swtch.connect(other._peerInfo, "/echo/1.0.0");
                await new Promise((resolve) => tryEcho(conn, resolve));
            }

            await adone.promise.delay(1000);

            switches.forEach((swtch, index) => {
                const other = selectOther(switches, index);
                const snapshot = swtch.stats.forPeer(other._peerInfo.id.asBase58()).snapshot;
                expect(snapshot.dataReceived.toString()).to.equal("4852");
                expect(snapshot.dataSent.toString()).to.equal("4852");
            });
            await teardown(switches);
        });
    });
});
