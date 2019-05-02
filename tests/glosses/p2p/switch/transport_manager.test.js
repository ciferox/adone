const sinon = require("sinon");

const {
    multiformat: { multiaddr },
    p2p: { PeerInfo }
} = adone;

const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "switch", ...args);

const TransportManager = require(srcPath("transport"));

describe("p2p", "switch", "Transport Manager", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe("dialables", () => {
        let peerInfo;
        const dialAllTransport = { filter: (addrs) => addrs };

        beforeEach((done) => {
            PeerInfo.create((err, info) => {
                if (err) {
                    return done(err);
                }
                peerInfo = info;
                done();
            });
        });

        it("should return all transport addresses when peer info has 0 addrs", () => {
            const queryAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                "/ip4/192.168.0.3/tcp/4002",
                "/ip6/::1/tcp/4001"
            ].map((a) => multiaddr(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo);

            expect(dialableAddrs).to.have.length(queryAddrs.length);

            queryAddrs.forEach((qa) => {
                expect(dialableAddrs.some((da) => da.equals(qa))).to.be.true();
            });
        });

        it("should return all transport addresses when we pass no peer info", () => {
            const queryAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                "/ip4/192.168.0.3/tcp/4002",
                "/ip6/::1/tcp/4001"
            ].map((a) => multiaddr(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs);

            expect(dialableAddrs).to.have.length(queryAddrs.length);

            queryAddrs.forEach((qa) => {
                expect(dialableAddrs.some((da) => da.equals(qa))).to.be.true();
            });
        });

        it("should filter our addresses", () => {
            const queryAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                "/ip4/192.168.0.3/tcp/4002",
                "/ip6/::1/tcp/4001"
            ].map((a) => multiaddr(a));

            const ourAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                "/ip4/192.168.0.3/tcp/4002"
            ];

            ourAddrs.forEach((a) => peerInfo.multiaddrs.add(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo);

            expect(dialableAddrs).to.have.length(1);
            expect(dialableAddrs[0].toString()).to.equal("/ip6/::1/tcp/4001");
        });

        it("should filter our addresses with peer ID suffix", () => {
            const queryAddrs = [
                "/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j",
                "/ip4/192.168.0.3/tcp/4002",
                "/ip6/::1/tcp/4001"
            ].map((a) => multiaddr(a));

            const ourAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                `/ip4/192.168.0.3/tcp/4002/ipfs/${peerInfo.id.toB58String()}`
            ];

            ourAddrs.forEach((a) => peerInfo.multiaddrs.add(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo);

            expect(dialableAddrs).to.have.length(1);
            expect(dialableAddrs[0].toString()).to.equal("/ip6/::1/tcp/4001");
        });

        it("should filter out our addrs that start with /ipfs/", () => {
            const queryAddrs = [
                "/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j"
            ].map((a) => multiaddr(a));

            const ourAddrs = [
                "/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z"
            ];

            ourAddrs.forEach((a) => peerInfo.multiaddrs.add(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo);

            expect(dialableAddrs).to.have.length(1);
            expect(dialableAddrs[0]).to.eql(queryAddrs[0]);
        });

        it("should filter our addresses over relay/rendezvous", () => {
            const peerId = peerInfo.id.toB58String();
            const queryAddrs = [
                `/p2p-circuit/ipfs/${peerId}`,
                "/p2p-circuit/ip4/127.0.0.1/tcp/4002",
                "/p2p-circuit/ip4/192.168.0.3/tcp/4002",
                `/p2p-circuit/ip4/127.0.0.1/tcp/4002/ipfs/${peerId}`,
                `/p2p-circuit/ip4/192.168.0.3/tcp/4002/ipfs/${peerId}`,
                "/p2p-circuit/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j",
                "/p2p-circuit/ip4/192.168.0.3/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j",
                `/p2p-webrtc-star/ipfs/${peerId}`,
                `/p2p-websocket-star/ipfs/${peerId}`,
                `/p2p-stardust/ipfs/${peerId}`,
                "/ip6/::1/tcp/4001"
            ].map((a) => multiaddr(a));

            const ourAddrs = [
                "/ip4/127.0.0.1/tcp/4002",
                `/ip4/192.168.0.3/tcp/4002/ipfs/${peerInfo.id.toB58String()}`
            ];

            ourAddrs.forEach((a) => peerInfo.multiaddrs.add(a));

            const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo);

            expect(dialableAddrs).to.have.length(1);
            expect(dialableAddrs[0].toString()).to.equal("/ip6/::1/tcp/4001");
        });
    });

    describe("listen", () => {
        const listener = {
            once() { },
            listen() { },
            removeListener() { },
            getAddrs() { }
        };

        it("should allow for multiple addresses with port 0", (done) => {
            const mockListener = sinon.stub(listener);
            mockListener.listen.callsArg(1);
            mockListener.getAddrs.callsArgWith(0, null, []);
            const mockSwitch = {
                _peerInfo: {
                    multiaddrs: {
                        toArray: () => [
                            multiaddr("/ip4/127.0.0.1/tcp/0"),
                            multiaddr("/ip4/0.0.0.0/tcp/0")
                        ],
                        replace: () => { }
                    }
                },
                _options: {},
                _connectionHandler: () => { },
                transports: {
                    TCP: {
                        filter: (addrs) => addrs,
                        createListener: () => {
                            return mockListener;
                        }
                    }
                }
            };
            const transportManager = new TransportManager(mockSwitch);
            transportManager.listen("TCP", null, null, (err) => {
                expect(err).to.not.exist();
                expect(mockListener.listen.callCount).to.eql(2);
                done();
            });
        });

        it("should filter out equal addresses", (done) => {
            const mockListener = sinon.stub(listener);
            mockListener.listen.callsArg(1);
            mockListener.getAddrs.callsArgWith(0, null, []);
            const mockSwitch = {
                _peerInfo: {
                    multiaddrs: {
                        toArray: () => [
                            multiaddr("/ip4/127.0.0.1/tcp/0"),
                            multiaddr("/ip4/127.0.0.1/tcp/0")
                        ],
                        replace: () => { }
                    }
                },
                _options: {},
                _connectionHandler: () => { },
                transports: {
                    TCP: {
                        filter: (addrs) => addrs,
                        createListener: () => {
                            return mockListener;
                        }
                    }
                }
            };
            const transportManager = new TransportManager(mockSwitch);
            transportManager.listen("TCP", null, null, (err) => {
                expect(err).to.not.exist();
                expect(mockListener.listen.callCount).to.eql(1);
                done();
            });
        });

        it("should account for addresses with no port", (done) => {
            const mockListener = sinon.stub(listener);
            mockListener.listen.callsArg(1);
            mockListener.getAddrs.callsArgWith(0, null, []);
            const mockSwitch = {
                _peerInfo: {
                    multiaddrs: {
                        toArray: () => [
                            multiaddr("/p2p-circuit"),
                            multiaddr("/p2p-websocket-star")
                        ],
                        replace: () => { }
                    }
                },
                _options: {},
                _connectionHandler: () => { },
                transports: {
                    TCP: {
                        filter: (addrs) => addrs,
                        createListener: () => {
                            return mockListener;
                        }
                    }
                }
            };
            const transportManager = new TransportManager(mockSwitch);
            transportManager.listen("TCP", null, null, (err) => {
                expect(err).to.not.exist();
                expect(mockListener.listen.callCount).to.eql(2);
                done();
            });
        });

        it("should filter out addresses with the same, non 0, port", (done) => {
            const mockListener = sinon.stub(listener);
            mockListener.listen.callsArg(1);
            mockListener.getAddrs.callsArgWith(0, null, []);
            const mockSwitch = {
                _peerInfo: {
                    multiaddrs: {
                        toArray: () => [
                            multiaddr("/ip4/127.0.0.1/tcp/8000"),
                            multiaddr("/dnsaddr/libp2p.io/tcp/8000")
                        ],
                        replace: () => { }
                    }
                },
                _options: {},
                _connectionHandler: () => { },
                transports: {
                    TCP: {
                        filter: (addrs) => addrs,
                        createListener: () => {
                            return mockListener;
                        }
                    }
                }
            };
            const transportManager = new TransportManager(mockSwitch);
            transportManager.listen("TCP", null, null, (err) => {
                expect(err).to.not.exist();
                expect(mockListener.listen.callCount).to.eql(1);
                done();
            });
        });
    });
});
