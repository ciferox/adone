const {
    multiformat: { multiaddr: MultiAddr },
    p2p: { PeerBook, PeerInfo, PeerId }
} = adone;

const TestPeerInfos = require("./switch/test-data/ids.json").infos;

const srcPath = (...args) => adone.getPath("src/glosses/p2p/node", ...args);
const { getPeerInfo, getPeerInfoRemote } = require(srcPath("get-peer-info"));

describe("Get Peer Info", () => {
    describe("getPeerInfo", () => {
        let peerBook;
        let peerInfoA;
        let multiaddrA;
        let peerIdA;

        before(async () => {
            peerBook = new PeerBook();
            const id = await PeerId.createFromJSON(TestPeerInfos[0].id);
            peerIdA = id;
            peerInfoA = new PeerInfo(peerIdA);
            multiaddrA = MultiAddr("/ipfs/QmdWYwTywvXBeLKWthrVNjkq9SafEDn1PbAZdz4xZW7Jd9");
            peerInfoA.multiaddrs.add(multiaddrA);
            peerBook.put(peerInfoA);
        });

        it("should be able get peer info from multiaddr", () => {
            const _peerInfo = getPeerInfo(multiaddrA, peerBook);
            expect(peerBook.has(_peerInfo)).to.equal(true);
            expect(peerInfoA).to.deep.equal(_peerInfo);
        });

        it("should return a new PeerInfo with a multiAddr not in the PeerBook", () => {
            const wrongMultiAddr = MultiAddr("/ipfs/QmckZzdVd72h9QUFuJJpQqhsZqGLwjhh81qSvZ9BhB2FQi");
            const _peerInfo = getPeerInfo(wrongMultiAddr, peerBook);
            expect(PeerInfo.isPeerInfo(_peerInfo)).to.equal(true);
        });

        it("should be able get peer info from peer id", () => {
            const _peerInfo = getPeerInfo(multiaddrA, peerBook);
            expect(peerBook.has(_peerInfo)).to.equal(true);
            expect(peerInfoA).to.deep.equal(_peerInfo);
        });

        it("should add a peerInfo to the book", async () => {
            const id = await PeerId.createFromJSON(TestPeerInfos[1].id);
            const peerInfo = new PeerInfo(id);
            expect(peerBook.has(peerInfo.id.toB58String())).to.eql(false);

            expect(getPeerInfo(peerInfo, peerBook)).to.exist();
            expect(peerBook.has(peerInfo.id.toB58String())).to.eql(true);
        });

        it("should return the most up to date version of the peer", async () => {
            const ma1 = MultiAddr("/ip4/0.0.0.0/tcp/8080");
            const ma2 = MultiAddr("/ip6/::/tcp/8080");
            const id = await PeerId.createFromJSON(TestPeerInfos[1].id);
            const peerInfo = new PeerInfo(id);
            peerInfo.multiaddrs.add(ma1);
            expect(getPeerInfo(peerInfo, peerBook)).to.exist();

            const peerInfo2 = new PeerInfo(id);
            peerInfo2.multiaddrs.add(ma2);
            const returnedPeerInfo = getPeerInfo(peerInfo2, peerBook);
            expect(returnedPeerInfo.multiaddrs.toArray()).to.contain.members([
                ma1, ma2
            ]);
        });

        it("an invalid peer type should throw an error", () => {
            let error;
            try {
                getPeerInfo("/ip4/127.0.0.1/tcp/1234", peerBook);
            } catch (err) {
                error = err;
            }

            expect(error.code).to.eql("ERR_INVALID_MULTIADDR");
        });
    });

    describe("getPeerInfoRemote", () => {
        it("should callback with error for invalid string multiaddr", async () => {
            let error;
            try {
                await getPeerInfoRemote("INVALID MULTIADDR");
            } catch (err) {
                error = err;
            }

            expect(error.code).to.eql("ERR_INVALID_PEER_TYPE");
        });

        it("should callback with error for invalid non-peer multiaddr", async () => {
            let error;
            try {
                await getPeerInfoRemote("/ip4/8.8.8.8/tcp/1080");
            } catch (err) {
                error = err;
            }

            expect(error.code).to.eql("ERR_INVALID_PEER_TYPE");
        });

        it("should callback with error for invalid non-peer multiaddr", async () => {
            let error;
            try {
                await getPeerInfoRemote(undefined);
            } catch (err) {
                error = err;
            }

            expect(error.code).to.eql("ERR_INVALID_PEER_TYPE");
        });

        it("should callback with error for invalid non-peer multiaddr (promise)", () => {
            return getPeerInfoRemote(undefined)
                .then(expect.fail, (err) => {
                    expect(err.code).to.eql("ERR_INVALID_PEER_TYPE");
                });
        });
    });
});
