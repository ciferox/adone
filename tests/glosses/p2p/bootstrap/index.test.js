const peerList = require("./default_peers");
const partialValidPeerList = require("./some_invalid_peers");
const mafmt = require("mafmt");

const {
    p2p: { Bootstrap }
} = adone;

describe("bootstrap", () => {
    it("find the other peer", function (done) {
        this.timeout(5 * 1000);
        const r = new Bootstrap({
            list: peerList,
            interval: 2000
        });

        r.once("peer", (peer) => done());
        r.start(() => { });
    });

    it("not fail on malformed peers in peer list", function (done) {
        this.timeout(5 * 1000);

        const r = new Bootstrap({
            list: partialValidPeerList,
            interval: 2000
        });

        r.start(() => { });

        r.on("peer", (peer) => {
            const peerList = peer.multiaddrs.toArray();
            expect(peerList.length).to.eq(1);
            expect(mafmt.IPFS.matches(peerList[0].toString()));
            done();
        });
    });
});
