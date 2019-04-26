const {
    fs2: fse,
    path,
    std: { fs, os }
} = adone;

describe("json promise support", () => {
    let TEST_DIR;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "json");
        fse.emptyDir(TEST_DIR, done);
    });

    afterEach((done) => fse.remove(TEST_DIR, done));
    describe("writeJson", () => {
        it("should support promises", () => {
            const obj1 = {
                firstName: "JP",
                lastName: "Richardson"
            };

            const file = path.join(TEST_DIR, "promise.json");
            return fse.writeJson(file, obj1)
                .then(() => {
                    const data = fs.readFileSync(file, "utf8");
                    assert.strictEqual(data, `${JSON.stringify(obj1)}\n`);
                });
        });
    });
});
