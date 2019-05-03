const series = require("async/series");
const ipfsExec = require("../utils/ipfs_exec");

const parallel = require("async/parallel");

const {
    ipfs: { ipfsdCtl }
} = adone;

const df = ipfsdCtl.create({ type: "js" });

const config = {
    Bootstrap: [],
    Discovery: {
        MDNS: {
            Enabled:
                false
        }
    }
};

describe("swarm", () => {
    let bMultiaddr;
    let ipfsA;

    const nodes = [];
    before(function (done) {
        // CI takes longer to instantiate the daemon, so we need to increase the
        // timeout for the before step
        this.timeout(80 * 1000);

        series([
            (cb) => {
                df.spawn({
                    exec: adone.getPath("lib/ipfs/main/cli/bin.js"),
                    config,
                    initOptions: { bits: 512 }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    ipfsA = ipfsExec(node.repoPath);
                    nodes.push(node);
                    cb();
                });
            },
            (cb) => {
                df.spawn({
                    exec: adone.getPath("lib/ipfs/main/cli/bin.js"),
                    config,
                    initOptions: { bits: 512 }
                }, (err, node) => {
                    expect(err).to.not.exist();
                    node.api.id((err, id) => {
                        expect(err).to.not.exist();
                        bMultiaddr = id.addresses[0];
                        nodes.push(node);
                        cb();
                    });
                });
            }
        ], done);
    });

    after((done) => parallel(nodes.map((node) => (cb) => node.stop(cb)), done));

    describe("daemon on (through http-api)", function () {
        this.timeout(60 * 1000);

        it("connect", () => {
            return ipfsA("swarm", "connect", bMultiaddr).then((out) => {
                expect(out).to.eql(`connect ${bMultiaddr} success\n`);
            });
        });

        it("peers", () => {
            return ipfsA("swarm peers").then((out) => {
                expect(out).to.eql(`${bMultiaddr}\n`);
            });
        });

        it("addrs", () => {
            return ipfsA("swarm addrs").then((out) => {
                expect(out).to.have.length.above(1);
            });
        });

        it("addrs local", () => {
            return ipfsA("swarm addrs local").then((out) => {
                expect(out).to.have.length.above(1);
            });
        });

        it("disconnect", () => {
            return ipfsA("swarm", "disconnect", bMultiaddr).then((out) => {
                expect(out).to.eql(
                    `disconnect ${bMultiaddr} success\n`
                );
            });
        });

        it("`peers` should not throw after `disconnect`", () => {
            return ipfsA("swarm peers").then((out) => {
                expect(out).to.be.empty();
            });
        });
    });
});
