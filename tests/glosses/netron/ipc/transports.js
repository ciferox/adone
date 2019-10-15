const parallel = require("async/parallel");
const series = require("async/series");

const createNode = require("./utils/create-node.js");
const tryEcho = require("./utils/try-echo");
const echo = require("./utils/echo");

describe("transports", () => {
    describe("TCP only", () => {
        let nodeA;
        let nodeB;

        before((done) => {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], done);
        });

        after((done) => {
            parallel([
                (cb) => nodeA.stop(cb),
                (cb) => nodeB.stop(cb)
            ], done);
        });

        it("nodeA.dial nodeB using PeerInfo without proto (warmup)", (done) => {
            nodeA.dial(nodeB.peerInfo, (err) => {
                expect(err).to.not.exist();

                // Some time for Identify to finish
                setTimeout(check, 500);

                function check() {
                    parallel([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(err).to.not.exist();
                            expect(Object.keys(peers)).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(err).to.not.exist();
                            expect(Object.keys(peers)).to.have.length(1);
                            cb();
                        }
                    ], done);
                }
            });
        });

        it("nodeA.dial nodeB using PeerInfo", (done) => {
            nodeA.dialProtocol(nodeB.peerInfo, "/echo/1.0.0", (err, conn) => {
                expect(err).to.not.exist();

                tryEcho(conn, done);
            });
        });

        it("nodeA.hangUp nodeB using PeerInfo (first)", (done) => {
            nodeA.hangUp(nodeB.peerInfo, (err) => {
                expect(err).to.not.exist();
                setTimeout(check, 500);

                function check() {
                    parallel([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeB._switch.connection.getAll()).to.have.length(0);
                            cb();
                        }
                    ], done);
                }
            });
        });

        it("nodeA.dialProtocol nodeB using multiaddr", (done) => {
            nodeA.dialProtocol(nodeB.peerInfo.multiaddrs.toArray()[0], "/echo/1.0.0", (err, conn) => {
                // Some time for Identify to finish
                setTimeout(check, 500);

                function check() {
                    expect(err).to.not.exist();
                    series([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(1);
                            cb();
                        }
                    ], () => tryEcho(conn, done));
                }
            });
        });

        it("nodeA.hangUp nodeB using multiaddr (second)", (done) => {
            nodeA.hangUp(nodeB.peerInfo.multiaddrs.toArray()[0], (err) => {
                expect(err).to.not.exist();
                setTimeout(check, 500);

                function check() {
                    parallel([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeB._switch.connection.getAll()).to.have.length(0);
                            cb();
                        }
                    ], done);
                }
            });
        });

        it("nodeA.dialProtocol nodeB using PeerId", (done) => {
            nodeA.dialProtocol(nodeB.peerInfo.id, "/echo/1.0.0", (err, conn) => {
                // Some time for Identify to finish
                setTimeout(check, 500);

                function check() {
                    expect(err).to.not.exist();
                    series([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(1);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(1);
                            cb();
                        }
                    ], () => tryEcho(conn, done));
                }
            });
        });

        it("nodeA.hangUp nodeB using PeerId (third)", (done) => {
            nodeA.hangUp(nodeB.peerInfo.id, (err) => {
                expect(err).to.not.exist();
                setTimeout(check, 500);

                function check() {
                    parallel([
                        (cb) => {
                            const peers = nodeA.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeA._switch.connection.getAll()).to.have.length(0);
                            cb();
                        },
                        (cb) => {
                            const peers = nodeB.peerBook.getAll();
                            expect(Object.keys(peers)).to.have.length(1);
                            expect(nodeB._switch.connection.getAll()).to.have.length(0);
                            cb();
                        }
                    ], done);
                }
            });
        });

        it(".dialFSM check conn and close", (done) => {
            nodeA.dialFSM(nodeB.peerInfo, (err, connFSM) => {
                expect(err).to.not.exist();

                connFSM.once("muxed", () => {
                    expect(
                        nodeA._switch.connection.getAllById(nodeB.peerInfo.id.toB58String())
                    ).to.have.length(1);

                    connFSM.once("error", done);
                    connFSM.once("close", () => {
                        // ensure the connection is closed
                        expect(
                            nodeA._switch.connection.getAllById(nodeB.peerInfo.id.toB58String())
                        ).to.have.length(0);
                        done();
                    });

                    connFSM.close();
                });
            });
        });

        it(".dialFSM with a protocol, do an echo and close", (done) => {
            nodeA.dialFSM(nodeB.peerInfo, "/echo/1.0.0", (err, connFSM) => {
                expect(err).to.not.exist();
                connFSM.once("connection", (conn) => {
                    expect(
                        nodeA._switch.connection.getAllById(nodeB.peerInfo.id.toB58String())
                    ).to.have.length(1);
                    tryEcho(conn, () => {
                        connFSM.close();
                    });
                });
                connFSM.once("error", done);
                connFSM.once("close", () => {
                    // ensure the connection is closed
                    expect(
                        nodeA._switch.connection.getAllById(nodeB.peerInfo.id.toB58String())
                    ).to.have.length(0);
                    done();
                });
            });
        });
    });
});
