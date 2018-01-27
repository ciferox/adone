const parallel = require("async/parallel");
const series = require("async/series");
const each = require("async/each");
const eachLimit = require("async/eachLimit");

const {
    multi,
    netron2: { transport: { TCP } },
    stream: { pull }
} = adone;

const marker = function (n, done) {
    let i = 0;
    return (err) => {
        i++;

        if (err) {
            console.error("Failed after %s iterations", i);
            return done(err);
        }

        if (i === n) {
            done();
        }
    };
};

const spawn = (muxer, nStreams, nMsg, done, limit) => {
    const p = pull.pair.duplex();
    const dialerSocket = p[0];
    const listenerSocket = p[1];

    const check = marker((6 * nStreams) + (nStreams * nMsg), done);

    const msg = "simple msg";

    const listener = muxer.listener(listenerSocket);
    const dialer = muxer.dialer(dialerSocket);

    listener.on("stream", (stream) => {
        assert.exists(stream) // eslint-disable-line
        check();
        pull(
            stream,
            pull.through((chunk) => {
                expect(chunk).to.exist // eslint-disable-line
                check();
            }),
            pull.onEnd((err) => {
                assert.notExists(err) // eslint-disable-line
                check();
                pull(pull.empty(), stream);
            })
        );
    });

    const numbers = [];
    for (let i = 0; i < nStreams; i++) {
        numbers.push(i);
    }

    const spawnStream = (n, cb) => {
        const stream = dialer.newStream((err) => {
            assert.notExists(err) // eslint-disable-line
            check();
            assert.exists(stream) // eslint-disable-line
            check();
            pull(
                pull.generate(0, (s, cb) => {
                    setImmediate(() => {
                        cb(s === nMsg ? true : null, msg, s + 1);
                    });
                }),
                stream,
                pull.collect((err, res) => {
                    assert.notExists(err) // eslint-disable-line
                    check();
                    expect(res).to.be.eql([]);
                    check();
                    cb();
                })
            );
        });
    };

    if (limit) {
        eachLimit(numbers, limit, spawnStream, () => { });
    } else {
        each(numbers, spawnStream, () => { });
    }
};


export default (common) => {
    describe("base", () => {
        let muxer;

        const closeAndWait = function (stream, done) {
            pull(
                pull.empty(),
                stream,
                pull.onEnd((err) => {
                    assert.notExists(err);
                    done();
                })
            );
        };

        beforeEach(async () => {
            muxer = await common.setup();
        });

        it("Open a stream from the dialer", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.dialer(p[0]);
            const listener = muxer.listener(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 4) {
                    done();
                }
            };

            listener.on("stream", (stream) => {
                assert.exists(stream);
                check();
                closeAndWait(stream, check);
            });

            const conn = dialer.newStream((err) => {
                assert.notExists(err);
                check();
            });

            closeAndWait(conn, check);
        });

        it("Open a stream from the listener", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.dialer(p[0]);
            const listener = muxer.listener(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 4) {
                    done();
                }
            };

            dialer.on("stream", (stream) => {
                assert.exists(stream);
                check();
                closeAndWait(stream, check);
            });

            const conn = listener.newStream((err) => {
                assert.notExists(err);
                check();
            });

            closeAndWait(conn, check);
        });

        it("Open a stream on both sides", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.dialer(p[0]);
            const listener = muxer.listener(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 8) {
                    done();
                }
            };

            dialer.on("stream", (stream) => {
                assert.exists(stream);
                check();
                closeAndWait(stream, check);
            });

            const listenerConn = listener.newStream((err) => {
                assert.notExists(err);
                check();
            });

            listener.on("stream", (stream) => {
                assert.exists(stream);
                check();
                closeAndWait(stream, check);
            });

            const dialerConn = dialer.newStream((err) => {
                assert.notExists(err);
                check();
            });

            closeAndWait(dialerConn, check);
            closeAndWait(listenerConn, check);
        });

        it("Open a stream on one side, write, open a stream in the other side", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.dialer(p[0]);
            const listener = muxer.listener(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 6) {
                    done();
                }
            };

            const dialerConn = dialer.newStream((err) => {
                assert.notExists(err);
                check();
            });

            listener.on("stream", (stream) => {
                pull(
                    stream,
                    pull.collect((err, chunks) => {
                        assert.notExists(err);
                        check();
                        expect(chunks).to.be.eql([Buffer.from("hey")]);
                        check();
                    })
                );

                const onDialerStream = function (stream) {
                    pull(
                        stream,
                        pull.collect((err, chunks) => {
                            assert.notExists(err);
                            check();
                            expect(chunks).to.be.eql([Buffer.from("hello")]);
                            check();
                        })
                    );
                };

                dialer.on("stream", onDialerStream);

                const listenerConn = listener.newStream((err) => {
                    assert.notExists(err);
                    check();
                });

                pull(
                    pull.values(["hello"]),
                    listenerConn
                );
            });

            pull(
                pull.values(["hey"]),
                dialerConn
            );
        });
    });

    describe("close", () => {
        let muxer;

        const mh = multi.address.create("/ip4/127.0.0.1/tcp/10000");

        const closeAndWait = function (stream, callback) {
            pull(
                pull.empty(),
                stream,
                pull.onEnd(callback)
            );
        };

        beforeEach(async () => {
            muxer = await common.setup();
        });

        it("closing underlying socket closes streams (tcp)", async (done) => {
            let counter = 0;
            const check = () => {
                if (++counter === 2) {
                    done();
                }
            };

            const tcp = new TCP();
            const tcpListener = tcp.createListener((conn) => {
                const listener = muxer.listener(conn);
                listener.on("stream", (stream) => {
                    pull(stream, stream);
                });
            });

            await tcpListener.listen(mh);
            const dialerConn = await tcp.connect(mh);
            tcpListener.close();

            const dialerMuxer = muxer.dialer(dialerConn);
            const s1 = dialerMuxer.newStream(() => {
                pull(
                    s1,
                    pull.onEnd((err) => {
                        assert.exists(err);
                        check();
                    })
                );
            });

            const s2 = dialerMuxer.newStream(() => {
                pull(
                    s2,
                    pull.onEnd((err) => {
                        assert.exists(err);
                        check();
                    })
                );
            });
        });

        it("closing one of the muxed streams doesn't close others", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.dialer(p[0]);
            const listener = muxer.listener(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 6) {
                    done();
                }
            };

            const conns = [];

            listener.on("stream", (stream) => {
                assert.exists(stream);
                check();
                pull(stream, stream);
            });

            for (let i = 0; i < 5; i++) {
                conns.push(dialer.newStream());
            }

            conns.forEach((conn, i) => {
                if (i === 1) {
                    closeAndWait(conn, (err) => {
                        assert.notExists(err);
                        check();
                    });
                } else {
                    pull(
                        conn,
                        pull.onEnd(() => {
                            throw new Error("should not end");
                        })
                    );
                }
            });
        });

        it.skip("closing on spdy doesn't close until all the streams that are being muxed are closed", (done) => {
            const p = pull.pair.duplex();
            const dialer = muxer.connect(p[0]);
            const listener = muxer.listen(p[1]);

            let counter = 0;
            const check = () => {
                if (++counter === 15) {
                    done();
                }
            };

            const conns = [];
            const count = [];
            for (let i = 0; i < 5; i++) {
                count.push(i);
            }

            series(count.map((i) => (cb) => {
                parallel([
                    (cb) => listener.once("stream", (stream) => {
                        assert.exists(stream);
                        check();
                        pull(stream, stream);
                        cb();
                    }),
                    (cb) => conns.push(dialer.newStream(cb))
                ], cb);
            }), (err) => {
                if (err) {
                    return done(err);
                }

                conns.forEach((conn, i) => {
                    pull(
                        pull.values([Buffer.from("hello")]),
                        pull.asyncMap((val, cb) => {
                            setTimeout(() => {
                                cb(null, val);
                            }, i * 10);
                        }),
                        conn,
                        pull.collect((err, data) => {
                            assert.notExists(err);
                            check();
                            expect(data).to.be.eql([Buffer.from("hello")]);
                            check();
                        })
                    );
                });
            });
        });
    });

    describe("stress test", () => {
        let muxer;

        beforeEach(async () => {
            muxer = await common.setup();
        });

        it("1 stream with 1 msg", (done) => {
            spawn(muxer, 1, 1, done);
        });

        it("1 stream with 10 msg", (done) => {
            spawn(muxer, 1, 10, done);
        });

        it("1 stream with 100 msg", (done) => {
            spawn(muxer, 1, 100, done);
        });

        it("10 streams with 1 msg", (done) => {
            spawn(muxer, 10, 1, done);
        });

        it("10 streams with 10 msg", (done) => {
            spawn(muxer, 10, 10, done);
        });

        it("10 streams with 100 msg", (done) => {
            spawn(muxer, 10, 100, done);
        });

        it("100 streams with 1 msg", (done) => {
            spawn(muxer, 100, 1, done);
        });

        it("100 streams with 10 msg", (done) => {
            spawn(muxer, 100, 10, done);
        });

        it("100 streams with 100 msg", (done) => {
            spawn(muxer, 100, 100, done);
        });

        it("1000 streams with 1 msg", (done) => {
            spawn(muxer, 1000, 1, done);
        });

        it("1000 streams with 10 msg", (done) => {
            spawn(muxer, 1000, 10, done);
        });

        it("1000 streams with 100 msg", function (done) {
            this.timeout(80 * 1000);
            spawn(muxer, 1000, 100, done);
        });
    });

    describe.skip("mega stress test", function () {
        this.timeout(100 * 200 * 1000);
        let muxer;

        beforeEach(async () => {
            muxer = await common.setup();
        });

        it("10000 messages of 10000 streams", (done) => {
            spawn(muxer, 10000, 10000, done, 5000);
        });
    });
};
