const {
    fs: { tmpName },
    std
} = adone;

describe("fs", "tmpName", () => {
    it("default", async () => {
        const name = await tmpName();
        assert.match(name, /tmp-/);
    });

    it("uuid4 generator", async () => {
        const name = await tmpName({
            nameGenerator: adone.util.uuid.v4
        });
        assert.match(name, /[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("hash generator with additional keys", async () => {
        const name = await tmpName({
            prefix: "",
            nameGenerator: () => adone.crypto.hash.murmur3.x86.hash128(`somefile${process.pid}888`)
        });
        const parts = name.split(std.path.sep).filter(adone.identity);
        assert.lengthOf(parts[parts.length - 1], 32);
    });
});
