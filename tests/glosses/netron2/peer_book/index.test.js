const async = require("async");

const {
    is,
    multi,
    netron2: { PeerId, PeerInfo, PeerBook }
} = adone;

const createPeerInfo = function (multiaddrs) {
    if (!is.array(multiaddrs)) {
        multiaddrs = [multiaddrs];
    }

    const peerId = PeerId.create({ bits: 1024 });
    const peerInfo = PeerInfo.create(peerId);
    multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma));
    return peerInfo;
};


describe("netron2", "PeerBook", () => {
    let pb;
    let p1;
    let p2;
    let p3;
    let p4;

    before(() => {
        p1 = createPeerInfo(["/tcp/1000", "/tcp/1001"]);
        p2 = createPeerInfo(["/tcp/2000", "/tcp/2001"]);
        p3 = createPeerInfo(["/tcp/3000", "/tcp/3001"]);
        p4 = createPeerInfo(["/tcp/4000", "/tcp/4001"]);
    });

    it("create PeerBook", () => {
        pb = new PeerBook();
        assert.exists(pb);
    });

    it(".put", () => {
        expect(pb.put(p1)).to.eql(p1);
        expect(pb.put(p2)).to.eql(p2);
        expect(pb.put(p3)).to.eql(p3);
    });

    it(".getAll", () => {
        const peers = pb.getAll();
        expect(Object.keys(peers).length).to.equal(3);
    });

    it(".getAllArray", () => {
        expect(pb.getAllArray()).to.have.length(3);
    });

    it(".get by PeerId", () => {
        const peer = pb.get(p1.id);
        expect(peer).to.eql(p1);
    });

    it(".get by B58String ", () => {
        const b58Str = p1.id.asBase58();
        const peer = pb.get(b58Str);
        expect(peer).to.eql(p1);
    });

    it(".get by B58String non existent", (done) => {
        try {
            pb.get(p4.id.asBase58());
        } catch (err) {
            assert.exists(err);
            done();
        }
    });

    it(".get by Multihash", () => {
        const mh = p1.id.toBytes();
        const peer = pb.get(mh);
        expect(peer).to.eql(p1);
    });

    it(".get by Multihash non existent", (done) => {
        try {
            pb.getByMultihash(p4.id.toBytes());
        } catch (err) {
            assert.exists(err);
            done();
        }
    });

    it(".remove by B58String", () => {
        const b58Str = p1.id.asBase58();

        pb.remove(b58Str);
        expect(pb.has(b58Str)).to.equal(false);
    });

    it(".remove by Multihash", () => {
        const mh = p1.id.toBytes();

        pb.remove(mh);
        expect(pb.has(mh)).to.equal(false);
    });

    it(".put repeated Id, merge info", () => {
        const peer3A = new PeerInfo(p3.id);
        peer3A.multiaddrs.add(new multi.address.Multiaddr("/ip4/127.0.0.1/tcp/4001"));

        pb.put(peer3A);
        const peer3B = pb.get(p3.id.toBytes());

        expect(peer3B.multiaddrs.toArray()).to.have.length(3);
    });

    it(".put repeated Id, replace info", () => {
        const peer3A = new PeerInfo(p3.id);
        peer3A.multiaddrs.add(new multi.address.Multiaddr("/ip4/188.0.0.1/tcp/5001"));

        pb.put(peer3A, true);
        const peer3B = pb.get(p3.id.asBase58());
        expect(peer3A.multiaddrs.toArray()).to.eql(peer3B.multiaddrs.toArray());
    });

    it(".getMultiaddrs", () => {
        const pb = new PeerBook();
        const peer = new PeerInfo(p3.id);
        peer.multiaddrs.add(new multi.address.Multiaddr("/ip4/127.0.0.1/tcp/1234"));

        pb.put(peer);
        expect(pb.getMultiaddrs(p3.id)).to.be.eql(peer.multiaddrs.toArray());
    });
});
