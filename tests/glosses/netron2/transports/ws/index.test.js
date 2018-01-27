const {
    multi,
    netron2: { transport: { WS } },
    stream: { pull }
} = adone;

describe("netron2", "trasnport", "ws", () => {
    describe("instantiate the transport", () => {
        it("create", () => {
            const ws = new WS();
            assert.exists(ws);
        });
    });

    describe("listen", () => {
        let ws;
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9595/ws");

        beforeEach(() => {
            ws = new WS();
        });

        it("listen", async () => {
            const listener = ws.createListener();

            await listener.listen(ma);
            await listener.close();
        });

        it("listen, check for listening event", (done) => {
            const listener = ws.createListener();

            listener.on("listening", () => {
                listener.close().then(done);
            });

            listener.listen(ma);
        });

        it("listen, check for the close event", (done) => {
            const listener = ws.createListener();

            listener.on("listening", () => {
                listener.on("close", done);
                listener.close();
            });

            listener.listen(ma);
        });

        it("listen on addr with /ipfs/QmHASH", async () => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9595/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

            const listener = ws.createListener();

            await listener.listen(ma);
            await listener.close();
        });

        it.skip("close listener with connections, through timeout", (done) => {
            // TODO `ws` closes all anyway, we need to make it not close
            // first - https://github.com/diasdavid/simple-websocket-server
        });

        it.skip("listen on port 0", (done) => {
            // TODO port 0 not supported yet
        });
        it.skip("listen on IPv6 addr", (done) => {
            // TODO IPv6 not supported yet
        });

        it.skip("listen on any Interface", (done) => {
            // TODO 0.0.0.0 not supported yet
        });

        it("getAddrs", async () => {
            const listener = ws.createListener();
            await listener.listen(ma);
            const addrs = await listener.getAddrs();
            expect(addrs.length).to.equal(1);
            expect(addrs[0]).to.deep.equal(ma);
            await listener.close();
        });

        it("getAddrs on port 0 listen", async () => {
            const addr = multi.address.create("/ip4/127.0.0.1/tcp/0/ws");
            const listener = ws.createListener();
            await listener.listen(addr);
            const addrs = await listener.getAddrs();
            expect(addrs.length).to.equal(1);
            expect(addrs.map((a) => a.toOptions().port)).to.not.include("0");
            await listener.close();
        });

        it("getAddrs from listening on 0.0.0.0", async () => {
            const addr = multi.address.create("/ip4/0.0.0.0/tcp/9003/ws");
            const listener = ws.createListener();
            await listener.listen(addr);
            const addrs = await listener.getAddrs();
            expect(addrs.map((a) => a.toOptions().host)).to.not.include("0.0.0.0");
            await listener.close();
        });

        it("getAddrs from listening on 0.0.0.0 and port 0", async () => {
            const addr = multi.address.create("/ip4/0.0.0.0/tcp/0/ws");
            const listener = ws.createListener();
            await listener.listen(addr);
            const addrs = await listener.getAddrs();
            expect(addrs.map((a) => a.toOptions().host)).to.not.include("0.0.0.0");
            expect(addrs.map((a) => a.toOptions().port)).to.not.include("0");
            await listener.close();
        });

        it("getAddrs preserves IPFS Id", async () => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9595/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const listener = ws.createListener();
            await listener.listen(ma);
            const addrs = await listener.getAddrs();
            expect(addrs.length).to.equal(1);
            expect(addrs[0]).to.deep.equal(ma);
            await listener.close();
        });
    });

    describe("connect", () => {
        let ws;
        let listener;
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9596/ws");

        beforeEach(async () => {
            ws = new WS();
            listener = ws.createListener((conn) => {
                pull(conn, conn);
            });
            await listener.listen(ma);
        });

        afterEach(async () => {
            await listener.close();
        });

        it("connect on IPv4", async (done) => {
            const conn = await ws.connect(ma);

            const s = pull.goodbye({
                source: pull.values(["hey"]),
                sink: pull.collect((err, result) => {
                    assert.notExists(err);

                    expect(result).to.be.eql(["hey"]);
                    done();
                })
            });

            pull(s, conn, s);
        });

        it.skip("connect on IPv6", (done) => {
            // TODO IPv6 not supported yet
        });

        it("connect on IPv4 with IPFS Id", async (done) => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9596/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const conn = await ws.connect(ma);

            const s = pull.goodbye({
                source: pull.values(["hey"]),
                sink: pull.collect((err, result) => {
                    assert.notExists(err);

                    expect(result).to.be.eql(["hey"]);
                    done();
                })
            });

            pull(s, conn, s);
        });
    });

    describe("filter addrs", () => {
        let ws;

        before(() => {
            ws = new WS();
        });

        describe("filter valid addrs for this transport", () => {
            it("should fail invalid WS addresses", () => {
                const ma1 = multi.address.create("/ip4/127.0.0.1/tcp/9595");
                const ma2 = multi.address.create("/ip4/127.0.0.1/udp/9595");
                const ma3 = multi.address.create("/ip6/::1/tcp/80");
                const ma4 = multi.address.create("/dns/ipfs.io/tcp/80");

                const valid = ws.filter([ma1, ma2, ma3, ma4]);
                expect(valid.length).to.equal(0);
            });

            it("should filter correct ipv4 addresses", () => {
                const ma1 = multi.address.create("/ip4/127.0.0.1/tcp/80/ws");
                const ma2 = multi.address.create("/ip4/127.0.0.1/tcp/443/wss");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct ipv4 addresses with ipfs id", () => {
                const ma1 = multi.address.create("/ip4/127.0.0.1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
                const ma2 = multi.address.create("/ip4/127.0.0.1/tcp/80/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct ipv6 address", () => {
                const ma1 = multi.address.create("/ip6/::1/tcp/80/ws");
                const ma2 = multi.address.create("/ip6/::1/tcp/443/wss");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct ipv6 addresses with ipfs id", () => {
                const ma1 = multi.address.create("/ip6/::1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
                const ma2 = multi.address.create("/ip6/::1/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct dns address", () => {
                const ma1 = multi.address.create("/dns/ipfs.io/ws");
                const ma2 = multi.address.create("/dns/ipfs.io/tcp/80/ws");
                const ma3 = multi.address.create("/dns/ipfs.io/tcp/80/wss");

                const valid = ws.filter([ma1, ma2, ma3]);
                expect(valid.length).to.equal(3);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
                expect(valid[2]).to.deep.equal(ma3);
            });

            it("should filter correct dns address with ipfs id", () => {
                const ma1 = multi.address.create("/dns/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
                const ma2 = multi.address.create("/dns/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct dns4 address", () => {
                const ma1 = multi.address.create("/dns4/ipfs.io/tcp/80/ws");
                const ma2 = multi.address.create("/dns4/ipfs.io/tcp/443/wss");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct dns6 address", () => {
                const ma1 = multi.address.create("/dns6/ipfs.io/tcp/80/ws");
                const ma2 = multi.address.create("/dns6/ipfs.io/tcp/443/wss");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter correct dns6 address with ipfs id", () => {
                const ma1 = multi.address.create("/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
                const ma2 = multi.address.create("/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

                const valid = ws.filter([ma1, ma2]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma2);
            });

            it("should filter mixed addresses", () => {
                const ma1 = multi.address.create("/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
                const ma2 = multi.address.create("/ip4/127.0.0.1/tcp/9595");
                const ma3 = multi.address.create("/ip4/127.0.0.1/udp/9595");
                const ma4 = multi.address.create("/dns6/ipfs.io/ws");
                const mh5 = multi.address.create("/ip4/127.0.0.1/tcp/9595/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw" +
                    "/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

                const valid = ws.filter([ma1, ma2, ma3, ma4, mh5]);
                expect(valid.length).to.equal(2);
                expect(valid[0]).to.deep.equal(ma1);
                expect(valid[1]).to.deep.equal(ma4);
            });
        });

        it("filter a single addr for this transport", (done) => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9595/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

            const valid = ws.filter(ma);
            expect(valid.length).to.equal(1);
            expect(valid[0]).to.deep.equal(ma);
            done();
        });
    });

    describe("valid Connection", () => {
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9092/ws");

        it("get observed addrs", async (done) => {
            let dialerObsAddrs;
            let listenerObsAddrs;

            const ws = new WS();

            const listener = ws.createListener((conn) => {
                assert.exists(conn);

                conn.getObservedAddrs((err, addrs) => {
                    assert.notExists(err);
                    dialerObsAddrs = addrs;
                });

                pull(conn, conn);
            });

            await listener.listen(ma);
            const conn = await ws.connect(ma);
            const onEnd = function () {
                conn.getObservedAddrs((err, addrs) => {
                    assert.notExists(err);
                    listenerObsAddrs = addrs;

                    const onClose = function () {
                        expect(listenerObsAddrs[0]).to.deep.equal(ma);
                        expect(dialerObsAddrs.length).to.equal(0);
                        done();
                    };

                    listener.close().then(onClose);
                });
            };

            pull(
                pull.empty(),
                conn,
                pull.onEnd(onEnd)
            );
        });

        it("get Peer Info", async (done) => {
            const ws = new WS();

            const listener = ws.createListener((conn) => {
                assert.exists(conn);

                conn.getPeerInfo((err, peerInfo) => {
                    assert.exists(err);
                });

                pull(conn, conn);
            });

            await listener.listen(ma);
            const conn = await ws.connect(ma);

            const onEnd = function () {
                conn.getPeerInfo((err, peerInfo) => {
                    assert.exists(err);
                    listener.close().then(done);
                });
            };

            pull(
                pull.empty(),
                conn,
                pull.onEnd(onEnd)
            );
        });

        it("set Peer Info", async (done) => {
            const ws = new WS();

            const listener = ws.createListener((conn) => {
                assert.exists(conn);
                conn.setPeerInfo("a");

                conn.getPeerInfo((err, peerInfo) => {
                    assert.notExists(err);
                    expect(peerInfo).to.equal("a");
                });

                pull(conn, conn);
            });

            await listener.listen(ma);
            const conn = await ws.connect(ma);
            conn.setPeerInfo("b");

            const onEnd = function () {
                conn.getPeerInfo((err, peerInfo) => {
                    assert.notExists(err);
                    expect(peerInfo).to.equal("b");
                    listener.close().then(done);
                });
            };

            pull(
                pull.empty(),
                conn,
                pull.onEnd(onEnd)
            );
        });
    });

    describe("ma-to-url test", () => {
        it("should convert ipv4 ma to url", () => {
            expect(WS.maToUrl(multi.address.create("/ip4/127.0.0.1/ws"))).to.equal("ws://127.0.0.1");
        });

        it("should convert ipv4 ma with port to url", () => {
            expect(WS.maToUrl(multi.address.create("/ip4/127.0.0.1/tcp/80/ws"))).to.equal("ws://127.0.0.1:80");
        });

        it("should convert dns ma to url", () => {
            expect(WS.maToUrl(multi.address.create("/dns4/ipfs.io/ws"))).to.equal("ws://ipfs.io");
        });

        it("should convert dns ma  with port to url", () => {
            expect(WS.maToUrl(multi.address.create("/dns4/ipfs.io/tcp/80/ws"))).to.equal("ws://ipfs.io:80");
        });
    });

    describe.skip("turbolence", () => {
        it("dialer - emits error on the other end is terminated abruptly", (done) => {
        });
        it("listener - emits error on the other end is terminated abruptly", (done) => {
        });
    });
});
