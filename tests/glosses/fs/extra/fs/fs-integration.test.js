const {
    fs: fse,
    path,
    std: { fs, os }
} = adone;

describe("native fs", () => {
    let TEST_DIR;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "native-fs");
        fse.emptyDir(TEST_DIR, done);
    });

    afterEach((done) => fse.remove(TEST_DIR, done));

    it("should use native fs methods", () => {
        const file = path.join(TEST_DIR, "write.txt");
        fse.writeFileSync(file, "hello");
        const data = fse.readFileSync(file, "utf8");
        assert.strictEqual(data, "hello");
    });

    it("should have native fs constants", () => {
    // Node.js v0.12 / IO.js
        if ("F_OK" in fs) {
            assert.strictEqual(fse.F_OK, fs.F_OK);
        }
    });
});
