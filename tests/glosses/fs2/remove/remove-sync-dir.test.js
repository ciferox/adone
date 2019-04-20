const {
    fs2: fse
} = adone;

const fs = require("fs");
const os = require("os");
const path = require("path");

describe("remove/sync", () => {
    let TEST_DIR;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "remove-sync");
        fse.emptyDir(TEST_DIR, done);
    });

    describe("+ removeSync()", () => {
        it("should delete directories and files synchronously", () => {
            assert(fs.existsSync(TEST_DIR));
            fs.writeFileSync(path.join(TEST_DIR, "somefile"), "somedata");
            fse.removeSync(TEST_DIR);
            assert(!fs.existsSync(TEST_DIR));
        });

        it("should delete an empty directory synchronously", () => {
            assert(fs.existsSync(TEST_DIR));
            fse.removeSync(TEST_DIR);
            assert(!fs.existsSync(TEST_DIR));
        });
    });
});
