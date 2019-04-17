const Prepare = require("./utils/prepare");

const PEER_COUNT = 3;

describe("p2p", "connection manager", () => {
    describe("default", () => {
        const prepare = Prepare(3, { pollInterval: 1000 });
        before(prepare.before);
        after(prepare.after);

        it("does not kick out any peer", (done) => {
            prepare.connManagers().forEach((connManager) => {
                connManager.on("disconnected", () => {
                    throw new Error("should not have disconnected");
                });
            });
            setTimeout(done, 1900);
        });
    });

    describe("maxData", () => {
        const prepare = Prepare(PEER_COUNT, {
            maxData: 100,
            minPeers: 1
        });
        before(prepare.create);
        after(prepare.after);

        it("kicks out peer after maxData reached", (done) => {
            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err) => {
                expect(err).to.not.exist();
            });
        });
    });

    describe("maxEventLoopDelay", () => {
        const debug = function (what) {
            if (what === 0) {
                // never true but the compiler doesn't know that
                console.log("WHAT");
            }
        };

        const prepare = Prepare(PEER_COUNT, [{
            pollInterval: 1000,
            maxEventLoopDelay: 5,
            minPeers: 1
        }]);
        before(prepare.create);
        after(prepare.after);

        it("kicks out peer after maxEventLoopDelay reached", (done) => {
            let stopped = false;

            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                stopped = true;
                done();
            });
            const makeDelay = function () {
                let sum = 0;
                for (let i = 0; i < 1000000; i++) {
                    sum += Math.random();
                }
                debug(sum);

                if (!stopped) {
                    setTimeout(makeDelay, 0);
                }
            };
            prepare.tryConnectAll((err) => {
                expect(err).to.not.exist();
                makeDelay();
            });

        });
    });

    describe("maxPeers", () => {
        const prepare = Prepare(PEER_COUNT, [{
            maxPeersPerProtocol: {
                tcp: 1
            }
        }]);
        before(prepare.create);
        after(prepare.after);

        it("kicks out peers in excess", (done) => {
            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err) => {
                expect(err).to.not.exist();
            });
        });
    });

    describe("maxPeers", () => {
        const prepare = Prepare(PEER_COUNT, [{
            maxPeers: 1
        }]);
        before(prepare.create);
        after(prepare.after);

        it("kicks out peers in excess", function (done) {
            this.timeout(10000);

            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err, eachNodeConnections) => {
                expect(err).to.not.exist();
            });
        });
    });



    describe("maxReceivedData", () => {
        const prepare = Prepare(PEER_COUNT, {
            maxReceivedData: 50,
            minPeers: 1
        });
        before(prepare.create);
        after(prepare.after);

        it("kicks out peer after maxReceivedData reached", function (done) {
            this.timeout(10000);

            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err, eachNodeConnections) => {
                expect(err).to.not.exist();
            });
        });
    });


    describe("maxSentData", () => {
        const prepare = Prepare(PEER_COUNT, [{
            maxSentData: 50,
            minPeers: 1
        }]);
        before(prepare.create);
        after(prepare.after);

        it("kicks out peer after maxSentData reached", function (done) {
            this.timeout(10000);

            let disconnects = 0;
            const manager = prepare.connManagers()[0];
            manager.on("disconnected", () => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err, eachNodeConnections) => {
                expect(err).to.not.exist();
            });
        });
    });


    describe.todo("setPeerValue", () => {
        const prepare = Prepare(PEER_COUNT, [{
            maxPeers: 1,
            defaultPeerValue: 0
        }]);
        before(prepare.create);
        after(prepare.after);

        it("kicks out lower valued peer first", (done) => {
            let disconnects = 0;
            let firstConnectedPeer;
            const manager = prepare.connManagers()[0];

            manager.once("connected", (peerId) => {
                if (!firstConnectedPeer) {
                    firstConnectedPeer = peerId;
                    manager.setPeerValue(peerId, 1);
                }
            });

            manager.on("disconnected", (peerId) => {
                disconnects++;
                expect(disconnects).to.be.most(PEER_COUNT - 2);
                expect(peerId).to.not.be.equal(firstConnectedPeer);
                manager.removeAllListeners("disconnected");
                done();
            });

            prepare.tryConnectAll((err) => {
                expect(err).to.not.exist();
            });
        });
    });
});
