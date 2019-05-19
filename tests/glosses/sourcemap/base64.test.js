const base64 = require(adone.getPath("lib", "glosses", "sourcemap", "base64"));

describe("base64", () => {
    it("test out of range encoding", () => {
        assert.throws(() => {
            base64.encode(-1);
        });
        assert.throws(() => {
            base64.encode(64);
        });
    });

    it("test out of range decoding", () => {
        assert.equal(base64.decode("=".charCodeAt(0)), -1);
    });

    it("test normal encoding and decoding", () => {
        for (let i = 0; i < 64; i++) {
            assert.equal(base64.decode(base64.encode(i).charCodeAt(0)), i);
        }
    });
});
