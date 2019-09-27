const {
    p2p: { DelegatedPeerRouter, DelegatedContentRouter, KadDHT, Bootstrap, PeerInfo, PeerId, transport: { WS } }
} = adone;

const srcPath = (...args) => adone.getPath("src/glosses/p2p/node", ...args);

const validateConfig = require(srcPath("config")).validate;

describe("configuration", () => {
    let peerInfo;

    before(async () => {
        const peerId = await PeerId.create({ bits: 512 });
        peerInfo = await PeerInfo.create(peerId);
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
        }).to.throw("ERROR_EMPTY");
    });

    it("should add defaults to config", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                dht: KadDHT
            }
        };

        const expected = {
            peerInfo,
            connectionManager: {
                minPeers: 25
            },
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    autoDial: true
                },
                pubsub: {
                    enabled: true,
                    emitSelf: true,
                    signMessages: true,
                    strictSigning: true
                },
                dht: {
                    kBucketSize: 20,
                    enabled: false,
                    randomWalk: {
                        enabled: false,
                        queriesPerPeriod: 1,
                        interval: 300000,
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
                },
                dht: {
                    enabled: false
                },
                relay: {
                    enabled: true
                },
                pubsub: {
                    enabled: true
                }
            }
        };

        const expected = {
            peerInfo,
            connectionManager: {
                minPeers: 25
            },
            modules: {
                transport: [WS],
                peerDiscovery: [Bootstrap],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    autoDial: true,
                    bootstrap: {
                        interval: 1000,
                        enabled: true
                    }
                },
                pubsub: {
                    enabled: true,
                    emitSelf: true,
                    signMessages: true,
                    strictSigning: true
                },
                dht: {
                    kBucketSize: 20,
                    enabled: false,
                    randomWalk: {
                        enabled: false,
                        queriesPerPeriod: 1,
                        interval: 300000,
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

    it("should allow for configuring the switch", () => {
        const options = {
            peerInfo,
            switch: {
                denyTTL: 60e3,
                denyAttempts: 5,
                maxParallelDials: 100,
                maxColdCalls: 50,
                dialTimeout: 30e3
            },
            modules: {
                transport: [WS],
                peerDiscovery: []
            }
        };

        expect(validateConfig(options)).to.deep.include({
            switch: {
                denyTTL: 60e3,
                denyAttempts: 5,
                maxParallelDials: 100,
                maxColdCalls: 50,
                dialTimeout: 30e3
            }
        });
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
                dht: {
                    enabled: true
                }
            }
        };

        expect(() => validateConfig(options)).to.throw();
    });

    it("should be able to add validators and selectors for dht", () => {
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
            connectionManager: {
                minPeers: 25
            },
            modules: {
                transport: [WS],
                dht: KadDHT
            },
            config: {
                pubsub: {
                    enabled: true,
                    emitSelf: true,
                    signMessages: true,
                    strictSigning: true
                },
                peerDiscovery: {
                    autoDial: true
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
                    enabled: false,
                    randomWalk: {
                        enabled: false,
                        queriesPerPeriod: 1,
                        interval: 300000,
                        timeout: 10000
                    },
                    selectors,
                    validators
                }
            }
        };
        expect(validateConfig(options)).to.deep.equal(expected);
    });

    it("should support new properties for the dht config", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [WS],
                dht: KadDHT
            },
            config: {
                dht: {
                    kBucketSize: 20,
                    enabled: false,
                    myNewDHTConfigProperty: true,
                    randomWalk: {
                        enabled: false,
                        queriesPerPeriod: 1,
                        interval: 300000,
                        timeout: 10000
                    }
                }
            }
        };

        const expected = {
            kBucketSize: 20,
            enabled: false,
            myNewDHTConfigProperty: true,
            randomWalk: {
                enabled: false,
                queriesPerPeriod: 1,
                interval: 300000,
                timeout: 10000
            }
        };

        const actual = validateConfig(options).config.dht;

        expect(actual).to.deep.equal(expected);
    });
});
