const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "kad_dht", ...args);
const PeerList = require(srcPath("peer-list"));

const createPeerInfo = require("./utils/create_peer_info");

describe("PeerList", () => {
    let peers;

    before((done) => {
        createPeerInfo(3, (err, p) => {
            if (err) {
                return done(err);
            }
            peers = p;
            done();
        });
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
