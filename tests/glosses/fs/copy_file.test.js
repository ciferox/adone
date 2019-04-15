const {
    error,
    fs,
    std: { path, crypto },
    text
} = adone;

const { copyFile } = fs;

// import crypto from "crypto";
// import importFresh from "import-fresh";
// import clearModule from "clear-module";
// import del from "del";
// import test from "ava";
// import uuid from "uuid";
// import sinon from "sinon";
// import assertDateEqual from "./helpers/assert";
// import { buildEACCES, buildENOSPC, buildENOENT, buildEPERM } from "./helpers/fs-errors";

const _10MB = 10 * 1024 * 1024;

describe("fs", "copyFile", () => {
    before(() => {
        process.chdir(path.dirname(__dirname));
    });

    let tmpPath;
    let srcFilePath;
    let dstFilePath;

    beforeEach(async () => {
        tmpPath = await fs.tmpName();
        await fs.mkdirp(tmpPath);
        srcFilePath = path.join(tmpPath, text.random(8));
        dstFilePath = path.join(tmpPath, text.random(8));
    });

    afterEach(async () => {
        await fs.rm(tmpPath);
    });

    it("should throw if no source path", async () => {
        await assert.throws(async () => copyFile(), error.InvalidArgumentException);
    });

    it("should throw if no destination path", async () => {
        await assert.throws(async () => copyFile("src"), error.InvalidArgumentException);
    });

    it("copy a file", async () => {
        await copyFile(__filename, dstFilePath);
        assert.equal(fs.readFileSync(dstFilePath, "utf8"), fs.readFileSync(__filename, "utf8"));
    });

    it("copy an empty file", async () => {
        await fs.writeFile(srcFilePath, "");
        await copyFile(srcFilePath, dstFilePath);
        assert.equal(fs.readFileSync(dstFilePath, "utf8"), "");
    });

    it("copy big files", async () => {
        const buf = crypto.randomBytes(_10MB);
        fs.writeFileSync(srcFilePath, buf);
        await copyFile(srcFilePath, dstFilePath);
        assert.isTrue(buf.equals(fs.readFileSync(dstFilePath)));
    });

    it("overwrite when enabled", async () => {
        fs.writeFileSync(dstFilePath, "");
        await copyFile(__filename, dstFilePath, { overwrite: true });
        assert.equal(fs.readFileSync(dstFilePath, "utf8"), fs.readFileSync(__filename, "utf8"));
    });

    it("overwrite when options are undefined", async () => {
        fs.writeFileSync(dstFilePath, "");
        await copyFile(__filename, dstFilePath);
        assert.equal(fs.readFileSync(dstFilePath, "utf8"), fs.readFileSync(__filename, "utf8"));
    });

    it("do not overwrite when disabled", async () => {
        fs.writeFileSync(dstFilePath, "");
        await copyFile(__filename, dstFilePath, { overwrite: false });
        assert.equal(fs.readFileSync(dstFilePath, "utf8"), "");
    });

    it("do not create `destination` on unreadable `source`", async () => {
        await assert.throws(async () => copyFile(__dirname, dstFilePath));
        assert.throws(() => {
            fs.statSync(dstFilePath);
        }, /ENOENT/);
    });

    it("do not create `destination` directory on unreadable `source`", async () => {
        await assert.throws(async () => copyFile(__dirname, path.join(tmpPath, `subdir/${text.random(8)}`)));
        assert.throws(() => {
            fs.statSync(path.join(tmpPath, "subdir"));
        }, /ENOENT/);
    });

    it("preserve timestamps", async () => {
        await copyFile(__filename, dstFilePath);
        const licenseStats = fs.lstatSync(__filename);
        const tmpStats = fs.lstatSync(dstFilePath);
        assert.deepEqual(licenseStats.atime, tmpStats.atime);
        assert.deepEqual(licenseStats.mtime, tmpStats.mtime);
    });

    it("preserve mode", async () => {
        await copyFile(__filename, dstFilePath);
        const licenseStats = fs.lstatSync(__filename);
        const tmpStats = fs.lstatSync(dstFilePath);
        assert.equal(licenseStats.mode, tmpStats.mode);
    });

    it("preserve ownership", async () => {
        await copyFile(__filename, dstFilePath);
        const licenseStats = fs.lstatSync(__filename);
        const tmpStats = fs.lstatSync(dstFilePath);
        assert.equal(licenseStats.gid, tmpStats.gid);
        assert.equal(licenseStats.uid, tmpStats.uid);
    });

    it("throw an Error if `source` does not exists", async () => {
        const error = await assert.throws(async () => copyFile("NO_ENTRY", dstFilePath));
        assert.equal(error.code, "ENOENT", error);
    });
});
