const parallel = require("run-parallel");
const series = require("run-series");

const {
    multiformat: { multistream },
    stream: { pull }
} = adone;
const { lengthPrefixed: pullLP } = pull;

const util = require("./util");
const { createPair } = util;

describe("multiformat", "multistream", () => {
    describe("custom matching function", () => {
        let conns;

        beforeEach((done) => {
            const gotConns = function (err, _conns) {
                expect(err).to.not.exist();
                conns = _conns;
                done();
            };
            createPair(false, gotConns);
        });

        it("match-true always", (done) => {
            let msl;
            let msd;
            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            expect(msl).to.exist();
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            expect(msd).to.exist();
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    msl.addHandler("/does-not-matter/1.0.0", (p, conn) => {
                        pull(conn, conn);
                    }, (myProtocol, requestedProtocol, callback) => {
                        callback(null, true);
                    });
                    next();
                },
                (next) => {
                    msd.select("/it-is-gonna-match-anyway/1.0.0", (err, conn) => {
                        expect(err).to.not.exist();

                        pull(
                            pull.values([Buffer.from("banana")]),
                            conn,
                            pull.collect((err, data) => {
                                expect(err).to.not.exist();
                                expect(data).to.be.eql([Buffer.from("banana")]);
                                next();
                            })
                        );
                    });
                }
            ], done);
        });
    });

    describe("half-handshake", () => {
        let conns;

        beforeEach((done) => {
            createPair(false, gotConns);

            function gotConns(err, _conns) {
                expect(err).to.not.exist();
                conns = _conns;
                done();
            }
        });

        it("dialer - sends the mss multicodec", (done) => {
            const dialerConn = conns[0];
            const listenerConn = conns[1];

            pull(
                listenerConn,
                pullLP.decode(),
                pull.drain((data) => {
                    expect(data.toString()).to.equal("/multistream/1.0.0\n");
                    done();
                })
            );

            const msd = new multistream.Dialer();
            expect(msd).to.exist();
            msd.handle(dialerConn, () => { });
        });

        it("listener sends the mss multicodec", (done) => {
            const dialerConn = conns[0];
            const listenerConn = conns[1];

            pull(
                dialerConn,
                pullLP.decode(),
                pull.drain((data) => {
                    expect(data.toString()).to.equal("/multistream/1.0.0\n");
                    done();
                })
            );

            const msl = new multistream.Listener();
            expect(msl).to.exist();
            msl.handle(listenerConn, () => { });
        });
    });

    describe("semver-match", () => {
        let conns;

        beforeEach((done) => {
            const gotConns = function (err, _conns) {
                expect(err).to.not.exist();
                conns = _conns;
                done();
            };

            createPair(false, gotConns);
        });

        it("should match", (done) => {
            let msl;
            let msd;
            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            expect(msl).to.exist();
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            expect(msd).to.exist();
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    msl.addHandler("/monster/1.0.0", (p, conn) => {
                        pull(conn, conn);
                    }, multistream.matchSemver);
                    next();
                },
                (next) => {
                    msd.select("/monster/1.0.0", (err, conn) => {
                        expect(err).to.not.exist();

                        pull(
                            pull.values(["cookie"]),
                            conn,
                            pull.collect((err, data) => {
                                expect(err).to.not.exist();
                                expect(data[0].toString()).to.be.eql("cookie");
                                next();
                            })
                        );
                    });
                }
            ], done);
        });

        it("should not match", (done) => {
            let msl;
            let msd;
            series([
                (next) => {
                    parallel([
                        (cb) => {
                            msl = new multistream.Listener();
                            expect(msl).to.exist();
                            msl.handle(conns[0], cb);
                        },
                        (cb) => {
                            msd = new multistream.Dialer();
                            expect(msd).to.exist();
                            msd.handle(conns[1], cb);
                        }
                    ], next);
                },
                (next) => {
                    msl.addHandler("/monster/1.1.0", (p, conn) => {
                        pull(conn, conn);
                    }, multistream.matchSemver);
                    next();
                },
                (next) => {
                    msd.select("/monster/2.0.0", (err, conn) => {
                        expect(err).to.exist();
                        next();
                    });
                }
            ], done);
        });
    });

    describe("handshake", () => {
        const {
            p2p: { muxer: { spdy, mplex } }
        } = adone;

        const options = [
            { name: "over pull-pair" },
            { name: "over spdy", muxer: spdy },
            { name: "over multiplex", muxer: mplex }
        ];

        options.forEach((option) => {
            describe(`mss handshake with - ${option.name}`, () => {
                let conns;

                beforeEach((done) => {
                    const gotConns = function (err, _conns) {
                        expect(err).to.not.exist();
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
                                    expect(msl).to.exist();
                                    msl.handle(conns[0], cb);
                                },
                                (cb) => {
                                    msd = new multistream.Dialer();
                                    expect(msd).to.exist();
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
                                expect(err).to.not.exist();

                                pull(
                                    pull.values([Buffer.from("banana")]),
                                    conn,
                                    pull.collect((err, data) => {
                                        expect(err).to.not.exist();
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
                                    expect(msl).to.exist();
                                    msl.handle(conns[0], cb);
                                },
                                (cb) => {
                                    msd = new multistream.Dialer();
                                    expect(msd).to.exist();
                                    msd.handle(conns[1], cb);
                                }
                            ], next);
                        },
                        (next) => {
                            msd.select("/panda/1.0.0", (err) => {
                                expect(err).to.exist();
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
                                    expect(msl).to.exist();
                                    msl.handle(conns[0], cb);
                                },
                                (cb) => {
                                    msd = new multistream.Dialer();
                                    expect(msd).to.exist();
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
                                expect(err).to.exist();
                                next();
                            });
                        },
                        (next) => {
                            msd.select("/monkey/1.0.0", (err, conn) => {
                                expect(err).to.not.exist();
                                pull(
                                    pull.values([Buffer.from("banana")]),
                                    conn,
                                    pull.collect((err, data) => {
                                        expect(err).to.not.exist();
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
                                    expect(msl).to.exist();
                                    msl.handle(conns[0], cb);
                                },
                                (cb) => {
                                    msd = new multistream.Dialer();
                                    expect(msd).to.exist();
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
                                expect(err).to.not.exist();
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
                                    expect(msl).to.exist();
                                    msl.handle(conns[0], cb);
                                },
                                (cb) => {
                                    msd = new multistream.Dialer();
                                    expect(msd).to.exist();
                                    msd.handle(conns[1], cb);
                                }
                            ], next);
                        },
                        (next) => {
                            expect(
                                () => msl.addHandler("/monkey/1.0.0", "potato")
                            ).to.throw(
                                /must be a function/
                            );
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
                                    expect(msl).to.exist();
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
                                expect(err).to.not.exist();
                                msd.select("/monkey/1.0.0", (err, conn) => {
                                    expect(err).to.not.exist();

                                    pull(
                                        pull.values([Buffer.from("banana")]),
                                        conn,
                                        pull.collect((err, data) => {
                                            expect(err).to.not.exist();
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
    });
});
