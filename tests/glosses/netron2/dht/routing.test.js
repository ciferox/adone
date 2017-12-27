const {
    math: { random },
    netron2: { dht, PeerId }
} = adone;
const { RoutingTable, utils } = adone.private(dht);

const createPeers = function (n) {
    const peers = [];
    for (let i = 0; i < n; i++) {
        peers.push(PeerId.create({ bits: 1024 }));
    }
    return peers;
};

describe("RoutingTable", () => {
    let table;

    beforeEach(function () {
        this.timeout(20 * 1000);

        const id = PeerId.create();
        table = new RoutingTable(id, 20);
    });

    // TODO fix a callback that is being called twice, making this test fail
    it("add", function () {
        this.timeout(60 * 1000);
        const peers = createPeers(20);

        for (let i = 0; i < 1000; i++) {
            table.add(peers[random(0, peers.length - 1)]);
        }

        for (let i = 0; i < 20; i++) {
            const id = peers[random(0, peers.length - 1)];
            const key = utils.convertPeerId(id);
            expect(table.closestPeers(key, 5).length).to.be.above(0);
        }
    });


    it("remove", function () {
        this.timeout(20 * 1000);

        const peers = createPeers(10);

        for (const p of peers) {
            table.add(p);
        }

        const id = peers[2];
        const k = utils.convertPeerId(id);
        expect(table.closestPeers(k, 10)).to.have.length(10);
        table.remove(peers[5]);
        expect(table.closestPeers(k, 10)).to.have.length(9);
        expect(table.size).to.be.eql(9);
    });

    it("closestPeer", function () {
        this.timeout(10 * 1000);

        const peers = createPeers(4);

        for (const p of peers) {
            table.add(p);
        }
        const id = peers[2];
        const key = utils.convertPeerId(id);
        expect(table.closestPeer(key)).to.eql(id);
    });

    // TODO fix a callback that is being called twice, making this test fail
    it("closestPeers", function () {
        this.timeout(20 * 1000);

        const peers = createPeers(18);

        for (const p of peers) {
            table.add(p);
        }
        const id = peers[2];
        const key = utils.convertPeerId(id);
        expect(table.closestPeers(key, 15)).to.have.length(15);
    });
});
