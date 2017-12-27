const { makePeers } = require("./utils");

const { PeerList } = adone.private(adone.netron2.dht);

describe("PeerList", () => {
    let peers;

    before(() => {
        peers = makePeers(3);
    });

    it("basics", () => {
        const l = new PeerList();

        expect(l.push(peers[0])).to.eql(true);
        expect(l.push(peers[0])).to.eql(false);
        expect(l).to.have.length(1);
        expect(l.push(peers[1])).to.eql(true);
        expect(l.pop()).to.eql(peers[1]);
        expect(l).to.have.length(1);
        expect(l.toArray()).to.eql([peers[0]]);
    });
});
