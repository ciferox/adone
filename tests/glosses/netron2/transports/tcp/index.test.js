const {
    multi,
    netron2: { Connection, transport: { TCP } },
    stream: { pull },
    std: { net }
} = adone;

describe("netron2", "transport", "tcp", () => {
    it("instantiate the transport", () => {
        new TCP();
    });

    describe("listen", () => {
        let tcp;

        beforeEach(() => {
            tcp = new TCP();
        });

        it("close listener with connections, through timeout", (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });

            listener.listen(mh, () => {
                const socket1 = net.connect(9191);
                const socket2 = net.connect(9191);

                socket1.write("Some data that is never handled");
                socket1.end();
                socket1.on("error", () => { });
                socket2.on("error", () => { });
                socket1.on("connect", () => {
                    listener.close(done);
                });
            });
        });

        it("listen on port 0", (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/0");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.close(done);
            });
        });

        it("listen on IPv6 addr", (done) => {
            const mh = multi.address.create("/ip6/::/tcp/9191");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.close(done);
            });
        });

        it("listen on any Interface", (done) => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/9191");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.close(done);
            });
        });

        it("getAddrs", (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.getAddrs((err, multiaddrs) => {
                    assert.notExists(err);
                    expect(multiaddrs.length).to.equal(1);
                    expect(multiaddrs[0]).to.deep.equal(mh);
                    listener.close(done);
                });
            });
        });

        it("getAddrs on port 0 listen", (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/0");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.getAddrs((err, multiaddrs) => {
                    assert.notExists(err);
                    expect(multiaddrs.length).to.equal(1);
                    listener.close(done);
                });
            });
        });

        it("getAddrs from listening on 0.0.0.0", (done) => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/9191");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.getAddrs((err, multiaddrs) => {
                    assert.notExists(err);
                    expect(multiaddrs.length > 0).to.equal(true);
                    expect(multiaddrs[0].toString().indexOf("0.0.0.0")).to.equal(-1);
                    listener.close(done);
                });
            });
        });

        it("getAddrs from listening on 0.0.0.0 and port 0", (done) => {
            const mh = multi.address.create("/ip4/0.0.0.0/tcp/0");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.getAddrs((err, multiaddrs) => {
                    assert.notExists(err);
                    expect(multiaddrs.length > 0).to.equal(true);
                    expect(multiaddrs[0].toString().indexOf("0.0.0.0")).to.equal(-1);
                    listener.close(done);
                });
            });
        });

        it("getAddrs preserves IPFS Id", (done) => {
            const mh = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const listener = tcp.createListener((conn) => { });
            listener.listen(mh, () => {
                listener.getAddrs((err, multiaddrs) => {
                    assert.notExists(err);
                    expect(multiaddrs.length).to.equal(1);
                    expect(multiaddrs[0]).to.deep.equal(mh);
                    listener.close(done);
                });
            });
        });
    });

    describe("connect", () => {
        let tcp;
        let listener;
        const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191");

        beforeEach((done) => {
            tcp = new TCP();
            listener = tcp.createListener((conn) => {
                pull(
                    conn,
                    pull.map((x) => Buffer.from(`${x.toString()}!`)),
                    conn
                );
            });
            listener.listen(ma, done);
        });

        afterEach((done) => {
            listener.close(done);
        });

        it("connect on IPv4", (done) => {
            pull(
                pull.values(["hey"]),
                tcp.connect(ma),
                pull.collect((err, values) => {
                    assert.notExists(err);
                    expect(values).to.eql([Buffer.from("hey!")]);
                    done();
                })
            );
        });

        it("connect to non existent listener", (done) => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/8989");
            pull(
                tcp.connect(ma),
                pull.onEnd((err) => {
                    assert.exists(err);
                    done();
                })
            );
        });

        it("connect on IPv6", (done) => {
            const ma = multi.address.create("/ip6/::/tcp/9066");
            const listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });
            listener.listen(ma, () => {
                pull(
                    pull.values(["hey"]),
                    tcp.connect(ma),
                    pull.collect((err, values) => {
                        assert.notExists(err);

                        expect(values).to.be.eql([Buffer.from("hey")]);

                        listener.close(done);
                    })
                );
            });
        });

        it.skip("connect and destroy on listener", (done) => {
            // TODO: why is this failing
            let count = 0;
            let listener = null;
            const finish = function () {
                listener.close(done);
            };

            const closed = ++count === 2 ? finish() : null;

            const ma = multi.address.create("/ip6/::/tcp/9067");

            listener = tcp.createListener((conn) => {
                pull(
                    pull.empty(),
                    conn,
                    pull.onEnd(closed)
                );
            });

            listener.listen(ma, () => {
                pull(tcp.connect(ma), pull.onEnd(closed));
            });
        });

        it("connect and destroy on dialer", (done) => {
            let count = 0;
            let listener = null;

            const finish = function () {
                listener.close(done);
            };
            const destroyed = () => ++count === 2 ? finish() : null;

            const ma = multi.address.create("/ip6/::/tcp/9068");

            listener = tcp.createListener((conn) => {
                pull(conn, pull.onEnd(destroyed));
            });

            listener.listen(ma, () => {
                pull(
                    pull.empty(),
                    tcp.connect(ma),
                    pull.onEnd(destroyed)
                );
            });
        });

        it("connect on IPv4 with IPFS Id", (done) => {
            const ma = multi.address.create("/ip4/127.0.0.1/tcp/9191/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw");
            const conn = tcp.connect(ma);

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

        it("get observed addrs", (done) => {
            let dialerObsAddrs;

            const listener = tcp.createListener((conn) => {
                assert.exists(conn);
                conn.getObservedAddrs((err, addrs) => {
                    assert.notExists(err);
                    dialerObsAddrs = addrs;
                    pull(pull.empty(), conn);
                });
            });

            listener.listen(ma, () => {
                const conn = tcp.connect(ma);

                const closeAndAssert = function (listener, addrs) {
                    listener.close(() => {
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
        });

        it("get Peer Info", (done) => {
            const listener = tcp.createListener((conn) => {
                assert.exists(conn);
                conn.getPeerInfo((err, peerInfo) => {
                    assert.exists(err);
                    assert.notExists(peerInfo);
                    pull(pull.empty(), conn);
                });
            });

            listener.listen(ma, () => {
                const conn = tcp.connect(ma);

                const endHandler = function () {
                    conn.getPeerInfo((err, peerInfo) => {
                        assert.exists(err);
                        assert.notExists(peerInfo);

                        listener.close(done);
                    });
                };

                pull(conn, pull.onEnd(endHandler));
            });
        });

        it("set Peer Info", (done) => {
            const listener = tcp.createListener((conn) => {
                assert.exists(conn);
                conn.setPeerInfo("batatas");
                conn.getPeerInfo((err, peerInfo) => {
                    assert.notExists(err);
                    expect(peerInfo).to.equal("batatas");
                    pull(pull.empty(), conn);
                });
            });

            listener.listen(ma, () => {
                const conn = tcp.connect(ma);

                const endHandler = function () {
                    conn.setPeerInfo("arroz");
                    conn.getPeerInfo((err, peerInfo) => {
                        assert.notExists(err);
                        expect(peerInfo).to.equal("arroz");

                        listener.close(done);
                    });
                };

                pull(conn, pull.onEnd(endHandler));
            });
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

        beforeEach((done) => {
            tcp = new TCP();
            listener = tcp.createListener((conn) => {
                pull(conn, conn);
            });
            listener.on("listening", done);
            listener.listen(ma);
        });

        afterEach((done) => {
            listener.close(done);
        });

        it("simple wrap", (done) => {
            const conn = tcp.connect(ma);
            conn.setPeerInfo("peerInfo");
            const connWrap = new Connection(conn);
            pull(
                pull.values(["hey"]),
                connWrap,
                pull.collect((err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);

                    connWrap.getPeerInfo((err, peerInfo) => {
                        assert.notExists(err);
                        expect(peerInfo).to.equal("peerInfo");
                        done();
                    });
                })
            );
        });

        it("buffer wrap", (done) => {
            const conn = tcp.connect(ma);
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

        it("overload wrap", (done) => {
            const conn = tcp.connect(ma);
            const connWrap = new Connection(conn);
            connWrap.getPeerInfo = (callback) => {
                callback(null, "none");
            };
            conn.getPeerInfo((err, peerInfo) => {
                assert.exists(err);
            });
            connWrap.getPeerInfo((err, peerInfo) => {
                assert.notExists(err);
                expect(peerInfo).to.equal("none");
            });
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

        it("connect error", (done) => {
            tcp.connect(multi.address.create("/ip4/999.0.0.1/tcp/1234"), (err) => {
                assert.exists(err);
                done();
            });
        });

        it("matryoshka wrap", (done) => {
            const conn = tcp.connect(ma);
            const connWrap1 = new Connection(conn);
            const connWrap2 = new Connection(connWrap1);
            const connWrap3 = new Connection(connWrap2);

            conn.getPeerInfo = (callback) => {
                callback(null, "inner doll");
            };
            pull(
                pull.values(["hey"]),
                connWrap3,
                pull.collect((err, chunks) => {
                    assert.notExists(err);
                    expect(chunks).to.be.eql([Buffer.from("hey")]);
                    connWrap3.getPeerInfo((err, peerInfo) => {
                        assert.notExists(err);
                        expect(peerInfo).to.equal("inner doll");
                        done();
                    });
                })
            );
        });
    });
});
