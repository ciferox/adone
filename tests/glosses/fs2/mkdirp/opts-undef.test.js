import { srcPath } from "../helpers";
const {
    fs2: fse
} = adone;

const fs = require("fs");
const os = require("os");
const path = require("path");
const mkdirp = require(srcPath("mkdirp")).default;

describe("mkdirp / opts-undef", () => {
    let TEST_DIR;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "mkdirp");
        fse.emptyDir(TEST_DIR, done);
    });

    // https://github.com/substack/node-mkdirp/issues/45
    it("should not hang", (done) => {
        const newDir = path.join(TEST_DIR, "doest", "not", "exist");
        assert(!fs.existsSync(newDir));

        mkdirp(newDir, undefined, (err) => {
            assert.ifError(err);
            assert(fs.existsSync(newDir));
            done();
        });
    });
});
