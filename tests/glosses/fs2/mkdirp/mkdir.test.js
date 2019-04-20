const {
    fs2: fse
} = adone;

const fs = require("fs");
const os = require("os");
const path = require("path");

describe("fs-extra", () => {
    let TEST_DIR;

    beforeEach((done) => {
        TEST_DIR = path.join(os.tmpdir(), "fs-extra", "mkdir");
        fse.emptyDir(TEST_DIR, done);
    });

    afterEach((done) => fse.remove(TEST_DIR, done));

    describe("+ mkdirp()", () => {
        it("should make the directory", (done) => {
            const dir = path.join(TEST_DIR, `tmp-${Date.now()}${Math.random()}`);

            assert(!fs.existsSync(dir));

            fse.mkdirp(dir, (err) => {
                assert.ifError(err);
                assert(fs.existsSync(dir));
                done();
            });
        });

        it("should make the entire directory path", (done) => {
            const dir = path.join(TEST_DIR, `tmp-${Date.now()}${Math.random()}`);
            const newDir = path.join(TEST_DIR, "dfdf", "ffff", "aaa");

            assert(!fs.existsSync(dir));

            fse.mkdirp(newDir, (err) => {
                assert.ifError(err);
                assert(fs.existsSync(newDir));
                done();
            });
        });
    });

    describe("+ mkdirpSync()", () => {
        it("should make the directory", (done) => {
            const dir = path.join(TEST_DIR, `tmp-${Date.now()}${Math.random()}`);

            assert(!fs.existsSync(dir));
            fse.mkdirpSync(dir);
            assert(fs.existsSync(dir));

            done();
        });

        it("should make the entire directory path", (done) => {
            const dir = path.join(TEST_DIR, `tmp-${Date.now()}${Math.random()}`);
            const newDir = path.join(dir, "dfdf", "ffff", "aaa");

            assert(!fs.existsSync(newDir));
            fse.mkdirpSync(newDir);
            assert(fs.existsSync(newDir));

            done();
        });
    });
});
