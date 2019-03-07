const waterfall = require("async/waterfall");
const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    p2p: { Node, PeerId, PeerInfo, transport: { WS }, KadDHT }
} = adone;

describe("private network", () => {
    let config;

    before((done) => {
        waterfall([
            (cb) => PeerId.create({ bits: 512 }, cb),
            (peerId, cb) => PeerInfo.create(peerId, cb),
            (peerInfo, cb) => {
                config = {
                    peerInfo,
                    modules: {
                        transport: [WS],
                        dht: KadDHT
                    }
                };
                cb();
            }
        ], () => done());
    });

    describe("enforced network protection", () => {
        before(() => {
            process.env.LIBP2P_FORCE_PNET = 1;
        });

        after(() => {
            delete process.env.LIBP2P_FORCE_PNET;
        });

        it("should throw an error without a provided protector", () => {
            expect(() => {
                return new Node(config);
            }).to.throw("Private network is enforced, but no protector was provided");
        });

        it("should create a libp2p node with a provided protector", () => {
            let node;
            const protector = {
                psk: "123",
                tag: "/psk/1.0.0",
                protect: () => { }
            };

            expect(() => {
                const options = defaultsDeep(config, {
                    modules: {
                        connProtector: protector
                    }
                });

                node = new Node(options);
                return node;
            }).to.not.throw();
            expect(node._switch.protector).to.deep.equal(protector);
        });

        it("should throw an error if the protector does not have a protect method", () => {
            expect(() => {
                const options = defaultsDeep(config, {
                    modules: {
                        connProtector: {}
                    }
                });

                return new Node(options);
            }).to.throw();
        });
    });

    describe("network protection not enforced", () => {
        it("should not throw an error with no provided protector", () => {
            expect(() => {
                return new Node(config);
            }).to.not.throw();
        });
    });
});
