import sinon from "sinon";
import fs from "fs";

const {
    std: { path }
} = adone;

describe("fs", "readChunk", "file descriptor", () => {
    const srcPath = path.join(adone.ROOT_PATH, "lib", "glosses", "fs", "read_chunk");
    const INVALID_FD = -1;
    const TEST_PATH = "garbage";

    before(() => {
        // We need to spy before requiring to get our spies into the promisified `fs`
        sinon.stub(fs, "open").callThrough();
        sinon.spy(fs, "close");

        sinon.stub(fs, "openSync").callThrough();
        sinon.spy(fs, "closeSync");
    });

    it("closes the file descriptor when reading fails", async () => {
        const readChunk = require(srcPath).default;
        const fsOpenStub = fs.open.withArgs(TEST_PATH, "r", sinon.match.func).yields(undefined, INVALID_FD);

        await assert.throws(async () => readChunk(TEST_PATH, 0, 4), Error);
        assert.isTrue(fsOpenStub.calledOnce);
        assert.isTrue(fs.close.withArgs(INVALID_FD).calledOnce);
    });

    it("synchronously closes the file descriptor when reading fails", () => {
        const readChunk = require(srcPath).default;
        const fsOpenSyncStub = fs.openSync.withArgs(TEST_PATH, "r").returns(INVALID_FD);

        assert.throws(() => readChunk.sync(TEST_PATH, 0, 4), Error);
        assert.isTrue(fsOpenSyncStub.calledOnce);
        assert.isTrue(fs.closeSync.withArgs(INVALID_FD).calledOnce);
    });
});
