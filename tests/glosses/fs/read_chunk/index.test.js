const {
    fs: { readChunk },
    std: { path }
} = adone;

describe("fs", "readChunk", () => {
    const FIXTURE_PATH = path.join(__dirname, "..", "fixtures", "copy", "a-file");

    it("read chunks from a file", async () => {
        assert.equal((await readChunk(FIXTURE_PATH, 1, 4)).toString(), "onic");
    });

    it("slice buffer if read bytes count is less than requested length", async () => {
        assert.equal((await readChunk(FIXTURE_PATH, 0, 25)).toString(), "sonic the hedgehog\n");
    });

    it("synchronously read chunks from a file", () => {
        assert.equal(readChunk.sync(FIXTURE_PATH, 1, 4).toString(), "onic");
    });

    it("synchronously slice buffer if read bytes count is less than requested length", () => {
        assert.equal(readChunk.sync(FIXTURE_PATH, 0, 25).toString(), "sonic the hedgehog\n");
    });
});
