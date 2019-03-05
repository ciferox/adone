const {
    p2p: { spdy, stream: { pull } }
} = adone;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", ...args);
const pair = require(srcPath("p2p", "streams", "pair/duplex"));

describe("spdy-generic", () => {
    let listenerSocket;
    let dialerSocket;

    let listener;
    let dialer;

    before(() => {
        const p = pair();
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
