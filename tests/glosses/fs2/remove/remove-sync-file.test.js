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
        it("should delete a file synchronously", () => {
            const file = path.join(TEST_DIR, "file");
            fs.writeFileSync(file, "hello");
            assert(fs.existsSync(file));
            fse.removeSync(file);
            assert(!fs.existsSync(file));
        });
    });
});
