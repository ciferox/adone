const {
    p2p: { muxer: { mplex } },
    stream: { pull2: pull }
} = adone;
const { pair } = pull;

describe("p2p", "muxer", "mplex", () => {
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

        it("attach to a duplex stream, as listener", () => {
            listener = mplex.listener(listenerSocket);
            expect(listener).to.exist();
        });

        it("attach to a duplex stream, as dialer", () => {
            dialer = mplex.dialer(dialerSocket);
            expect(dialer).to.exist();
        });

        it("open a mplex stream from client", (done) => {
            listener.once("stream", (conn) => {
                pull(conn, conn);
            });

            const conn = dialer.newStream();
            pull(
                // Strings should be converted to Buffers
                pull.values(["hello"]),
                conn,
                pull.collect((err, res) => {
                    expect(err).to.not.exist();
                    expect(res).to.eql([Buffer.from("hello")]);
                    done();
                })
            );
        });

        it("open a mplex stream from listener", (done) => {
            dialer.once("stream", (conn) => {
                pull(conn, conn);
            });

            const conn = listener.newStream();
            pull(
                pull.values([Buffer.from("hello")]),
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
        const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "muxers", "mplex", ...args);
        const Muxer = require(srcPath("muxer"));
        const Multiplex = require(srcPath("internals"));

        let muxer;
        let multiplex;

        it("can be created", () => {
            const p = pair.duplex();
            multiplex = new Multiplex();
            muxer = new Muxer(p, multiplex);
        });

        it("catches newStream errors", (done) => {
            multiplex.createStream = () => {
                throw new Error("something nbad happened");
            };
            muxer.newStream((err) => {
                expect(err).to.exist();
                expect(err.message).to.equal("something nbad happened");
                done();
            });
        });

        it("can be destroyed with an error", (done) => {
            const p = pair.duplex();
            const multiplex = new Multiplex();
            const muxer = new Muxer(p, multiplex);
            const error = new Error("bad things");
            muxer.once("error", (err) => {
                expect(err).to.eql(error);
                done();
            });
            muxer.end(error);
        });

        it("destroying with error does not throw with no listener", () => {
            const p = pair.duplex();
            const multiplex = new Multiplex();
            const muxer = new Muxer(p, multiplex);
            const error = new Error("bad things");
            expect(() => muxer.end(error)).to.not.throw();
        });

        it("can get destroyed", (done) => {
            expect(multiplex.destroyed).to.eql(false);

            muxer.end((err) => {
                expect(err).to.not.exist();
                expect(multiplex.destroyed).to.be.true();
                done();
            });
        });

        it("should handle a repeat destroy", (done) => {
            expect(multiplex.destroyed).to.be.true();

            muxer.end((err) => {
                expect(err).to.not.exist();
                expect(multiplex.destroyed).to.be.true();
                done();
            });
        });
    });

    describe("compliance", () => {
        const tests = require("../interface");

        tests({
            setup(cb) {
                cb(null, mplex);
            },
            teardown(cb) {
                cb();
            }
        });
    });

});
