const { makePeers } = require("./utils");

const { LimitedPeerList } = adone.private(adone.netron2.dht);

describe("netron2", "dht", "KadDHT", "LimitedPeerList", () => {
    let peers;

    before(function () {
        this.timeout(10 * 1000);

        peers = makePeers(5);
    });

    it("basics", () => {
        const l = new LimitedPeerList(4);

        expect(l.push(peers[0])).to.eql(true);
        expect(l.push(peers[0])).to.eql(false);
        expect(l.push(peers[1])).to.eql(true);
        expect(l.push(peers[2])).to.eql(true);
        expect(l.push(peers[3])).to.eql(true);
        expect(l.push(peers[4])).to.eql(false);

        expect(l).to.have.length(4);
        expect(l.pop()).to.eql(peers[3]);
        expect(l).to.have.length(3);
        expect(l.push(peers[4])).to.eql(true);
        expect(l.toArray()).to.eql([peers[0], peers[1], peers[2], peers[4]]);
    });
});