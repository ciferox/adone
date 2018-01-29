const {
    multi,
    net: { p2p: { Connection, transport: { TCP } } },
    stream: { pull },
    std: { net }
} = adone;

describe("transport", "tcp", () => {
    it("instantiate the transport", () => {
        new TCP();
    });

    describe("listen", () => {
        let tcp;

        beforeEach(() => {
            tcp = new TCP();
        });

        it("close listener with connections, through timeout", async (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });

            await listener.listen(mh);
            const socket1 = net.connect(9191);
            const socket2 = net.connect(9191);

            socket1.write("Some data that is never handled");
            socket1.end();
            socket1.on("error", () => { });
            socket2.on("error", () => { });
            socket1.on("connect", () => {
                listener.close().then(done);
            });
        });

        it("listen on port 0", async () => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/0");
            const listener = tcp.createListener();
            await listener.listen(mh);
            await listener.close();
        });

        it("listen on IPv6 addr", async () => {
            const mh = multi.address.create("/ip6/::/tcp/9191");
            const listener = tcp.createListener();
            await listener.listen(mh);
            await listener.close();
        });

        it("listen on any Interface", async () => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/9191");
            const listener = tcp.createListener();
            await listener.listen(mh);
            await listener.close();
        });

        it("getAddrs", async () => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191");
            const listener = tcp.createListener();
            await listener.listen(mh);
            const multiaddrs = await listener.getAddrs();
            expect(multiaddrs.length).to.equal(1);
            expect(multiaddrs[0]).to.deep.equal(mh);
            await listener.close();
        });

        it("getAddrs on port 0 listen", async () => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/0");
            const listener = tcp.createListener();
            await listener.listen(mh);
            const multiaddrs = await listener.getAddrs();
            expect(multiaddrs.length).to.equal(1);
            await listener.close();
        });

        it("getAddrs from listening on 0.0.0.0", async () => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/9191");
            const listener = tcp.createListener();
            await listener.listen(mh);
            const multiaddrs = await listener.getAddrs();
            expect(multiaddrs.length > 0).to.equal(true);
            expect(multiaddrs[0].toString().indexOf("0.0.0.0")).to.equal(-1);
            await listener.close();
        });

        it("getAddrs from listening on 0.0.0.0 and port 0", async () => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/0");
            const listener = tcp.createListener();
            await listener.listen(mh);
            const multiaddrs = await listener.getAddrs();
            expect(multiaddrs.length > 0).to.equal(true);
            expect(multiaddrs[0].toString().indexOf("0.0.0.0")).to.equal(-1);
            await listener.close();
        });

        it("getAddrs preserves IPFS Id", async () => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const listener = tcp.createListener();
            await listener.listen(mh);
            const multiaddrs = await listener.getAddrs();
            expect(multiaddrs.length).to.equal(1);
            expect(multiaddrs[0]).to.deep.equal(mh);
            await listener.close();
        });
    });

    describe("connect", () => {
        let tcp;
        let listener;
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191");

        beforeEach(async () => {
            tcp = new TCP();
            listener = tcp.createListener((conn) => {
                pull(
                    conn,
                    pull.map((x) => Buffer.from(`${x.toString()}!`)),
                    conn
                );
            });
            await listener.listen(ma);
        });

        afterEach(async () => {
            await listener.close();
        });

        it("connect on IPv4", async (done) => {
            const conn = await tcp.connect(ma);
            pull(
                pull.values(["hey"]),
                conn,
                pull.collect((err, values) => {
                    assert.notExists(err);
                    expect(values).to.eql([Buffer.from("hey!")]);
                    done();
                })
            );
        });

        it("connect to non existent listener", async () => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/8989");
            await assert.throws(async () => tcp.connect(ma));
        });

        it("connect on IPv6", async (done) => {
            const ma = multi.address.create("/ip6/::/tcp/9066");
            const listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });
            await listener.listen(ma);
            const conn = await tcp.connect(ma);
            pull(
                pull.values(["hey"]),
                conn,
                pull.collect((err, values) => {
                    assert.notExists(err);

                    expect(values).to.be.eql([Buffer.from("hey")]);

                    listener.close().then(done);
                })
            );
        });

        it("connect and destroy on listener", async (done) => {
            let count = 0;
            let listener = null;
            const finish = function () {
                listener.close().then(done);
            };

            const closed = () => ++count === 2 ? finish() : null;

            const ma = multi.address.create("/ip6/::/tcp/9067");

            listener = tcp.createListener((conn) => {
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(closed)
                );
            });

            await listener.listen(ma);
            const conn = await tcp.connect(ma);
            pull(conn, pull.onEnd(closed));
        });

        it("connect and destroy on client", async (done) => {
            let count = 0;
            let listener = null;

            const finish = function () {
                listener.close().then(done);
            };
            const destroyed = () => ++count === 2 ? finish() : null;

            const ma = multi.address.create("/ip6/::/tcp/9068");

            listener = tcp.createListener((conn) => {
                pull(conn, pull.onEnd(destroyed));
            });

            await listener.listen(ma);
            const conn = await tcp.connect(ma);
            pull(
                pull.empty(),
                conn,
                pull.onEnd(destroyed)
            );
        });

        it("connect on IPv4 with IPFS Id", async (done) => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const conn = await tcp.connect(ma);

            pull(
                pull.values(["hey"]),
                conn,
                pull.collect((err, res) => {
                    assert.notExists(err);
                    expect(res).to.be.eql([Buffer.from("hey!")]);
                    done();
                })
            );
        });
    });

    describe("filter addrs", () => {
        let tcp;

        before(() => {
            tcp = new TCP();
        });

        it("filter valid addrs for this transport", () => {
            const mh1 = multi.address.create("/ip4/127.0.0.1/tcp/9191");
            const mh2 = multi.address.create("/ip4/127.0.0.1/udp/9191");
            const mh3 = multi.address.create("/ip4/127.0.0.1/tcp/9191/http");
            const mh4 = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const mh5 = multi.address.create("/ip4/127.0.0.1/tcp/9191/http/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const mh6 = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw" +
                "/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");

            const valid = tcp.filter([mh1, mh2, mh3, mh4, mh5, mh6]);
            expect(valid.length).to.equal(2);
            expect(valid[0]).to.deep.equal(mh1);
            expect(valid[1]).to.deep.equal(mh4);
        });

        it("filter a single addr for this transport", () => {
            const mh1 = multi.address.create("/ip4/127.0.0.1/tcp/9191");

            const valid = tcp.filter(mh1);
            expect(valid.length).to.equal(1);
            expect(valid[0]).to.deep.equal(mh1);
        });
    });

    describe("valid Connection", () => {
        let tcp;

        beforeEach(() => {
            tcp = new TCP();
        });

        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191");

        it("get observed addrs", async (done) => {
            let dialerObsAddrs;

            const listener = tcp.createListener((conn) => {
                assert.exists(conn);
                conn.getObservedAddrs((err, addrs) => {
                    assert.notExists(err);
                    dialerObsAddrs = addrs;
                    pull(pull.empty(), conn);
                });
            });

            await listener.listen(ma);
            const conn = await tcp.connect(ma);

            const closeAndAssert = function (listener, addrs) {
                listener.close().then(() => {
                    expect(addrs[0]).to.deep.equal(ma);
                    expect(dialerObsAddrs.length).to.equal(1);
                    done();
                });
            };

            const endHandler = function () {
                conn.getObservedAddrs((err, addrs) => {
                    assert.notExists(err);
                    pull(pull.empty(), conn);
                    closeAndAssert(listener, addrs);
                });
            };

            pull(
                conn,
                pull.onEnd(endHandler)
            );
        });

        it("get Peer Info", async (done) => {
            const listener = tcp.createListener(async (conn) => {
                assert.exists(conn);
                await assert.throws(async () => conn.getPeerInfo());
                pull(pull.empty(), conn);
            });

            await listener.listen(ma);
            const conn = await tcp.connect(ma);

            const endHandler = async () => {
                await assert.throws(async () => conn.getPeerInfo());
                listener.close().then(done);
            };

            pull(conn, pull.onEnd(endHandler));
        });

        it("set Peer Info", async (done) => {
            const listener = tcp.createListener(async (conn) => {
                assert.exists(conn);
                conn.setPeerInfo("batatas");
                const peerInfo = await conn.getPeerInfo();
                expect(peerInfo).to.equal("batatas");
                pull(pull.empty(), conn);
            });

            await listener.listen(ma);
            const conn = await tcp.connect(ma);

            const endHandler = async () => {
                conn.setPeerInfo("arroz");
                const peerInfo = await conn.getPeerInfo();
                expect(peerInfo).to.equal("arroz");

                listener.close().then(done);
            };

            pull(conn, pull.onEnd(endHandler));
        });
    });

    describe.skip("turbolence", () => {
        it("dialer - emits error on the other end is terminated abruptly", (done) => { });
        it("listener - emits error on the other end is terminated abruptly", (done) => { });
    });

    describe("Connection wrap", () => {
        let tcp;
        let listener;
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191");

        beforeEach(async () => {
            tcp = new TCP();
            listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });
            await listener.listen(ma);
        });

        afterEach(async () => {
            await listener.close();
        });

        it("simple wrap", async (done) => {
            const conn = await tcp.connect(ma);
            conn.setPeerInfo("peerInfo");
            const connWrap = new Connection(conn);
            pull(
                pull.values(["hey"]),
                connWrap,
                pull.collect(async (err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);

                    const peerInfo = await connWrap.getPeerInfo();
                    expect(peerInfo).to.equal("peerInfo");
                    done();
                })
            );
        });

        it("buffer wrap", async (done) => {
            const conn = await tcp.connect(ma);
            const connWrap = new Connection();
            pull(
                pull.values(["hey"]),
                connWrap,
                pull.collect((err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);
                    done();
                })
            );

            connWrap.setInnerConn(conn);
        });

        it("overload wrap", async (done) => {
            const conn = await tcp.connect(ma);
            const connWrap = new Connection(conn);
            connWrap.getPeerInfo = () => "none";
            await assert.throws(async () => conn.getPeerInfo());
            const peerInfo = await connWrap.getPeerInfo();
            expect(peerInfo).to.equal("none");
            pull(
                pull.values(["hey"]),
                connWrap,
                pull.collect((err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);
                    done();
                })
            );
        });

        it("connect error", async () => {
            await assert.throws(async () => tcp.connect(multi.address.create("/ip4/999.0.0.1/tcp/1234")));
        });

        it("matryoshka wrap", async (done) => {
            const conn = await tcp.connect(ma);
            const connWrap1 = new Connection(conn);
            const connWrap2 = new Connection(connWrap1);
            const connWrap3 = new Connection(connWrap2);

            conn.getPeerInfo = () => "inner doll";
            pull(
                pull.values(["hey"]),
                connWrap3,
                pull.collect(async (err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);
                    const peerInfo = await connWrap3.getPeerInfo();
                    expect(peerInfo).to.equal("inner doll");
                    done();
                })
            );
        });
    });
});
