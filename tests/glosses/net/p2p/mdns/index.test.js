const parallel = require("async/parallel");
const series = require("async/series");

const {
    multi,
    net: { p2p: { MulticastDNS, PeerInfo } }
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
        pB.multiaddrs.add(multi.address.create("/ip6/::1/tcp/20002"));

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
        const mdnsA = new MulticastDNS(pA, {
            broadcast: false, // do not talk to ourself
            port: 50001
        });
        const mdnsB = new MulticastDNS(pB, options);

        parallel([
            (cb) => mdnsA.start(cb),
            (cb) => mdnsB.start(cb)
        ], () => {
            mdnsA.once("peer", (peerInfo) => {
                expect(pB.id.asBase58()).to.eql(peerInfo.id.asBase58());
                parallel([
                    (cb) => mdnsA.stop(cb),
                    (cb) => mdnsB.stop(cb)
                ], done);
            });

            mdnsB.once("peer", (peerInfo) => { });
        });
    });

    it("only announce TCP multiaddrs", (done) => {
        const options = {
            port: 50003 // port must be the same
        };

        const mdnsA = new MulticastDNS(pA, {
            broadcast: false, // do not talk to ourself
            port: 50003
        });
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
                parallel([
                    (cb) => mdnsA.stop(cb),
                    (cb) => mdnsC.stop(cb),
                    (cb) => mdnsD.stop(cb)
                ], done);
            });

            mdnsC.once("peer", (peerInfo) => { });
        });
    });

    it("announces IP6 addresses", function (done) {
        this.timeout(40 * 1000);

        const options = {
            port: 50001 // port must be the same
        };
        const mdnsA = new MulticastDNS(pA, {
            broadcast: false, // do not talk to ourself
            port: 50001
        });
        const mdnsB = new MulticastDNS(pB, options);

        series([
            (cb) => mdnsB.start(cb),
            (cb) => mdnsA.start(cb)
        ], () => {
            mdnsA.once("peer", (peerInfo) => {
                expect(pB.id.asBase58()).to.eql(peerInfo.id.asBase58());
                expect(peerInfo.multiaddrs.size).to.equal(2);
                parallel([
                    (cb) => mdnsA.stop(cb),
                    (cb) => mdnsB.stop(cb)
                ], done);
            });

            mdnsB.once("peer", (peerInfo) => { });
        });
    });

    it("doesn't emit peers after stop", (done) => {
        const options = {
            port: 50004 // port must be the same
        };
        const mdnsA = new MulticastDNS(pA, options);
        const mdnsC = new MulticastDNS(pC, options);

        series([
            (cb) => mdnsA.start(cb),
            (cb) => setTimeout(cb, 1000),
            (cb) => mdnsA.stop(cb),
            (cb) => mdnsC.start(cb)
        ], () => {
            setTimeout(() => mdnsC.stop(done), 5000);
            mdnsC.once("peer", (peerInfo) => {
                done(new Error("Should not receive new peer."));
            });
        });
    });
});
