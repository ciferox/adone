const {
    is,
    multi,
    net: { p2p: { PeerId, PeerInfo, PeerBook } }
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


describe("PeerBook", () => {
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

    it("set()", () => {
        expect(pb.set(p1)).to.eql(p1);
        expect(pb.set(p2)).to.eql(p2);
        expect(pb.set(p3)).to.eql(p3);
    });

    it("getAll()", () => {
        const peers = pb.getAll();
        expect(peers.size).to.equal(3);
    });

    it("getAllAsArray()", () => {
        expect(pb.getAllAsArray()).to.have.length(3);
    });

    it("get() by PeerId", () => {
        const peer = pb.get(p1.id);
        expect(peer).to.eql(p1);
    });

    it("get() by base58 string ", () => {
        const b58Str = p1.id.asBase58();
        const peer = pb.get(b58Str);
        expect(peer).to.eql(p1);
    });

    it("get() by base58 string non existent", () => {
        assert.throws(() => pb.get(p4.id.asBase58()));
    });

    it("get() by Multihash", () => {
        const mh = p1.id.toBytes();
        const peer = pb.get(mh);
        expect(peer).to.eql(p1);
    });

    it("get() by Multihash non existent", () => {
        assert.throws(() => pb.getByMultihash(p4.id.toBytes()));
    });

    it("delete() by base58 string", () => {
        const b58Str = p1.id.asBase58();

        pb.delete(b58Str);
        expect(pb.has(b58Str)).to.equal(false);
    });

    it("delete() by Multihash", () => {
        const mh = p1.id.toBytes();

        pb.delete(mh);
        expect(pb.has(mh)).to.equal(false);
    });

    it("set() peerInfo and merge info", () => {
        const peer3A = new PeerInfo(p3.id);
        peer3A.multiaddrs.add(new multi.address.Multiaddr("/ip4/127.0.0.1/tcp/4001"));

        pb.set(peer3A);
        const peer3B = pb.get(p3.id.toBytes());

        expect(peer3B.multiaddrs.toArray()).to.have.length(3);
    });

    it("set() peerInfo and replace info", () => {
        const peer3A = new PeerInfo(p3.id);
        peer3A.multiaddrs.add(new multi.address.Multiaddr("/ip4/188.0.0.1/tcp/5001"));

        pb.set(peer3A, true);
        const peer3B = pb.get(p3.id.asBase58());
        expect(peer3A.multiaddrs.toArray()).to.eql(peer3B.multiaddrs.toArray());
    });

    it("getMultiaddrs()", () => {
        const pb = new PeerBook();
        const peer = new PeerInfo(p3.id);
        peer.multiaddrs.add(new multi.address.Multiaddr("/ip4/127.0.0.1/tcp/1234"));

        pb.set(peer);
        expect(pb.getMultiaddrs(p3.id)).to.be.eql(peer.multiaddrs.toArray());
    });
});
