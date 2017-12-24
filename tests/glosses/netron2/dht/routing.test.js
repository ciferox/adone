const map = require("async/map");
const each = require("async/each");
const waterfall = require("async/waterfall");

const {
    math: { random },
    netron2: { dht, PeerId },
    vendor: { lodash: { range } }
} = adone;
const { RoutingTable, utils } = adone.private(dht);

const createPeers = function (n, callback) {
    map(range(n), (i, cb) => PeerId.create({ bits: 1024 }, cb), callback);
};

describe("RoutingTable", () => {
    let table;

    beforeEach(function (done) {
        this.timeout(20 * 1000);

        PeerId.create((err, id) => {
            assert.notExists(err);
            table = new RoutingTable(id, 20);
            done();
        });
    });

    // TODO fix a callback that is being called twice, making this test fail
    it("add", function (done) {
        this.timeout(60 * 1000);
        createPeers(20, (err, peers) => {
            assert.notExists(err);
            waterfall([
                (cb) => each(range(1000), (n, cb) => {
                    table.add(peers[random(0, peers.length - 1)], cb);
                }, cb),
                (cb) => each(range(20), (n, cb) => {
                    const id = peers[random(0, peers.length - 1)];
                    utils.convertPeerId(id, (err, key) => {
                        assert.notExists(err);
                        expect(
                            table.closestPeers(key, 5).length
                        ).to.be.above(0);
                        cb();
                    });
                }, cb)
            ], done);
        });
    });

    
    it("remove", function (done) {
        this.timeout(20 * 1000);

        createPeers(10, (err, peers) => {
            assert.notExists(err);

            let k;
            waterfall([
                (cb) => each(peers, (peer, cbEach) => table.add(peer, cbEach), cb),
                (cb) => {
                    const id = peers[2];
                    utils.convertPeerId(id, (err, key) => {
                        assert.notExists(err);
                        k = key;
                        expect(table.closestPeers(key, 10)).to.have.length(10);
                        cb();
                    });
                },
                (cb) => table.remove(peers[5], cb),
                (cb) => {
                    expect(table.closestPeers(k, 10)).to.have.length(9);
                    expect(table.size).to.be.eql(9);
                    cb();
                }
            ], done);
        });
    });

    it("closestPeer", function (done) {
        this.timeout(10 * 1000);

        createPeers(4, (err, peers) => {
            assert.notExists(err);
            waterfall([
                (cb) => each(peers, (peer, cb) => table.add(peer, cb), cb),
                (cb) => {
                    const id = peers[2];
                    utils.convertPeerId(id, (err, key) => {
                        assert.notExists(err);
                        expect(table.closestPeer(key)).to.eql(id);
                        cb();
                    });
                }
            ], done);
        });
    });

    // TODO fix a callback that is being called twice, making this test fail
    it("closestPeers", function (done) {
        this.timeout(20 * 1000);

        createPeers(18, (err, peers) => {
            assert.notExists(err);
            waterfall([
                (cb) => each(peers, (peer, cb) => table.add(peer, cb), cb),
                (cb) => {
                    const id = peers[2];
                    utils.convertPeerId(id, (err, key) => {
                        assert.notExists(err);
                        expect(table.closestPeers(key, 15)).to.have.length(15);
                        cb();
                    });
                }
            ], done);
        });
    });
});
