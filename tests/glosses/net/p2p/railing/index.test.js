const peerList = require("./default-peers");

const {
    net: { p2p: { Railing } }
} = adone;

describe("without verify on", () => {
    it("find the other peer", (done) => {
        const r = new Railing(peerList);

        r.start(() => { });

        r.once("peer", (peer) => done());
    });
});
