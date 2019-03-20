const {
    p2p: { Connection, muxer: { pullMplex } },
    stream: { pull }
} = adone;
const { abortable, defer, pushable, through2, lengthPrefixed, pair } = pull;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "muxers", "pull_mplex", ...args);

const coder = require(srcPath("coder"));
const Plex = require(srcPath("mplex"));

const noop = () => { };

describe("p2p", "muxer", "pullMplex", () => {
    it("destroy should close both ends", (done) => {
        const p = pair.duplex();

        const plex1 = new Plex(true);
        const plex2 = new Plex(false);

        pull(plex1, p[0], plex1);
        pull(plex2, p[1], plex2);

        expect(4).check(done);

        const errHandler = (err) => {
            expect(err.message).to.be.eql("Underlying stream has been closed").mark();
        };
        plex1.on("error", errHandler);
        plex2.on("error", errHandler);

        plex2.on("close", () => {
            expect().mark();
        });

        plex2.on("close", () => {
            expect().mark();
        });
        plex1.destroy();
    });

    it("closing stream should close all channels", (done) => {
        const aborter = abortable();
        const plex1 = new Plex();

        plex1.on("error", noop);

        pull(plex1, aborter);

        expect(2).check(done);

        const stream1 = plex1.createStream();
        stream1.on("error", noop);

        const stream2 = plex1.createStream();
        stream2.on("error", noop);
        pull(
            stream1,
            pull.onEnd((err) => {
                expect(err).to.exist().mark();
            })
        );

        pull(
            stream2,
            pull.onEnd((err) => {
                expect(err).to.exist().mark();
            })
        );

        aborter.abort();
    });

    it("error should propagate to all channels", (done) => {
        const aborter = abortable();
        const plex1 = new Plex();

        plex1.on("error", noop);

        pull(plex1, aborter);

        expect(2).check(done);

        const stream1 = plex1.createStream();
        stream1.on("error", noop);

        const stream2 = plex1.createStream();
        stream2.on("error", noop);

        pull(
            stream1,
            pull.onEnd((err) => {
                expect(err.message).to.eql("nasty error").mark();
            })
        );

        pull(
            stream2,
            pull.onEnd((err) => {
                expect(err.message).to.eql("nasty error").mark();
            })
        );

        aborter.abort(new Error("nasty error"));
    });

    it.skip("should fail if max number of channels exceeded", (done) => {
        const plex1 = new Plex({
            maxChannels: 10,
            lazy: true
        });

        plex1.on("error", (err) => {
            expect(err.message).to.eql("max channels exceeded");
            done();
        });

        for (let i = 0; i < 11; i++) {
            plex1.createStream();
        }
    });

    it("should restrict message size", (done) => {
        const plex = new Plex();

        plex.on("error", (err) => {
            expect(err.message).to.equal("message too large!");
            done();
        });

        pull(
            pull.values([Array(1048576 + 2).join("\xff")]), // 1mb
            plex
        );
    });

    it("should validate message", (done) => {
        const plex = new Plex();

        plex.on("error", (err) => {
            expect(err.message).to.equal("Invalid message type");
            done();
        });

        pull(
            pull.values([[1, 7]]),
            coder.encode(), // invalid message type
            plex
        );
    });

    describe("channel", () => {
        const closeAndWait = function (stream) {
            pull(
                pull.empty(),
                stream,
                pull.onEnd((err) => {
                    expect(err).to.not.exist.mark();
                })
            );
        };

        describe("channel", () => {
            it("initiator should be able to send data", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    pull(
                        stream,
                        pull.collect((err, data) => {
                            expect(err).to.not.exist();
                            expect(data[0]).to.deep.eql(Buffer.from("hello from plex1!!"));
                            done();
                        })
                    );
                });

                const stream = plex1.createStream("stream 1");
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    stream
                );
            });

            it("receiver should be able to send data", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const chan = plex2.createStream("stream 2");
                pull(
                    pull.values([Buffer.from("hello from plex2!!")]),
                    chan
                );

                plex1.on("stream", (stream) => {
                    pull(
                        stream,
                        pull.collect((err, data) => {
                            expect(err).to.not.exist();
                            expect(data[0]).to.deep.eql(Buffer.from("hello from plex2!!"));
                            done();
                        })
                    );
                });
            });

            it("stream can be piped to itself (echo)", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const chan1 = plex1.createStream("stream 1");
                plex2.on("stream", (stream) => {
                    pull(
                        stream,
                        stream
                    );
                });

                pull(
                    pull.values([Buffer.from("hello")]),
                    chan1,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0]).to.deep.eql(Buffer.from("hello"));
                        done();
                    })
                );
            });

            it("closing sender closes stream for writting, but allows reading", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const sndrSrc = pushable();
                const rcvrSrc = pushable();

                plex2.on("stream", (receiver) => {
                    pull(
                        rcvrSrc,
                        receiver
                    );

                    rcvrSrc.push("Here ya go!"); // should be able to write to closed chan
                    rcvrSrc.end();
                });

                const sender = plex1.createStream();
                sender.openChan();
                sndrSrc.end();
                pull(
                    sndrSrc,
                    sender,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.be.eql("Here ya go!");
                        done();
                    })
                );
            });

            it("closing receiver closes stream for writting, but allows reading", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const sndrSrc = pushable();
                const rcvrSrc = pushable();

                plex2.on("stream", (receiver) => {
                    rcvrSrc.end();

                    pull(
                        rcvrSrc,
                        receiver,
                        pull.collect((err, data) => {
                            expect(err).to.not.exist();
                            expect(data[0].toString()).to.be.eql("Here ya go!");
                            done();
                        })
                    );
                });

                const sender = plex1.createStream();
                sender.openChan();
                pull(
                    sndrSrc,
                    sender
                );

                sndrSrc.push("Here ya go!"); // should be able to write to closed chan
                sndrSrc.end();
            });

            it("closed sender should allow receiver to flush data", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const sndrSrc = pushable();
                const rcvrSrc = pushable();

                plex2.on("stream", (receiver) => {
                    pull(
                        rcvrSrc,
                        receiver,
                        pull.collect((err, data) => {
                            expect(err).to.not.exist();
                            expect(data[0].toString()).to.be.eql("hello from sender!");
                            done();
                        })
                    );
                });

                const sender = plex1.createStream();
                sender.openChan();
                sndrSrc.push("hello from sender!");
                sndrSrc.end();

                pull(
                    sndrSrc,
                    sender
                );
            });

            it("should destroy channels", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    pull(
                        stream,
                        pull.collect((err, data) => {
                            expect(err).to.exist();
                            expect(data[0].toString()).to.eql("hello there!");
                            done();
                        })
                    );

                    sndrSrc.push(Buffer.from("hello there!"));
                    aborter.abort(new Error("nasty error!"));
                });

                const sndrSrc = pushable();
                const sender = plex1.createStream();
                const aborter = abortable();
                sender.openChan();
                pull(
                    sndrSrc,
                    aborter,
                    sender
                );
            });

            it("open a stream on both sides", (done) => {
                const p = pair.duplex();

                const dialer = new Plex(true);
                const listener = new Plex(false);

                pull(dialer, p[0], dialer);
                pull(listener, p[1], listener);

                expect(6).check(done);

                dialer.on("stream", (stream) => {
                    expect(stream).to.exist.mark();
                    closeAndWait(stream);
                });

                const listenerConn = listener.createStream("listener");
                listenerConn.openChan();

                listener.on("stream", (stream) => {
                    expect(stream).to.exist.mark();
                    closeAndWait(stream);
                });

                const dialerConn = dialer.createStream("dialer");
                dialerConn.openChan();

                closeAndWait(dialerConn);
                closeAndWait(listenerConn);
            });

            it("should be able to send and receive from same stream", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    pull(
                        stream,
                        through2(function (data) {
                            this.queue(data.toString().toUpperCase());
                        }),
                        stream
                    );
                });

                const stream = plex1.createStream("stream 1");
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    stream,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });

            it("should be able to send and receive from same stream with delayed pipe", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    setTimeout(() => pull(
                        stream,
                        through2(function (data) {
                            this.queue(data.toString().toUpperCase());
                        }),
                        stream
                    ), 800);
                });

                const stream = plex1.createStream("stream 1");
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    stream,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });

            it("should be able to send and receive from same stream with deferred stream", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const stream2 = defer.duplex();
                plex2.on("stream", (_stream) => {
                    stream2.resolve(_stream);
                });

                pull(
                    stream2,
                    through2(function (data) {
                        this.queue(data.toString().toUpperCase());
                    }),
                    stream2
                );

                const stream1 = plex1.createStream("stream 1");
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    stream1,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });

            it("should be able to send and receive from same stream with deferred and delayed stream", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                const stream2 = defer.duplex();
                plex2.on("stream", (_stream) => {
                    stream2.resolve(_stream);
                });

                setTimeout(() => pull(
                    stream2,
                    through2(function (data) {
                        this.queue(data.toString().toUpperCase());
                    }),
                    stream2
                ), 800);

                const stream1 = plex1.createStream("stream 1");
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    stream1,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });

            it("should work with connection", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    const conn = new Connection(stream);
                    pull(
                        conn,
                        through2(function (data) {
                            this.queue(data.toString().toUpperCase());
                        }),
                        conn
                    );
                });

                const stream = plex1.createStream("stream 1");
                const conn = new Connection(stream);
                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    conn,
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });

            it("should work with connection length prefixed", (done) => {
                const p = pair.duplex();

                const plex1 = new Plex(true);
                const plex2 = new Plex(false);

                pull(plex1, p[0], plex1);
                pull(plex2, p[1], plex2);

                plex2.on("stream", (stream) => {
                    const conn = new Connection(stream);
                    pull(
                        conn,
                        lengthPrefixed.decode(),
                        through2(function (data) {
                            this.queue(Buffer.from(data.toString().toUpperCase()));
                        }),
                        lengthPrefixed.encode(),
                        conn
                    );
                });

                const stream = plex1.createStream("stream 1");
                const conn = new Connection(stream);

                pull(
                    pull.values([Buffer.from("hello from plex1!!")]),
                    lengthPrefixed.encode(),
                    conn,
                    lengthPrefixed.decode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0].toString()).to.eql("HELLO FROM PLEX1!!");
                        done();
                    })
                );
            });
        });
    });

    describe("coder", () => {
        describe("coder", () => {
            it("encodes header", () => {
                pull(
                    pull.values([[17, 0, Buffer.from("17")]]),
                    coder.encode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0]).to.be.eql(Buffer.from("880102", "hex"));
                    })
                );
            });

            it("decodes header", () => {
                pull(
                    pull.values([Buffer.from("8801023137", "hex")]),
                    coder.decode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0]).to.be.eql({ id: 17, type: 0, data: Buffer.from("17") });
                    })
                );
            });

            it("encodes several msgs into buffer", () => {
                pull(
                    pull.values([
                        [17, 0, Buffer.from("17")],
                        [19, 0, Buffer.from("19")],
                        [21, 0, Buffer.from("21")]
                    ]),
                    coder.encode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(Buffer.concat(data)).to.be.eql(Buffer.from("88010231379801023139a801023231", "hex"));
                    })
                );
            });

            it("decodes msgs from buffer", () => {
                pull(
                    pull.values([Buffer.from("88010231379801023139a801023231", "hex")]),
                    coder.decode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data).to.be.deep.eql([
                            { id: 17, type: 0, data: Buffer.from("17") },
                            { id: 19, type: 0, data: Buffer.from("19") },
                            { id: 21, type: 0, data: Buffer.from("21") }
                        ]);
                    })
                );
            });

            it("encodes zero length body msg", () => {
                pull(
                    pull.values([[17, 0]]),
                    coder.encode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0]).to.be.eql(Buffer.from("880100", "hex"));
                    })
                );
            });

            it("decodes zero length body msg", () => {
                pull(
                    pull.values([Buffer.from("880100", "hex")]),
                    coder.decode(),
                    pull.collect((err, data) => {
                        expect(err).to.not.exist();
                        expect(data[0]).to.be.eql({ id: 17, type: 0, data: Buffer.alloc(0) });
                    })
                );
            });
        });

    });

    describe("compliance", () => {
        const tests = require("./interface");

        tests({
            setup(cb) {
                cb(null, pullMplex);
            },
            teardown(cb) {
                cb();
            }
        });
    });
});
