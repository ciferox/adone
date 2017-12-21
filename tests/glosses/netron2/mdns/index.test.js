const parallel = require("async/parallel");

const {
    multi,
    netron2: { MulticastDNS, PeerInfo }
} = adone;

describe("MulticastDNS", () => {
    let pA;
    let pB;
    let pC;
    let pD;

    before(function (done) {
        this.timeout(25000);
        parallel([
            (cb) => {
                PeerInfo.create((err, peer) => {
                    assert.notExists(err);

                    pA = peer;
                    pA.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20001"));
                    cb();
                });
            },
            (cb) => {
                PeerInfo.create((err, peer) => {
                    assert.notExists(err);

                    pB = peer;
                    pB.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20002"));
                    cb();
                });
            },
            (cb) => {
                PeerInfo.create((err, peer) => {
                    assert.notExists(err);
                    pC = peer;
                    pC.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20003"));
                    pC.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/30003/ws"));
                    cb();
                });
            },
            (cb) => {
                PeerInfo.create((err, peer) => {
                    if (err) {
                        cb(err);
                    }
                    pD = peer;
                    pD.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/30003/ws"));
                    cb();
                });
            }
        ], done);
    });

    it("find another peer", (done) => {
        const options = {
            port: 50001 // port must be the same
        };
        const mdnsA = new MulticastDNS(pA, options);
        const mdnsB = new MulticastDNS(pB, options);

        parallel([
            (cb) => mdnsA.start(cb),
            (cb) => mdnsB.start(cb)
        ], () => {
            mdnsA.once("peer", (peerInfo) => {
                expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String());
                done();
            });

            mdnsB.once("peer", (peerInfo) => { });
        });
    });

    it("only announce TCP multiaddrs", (done) => {
        const options = {
            port: 50003 // port must be the same
        };

        const mdnsA = new MulticastDNS(pA, options);
        const mdnsC = new MulticastDNS(pC, options);
        const mdnsD = new MulticastDNS(pD, options);

        parallel([
            (cb) => mdnsA.start(cb),
            (cb) => mdnsC.start(cb),
            (cb) => mdnsD.start(cb)

        ], () => {
            mdnsA.once("peer", (peerInfo) => {
                expect(pC.id.toB58String()).to.eql(peerInfo.id.toB58String());
                expect(peerInfo.multiaddrs.size).to.equal(1);
                done();
            });

            mdnsC.once("peer", (peerInfo) => { });
        });
    });

    it("doesn't emit peers after stop", (done) => {
        const options = {
            port: 50004 // port must be the same
        };
        const mdnsA = new MulticastDNS(pA, options);
        const mdnsC = new MulticastDNS(pC, options);

        setTimeout(done, 15000);

        parallel([
            (cb) => mdnsA.start(cb),
            (cb) => mdnsC.start(cb)
        ], () => {
            mdnsA.stop((err) => {
                if (err) {
                    return done(err);
                }
            });

            mdnsC.once("peer", (peerInfo) => {
                done(new Error("Should not receive new peer."));
            });
        });
    });
});
