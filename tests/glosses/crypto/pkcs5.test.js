describe("pkcs5", () => {
    const {
        crypto,
        std
    } = adone;

    const {
        pkcs5
    } = crypto;

    describe("pbkdf2", () => {
        const {
            pbkdf2,
            pbkdf2Sync
        } = pkcs5;

        const createTests = (name, fn) => {
            describe(name, () => {

                it("should derive a password with hmac-sha-1 c=1", async () => {
                    const dkHex = await fn("password", "salt", 1, 20);
                    assert.equal(dkHex.toString("hex"), "0c60c80f961f0e71f3a9b524af6012062fe037a6");
                });

                it("should derive a password with hmac-sha-1 c=2", async () => {
                    const dkHex = await fn("password", "salt", 2, 20);
                    assert.equal(dkHex.toString("hex"), "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957");
                });

                it("should derive a password with hmac-sha-1 c=5 keylen=8", async () => {
                    const salt = Buffer.from("1234567878563412", "hex");
                    const dkHex = await fn("password", salt, 5, 8);
                    assert.equal(dkHex.toString("hex"), "d1daa78615f287e6");
                });

                it.todo("should derive a utf8 password with hmac-sha-1 c=1 keylen=16", async () => {
                    const dkHex = await fn("中", "salt", 1, 16);
                    assert.equal(dkHex.toString("hex"), "5f719aa196edc4df6b1556de503faaf3");
                });

                it("should derive a password with hmac-sha-1 c=4096", async () => {
                    const dkHex = await fn("password", "salt", 4096, 20);
                    assert.equal(dkHex.toString("hex"), "4b007901b765489abead49d926f721d065a429c1");
                });

                it("should derive a password with hmac-sha-256 (passed as an algorithm identifier) c=1000", async () => {
                    const salt = "4bcda0d1c689fe465c5b8a817f0ddf3d";
                    const dkHex = await fn("password", salt, 1000, 48, "sha256");
                    assert.equal(dkHex.toString("hex"), "9da8a5f4ae605f35e82e5beac5f362df15c4255d88f738d641466a4107f9970238e768e72af29ac89a1b16ff277b31d2");
                });

                it("should derive a password with hmac-sha-512 (passed as an algorithm identifier) c=1000", async () => {
                    const salt = "4bcda0d1c689fe465c5b8a817f0ddf3d";
                    const dkHex = await fn("password", salt, 1000, 48, "sha512");
                    assert.equal(dkHex.toString("hex"), "975725960aa736f721182962677291a9085c75421c38636098d904f5a96f11a485f767082b710a69f8a46bcf9eba29f3");
                });
            });
        };

        createTests("sync", pbkdf2Sync);
        createTests("async", pbkdf2);
    });
});
