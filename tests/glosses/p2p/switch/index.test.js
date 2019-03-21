const { EventEmitter } = require("events");

const utils = require("./utils");
const createInfos = utils.createInfos;
const TestPeerInfos = require("./test-data/ids.json").infos;

const {
    is,
    multiformat: { multiaddr },
    p2p: { Switch, PeerId, PeerInfo, PeerBook },
    stream: { pull }
} = adone;
const { pair } = pull;

describe("p2p", "switch", () => {
    describe("create Switch instance", () => {
        it("throws on missing peerInfo", () => {
            expect(() => new Switch()).to.throw(/You must provide a `peerInfo`/);
        });
    });



    describe("dial self", () => {
        class MockTransport extends EventEmitter {
            constructor() {
                super();
                this.conn = pair.duplex();
            }

            dial(addr, cb) {
                const c = this.conn[0];
                this.emit("connection", this.conn[1]);
                setImmediate(() => cb(null, c));
                return c;
            }

            listen(addr, cb) {
                return cb();
            }

            filter(mas) {
                return is.array(mas) ? mas : [mas];
            }
        }

        let swarmA;
        let peerInfos;

        before((done) => createInfos(2, (err, infos) => {
            expect(err).to.not.exist();

            const peerA = infos.shift();
            peerInfos = infos;

            peerA.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerA.multiaddrs.add(`/ip4/127.0.0.1/tcp/9001/ipfs/${peerA.id.toB58String()}`);
            peerA.multiaddrs.add(`/ip4/127.0.0.1/tcp/9001/p2p-circuit/ipfs/${peerA.id.toB58String()}`);
            peerA.multiaddrs.add("/ip4/0.0.0.0/tcp/9001");
            peerA.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/ipfs/${peerA.id.toB58String()}`);
            peerA.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/p2p-circuit/ipfs/${peerA.id.toB58String()}`);

            swarmA = new Switch(peerA, new PeerBook());

            swarmA.transport.add("tcp", new MockTransport());

            done();
        }));

        after((done) => swarmA.stop(done));

        it("node should not be able to dial itself", (done) => {
            swarmA.dial(swarmA._peerInfo, (err, conn) => {
                expect(err).to.exist();
                expect(() => {
                    throw err;
                }).to.throw(/A node cannot dial itself/);
                expect(conn).to.not.exist();
                done();
            });
        });

        it("node should not be able to dial another peers address that matches its own", (done) => {
            const peerB = peerInfos.shift();
            peerB.multiaddrs.add("/ip4/127.0.0.1/tcp/9001");
            peerB.multiaddrs.add("/ip4/0.0.0.0/tcp/9001");
            peerB.multiaddrs.add(`/ip4/0.0.0.0/tcp/9001/ipfs/${peerB.id.toB58String()}`);

            swarmA.dial(peerB, (err, conn) => {
                expect(err).to.exist();
                expect(err.code).to.eql("CONNECTION_FAILED");
                expect(conn).to.not.exist();
                done();
            });
        });
    });

    describe("Get peer info", () => {
        const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "switch", ...args);
        const getPeerInfo = require(srcPath("get-peer-info"));

        let peerBook;
        let peerInfoA;
        let multiaddrA;
        let peerIdA;

        before((done) => {
            peerBook = new PeerBook();
            PeerId.createFromJSON(TestPeerInfos[0].id, (err, id) => {
                peerIdA = id;
                peerInfoA = new PeerInfo(peerIdA);
                multiaddrA = multiaddr("/ipfs/QmdWYwTywvXBeLKWthrVNjkq9SafEDn1PbAZdz4xZW7Jd9");
                peerInfoA.multiaddrs.add(multiaddrA);
                peerBook.put(peerInfoA);
                done(err);
            });
        });

        it("should be able get peer info from multiaddr", () => {
            const _peerInfo = getPeerInfo(multiaddrA, peerBook);
            expect(peerBook.has(_peerInfo)).to.equal(true);
            expect(peerInfoA).to.deep.equal(_peerInfo);
        });

        it("should return a new PeerInfo with a multiAddr not in the PeerBook", () => {
            const wrongMultiAddr = multiaddr("/ipfs/QmckZzdVd72h9QUFuJJpQqhsZqGLwjhh81qSvZ9BhB2FQi");
            const _peerInfo = getPeerInfo(wrongMultiAddr, peerBook);
            expect(PeerInfo.isPeerInfo(_peerInfo)).to.equal(true);
            expect(peerBook.has(_peerInfo)).to.equal(false);
        });

        it("should be able get peer info from peer id", () => {
            const _peerInfo = getPeerInfo(multiaddrA, peerBook);
            expect(peerBook.has(_peerInfo)).to.equal(true);
            expect(peerInfoA).to.deep.equal(_peerInfo);
        });

        it("should not be able to get the peer info for a wrong peer id", (done) => {
            PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
                const func = () => {
                    getPeerInfo(id, peerBook);
                };

                expect(func).to.throw("Couldnt get PeerInfo");

                done(err);
            });
        });

        it("should add a peerInfo to the book", (done) => {
            PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
                const peerInfo = new PeerInfo(id);
                expect(peerBook.has(peerInfo.id.toB58String())).to.eql(false);
        
                expect(getPeerInfo(peerInfo, peerBook)).to.exist();
                expect(peerBook.has(peerInfo.id.toB58String())).to.eql(true);
                done(err);
            });
        });
        
        it("should return the most up to date version of the peer", (done) => {
            const ma1 = multiaddr("/ip4/0.0.0.0/tcp/8080");
            const ma2 = multiaddr("/ip6/::/tcp/8080");
            PeerId.createFromJSON(TestPeerInfos[1].id, (err, id) => {
                const peerInfo = new PeerInfo(id);
                peerInfo.multiaddrs.add(ma1);
                expect(getPeerInfo(peerInfo, peerBook)).to.exist();
        
                const peerInfo2 = new PeerInfo(id);
                peerInfo2.multiaddrs.add(ma2);
                const returnedPeerInfo = getPeerInfo(peerInfo2, peerBook);
                expect(returnedPeerInfo.multiaddrs.toArray()).to.contain.members([
                    ma1, ma2
                ]);
                done(err);
            });
        });

        it("an invalid peer type should throw an error", () => {
            const func = () => {
                getPeerInfo("/ip4/127.0.0.1/tcp/1234", peerBook);
            };

            expect(func).to.throw("peer type not recognized");
        });
    });
});
