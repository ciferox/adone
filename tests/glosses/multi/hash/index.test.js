const validCases = require("./fixtures/valid");
const invalidCases = require("./fixtures/invalid");

const {
    data: { base58 },
    multi
} = adone;

const sample = (code, size, hex) => {
    return Buffer.concat([
        Buffer.from([code, size]),
        Buffer.from(hex, "hex")
    ]);
};

describe("multi", "hash", () => {
    describe("toHexString", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                const code = test.encoding.code;
                const buf = multi.hash.encode(Buffer.from(test.hex, "hex"), code);
                assert.equal(multi.hash.toHexString(buf), buf.toString("hex"));
            });
        });

        it("invalid", () => {
            assert.throws(() => multi.hash.toHexString("hello world"), /must be passed a buffer/);
        });
    });

    describe("fromHexString", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                const code = test.encoding.code;
                const buf = multi.hash.encode(Buffer.from(test.hex, "hex"), code);
                assert.equal(multi.hash.fromHexString(buf.toString("hex")).toString("hex"), buf.toString("hex"));
            });
        });
    });

    describe("toB58String", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                const code = test.encoding.code;
                const buf = multi.hash.encode(Buffer.from(test.hex, "hex"), code);
                assert.equal(multi.hash.toB58String(buf), base58.encode(buf));
            });
        });

        it("invalid", () => {
            assert.throws(() => multi.hash.toB58String("hello world"), /must be passed a buffer/);
        });
    });

    describe("fromB58String", () => {
        it("valid", () => {
            const src = "QmPfjpVaf593UQJ9a5ECvdh2x17XuJYG5Yanv5UFnH3jPE";
            const expected = Buffer.from("122013bf801597d74a660453412635edd8c34271e5998f801fac5d700c6ce8d8e461", "hex");

            assert.deepEqual(multi.hash.fromB58String(src), expected);
            assert.deepEqual(multi.hash.fromB58String(Buffer.from(src)), expected);
        });
    });

    describe("decode", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                const code = test.encoding.code;
                const buf = sample(code, test.size, test.hex);
                const name = test.encoding.name;
                const d1 = Buffer.from(test.hex, "hex");
                const length = d1.length;

                const r = multi.hash.decode(buf);
                const d2 = r.digest;

                assert.equal(r.code, code);
                assert.equal(r.name, name);
                assert.equal(r.length, length);
                assert.true(d1.equals(d2));
            });
        });

        it("invalid", () => {
            assert.throws(() => multi.hash.decode("hello"), /multihash must be a Buffer/);
        });
    });

    describe("encode", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                const code = test.encoding.code;
                const name = test.encoding.name;
                const buf = sample(code, test.size, test.hex);
                const results = [
                    multi.hash.encode(Buffer.from(test.hex, "hex"), code),
                    multi.hash.encode(Buffer.from(test.hex, "hex"), name)
                ];

                results.forEach((res) => {
                    assert.equal(res.toString("hex"), buf.toString("hex"));
                });
            });
        });

        it("invalid", () => {
            assert.throws(() => multi.hash.encode(), /requires at least two args/);
            assert.throws(() => multi.hash.encode("hello", 0x11), /digest should be a Buffer/);
            assert.throws(() => multi.hash.encode(Buffer.from("hello"), 0x11, 2), /length should be equal/);
        });
    });

    describe("validate", () => {
        it("valid", () => {
            validCases.forEach((test) => {
                multi.hash.validate(sample(test.encoding.code, test.size, test.hex));
            });
        });

        it("invalid", () => {
            invalidCases.forEach((test) => {
                assert.throws(() => multi.hash.validate(sample(test.code, test.size, test.hex)));
            });

            const longBuffer = Buffer.alloc(150, "a");
            assert.throws(() => multi.hash.validate(longBuffer));
        });
    });

    describe("isValidCode", () => {
        it("valid", () => {
            assert.true(multi.hash.isValidCode(2));
            assert.true(multi.hash.isValidCode(0x13));
        });

        it("invalid", () => {
            assert.false(multi.hash.isValidCode(0x10));
            assert.false(multi.hash.isValidCode(0x90));
        });
    });

    describe("isAppCode", () => {
        it("valid", () => {
            for (let n = 1; n < 0x10; n++) {
                assert.true(multi.hash.isAppCode(n));
            }
        });

        it("invalid", () => {
            assert.false(multi.hash.isAppCode(0));

            for (let m = 0x10; m <= 0xff; m++) {
                assert.false(multi.hash.isAppCode(m));
            }
        });
    });

    describe("coerceCode", () => {
        it("valid", () => {
            const names = {
                sha1: 0x11,
                "sha2-256": 0x12,
                "sha2-512": 0x13,
                "sha3-512": 0x14
            };

            Object.keys(names).forEach((name) => {
                assert.deepEqual(multi.hash.coerceCode(name), names[name]);
                assert.deepEqual(multi.hash.coerceCode(names[name]), names[name]);
            });
        });

        it("invalid", () => {
            const invalidNames = [
                "sha256",
                "sha9",
                "Blake4b"
            ];

            invalidNames.forEach((name) => {
                assert.throws(() => multi.hash.coerceCode(name), `Unrecognized hash function named: ${name}`);
            });

            assert.throws(() => multi.hash.coerceCode(Buffer.from("hello")), /should be a number/);

            assert.throws(() => multi.hash.coerceCode(0x99), /Unrecognized function code/);
        });
    });

    it("prefix", () => {
        const multihash = multi.hash.encode(Buffer.from("hey"), 0x11, 3);
        const prefix = multi.hash.prefix(multihash);
        assert.equal(prefix.toString("hex"), "1103");
    });

    it("prefix throws on invalid multihash", () => {
        const multihash = Buffer.from("definitely not valid");

        assert.throws(() => multi.hash.prefix(multihash));
    });

    describe("constants", () => {
        it("frozen", () => {
            assert.true(Object.isFrozen(multi.hash.names));
            assert.true(Object.isFrozen(multi.hash.codes));
            assert.true(Object.isFrozen(multi.hash.defaultLengths));
        });
    });
});
