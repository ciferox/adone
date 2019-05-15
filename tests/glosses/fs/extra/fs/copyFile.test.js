const {
    is,
    fs: fse,
    path, 
    std: { fs, os }
} = adone;

// Only availible in Node 8.5+
if (is.function(fs.copyFile)) {
    describe("fs.copyFile", () => {
        let TEST_DIR;

        beforeEach((done) => {
            TEST_DIR = path.join(os.tmpdir(), "fs-extra", "fs-copyfile");
            fse.emptyDir(TEST_DIR, done);
        });

        afterEach((done) => fse.remove(TEST_DIR, done));

        it("supports promises", () => {
            const src = path.join(TEST_DIR, "init.txt");
            const dest = path.join(TEST_DIR, "copy.txt");
            fse.writeFileSync(src, "hello");
            return fse.copyFile(src, dest).then(() => {
                const data = fse.readFileSync(dest, "utf8");
                assert.strictEqual(data, "hello");
            });
        });
    });
}
