const goenv = require("go-platform");

const {
    is,
    ipfs: { go },
    std: { fs, path }
} = adone;

const GO_IPFS_PATH = path.resolve(adone.realm.getRootRealm().env.OPT_PATH, "go-ipfs");

// These tests won't work with promises, wrap the download function to a callback
const download = function (version, platform, arch, callback) {
    if (is.function(version) || !version) {
        callback = version || callback;
        version = null;
    }

    if (is.function(platform) || !platform) {
        callback = callback || platform;
        platform = null;
    }

    if (is.function(arch) || !arch) {
        callback = callback || arch;
        arch = null;
    }

    callback = callback || ((err, res) => {
        if (err) {
            throw err;
        }
    });

    go.download(version, platform, arch)
        .then((artifact) => callback(null, artifact))
        .catch((err) => callback(err));
};

describe("go executable", function () {
    this.timeout(80 * 1000);

    it("Ensure ipfs gets downloaded (current version and platform)", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);

        download((err, res) => {
            assert.notExists(err);
            assert.isTrue(res.fileName.includes(`ipfs_v${go.defaultVersion}_${goenv.GOOS}-${goenv.GOARCH}`), "Returns the correct filename");

            assert.isTrue(res.installPath === path.resolve(adone.realm.getRootRealm().env.OPT_PATH, "go-ipfs") + path.sep, "Returns the correct output path");

            fs.stat(GO_IPFS_PATH, (err, stats) => {
                assert.notExists(err, "go-ipfs should stat without error");
                assert.ok(stats, "go-ipfs was downloaded");
                done();
            });
        });
    });

    it("Ensure Windows version gets downloaded", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);

        download(`v${go.defaultVersion}`, "windows", (err, res) => {
            assert.notExists(err);
            assert.isTrue(res.fileName.includes(`ipfs_v${go.defaultVersion}_windows-${goenv.GOARCH}`), "Returns the correct filename");
            assert.isTrue(res.installPath === GO_IPFS_PATH + path.sep, "Returns the correct output path");

            fs.stat(GO_IPFS_PATH, (err, stats) => {
                assert.notExists(err, "go-ipfs for windows should stat without error");
                assert.ok(stats, "go-ipfs for windows was downloaded");
                // Check executable
                fs.stat(path.join(GO_IPFS_PATH, "ipfs.exe"), (err2, stats2) => {
                    assert.notExists(err2, "windows bin should stat without error");
                    assert.ok(stats2, "windows bin was downloaded");
                    done();
                });
            });
        });
    });

    it("Ensure Linux version gets downloaded", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);
        download(`v${go.defaultVersion}`, "linux", (err, res) => {
            assert.notExists(err);
            assert.isTrue(res.fileName.includes(`ipfs_v${go.defaultVersion}_linux-${goenv.GOARCH}`), "Returns the correct filename");
            assert.isTrue(res.installPath === GO_IPFS_PATH + path.sep, "Returns the correct output path");

            fs.stat(GO_IPFS_PATH, (err, stats) => {
                assert.notExists(err, "go-ipfs for linux should stat without error");
                assert.ok(stats, "go-ipfs for linux was downloaded");
                // Check executable
                fs.stat(path.join(GO_IPFS_PATH, "ipfs"), (err2, stats2) => {
                    assert.notExists(err2, "linux bin should stat without error");
                    assert.ok(stats2, "linux bin was downloaded");
                    done();
                });
            });
        });
    });

    it("Ensure OSX version gets downloaded", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);
        download(`v${go.defaultVersion}`, "darwin", (err, res) => {
            assert.notExists(err);
            assert.isTrue(res.fileName.includes(`ipfs_v${go.defaultVersion}_darwin-${goenv.GOARCH}`), "Returns the correct filename");
            assert.isTrue(res.installPath === GO_IPFS_PATH + path.sep, "Returns the correct output path");

            fs.stat(GO_IPFS_PATH, (err, stats) => {
                assert.notExists(err, "go-ipfs for OSX should stat without error");
                assert.ok(stats, "go-ipfs OSX linux was downloaded");
                // Check executable
                fs.stat(path.join(GO_IPFS_PATH, "ipfs"), (err2, stats2) => {
                    assert.notExists(err2, "OSX bin should stat without error");
                    assert.ok(stats2, "OSX bin was downloaded");
                    done();
                });
            });
        });
    });

    it("Ensure TARGET_OS, TARGET_VERSION and TARGET_ARCH version gets downloaded", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);

        process.env.TARGET_OS = "windows";
        process.env.TARGET_VERSION = `v${go.defaultVersion}`;

        // TODO solve this https://github.com/ipfs/distributions/issues/165
        // process.env.TARGET_ARCH = '386'
        process.env.TARGET_ARCH = "amd64";

        download((err, res) => {
            assert.notExists(err);
            assert.isTrue(res.fileName.includes(`ipfs_${process.env.TARGET_VERSION}_${process.env.TARGET_OS}-${process.env.TARGET_ARCH}`), "Returns the correct filename");
            assert.isTrue(res.installPath === GO_IPFS_PATH + path.sep, "Returns the correct output path");

            fs.stat(GO_IPFS_PATH, (err, stats) => {
                assert.notExists(err, "go-ipfs for windows should stat without error");
                assert.ok(stats, "go-ipfs for windows was downloaded");
                // Check executable
                fs.stat(path.join(GO_IPFS_PATH, "ipfs.exe"), (err2, stats2) => {
                    assert.notExists(err2, "windows bin should stat without error");
                    assert.ok(stats2, "windows bin was downloaded");
                    delete process.env.TARGET_OS;
                    delete process.env.TARGET_VERSION;
                    delete process.env.TARGET_ARCH;
                    done();
                });
            });
        });
    });

    it("Returns an error when version unsupported", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);
        download("bogusversion", "linux", (err) => {
            assert.ok(!is.null(err), "Throws an error");
            assert.ok(err.toString() === "Error: Version 'bogusversion' not available", "Throws the correct error message");
            done();
        });
    });

    it("Returns an error when dist url is 404", async (done) => {
        await adone.fs.rm(GO_IPFS_PATH);
        process.env.GO_IPFS_DIST_URL = "https://dist.ipfs.io/notfound";
        download((err) => {
            assert.ok(err, "Throws an error");
            assert.ok(err.toString().indexOf("Error: 404") > -1, "Throws the correct error message");
            delete process.env.GO_IPFS_DIST_URL;
            done();
        });
    });    
});
