const waterfall = require("async/waterfall");

const {
    p2p: { DelegatedContentRouter, DelegatedPeerRouter, KadDHT, Bootstrap, PeerId, PeerInfo, WS },
    std: { path }
} = adone;

const validateConfig = require(path.join(adone.ROOT_PATH, "lib/ipfs/libp2p/node/config")).validate;

describe("configuration", () => {
    let peerInfo;

    before((done) => {
        waterfall([
            (cb) => PeerId.create({ bits: 512 }, cb),
            (peerId, cb) => PeerInfo.create(peerId, cb),
            (info, cb) => {
                peerInfo = info;
                cb();
            }
        ], () => done());
    });

    it("should throw an error if peerInfo is missing", () => {
        expect(() => {
            validateConfig({
                modules: {
                    transport: [WS]
                }
            });
        }).to.throw();
    });

    it("should throw an error if modules is missing", () => {
        expect(() => {
            validateConfig({
                peerInfo
            });
        }).to.throw();
    });

    it("should throw an error if there are no transports", () => {
        expect(() => {
            validateConfig({
                peerInfo,
                modules: {
                    transport: []
                }
            });
        }).to.throw();
    });

    it("should add defaults to missing items", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    bootstrap: {
                        interval: 1000,
                        enabled: true
                    }
                }
            }
        };

        const expected = {
            peerInfo,
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    bootstrap: {
                        interval: 1000,
                        enabled: true
                    }
                },
                EXPERIMENTAL: {
                    pubsub: false
                },
                dht: {
                    kBucketSize: 20,
                    enabled: true,
                    randomWalk: {
                        enabled: true,
                        queriesPerPeriod: 1,
                        interval: 30000,
                        timeout: 10000
                    }
                },
                relay: {
                    enabled: true,
                    hop: {
                        active: false,
                        enabled: false
                    }
                }
            }
        };

        expect(validateConfig(options)).to.deep.equal(expected);
    });

    it("should allow for delegated content and peer routing", () => {
        const peerRouter = new DelegatedPeerRouter();
        const contentRouter = new DelegatedContentRouter(peerInfo);

        const options = {
            peerInfo,
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                peerRouting: [peerRouter],
                contentRouting: [contentRouter],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    bootstrap: {
                        interval: 1000,
                        enabled: true
                    }
                }
            }
        };

        expect(validateConfig(options).modules).to.deep.include({
            peerRouting: [peerRouter],
            contentRouting: [contentRouter]
        });
    });

    it("should not allow for dht to be enabled without it being provided", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [WS]
            },
            config: {
                EXPERIMENTAL: {
                    dht: true
                }
            }
        };

        expect(() => validateConfig(options)).to.throw();
    });

    it("should add defaults, validators and selectors for dht", () => {
        const selectors = {};
        const validators = {};

        const options = {
            peerInfo,
            modules: {
                transport: [WS],
                dht: KadDHT
            },
            config: {
                dht: {
                    selectors,
                    validators
                }
            }
        };
        const expected = {
            peerInfo,
            modules: {
                transport: [WS],
                dht: KadDHT
            },
            config: {
                EXPERIMENTAL: {
                    pubsub: false
                },
                relay: {
                    enabled: true,
                    hop: {
                        active: false,
                        enabled: false
                    }
                },
                dht: {
                    kBucketSize: 20,
                    enabled: true,
                    randomWalk: {
                        enabled: true,
                        queriesPerPeriod: 1,
                        interval: 30000,
                        timeout: 10000
                    },
                    selectors,
                    validators
                }
            }
        };
        expect(validateConfig(options)).to.deep.equal(expected);
    });
});
