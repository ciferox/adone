describe("crypto", "Keygrip", () => {
    const { crypto: { Keygrip }, std: { crypto } } = adone;

    const testKeygripInstance = (keys, keylist) => {
        let hash = keys.sign("hello world");

        let index = keys.indexOf("hello world", hash);
        assert.equal(index, 0);

        const matched = keys.verify("hello world", hash);
        assert.ok(matched);

        index = keys.indexOf("hello world", "o_O");
        assert.equal(index, -1);

        // rotate a new key in, and an old key out
        keylist.unshift("SEKRIT4");
        keylist.pop();

        // if index > 0, it's time to re-sign
        index = keys.indexOf("hello world", hash);
        assert.equal(index, 1);
        hash = keys.sign("hello world");
    };

    describe("keygrip(keys)", () => {
        it("should throw if keys are missing or empty", () => {
            // keygrip takes an array of keys. If missing or empty, it will throw.
            assert.throws(() => {
                new Keygrip(/* empty list */);
            }, /must be provided/);
        });

        it("should throw when setting an invalid hash algorithm", () => {
            const keys = new Keygrip(["a", "b"]);
            assert.throws(() => {
                keys.hash = "asdf";
            }, /unsupported/);
        });

        it("should throw when setting an invalid cipher", () => {
            const keys = new Keygrip(["a", "b"]);
            assert.throws(() => {
                keys.cipher = "asdf";
            }, /unsupported/);
        });
    });

    describe("keygrip([key])", () => {
        const keys = new Keygrip(["06ae66fdc6c2faf5a401b70e0bf885cb"]);

        it("should sign a string", () => {
            const hash = keys.sign("hello world");
            assert.ok(/^[\w\+=]{44}$/.test(hash.toString("base64")));
        });

        it("should encrypt a message", () => {
            const hash = keys.encrypt("lol");
            assert.equal("lol", keys.decrypt(hash)[0].toString("utf8"));
        });

        it("should return false on bad decryptions", () => {
            const keys2 = new Keygrip(["lkjasdf"]);
            assert.equal(false, keys2.decrypt(keys.encrypt("lol")));
        });

        it("should return false on bad inputs", () => {
            assert.equal(false, keys.decrypt(`${keys.encrypt("lol")}asdf`));
        });
    });

    describe("keygrip([keys...])", () => {
        it("should sign a string", () => {
            const keylist = ["Newest", "AnotherKey", "Oldest"];
            testKeygripInstance(new Keygrip(keylist), keylist);
        });

        it("should sign a string with a different algorithm and encoding", () => {
            // now pass in a different hmac algorithm and encoding
            const keylist = ["Newest", "AnotherKey", "Oldest"];
            testKeygripInstance(new Keygrip(keylist), keylist);
        });
    });

    describe("Message encryption", () => {
        const length = 16;
        const key = crypto.randomBytes(32);
        const keygrip = new Keygrip([key]);

        describe("with iv", () => {
            const iv = crypto.randomBytes(length);
            const message = keygrip.encrypt("lol, have Σπ", iv);

            it("should encrypt and decrypt", () => {
                assert.equal("lol, have Σπ", keygrip.decrypt(message, iv)[0].toString("utf8"));
            });

            it("should return false on invalid key", () => {
                assert.equal(false, new Keygrip([crypto.randomBytes(32)])
                    .decrypt(message, iv));
            });

            it("should return false on missing iv", () => {
                assert.equal(false, keygrip.decrypt(message));
            });

            it("should return false on invalid iv", () => {
                assert.equal(false, keygrip.decrypt(message, crypto.randomBytes(length)));
            });
        });

        describe("without iv", () => {
            const message = keygrip.encrypt("lol, have Σπ");

            it("should encrypt and decrypt", () => {
                assert.equal("lol, have Σπ", keygrip.decrypt(message)[0].toString("utf8"));
            });

            it("should return false on invalid key", () => {
                assert.equal(false, new Keygrip([crypto.randomBytes(32)])
                    .decrypt(message));
            });

            it("should work on really long strings", () => {
                let string = "";
                for (let i = 0; i < 10000; i++) {
                    string += "a";
                }
                const msg = keygrip.encrypt(new Buffer(string));
                assert.equal(string, keygrip.decrypt(msg)[0].toString("utf8"));
            });
        });
    });
});
