const peerList = require("./default-peers");

const {
    netron2: { Railing }
} = adone;

describe("without verify on", () => {
    it("find the other peer", (done) => {
        const r = new Railing(peerList);

        r.start(() => { });

        r.once("peer", (peer) => done());
    });
});
