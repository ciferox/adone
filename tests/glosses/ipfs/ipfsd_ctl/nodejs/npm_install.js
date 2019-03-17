const {
    std: { fs, path, os }
} = adone;

const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const isWindows = os.platform() === "win32";

const types = [
    "js",
    "go"
];

types.forEach((type) => {
    describe("ipfs executable path", () => {
        let tmp;
        let appName;
        let oldPath;

        before(() => {
            tmp = os.tmpdir();

            appName = type === "js"
                ? "bin.js"
                : isWindows ? "ipfs.exe" : "ipfs";

            oldPath = process.env.testpath;

            // fake __dirname
            process.env.testpath = path.join(tmp, "ipfsd-ctl-test/node_modules/ipfsd-ctl/lib");
        });

        after(() => {
            process.env.testpath = oldPath;
        });

        it("has the correct path when installed with npm3", (done) => {
            const execPath = type === "js"
                ? "ipfsd-ctl-test/node_modules/ipfs/src/cli"
                : "ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs";

            const npm3Path = path.join(tmp, execPath);

            mkdirp(npm3Path, (err) => {
                expect(err).to.not.exist();

                fs.writeFileSync(path.join(npm3Path, appName));
                delete require.cache[require.resolve("../src/ipfsd-daemon.js")];
                const Daemon = require("../src/ipfsd-daemon.js");

                const node = new Daemon({ type });
                expect(node.exec)
                    .to.eql(path.join(tmp, `${execPath}/${appName}`));

                rimraf(path.join(tmp, "ipfsd-ctl-test"), done);
            });
        });

        it("has the correct path when installed with npm2", (done) => {
            const execPath = type === "js"
                ? "ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/ipfs/src/cli"
                : "ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs";

            const npm2Path = path.join(tmp, execPath);

            mkdirp(npm2Path, (err) => {
                expect(err).to.not.exist();

                fs.writeFileSync(path.join(npm2Path, appName));
                delete require.cache[require.resolve("../src/ipfsd-daemon.js")];
                const Daemon = require("../src/ipfsd-daemon.js");

                const node = new Daemon({ type });
                expect(node.exec)
                    .to.eql(path.join(tmp, `${execPath}/${appName}`));

                rimraf(path.join(tmp, "ipfsd-ctl-test"), done);
            });
        });
    });
});
