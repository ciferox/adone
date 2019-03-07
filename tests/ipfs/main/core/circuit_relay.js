const parallel = require("async/parallel");
const series = require("async/series");
const waterfall = require("async/waterfall");
const crypto = require("crypto");

const {
    is,
    multiformat: { multiaddr },
    ipfs: { IPFS, ipfsdCtl }
} = adone;

const procDf = ipfsdCtl.create({ type: "proc", exec: IPFS });

const baseConf = {
    Bootstrap: [],
    Addresses: {
        API: "/ip4/0.0.0.0/tcp/0",
        Gateway: "/ip4/0.0.0.0/tcp/0"
    },
    Discovery: {
        MDNS: {
            Enabled:
                false
        }
    }
};

const setupInProcNode = function (addrs, hop, callback) {
    if (is.function(hop)) {
        callback = hop;
        hop = false;
    }

    procDf.spawn({
        libp2p: {
            config: {
                relay: {
                    enabled: true,
                    hop: {
                        enabled: hop
                    }
                }
            }
        },
        config: Object.assign({}, baseConf, {
            Addresses: {
                Swarm: addrs
            }
        })
    }, (err, ipfsd) => {
        expect(err).to.not.exist();
        ipfsd.api.id((err, id) => {
            callback(err, { ipfsd, addrs: id.addresses });
        });
    });
};

const wsAddr = (addrs) => addrs.map((a) => a.toString()).find((a) => a.includes("/ws"));
const tcpAddr = (addrs) => addrs.map((a) => a.toString()).find((a) => !a.includes("/ws"));

describe("circuit relay", () => {
    describe("A <-> R <-> B", function () {
        this.timeout(80 * 1000);

        let nodeA;
        let nodeAAddr;
        let nodeB;
        let nodeBAddr;
        let nodeBCircuitAddr;

        let relayNode;

        let nodes;
        before("create and connect", (done) => {
            parallel([
                (cb) => setupInProcNode([
                    "/ip4/0.0.0.0/tcp/0",
                    "/ip4/0.0.0.0/tcp/0/ws"
                ], true, cb),
                (cb) => setupInProcNode(["/ip4/0.0.0.0/tcp/0"], cb),
                (cb) => setupInProcNode(["/ip4/0.0.0.0/tcp/0/ws"], cb)
            ], (err, res) => {
                expect(err).to.not.exist();
                nodes = res.map((node) => node.ipfsd);

                relayNode = res[0].ipfsd;

                nodeAAddr = tcpAddr(res[1].addrs);
                nodeA = res[1].ipfsd.api;

                nodeBAddr = wsAddr(res[2].addrs);

                nodeB = res[2].ipfsd.api;
                nodeBCircuitAddr = `/p2p-circuit/ipfs/${multiaddr(nodeBAddr).getPeerId()}`;

                // ensure we have an address string
                expect(nodeAAddr).to.be.a("string");
                expect(nodeBAddr).to.be.a("string");
                expect(nodeBCircuitAddr).to.be.a("string");

                series([
                    (cb) => relayNode.api.swarm.connect(nodeAAddr, cb),
                    (cb) => relayNode.api.swarm.connect(nodeBAddr, cb),
                    (cb) => setTimeout(cb, 1000),
                    (cb) => nodeA.swarm.connect(nodeBCircuitAddr, cb)
                ], done);
            });
        });

        after((done) => parallel(nodes.map((node) => (cb) => node.stop(cb)), done));

        it("should transfer", (done) => {
            const data = crypto.randomBytes(128);
            waterfall([
                (cb) => nodeA.add(data, cb),
                (res, cb) => nodeB.cat(res[0].hash, cb),
                (buffer, cb) => {
                    expect(buffer).to.deep.equal(data);
                    cb();
                }
            ], done);
        });
    });
});
