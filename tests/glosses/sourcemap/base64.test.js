const base64 = require(adone.path.join(adone.ROOT_PATH, "lib", "glosses", "sourcemap", "base64"));

describe("base64", () => {
    it("test out of range encoding", () => {
        assert.throws(() => {
            base64.encode(-1);
        }, /Must be between 0 and 63/);
        assert.throws(() => {
            base64.encode(64);
        }, /Must be between 0 and 63/);
    });
    
    it("test normal encoding and decoding", () => {
        for (let i = 0; i < 64; i++) {
            base64.encode(i);
        }
    });        
});
