const sinon = require("sinon");

const {
    p2p: { muxer: { spdy } },
    stream: { pull2: pull }
} = adone;
const { pair, pullStreamToStream } = pull;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", ...args);

describe("generic", () => {
    let listenerSocket;
    let dialerSocket;

    let listener;
    let dialer;

    before(() => {
        const p = pair.duplex();
        dialerSocket = p[0];
        listenerSocket = p[1];
    });

    after((done) => {
        listener.end((err) => {
            done(err);
        });
    });

    it("attach to a duplex stream, as listener", () => {
        listener = spdy.listener(listenerSocket);
        expect(listener).to.exist();
    });

    it("attach to a duplex stream, as dialer", () => {
        dialer = spdy.dialer(dialerSocket);
        expect(dialer).to.exist();
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
                expect(err).to.not.exist();
                expect(res).to.eql([Buffer.from("hello")]);
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
                expect(err).to.not.exist();
                expect(res).to.eql([Buffer.from("hello")]);
                done();
            })
        );
    });
});

describe("muxer", () => {
    const spdyTransport = require("spdy-transport");

    const Muxer = require(srcPath("p2p", "spdy", "muxer"));
    let muxer;
    let spdyMuxer;

    afterEach(() => {
        sinon.restore();
    });

    it("can be created", () => {
        const p = pair.duplex();
        spdyMuxer = spdyTransport.connection.create(pullStreamToStream(p), {
            protocol: "spdy",
            isServer: false
        });
        muxer = new Muxer(p, spdyMuxer);
    });

    it("catches newStream errors", (done) => {
        sinon.stub(spdyMuxer, "request").callsFake((_, cb) => {
            cb(new Error("something bad happened"));
        });

        muxer.newStream((err) => {
            expect(err).to.exist();
            expect(err.message).to.equal("something bad happened");
            done();
        });
    });

    it("catches stream errors", (done) => {
        const stream = muxer.newStream((err) => {
            expect(err).to.not.exist();
            pull(
                pull.error(Object.assign(new Error("ECONNRESET")), {
                    code: "ECONNRESET"
                }),
                stream,
                pull.onEnd((err) => {
                    expect(err).to.not.exist();
                    done();
                })
            );
        });
    });

    // This logic can be removed once spdy-transport doesn't emit empty errors
    it("should not emit an error when spdy emits an empty error", () => {
        muxer.once("error", expect.fail);
        muxer.spdy.emit("error");
        muxer.removeListener("error", expect.fail);
    });

    it("can get destroyed", (done) => {
        const spy = sinon.spy(spdyMuxer, "destroyStreams");
        expect(2).checks(done);

        muxer.end((err) => {
            expect(err).to.not.exist().mark();

            // End it again to test accidental duplicate close
            muxer.end((err) => {
                expect(spy.callCount).to.eql(2);
                expect(err).to.not.exist().mark();
            });
        });
    });

    it(".end should not require a callback", () => {
        const stub = sinon.stub(spdyMuxer, "end").callsFake((cb) => {
            cb();
        });

        muxer.end();
        expect(stub.callCount).to.eql(1);
    });

    it("should emit an error if spdy does", (done) => {
        muxer.once("error", (err) => {
            expect(err.code).to.eql("ERR_UNKNOWN");
            done();
        });

        muxer.spdy.emit("error", Object.assign(new Error("bad things"), {
            code: "ERR_UNKNOWN"
        }));
    });

    it("should not throw if there are no error listeners", () => {
        muxer.removeAllListeners("error");

        muxer.spdy.emit("error", Object.assign(new Error("bad things"), {
            code: "ERR_UNKNOWN"
        }));
    });
});

describe("compliance", () => {
    const tests = require("../interface");

    tests({
        setup(cb) {
            cb(null, spdy);
        },
        teardown(cb) {
            cb();
        }
    });
});
