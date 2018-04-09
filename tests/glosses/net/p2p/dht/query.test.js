import createPeerInfo from "./utils/create_peer_info";

const {
    net: { p2p: { muxer: { mplex }, dht, switch: { Switch }, PeerBook, transport: { TCP } } }
} = adone;
const { KadDHT } = dht;
const { Query } = adone.private(dht);

describe("dht", "KadDHT", "Query", () => {
    let peerInfos;
    let dht;

    before(function () {
        this.timeout(5 * 1000);
        peerInfos = createPeerInfo(3);
        const sw = new Switch(peerInfos[0], new PeerBook());
        sw.tm.add("tcp", new TCP());
        sw.connection.addStreamMuxer(mplex);
        sw.connection.reuse();
        dht = new KadDHT(sw);
    });

    it("simple run", (done) => {
        const peer = peerInfos[0];

        // mock this so we can connect non existing peers
        dht.switch.connect = (peer) => { };

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

        // mock this so we can connect non existing peers
        dht.switch.connect = (peer) => { };

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

        // mock this so we can connect non existing peers
        dht.switch.connect = (peer) => { };

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
