const {
    fs2: fse
} = adone;

const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * global afterEach, beforeEach, describe, it
 */

describe("+ emptyDir()", () => {
    let TEST_DIR;

    beforeEach(() => {
        TEST_DIR = path.join(os.tmpdir(), "test-fs-extra", "empty-dir");
        if (fs.existsSync(TEST_DIR)) {
            fse.removeSync(TEST_DIR);
        }
        fse.mkdirpSync(TEST_DIR);
    });

    afterEach((done) => fse.remove(TEST_DIR, done));

    describe("> when directory exists and contains items", () => {
        it("should delete all of the items", () => {
            // verify nothing
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 0);
            fse.createFileSync(path.join(TEST_DIR, "some-file"));
            fse.createFileSync(path.join(TEST_DIR, "some-file-2"));
            fse.mkdirpSync(path.join(TEST_DIR, "some-dir"));
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 3);

            fse.emptyDirSync(TEST_DIR);
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 0);
        });
    });

    describe("> when directory exists and contains no items", () => {
        it("should do nothing", () => {
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 0);
            fse.emptyDirSync(TEST_DIR);
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 0);
        });
    });

    describe("> when directory does not exist", () => {
        it("should create it", () => {
            fse.removeSync(TEST_DIR);
            assert(!fs.existsSync(TEST_DIR));
            fse.emptyDirSync(TEST_DIR);
            assert.strictEqual(fs.readdirSync(TEST_DIR).length, 0);
        });
    });
});
