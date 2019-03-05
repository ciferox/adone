const parallel = require("async/parallel");
const series = require("async/series");
const createNode = require("../utils/create_node");
const tryEcho = require("../utils/try_echo");
const echo = require("../utils/echo");

const {
    p2p: { spdy, multiplex },
    stream: { pull2: { mplex: pMplex } }
} = adone;

const test = function (nodeA, nodeB, callback) {
    nodeA.dialProtocol(nodeB.peerInfo, "/echo/1.0.0", (err, conn) => {
        expect(err).to.not.exist();
        tryEcho(conn, callback);
    });
};

const teardown = function (nodeA, nodeB, callback) {
    parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
    ], callback);
};

describe("stream muxing", () => {
    it("spdy only", (done) => {
        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        };

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("mplex only", (done) => {
        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        };

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("pMplex only", (done) => {
        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [pMplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [pMplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        };

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("spdy + mplex", function (done) {
        this.timeout(5000);

        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy, multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        };

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("mplex + pull-mplex", function (done) {
        this.timeout(5000);

        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [pMplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        }

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("spdy + mplex in reverse muxer order", function (done) {
        this.timeout(5 * 1000);

        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy, multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex, spdy]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        }

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("spdy + pull-mplex in reverse muxer order", function (done) {
        this.timeout(5 * 1000);

        let nodeA;
        let nodeB;

        const setup = function (callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy, pMplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [pMplex, spdy]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        };

        series([
            (cb) => setup(cb),
            (cb) => test(nodeA, nodeB, cb),
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });

    it("one without the other fails to establish a muxedConn", function (done) {
        this.timeout(5 * 1000);

        let nodeA;
        let nodeB;

        function setup(callback) {
            parallel([
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [spdy]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeA = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                }),
                (cb) => createNode("/ip4/0.0.0.0/tcp/0", {
                    modules: {
                        streamMuxer: [multiplex]
                    }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    nodeB = node;
                    node.handle("/echo/1.0.0", echo);
                    node.start(cb);
                })
            ], callback);
        }

        series([
            (cb) => setup(cb),
            (cb) => {
                // it will just 'warm up a conn'
                expect(Object.keys(nodeA._switch.muxers)).to.have.length(1);
                expect(Object.keys(nodeB._switch.muxers)).to.have.length(1);

                nodeA.dial(nodeB.peerInfo, (err) => {
                    expect(err).to.not.exist();
                    expect(nodeA._switch.connection.getAll()).to.have.length(0);
                    cb();
                });
            },
            (cb) => teardown(nodeA, nodeB, cb)
        ], done);
    });
});
