const parallel = require("run-parallel");

const {
    multi,
    net: { p2p: { muxer: { spdy }, Connection, transport: { TCP, WS } } },
    stream: { pull },
    std: { fs, path }
} = adone;

const fixture = (name) => path.join(__dirname, "fixtures", name);

describe("muxer", "spdy", () => {
    describe("spdy-generic", () => {
        let listenerSocket;
        let dialerSocket;

        let listener;
        let dialer;

        before(() => {
            const p = pull.pair.duplex();
            dialerSocket = p[0];
            listenerSocket = p[1];
        });

        it("attach to a duplex stream, as listener", () => {
            listener = spdy.listener(listenerSocket);
            assert.exists(listener);
        });

        it("attach to a duplex stream, as dialer", () => {
            dialer = spdy.dialer(dialerSocket);
            assert.exists(dialer);
        });

        it("open a multiplex stream from client", (done) => {
            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            const conn = dialer.newStream();
            pull(
                pull.values(["hello"]),
                conn,
                pull.collect((err, res) => {
                    assert.notExists(err);
                    expect(res).to.be.eql([Buffer.from("hello")]);
                    done();
                })
            );
        });

        it("open a multiplex stream from listener", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            const conn = listener.newStream();
            pull(
                pull.values(["hello"]),
                conn,
                pull.collect((err, res) => {
                    assert.notExists(err);
                    expect(res).to.be.eql([Buffer.from("hello")]);
                    done();
                })
            );
        });
    });

    describe("conn properties are propagated to each stream", () => {
        let lMuxer;
        let dMuxer;
        let dConn;
        let listener;

        before(async () => {
            const dtcp = new TCP();
            const ltcp = new TCP();
            const ma = multi.address.create("//ip4/127.0.0.1//tcp/9876");
            listener = ltcp.createListener((conn) => {
                lMuxer = spdy.listener(conn);
                lMuxer.on("stream", (conn) => {
                    pull(conn, conn);
                });
            });

            await listener.listen(ma);
            dConn = await dtcp.connect(ma);
            dMuxer = spdy.dialer(dConn);
        });

        after((done) => {
            // TODO: fix listener close hanging
            // listener.close(done)
            done();
        });

        it("getObservedAddrs", (done) => {
            let oa1;
            let oa2;

            parallel([
                (cb) => {
                    const conn = dMuxer.newStream();
                    conn.getObservedAddrs((err, addrs) => {
                        assert.notExists(err);
                        oa1 = addrs;
                        pull(pull.empty(), conn, pull.onEnd(cb));
                    });
                },
                (cb) => {
                    dConn.getObservedAddrs((err, addrs) => {
                        assert.notExists(err);
                        oa2 = addrs;
                        cb();
                    });
                }
            ], () => {
                expect(oa1).to.deep.equal(oa2);
                done();
            });
        });

        it("getPeerInfo yields error", async (done) => {
            const conn = dMuxer.newStream();
            await assert.throws(async () => conn.getPeerInfo());
            pull(pull.empty(), conn, pull.onEnd(done));
        });

        it("setPeerInfo on muxedConn, verify that it is the same on conn", (done) => {
            const conn = dMuxer.newStream();
            conn.setPeerInfo("banana");
            parallel([
                async (cb) => {
                    const pInfo = await conn.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    pull(pull.empty(), conn, pull.onEnd(cb));
                },
                async (cb) => {
                    const pInfo = await dConn.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    cb();
                }
            ], done);
        });

        it("wrap the muxed stream in another Conn, see how everything still trickles", async (done) => {
            const conn = dMuxer.newStream();
            const proxyConn = new Connection(conn);
            const pInfo = await proxyConn.getPeerInfo();
            expect(pInfo).to.equal("banana");
            pull(pull.empty(), conn, pull.onEnd(done));
        });

        it("open several streams, see how they all pack the same info", (done) => {
            const conn1 = dMuxer.newStream();
            const conn2 = dMuxer.newStream();
            const conn3 = dMuxer.newStream();
            const conn4 = dMuxer.newStream();

            parallel([
                async (cb) => {
                    const pInfo = await conn1.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    pull(pull.empty(), conn1, pull.onEnd(cb));
                },
                async (cb) => {
                    const pInfo = await conn2.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    pull(pull.empty(), conn2, pull.onEnd(cb));
                },
                async (cb) => {
                    const pInfo = await conn3.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    pull(pull.empty(), conn3, pull.onEnd(cb));
                },
                async (cb) => {
                    const pInfo = await conn4.getPeerInfo();
                    expect(pInfo).to.equal("banana");
                    pull(pull.empty(), conn4, pull.onEnd(cb));
                }
            ], done);
        });

        it("setPeerInfo on conn, verify that it is the same on muxedConn", (done) => {
            const conn = dMuxer.newStream();
            dConn.setPeerInfo("pineapple");
            parallel([
                async (cb) => {
                    const pInfo = await conn.getPeerInfo();
                    expect(pInfo).to.equal("pineapple");
                    pull(pull.empty(), conn, pull.onEnd(cb));
                },
                async (cb) => {
                    const pInfo = await dConn.getPeerInfo();
                    expect(pInfo).to.equal("pineapple");
                    cb();
                }
            ], done);
        });
    });

    describe("spdy-over-tcp", () => {
        let listener;
        let dialer;

        let tcp;
        const mh = multi.address.create("//ip4/127.0.0.1//tcp/9090");

        before(() => {
            tcp = new TCP();
        });

        it("attach to a tcp socket, as listener", async () => {
            const tcpListener = tcp.createListener((socket) => {
                assert.exists(socket);
                listener = spdy.listener(socket);
                assert.exists(listener);
            });

            await tcpListener.listen(mh);
        });

        it("attach to a tcp socket, as dialer", async () => {
            const socket = await tcp.connect(mh);
            assert.exists(socket);
            dialer = spdy.dialer(socket);
            assert.exists(dialer);
        });

        it("open a multiplex stream from dialer", async (done) => {
            // wait for connection established
            await adone.promise.delay(500);

            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.empty(),
                dialer.newStream(),
                pull.onEnd(done)
            );
        });

        it("open a multiplex stream from listener", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.empty(),
                listener.newStream(),
                pull.onEnd(done)
            );
        });

        it("open a spdy stream from dialer and write to it", (done) => {
            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.values(["hello world"]),
                dialer.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    expect(data[0].toString()).to.equal("hello world");
                    done();
                })
            );
        });

        it("open a spdy stream from listener and write to it", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.values(["hello world"]),
                listener.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    expect(data[0].toString()).to.equal("hello world");
                    done();
                })
            );
        });

        it("open a spdy stream from listener and write a lot", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            const filePath = fixture("1.2MiB.txt");
            pull(
                pull.file(filePath),
                listener.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    const expected = fs.readFileSync(filePath);
                    expect(Buffer.concat(data)).to.deep.equal(expected);
                    done();
                })
            );
        });
    });

    describe("spdy-over-ws", () => {
        const mh = multi.address.create("//ip4/127.0.0.1//tcp/9091//ws");

        let listener;
        let dialer;
        let ws;

        before(async (done) => {
            ws = new WS();

            let i = 0;
            const check = () => {
                if (++i === 2) {
                    done();
                }
            };

            const wsListener = ws.createListener((socket) => {
                listener = spdy.listener(socket);
                check();
            });

            await wsListener.listen(mh);
            const socket = await ws.connect(mh);

            dialer = spdy.dialer(socket);
            check();
        });

        it("open a multiplex stream from dialer", (done) => {
            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.empty(),
                dialer.newStream(),
                pull.onEnd(done)
            );
        });

        it("open a multiplex stream from listener", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.empty(),
                listener.newStream(),
                pull.onEnd(done)
            );
        });

        it("open a spdy stream from dialer and write to it", (done) => {
            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.values(["hello world"]),
                dialer.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    expect(data[0].toString()).to.equal("hello world");
                    done();
                })
            );
        });

        it("open a spdy stream from listener and write to it", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            pull(
                pull.values(["hello world"]),
                listener.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    expect(data[0].toString()).to.equal("hello world");
                    done();
                })
            );
        });

        it("open a spdy stream from listener and write a lot", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            const filePath = fixture("1.2MiB.txt");
            pull(
                pull.file(filePath),
                listener.newStream(),
                pull.collect((err, data) => {
                    assert.notExists(err);
                    const expected = fs.readFileSync(filePath);
                    expect(Buffer.concat(data)).to.deep.equal(expected);
                    done();
                })
            );
        });
    });
});
