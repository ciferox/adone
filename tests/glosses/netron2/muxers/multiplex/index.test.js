const {
    netron2: { multiplex },
    stream: { pull }
} = adone;

describe("netron2", "muxer", "multiplex", () => {
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
        listener = multiplex.listener(listenerSocket);
        assert.exists(listener);
    });

    it("attach to a duplex stream, as dialer", () => {
        dialer = multiplex.dialer(dialerSocket);
        assert.exists(dialer);
    });

    it("open a multiplex stream from client", (done) => {
        listener.once("stream", (conn) => {
            pull(conn, conn);
        });

        const conn = dialer.newStream();
        pull(
            // Strings should be converted to Buffers
            pull.values(["hello"]),
            conn,
            pull.collect((err, res) => {
                assert.notExists(err);
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
            pull.values([Buffer.from("hello")]),
            conn,
            pull.collect((err, res) => {
                assert.notExists(err);
                expect(res).to.eql([Buffer.from("hello")]);
                done();
            })
        );
    });
});
