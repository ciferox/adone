const hat = require("hat");
const ipfsExec = require("./ipfs_exec");
const clean = require("./clean");

const {
    ipfs: { ipfsdCtl },
    std: { os, path }
} = adone;

const df = ipfsdCtl.create();

const off = function (tests) {
    describe("daemon off (directly to core)", () => {
        const thing = {};
        let repoPath;

        before(function () {
            this.timeout(60 * 1000);

            repoPath = `${os.tmpdir()}/ipfs-${hat()}`;
            thing.ipfs = ipfsExec(repoPath);
            thing.ipfs.repoPath = repoPath;
            return thing.ipfs("init");
        });

        after(function (done) {
            this.timeout(20 * 1000);
            clean(repoPath);
            setImmediate(done);
        });

        tests(thing);
    });
};

const on = function (tests) {
    describe("daemon on (through http-api)", () => {
        const thing = {};

        let ipfsd;
        before(function (done) {
            // CI takes longer to instantiate the daemon,
            // so we need to increase the timeout for the
            // before step
            this.timeout(60 * 1000);

            df.spawn({
                type: "js",
                exec: path.join(adone.ROOT_PATH, "lib/ipfs/ipfs/cli/bin.js"),
                initOptions: { bits: 512 },
                config: { Bootstrap: [] }
            }, (err, node) => {
                expect(err).to.not.exist();
                ipfsd = node;
                thing.ipfs = ipfsExec(node.repoPath);
                thing.ipfs.repoPath = node.repoPath;
                done();
            });
        });

        after(function (done) {
            this.timeout(15 * 1000);
            ipfsd.stop(done);
        });

        tests(thing);
    });
};

/**
 * CLI Utility to run the tests offline (daemon off) and online (daemon on)
 */
exports = module.exports = (tests) => {
    off(tests);
    on(tests);
};

exports.off = off;
exports.on = on;
