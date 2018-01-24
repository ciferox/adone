const { makePeers } = require("./utils");

const {
    netron2: { multiplex, dht, swarm: { Swarm }, PeerBook, transport: { TCP } }
} = adone;
const { KadDHT } = dht;
const { Query } = adone.private(dht);

describe("Query", () => {
    let peerInfos;
    let dht;

    before(function () {
        this.timeout(5 * 1000);
        peerInfos = makePeers(3);
        const swarm = new Swarm(peerInfos[0], new PeerBook());
        swarm.tm.add("tcp", new TCP());
        swarm.connection.addStreamMuxer(multiplex);
        swarm.connection.reuse();
        dht = new KadDHT(swarm);
    });

    it("simple run", (done) => {
        const peer = peerInfos[0];

        // mock this so we can dial non existing peers
        dht.swarm.dial = (peer, callback) => callback();

        let i = 0;
        const query = (p, cb) => {
            if (i++ === 1) {
                expect(p.id).to.eql(peerInfos[2].id.id);

                return cb(null, {
                    value: Buffer.from("cool"),
                    success: true
                });
            }
            expect(p.id).to.eql(peerInfos[1].id.id);
            cb(null, {
                closerPeers: [peerInfos[2]]
            });
        };

        const q = new Query(dht, peer.id.id, query);
        q.run([peerInfos[1].id], (err, res) => {
            assert.notExists(err);
            expect(res.value).to.eql(Buffer.from("cool"));
            expect(res.success).to.eql(true);
            expect(res.finalSet.size).to.eql(2);
            done();
        });
    });

    it("returns an error if all queries error", (done) => {
        const peer = peerInfos[0];

        // mock this so we can dial non existing peers
        dht.swarm.dial = (peer, callback) => callback();

        const query = (p, cb) => cb(new Error("fail"));

        const q = new Query(dht, peer.id.id, query);
        q.run([peerInfos[1].id], (err, res) => {
            assert.exists(err);
            expect(err.message).to.eql("fail");
            done();
        });
    });

    it("only closerPeers", (done) => {
        const peer = peerInfos[0];

        // mock this so we can dial non existing peers
        dht.swarm.dial = (peer, callback) => callback();

        const query = (p, cb) => {
            cb(null, {
                closerPeers: [peerInfos[2]]
            });
        };

        const q = new Query(dht, peer.id.id, query);
        q.run([peerInfos[1].id], (err, res) => {
            assert.notExists(err);
            expect(res.finalSet.size).to.eql(2);
            done();
        });
    });
});
