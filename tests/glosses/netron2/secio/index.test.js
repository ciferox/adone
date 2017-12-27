const parallel = require("async/parallel");
const series = require("async/series");

const {
    netron2: { multistream, secio, PeerId, crypto },
    stream: { pull }
} = adone;

const Listener = multistream.Listener;
const Dialer = multistream.Dialer;

const createSession = function (insecure) {
    const key = crypto.keys.generateKeyPair("RSA", 2048);
    const digest = key.public.hash();
    return secio.encrypt(new PeerId(digest, key), key, insecure);
};


describe("secio", () => {
    it("exports a tag", () => {
        expect(secio.tag).to.equal("/secio/1.0.0");
    });

    it("upgrades a connection", (done) => {
        const p = pull.pair.duplex();
        const local = createSession(p[0]);
        const remote = createSession(p[1]);
        pull(
            pull.values([Buffer.from("hello world")]),
            local
        );

        pull(
            remote,
            pull.collect((err, chunks) => {
                assert.notExists(err);
                expect(chunks).to.eql([Buffer.from("hello world")]);
                done();
            })
        );
    });

    it("works over multistream", (done) => {
        const p = pull.pair.duplex();

        const listener = new Listener();
        const dialer = new Dialer();

        series([
            (cb) => parallel([
                (cb) => listener.handle(p[0], cb),
                (cb) => dialer.handle(p[1], cb)
            ], cb),
            (cb) => {
                listener.addHandler("/banana/1.0.0", (protocol, conn) => {
                    const local = createSession(conn);
                    pull(
                        local,
                        pull.collect((err, chunks) => {
                            assert.notExists(err);
                            expect(chunks).to.be.eql([Buffer.from("hello world")]);
                            done();
                        })
                    );
                });
                cb();
            },
            (cb) => dialer.select("/banana/1.0.0", (err, conn) => {
                assert.notExists(err);

                const remote = createSession(conn);
                pull(
                    pull.values([Buffer.from("hello world")]),
                    remote
                );
                cb();
            })
        ], (err) => assert.notExists(err));
    });
});
