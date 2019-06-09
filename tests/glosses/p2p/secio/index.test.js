const {
    async: { parallel, series },
    multiformat: { multistream },
    p2p: { secio, Connection, PeerId },
    stream: { pull }
} = adone;
const { pair } = pull;
const { Listener, Dialer } = multistream;

const srcPath = (...args) => adone.getPath("lib", "glosses", ...args);

const State = require(srcPath("p2p", "secio", "state"));
const handshake = require(srcPath("p2p", "secio", "handshake"));

describe("p2p", "secio", () => {
    let peerA;
    let peerB;
    let peerC;

    before((done) => {
        parallel([
            (cb) => PeerId.createFromJSON(require("./fixtures/peer-a"), cb),
            (cb) => PeerId.createFromJSON(require("./fixtures/peer-b"), cb),
            (cb) => PeerId.createFromJSON(require("./fixtures/peer-c"), cb)
        ], (err, peers) => {
            expect(err).to.not.exist();
            peerA = peers[0];
            peerB = peers[1];
            peerC = peers[2];
            done();
        });
    });

    it("exports a secio multicodec", () => {
        expect(secio.tag).to.equal("/secio/1.0.0");
    });

    it("upgrades a connection", (done) => {
        const p = pair.duplex();

        const aToB = secio.encrypt(peerA, new Connection(p[0]), peerB, (err) => expect(err).to.not.exist());
        const bToA = secio.encrypt(peerB, new Connection(p[1]), peerA, (err) => expect(err).to.not.exist());

        pull(
            pull.values([Buffer.from("hello world")]),
            aToB
        );

        pull(
            bToA,
            pull.collect((err, chunks) => {
                expect(err).to.not.exist();
                expect(chunks).to.eql([Buffer.from("hello world")]);
                done();
            })
        );
    });

    it("works over multistream-select", (done) => {
        const p = pair.duplex();

        const listener = new Listener();
        const dialer = new Dialer();

        series([
            (cb) => parallel([
                (cb) => listener.handle(p[0], cb),
                (cb) => dialer.handle(p[1], cb)
            ], cb),
            (cb) => {
                listener.addHandler("/banana/1.0.0", (protocol, conn) => {
                    const bToA = secio.encrypt(peerB, conn, peerA, (err) => expect(err).to.not.exist());

                    pull(
                        bToA,
                        pull.collect((err, chunks) => {
                            expect(err).to.not.exist();
                            expect(chunks).to.eql([Buffer.from("hello world")]);
                            done();
                        })
                    );
                });

                cb();
            },
            (cb) => dialer.select("/banana/1.0.0", (err, conn) => {
                expect(err).to.not.exist();

                const aToB = secio.encrypt(peerA, conn, peerB, (err) => expect(err).to.not.exist());

                pull(
                    pull.values([Buffer.from("hello world")]),
                    aToB
                );
                cb();
            })
        ]);
    });

    it("establishes the connection even if the receiver does not know who is dialing", (done) => {
        const p = pair.duplex();

        const aToB = secio.encrypt(peerA, new Connection(p[0]), peerB, (err) => expect(err).to.not.exist());
        const bToA = secio.encrypt(peerB, new Connection(p[1]), undefined, (err) => expect(err).to.not.exist());

        pull(
            pull.values([Buffer.from("hello world")]),
            aToB
        );

        pull(
            bToA,
            pull.collect((err, chunks) => {
                expect(err).to.not.exist();

                expect(chunks).to.eql([Buffer.from("hello world")]);

                bToA.getPeerInfo((err, PeerInfo) => {
                    expect(err).to.not.exist();
                    expect(PeerInfo.id.toB58String()).to.equal(peerA.toB58String());
                    done();
                });
            })
        );
    });

    it("fails if we dialed to the wrong peer", (done) => {
        const p = pair.duplex();
        let count = 0;

        function check(err) {
            expect(err).to.exist();
            if (++count === 2) {
                done();
            }
        }

        // we are using peerC Id on purpose to fail
        secio.encrypt(peerA, new Connection(p[0]), peerC, check);
        secio.encrypt(peerB, new Connection(p[1]), peerA, check);
    });

    it("bubbles errors from handshake failures properly", (done) => {
        const p = pair.duplex();
        const timeout = 60 * 1000 * 5;
        const stateA = new State(peerA, peerC, timeout, () => { });
        const stateB = new State(peerB, peerA, timeout, () => { });
        const connA = new Connection(p[0]);
        const connB = new Connection(p[1]);

        function finish(err) {
            expect(err).to.exist();
            done();
        }

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

    describe("support", () => {
        const support = require(srcPath("p2p", "secio", "support"));

        describe("theBest", () => {
            it("returns the first matching element, preferring p1", () => {
                const order = 1;
                const p1 = ["hello", "world"];
                const p2 = ["world", "hello"];

                expect(
                    support.theBest(order, p1, p2)
                ).to.be.eql(
                    "hello"
                );
            });

            it("returns the first matching element, preferring p2", () => {
                const order = -1;
                const p1 = ["hello", "world"];
                const p2 = ["world", "hello"];

                expect(
                    support.theBest(order, p1, p2)
                ).to.be.eql(
                    "world"
                );
            });

            it("returns the first element if the same", () => {
                const order = 0;
                const p1 = ["hello", "world"];
                const p2 = p1;

                expect(
                    support.theBest(order, p1, p2)
                ).to.be.eql(
                    "hello"
                );
            });

            it("throws if no matching element was found", () => {
                expect(
                    () => support.theBest(1, ["hello"], ["world"])
                ).to.throw(
                    /No algorithms in common/
                );
            });
        });
    });

});
