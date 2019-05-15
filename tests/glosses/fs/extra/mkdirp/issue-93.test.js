const {
    fs: fse,
    path,
    std: { os }
} = adone;

describe("mkdirp: issue-93, win32, when drive does not exist, it should return a cleaner error", () => {
    let TEST_DIR;

    // only seems to be an issue on Windows.
    if (process.platform !== "win32") {
        return; 
    }

    before((done) => {
        TEST_DIR = path.join(os.tmpdir(), "tests", "fs-extra", "mkdirp-issue-93");
        fse.emptyDir(TEST_DIR, (err) => {
            assert.ifError(err);
            done();
        });
    });

    it("should return a cleaner error than inifinite loop, stack crash", (done) => {
        const file = "R:\\afasd\\afaff\\fdfd"; // hopefully drive 'r' does not exist on appveyor
        fse.mkdirp(file, (err) => {
            assert.strictEqual(err.code, "ENOENT");

            try {
                fse.mkdirpSync(file);
            } catch (err) {
                assert.strictEqual(err.code, "ENOENT");
            }

            done();
        });
    });
});
