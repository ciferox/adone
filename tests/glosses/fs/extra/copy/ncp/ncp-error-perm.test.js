const {
    fs: fse,
    path,
    std: { fs, os }
} = adone;

// file in reference: https://github.com/jprichardson/node-fs-extra/issues/56

const { copy: ncp } = fse;

// skip test for windows
// eslint-disable globalReturn */
// if (os.platform().indexOf('win') === 0) return
// eslint-enable globalReturn */

describe("ncp / error / dest-permission", () => {
    const TEST_DIR = path.join(os.tmpdir(), "fs-extra", "ncp-error-dest-perm");
    const src = path.join(TEST_DIR, "src");
    const dest = path.join(TEST_DIR, "dest");

    if (os.platform().indexOf("win") === 0) {
        return;
    }

    beforeEach((done) => {
        fse.emptyDir(TEST_DIR, (err) => {
            assert.ifError(err);
            done();
        });
    });

    afterEach((done) => fse.remove(TEST_DIR, done));

    it("should return an error", (done) => {
        const someFile = path.join(src, "some-file");
        fse.outputFileSync(someFile, "hello");

        fse.mkdirpSync(dest);
        fs.chmodSync(dest, parseInt("444", 8));

        const subdest = path.join(dest, "another-dir");

        ncp(src, subdest, (err) => {
            assert(err);
            assert.strictEqual(err.code, "EACCES");
            done();
        });
    });
});
