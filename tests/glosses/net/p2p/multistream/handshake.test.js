const parallel = require("run-parallel");
const series = require("run-series");
const util = require("./util");
const createPair = util.createPair;

const {
    net: { p2p: { spdy, multiplex, multistream } },
    stream: { pull }
} = adone;

const options = [
    { name: "over pull-pair" },
    { name: "over spdy", muxer: spdy },
    { name: "over multiplex", muxer: multiplex }
];

options.forEach((option) => {
    describe(`mss handshake with - ${option.name}`, () => {
        let conns;

        beforeEach((done) => {
            const gotConns = function (err, _conns) {
                assert.notExists(err);
                conns = _conns;
                done();
            };
            createPair(option.muxer, gotConns);
        });

        it("performs the mss handshake", (done) => {
            parallel([
                (cb) => {
                    const msl = new multistream.Listener();
                    msl.handle(conns[0], cb);
                },
                (cb) => {
                    const msd = new multistream.Dialer();
                    msd.handle(conns[1], cb);
                }
            ], done);
        });

        it("handle and select a protocol", (done) => {
            let msl;
            let msd;
            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            assert.exists(msl);
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            assert.exists(msd);
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    const protocol = "/monkey/1.0.0";
                    msl.addHandler(protocol, (p, conn) => {
                        expect(protocol).to.equal(p);
                        pull(conn, conn);
                    });
                    next();
                },
                (next) => {
                    msd.select("/monkey/1.0.0", (err, conn) => {
                        assert.notExists(err);

                        pull(
                            pull.values([Buffer.from("banana")]),
                            conn,
                            pull.collect((err, data) => {
                                assert.notExists(err);
                                expect(data).to.be.eql([Buffer.from("banana")]);
                                next();
                            })
                        );
                    });
                }
            ], done);
        });

        it("select non existing proto", (done) => {
            let msd;

            series([
                (next) => {
                    parallel([
                        (cb) => {
                            const msl = new multistream.Listener();
                            assert.exists(msl);
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            assert.exists(msd);
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    msd.select("/panda/1.0.0", (err) => {
                        assert.exists(err);
                        next();
                    });
                }
            ], done);
        });

        it("select a non existing proto and then select an existing proto", (done) => {
            let msl;
            let msd;

            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            assert.exists(msl);
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            assert.exists(msd);
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    const protocol = "/monkey/1.0.0";
                    msl.addHandler(protocol, (p, conn) => {
                        expect(protocol).to.equal(p);
                        pull(conn, conn);
                    });
                    next();
                },
                (next) => {
                    msd.select("/sadpanda/1.0.0", (err) => {
                        assert.exists(err);
                        next();
                    });
                },
                (next) => {
                    msd.select("/monkey/1.0.0", (err, conn) => {
                        assert.notExists(err);
                        pull(
                            pull.values([Buffer.from("banana")]),
                            conn,
                            pull.collect((err, data) => {
                                assert.notExists(err);
                                expect(data).to.be.eql([Buffer.from("banana")]);
                                next();
                            })
                        );
                    });
                }
            ], done);
        });

        it("ls", (done) => {
            let msl;
            let msd;

            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            assert.exists(msl);
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            assert.exists(msd);
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    const protocol = "/monkey/1.0.0";
                    msl.addHandler(protocol, (p, conn) => {
                        expect(protocol).to.equal(p);
                        pull(conn, conn);
                    });
                    next();
                },
                (next) => {
                    msl.addHandler("/giraffe/2.0.0", (protocol, conn) => {
                        pull(conn, conn);
                    });
                    next();
                },
                (next) => {
                    msl.addHandler("/elephant/2.5.0", (protocol, conn) => {
                        pull(conn, conn);
                    });
                    next();
                },
                (next) => {
                    msd.ls((err, protocols) => {
                        assert.notExists(err);
                        expect(protocols).to.eql([
                            "/monkey/1.0.0",
                            "/giraffe/2.0.0",
                            "/elephant/2.5.0"
                        ]);
                        next();
                    });
                }
            ], done);
        });

        it("handler must be a function", (done) => {
            let msl;
            let msd;
            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            assert.exists(msl);
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            assert.exists(msd);
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    expect(
                        () => msl.addHandler("/monkey/1.0.0", "potato")
                    ).to.throw(/must be a function/);
                    next();
                }
            ], done);
        });

        it("racing condition resistent", (done) => {
            let msl;
            let msd;

            parallel([
                (cb) => {
                    series([
                        (next) => {
                            msl = new multistream.Listener();
                            assert.exists(msl);
                            setTimeout(() => {
                                msl.handle(conns[0], next);
                            }, 200);
                        },
                        (next) => {
                            msl.addHandler("/monkey/1.0.0", (protocol, conn) => {
                                pull(conn, conn);
                            });
                            next();
                        }
                    ], cb);
                },
                (cb) => {
                    msd = new multistream.Dialer();
                    msd.handle(conns[1], (err) => {
                        assert.notExists(err);
                        msd.select("/monkey/1.0.0", (err, conn) => {
                            assert.notExists(err);

                            pull(
                                pull.values([Buffer.from("banana")]),
                                conn,
                                pull.collect((err, data) => {
                                    assert.notExists(err);
                                    expect(data).to.be.eql([Buffer.from("banana")]);
                                    cb();
                                })
                            );
                        });
                    });
                }
            ], done);
        });
    });
});
