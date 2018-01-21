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

    before(function () {
        this.timeout(25000);

        pA = PeerInfo.create();
        pA.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20001"));

        pB = PeerInfo.create();
        pB.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20002"));

        pC = PeerInfo.create();
        pC.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/20003"));
        pC.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/30003/ws"));

        pD = PeerInfo.create();
        pD.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/30003/ws"));
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
                expect(pB.id.asBase58()).to.eql(peerInfo.id.asBase58());
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
                expect(pC.id.asBase58()).to.eql(peerInfo.id.asBase58());
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
