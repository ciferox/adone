const {
    async: { parallel, series },
    crypto: { Identity },
    net: { p2p: { Connection, multistream, secio } },
    stream: { pull }
} = adone;

const Listener = multistream.Listener;
const Dialer = multistream.Dialer;

describe("secio", () => {
    let peerA;
    let peerB;
    let peerC;

    before(async () => {
        peerA = await Identity.createFromJSON(require("./fixtures/peer-a"));
        peerB = await Identity.createFromJSON(require("./fixtures/peer-b"));
        peerC = await Identity.createFromJSON(require("./fixtures/peer-c"));
    });

    it("exports a secio multicodec", () => {
        expect(secio.tag).to.equal("/secio/1.0.0");
    });

    it("upgrades a connection", (done) => {
        const p = pull.pair.duplex();

        const aToB = secio.encrypt(peerA, new Connection(p[0]), peerB, (err) => assert.notExists(err));
        const bToA = secio.encrypt(peerB, new Connection(p[1]), peerA, (err) => assert.notExists(err));

        pull(
            pull.values([Buffer.from("hello world")]),
            aToB
        );

        pull(
            bToA,
            pull.collect((err, chunks) => {
                assert.notExists(err);
                expect(chunks).to.eql([Buffer.from("hello world")]);
                done();
            })
        );
    });

    it("works over multistream-select", (done) => {
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
                    const bToA = secio.encrypt(peerB, conn, peerA, (err) => assert.notExists(err));

                    pull(
                        bToA,
                        pull.collect((err, chunks) => {
                            assert.notExists(err);
                            expect(chunks).to.eql([Buffer.from("hello world")]);
                            done();
                        })
                    );
                });

                cb();
            },
            (cb) => dialer.select("/banana/1.0.0", (err, conn) => {
                assert.notExists(err);

                const aToB = secio.encrypt(peerA, conn, peerB, (err) => assert.notExists(err));

                pull(
                    pull.values([Buffer.from("hello world")]),
                    aToB
                );
                cb();
            })
        ]);
    });

    it("establishes the connection even if the receiver does not know who is dialing", (done) => {
        const p = pull.pair.duplex();

        const aToB = secio.encrypt(peerA, new Connection(p[0]), peerB, (err) => assert.notExists(err));
        const bToA = secio.encrypt(peerB, new Connection(p[1]), undefined, (err) => assert.notExists(err));

        pull(
            pull.values([Buffer.from("hello world")]),
            aToB
        );

        pull(
            bToA,
            pull.collect(async (err, chunks) => {
                assert.notExists(err);

                expect(chunks).to.eql([Buffer.from("hello world")]);

                const peerInfo = await bToA.getPeerInfo();
                expect(peerInfo.id.asBase58()).to.equal(peerA.asBase58());
                done();
            })
        );
    });

    it("fails if we dialed to the wrong peer", (done) => {
        const p = pull.pair.duplex();
        let count = 0;

        const check = function (err) {
            assert.exists(err);
            if (++count === 2) {
                done();
            }
        };

        // we are using peerC Id on purpose to fail
        secio.encrypt(peerA, new Connection(p[0]), peerC, check);
        secio.encrypt(peerB, new Connection(p[1]), peerA, check);
    });

    it("bubbles errors from handshake failures properly", (done) => {
        const {
            State,
            handshake
        } = adone.private(adone.net.p2p.secio);
        const p = pull.pair.duplex();
        const timeout = 60 * 1000 * 5;
        const stateA = new State(peerA, peerC, timeout, () => { });
        const stateB = new State(peerB, peerA, timeout, () => { });
        const connA = new Connection(p[0]);
        const connB = new Connection(p[1]);

        const finish = (err) => {
            assert.exists(err);
            done();
        };

        pull(
            connA,
            handshake(stateA, finish),
            connA
        );

        pull(
            connB,
            handshake(stateB, finish),
            connB
        );
    });
});
