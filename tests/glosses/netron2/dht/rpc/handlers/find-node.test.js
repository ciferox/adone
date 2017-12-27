const waterfall = require("async/waterfall");
const util = require("../../utils");

const {
    netron2: { dht }
} = adone;
const { rpcHandler: { findNode }, Message } = adone.private(dht);

const T = Message.TYPES.FIND_NODE;

describe("rpc - handlers - FindNode", () => {
    let peers;
    let myDht;

    before(() => {
        peers = util.makePeers(3);
    });

    afterEach((done) => util.teardown(done));

    beforeEach((done) => {
        util.setupDHT((err, res) => {
            assert.notExists(err);
            myDht = res;
            done();
        });
    });

    it("returns self, if asked for self", (done) => {
        const msg = new Message(T, myDht.peerInfo.id.id, 0);

        findNode(myDht)(peers[1], msg, (err, response) => {
            assert.notExists(err);
            expect(response.closerPeers).to.have.length(1);
            const peer = response.closerPeers[0];

            expect(peer.id.id).to.be.eql(myDht.peerInfo.id.id);
            done();
        });
    });

    it("returns closer peers", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 0);
        const other = peers[1];

        myDht._add(other);
        waterfall([
            (cb) => findNode(myDht)(peers[2], msg, cb)
        ], (err, response) => {
            assert.notExists(err);
            expect(response.closerPeers).to.have.length(1);
            const peer = response.closerPeers[0];

            expect(peer.id.id).to.be.eql(peers[1].id.id);
            expect(peer.multiaddrs.toArray()).to.be.eql(peers[1].multiaddrs.toArray());

            done();
        });
    });

    it("handles no peers found", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 0);

        findNode(myDht)(peers[2], msg, (err, response) => {
            assert.notExists(err);
            expect(response.closerPeers).to.have.length(0);
            done();
        });
    });
});
