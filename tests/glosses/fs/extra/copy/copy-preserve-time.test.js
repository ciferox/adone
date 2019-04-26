const {
    fs2: fs
} = adone;

const os = require("os");
const path = require("path");
const { utimes, copy } = fs;
const nodeVersion = process.versions.node;
const nodeVersionMajor = parseInt(nodeVersion.split(".")[0], 10);

if (process.arch === "ia32") {
    console.warn("32 bit arch; skipping copy timestamp tests");
}
if (nodeVersionMajor < 8) {
    console.warn(`old node version (v${nodeVersion}); skipping copy timestamp tests`);
}

const describeIfPractical = (process.arch === "ia32" || nodeVersionMajor < 8) ? describe.skip : describe;

describeIfPractical("copy() - preserve timestamp", () => {
    let TEST_DIR; let SRC; let DEST; let FILES;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "copy-preserve-timestamp");
        SRC = path.join(TEST_DIR, "src");
        DEST = path.join(TEST_DIR, "dest");
        FILES = ["a-file", path.join("a-folder", "another-file"), path.join("a-folder", "another-folder", "file3")];
        FILES.forEach((f) => fs.createFileSync(path.join(SRC, f)));
        done();
    });

    afterEach((done) => fs.remove(TEST_DIR, done));

    describe("> when timestamp option is true", () => {
        it("should have the same timestamps on copy", (done) => {
            copy(SRC, DEST, { preserveTimestamps: true }, () => {
                FILES.forEach(testFile({ preserveTimestamps: true }));
                done();
            });
        });
    });

    function testFile(options) {
        return function (file) {
            const a = path.join(SRC, file);
            const b = path.join(DEST, file);
            const fromStat = fs.statSync(a);
            const toStat = fs.statSync(b);
            if (options.preserveTimestamps) {
                // https://github.com/nodejs/io.js/issues/2069
                if (process.platform !== "win32") {
                    assert.strictEqual(toStat.mtime.getTime(), fromStat.mtime.getTime());
                    assert.strictEqual(toStat.atime.getTime(), fromStat.atime.getTime());
                } else {
                    assert.strictEqual(toStat.mtime.getTime(), utimes.timeRemoveMillis(fromStat.mtime.getTime()));
                    assert.strictEqual(toStat.atime.getTime(), utimes.timeRemoveMillis(fromStat.atime.getTime()));
                }
            } else {
                assert.notStrictEqual(toStat.mtime.getTime(), fromStat.mtime.getTime());
                // the access time might actually be the same, so check only modification time
            }
        };
    }
});
