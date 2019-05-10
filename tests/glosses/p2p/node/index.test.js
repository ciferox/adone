const sinon = require("sinon");
const series = require("async/series");
const createNode = require("./utils/create_node");

const waterfall = require("async/waterfall");

const {
    p2p: { Bootstrap, DelegatedPeerRouter, DelegatedContentRouter, PeerId, PeerInfo, KadDHT, transport: { WS } }
} = adone;

const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "node", ...args);

describe("creation", () => {
    it("should be able to start and stop successfully", (done) => {
        createNode([], {
            config: {
                EXPERIMENTAL: {
                    pubsub: true
                },
                dht: {
                    enabled: true
                }
            }
        }, (err, node) => {
            expect(err).to.not.exist();

            const sw = node._switch;
            const cm = node.connectionManager;
            const dht = node._dht;
            const pub = node._floodSub;

            sinon.spy(sw, "start");
            sinon.spy(cm, "start");
            sinon.spy(dht, "start");
            sinon.spy(dht.randomWalk, "start");
            sinon.spy(pub, "start");
            sinon.spy(sw, "stop");
            sinon.spy(cm, "stop");
            sinon.spy(dht, "stop");
            sinon.spy(dht.randomWalk, "stop");
            sinon.spy(pub, "stop");
            sinon.spy(node, "emit");

            series([
                (cb) => node.start(cb),
                (cb) => {
                    expect(sw.start.calledOnce).to.equal(true);
                    expect(cm.start.calledOnce).to.equal(true);
                    expect(dht.start.calledOnce).to.equal(true);
                    expect(dht.randomWalk.start.calledOnce).to.equal(true);
                    expect(pub.start.calledOnce).to.equal(true);
                    expect(node.emit.calledWith("start")).to.equal(true);

                    cb();
                },
                (cb) => node.stop(cb)
            ], (err) => {
                expect(err).to.not.exist();

                expect(sw.stop.calledOnce).to.equal(true);
                expect(cm.stop.calledOnce).to.equal(true);
                expect(dht.stop.calledOnce).to.equal(true);
                expect(dht.randomWalk.stop.called).to.equal(true);
                expect(pub.stop.calledOnce).to.equal(true);
                expect(node.emit.calledWith("stop")).to.equal(true);

                done();
            });
        });
    });

    it("should not create disabled modules", (done) => {
        createNode([], {
            config: {
                EXPERIMENTAL: {
                    pubsub: false
                }
            }
        }, (err, node) => {
            expect(err).to.not.exist();
            expect(node._floodSub).to.not.exist();
            done();
        });
    });

    it("should not throw errors from switch if node has no error listeners", (done) => {
        createNode([], {}, (err, node) => {
            expect(err).to.not.exist();

            node._switch.emit("error", new Error("bad things"));
            done();
        });
    });

    it("should emit errors from switch if node has error listeners", (done) => {
        const error = new Error("bad things");
        createNode([], {}, (err, node) => {
            expect(err).to.not.exist();
            node.once("error", (err) => {
                expect(err).to.eql(error);
                done();
            });
            node._switch.emit("error", error);
        });
    });
});

describe("configuration", () => {
    const validateConfig = require(srcPath("config")).validate;

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
                EXPERIMENTAL: {
                    pubsub: false
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
                EXPERIMENTAL: {
                    pubsub: false
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
                blacklistTTL: 60e3,
                blackListAttempts: 5,
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
                blacklistTTL: 60e3,
                blackListAttempts: 5,
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
                EXPERIMENTAL: {
                    pubsub: false
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

describe("state machine (fsm)", () => {
    describe("starting and stopping", () => {
        let node;
        beforeEach((done) => {
            createNode([], {
                config: {
                    dht: {
                        enabled: false
                    }
                }
            }, (err, _node) => {
                node = _node;
                done(err);
            });
        });
        afterEach(() => {
            node.removeAllListeners();
            sinon.restore();
        });
        after((done) => {
            node.stop(done);
            node = null;
        });

        it("should be able to start and stop several times", (done) => {
            node.on("start", (err) => {
                expect(err).to.not.exist().mark();
            });
            node.on("stop", (err) => {
                expect(err).to.not.exist().mark();
            });

            expect(4).checks(done);

            series([
                (cb) => node.start(cb),
                (cb) => node.stop(cb),
                (cb) => node.start(cb),
                (cb) => node.stop(cb)
            ], () => { });
        });

        it("should noop when stopping a stopped node", (done) => {
            node.once("start", node.stop);
            node.once("stop", () => {
                node.state.on("STOPPING", () => {
                    throw new Error("should not stop a stopped node");
                });
                node.once("stop", done);

                // stop the stopped node
                node.stop();
            });
            node.start();
        });

        it("should callback with an error when it occurs on stop", (done) => {
            const error = new Error("some error starting");
            node.once("start", () => {
                node.once("error", (err) => {
                    expect(err).to.eql(error).mark();
                });
                node.stop((err) => {
                    expect(err).to.eql(error).mark();
                });
            });

            expect(2).checks(done);

            sinon.stub(node._switch, "stop").callsArgWith(0, error);
            node.start();
        });

        it("should noop when starting a started node", (done) => {
            node.once("start", () => {
                node.state.on("STARTING", () => {
                    throw new Error("should not start a started node");
                });
                node.once("start", () => {
                    node.once("stop", done);
                    node.stop();
                });

                // start the started node
                node.start();
            });
            node.start();
        });

        it("should error on start with no transports", (done) => {
            const transports = node._modules.transport;
            node._modules.transport = null;

            node.on("stop", () => {
                node._modules.transport = transports;
                expect(node._modules.transport).to.exist().mark();
            });
            node.on("error", (err) => {
                expect(err).to.exist().mark();
            });
            node.on("start", () => {
                throw new Error("should not start");
            });

            expect(2).checks(done);

            node.start();
        });

        it("should not start if the switch fails to start", (done) => {
            const error = new Error("switch didnt start");
            const stub = sinon.stub(node._switch, "start")
                .callsArgWith(0, error);

            node.on("stop", () => {
                expect(stub.calledOnce).to.eql(true).mark();
                stub.restore();
            });
            node.on("error", (err) => {
                expect(err).to.eql(error).mark();
            });
            node.on("start", () => {
                throw new Error("should not start");
            });

            expect(3).checks(done);

            node.start((err) => {
                expect(err).to.eql(error).mark();
            });
        });

        it("should not dial when the node is stopped", (done) => {
            node.on("stop", () => {
                node.dial(null, (err) => {
                    expect(err).to.exist();
                    expect(err.code).to.eql("ERR_NODE_NOT_STARTED");
                    done();
                });
            });

            node.stop();
        });

        it("should not dial (fsm) when the node is stopped", (done) => {
            node.on("stop", () => {
                node.dialFSM(null, null, (err) => {
                    expect(err).to.exist();
                    expect(err.code).to.eql("ERR_NODE_NOT_STARTED");
                    done();
                });
            });

            node.stop();
        });
    });
});

describe("getPeerInfo", () => {
    const getPeerInfo = require(srcPath("get_peer_info"));

    it("should callback with error for invalid string multiaddr", (done) => {
        getPeerInfo(null)("INVALID MULTIADDR", (err) => {
            expect(err).to.exist();
            expect(err.code).to.eql("ERR_INVALID_MULTIADDR");
            done();
        });
    });

    it("should callback with error for invalid non-peer multiaddr", (done) => {
        getPeerInfo(null)("/ip4/8.8.8.8/tcp/1080", (err) => {
            expect(err).to.exist();
            expect(err.code).to.equal("ERR_INVALID_MULTIADDR");
            done();
        });
    });

    it("should callback with error for invalid non-peer multiaddr", (done) => {
        getPeerInfo(null)(undefined, (err) => {
            expect(err).to.exist();
            expect(err.code).to.eql("ERR_INVALID_PEER_TYPE");
            done();
        });
    });
});
