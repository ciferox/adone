const util = require("./util");
const BN = require("bn.js");
const messages = require("./messages");

const {
    crypto: { secp256k1 },
    std: { crypto: { randomBytes: getRandomBytes } }
} = adone;

describe("crypto", "secp256k1", () => {
    util.setSeed(util.env.seed);

    describe("private key", () => {
        describe("privateKeyVerify", () => {
            it("should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.privateKeyVerify(null);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("invalid length", () => {
                const privateKey = util.getPrivateKey().slice(1);
                assert.isFalse(secp256k1.privateKeyVerify(privateKey));
            });

            it("zero key", () => {
                const privateKey = util.BN_ZERO.toArrayLike(Buffer, "be", 32);
                assert.isFalse(secp256k1.privateKeyVerify(privateKey));
            });

            it("equal to N", () => {
                const privateKey = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                assert.isFalse(secp256k1.privateKeyVerify(privateKey));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                assert.isTrue(secp256k1.privateKeyVerify(privateKey));
                done();
            });
        });

        describe("privateKeyExport", () => {
            it("private key should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.privateKeyExport(null);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("private key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey().slice(1);
                    secp256k1.privateKeyExport(privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    secp256k1.privateKeyExport(privateKey, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            it("private key is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.privateKeyExport(privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_EXPORT_DER_FAIL}$`));
            });
        });

        describe("privateKeyImport", () => {
            it("should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.privateKeyImport(null);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("invalid format", () => {
                assert.throws(() => {
                    const buffer = Buffer.from([0x00]);
                    secp256k1.privateKeyImport(buffer);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_IMPORT_DER_FAIL}$`));
            });
        });

        describe("privateKeyExport/privateKeyImport", () => {
            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();

                const der1 = secp256k1.privateKeyExport(privateKey, true);
                const privateKey1 = secp256k1.privateKeyImport(der1);
                assert.deepEqual(privateKey1, privateKey);

                const der2 = secp256k1.privateKeyExport(privateKey, false);
                const privateKey2 = secp256k1.privateKeyImport(der2);
                assert.deepEqual(privateKey2, privateKey);

                done();
            });
        });

        describe("privateKeyTweakAdd", () => {
            it("private key should be a Buffer", () => {
                assert.throws(() => {
                    const tweak = util.getTweak();
                    secp256k1.privateKeyTweakAdd(null, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("private key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey().slice(1);
                    const tweak = util.getTweak();
                    secp256k1.privateKeyTweakAdd(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("tweak should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    secp256k1.privateKeyTweakAdd(privateKey, null);
                }, new RegExp(`^${messages.TWEAK_TYPE_INVALID}$`));
            });

            it("tweak length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const tweak = util.getTweak().slice(1);
                    secp256k1.privateKeyTweakAdd(privateKey, tweak);
                }, new RegExp(`^${messages.TWEAK_LENGTH_INVALID}$`));
            });

            it("tweak overflow", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const tweak = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.privateKeyTweakAdd(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL}$`));
            });

            it("result is zero: (N - 1) + 1", () => {
                assert.throws(() => {
                    const privateKey = util.ec.curve.n.sub(util.BN_ONE).toArrayLike(Buffer, "be", 32);
                    const tweak = util.BN_ONE.toArrayLike(Buffer, "be", 32);
                    secp256k1.privateKeyTweakAdd(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const tweak = util.getTweak();

                const expected = new BN(privateKey).add(new BN(tweak)).mod(util.ec.curve.n);
                if (expected.cmp(util.BN_ZERO) === 0) {
                    assert.throws(() => {
                        secp256k1.privateKeyTweakAdd(privateKey, tweak);
                    }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL}$`));
                } else {
                    const result = secp256k1.privateKeyTweakAdd(privateKey, tweak);
                    assert.deepEqual(result.toString("hex"), expected.toString(16, 64));
                }

                done();
            });
        });

        describe("privateKeyTweakMul", () => {
            it("private key should be a Buffer", () => {
                assert.throws(() => {
                    const tweak = util.getTweak();
                    secp256k1.privateKeyTweakMul(null, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("private key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey().slice(1);
                    const tweak = util.getTweak();
                    secp256k1.privateKeyTweakMul(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("tweak should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    secp256k1.privateKeyTweakMul(privateKey, null);
                }, new RegExp(`^${messages.TWEAK_TYPE_INVALID}$`));
            });

            it("tweak length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const tweak = util.getTweak().slice(1);
                    secp256k1.privateKeyTweakMul(privateKey, tweak);
                }, new RegExp(`^${messages.TWEAK_LENGTH_INVALID}$`));
            });

            it("tweak equal N", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const tweak = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.privateKeyTweakMul(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL}$`));
            });

            it("tweak is 0", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const tweak = util.BN_ZERO.toArrayLike(Buffer, "be", 32);
                    secp256k1.privateKeyTweakMul(privateKey, tweak);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const tweak = util.getTweak();

                if (new BN(tweak).cmp(util.BN_ZERO) === 0) {
                    assert.throws(() => {
                        secp256k1.privateKeyTweakMul(privateKey, tweak);
                    }, new RegExp(`^${messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL}$`));
                } else {
                    const expected = new BN(privateKey).mul(new BN(tweak)).mod(util.ec.curve.n);
                    const result = secp256k1.privateKeyTweakMul(privateKey, tweak);
                    assert.deepEqual(result.toString("hex"), expected.toString(16, 64));
                }

                done();
            });
        });
    });

    describe("public key", () => {
        describe("publicKeyCreate", () => {
            it("should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.publicKeyCreate(null);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("invalid length", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey().slice(1);
                    secp256k1.publicKeyCreate(privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("overflow", () => {
                assert.throws(() => {
                    const privateKey = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.publicKeyCreate(privateKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_CREATE_FAIL}$`));
            });

            it("equal zero", () => {
                assert.throws(() => {
                    const privateKey = util.BN_ZERO.toArrayLike(Buffer, "be", 32);
                    secp256k1.publicKeyCreate(privateKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_CREATE_FAIL}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    secp256k1.publicKeyCreate(privateKey, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const expected = util.getPublicKey(privateKey);

                const compressed = secp256k1.publicKeyCreate(privateKey, true);
                assert.deepEqual(compressed, expected.compressed);

                const uncompressed = secp256k1.publicKeyCreate(privateKey, false);
                assert.deepEqual(uncompressed, expected.uncompressed);

                done();
            });
        });

        describe("publicKeyConvert", () => {
            it("should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.publicKeyConvert(null);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    secp256k1.publicKeyConvert(publicKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.publicKeyConvert(publicKey, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const expected = util.getPublicKey(privateKey);

                const compressed = secp256k1.publicKeyConvert(expected.uncompressed, true);
                assert.deepEqual(compressed, expected.compressed);

                const uncompressed = secp256k1.publicKeyConvert(expected.compressed, false);
                assert.deepEqual(uncompressed, expected.uncompressed);

                done();
            });
        });

        describe("publicKeyVerify", () => {
            it("should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.publicKeyVerify(null);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("invalid length", () => {
                const privateKey = util.getPrivateKey();
                const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("invalid first byte", () => {
                const privateKey = util.getPrivateKey();
                const publicKey = util.getPublicKey(privateKey).compressed;
                publicKey[0] = 0x01;
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("x overflow (first byte is 0x03)", () => {
                const publicKey = Buffer.concat([
                    Buffer.from([0x03]),
                    util.ec.curve.p.toArrayLike(Buffer, "be", 32)
                ]);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("x overflow", () => {
                const publicKey = Buffer.concat([
                    Buffer.from([0x04]),
                    util.ec.curve.p.toArrayLike(Buffer, "be", 32)
                ]);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("y overflow", () => {
                const publicKey = Buffer.concat([
                    Buffer.from([0x04]),
                    Buffer.alloc(32),
                    util.ec.curve.p.toArrayLike(Buffer, "be", 32)
                ]);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("y is even, first byte is 0x07", () => {
                const publicKey = Buffer.concat([
                    Buffer.from([0x07]),
                    Buffer.alloc(32),
                    util.ec.curve.p.subn(1).toArrayLike(Buffer, "be", 32)
                ]);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            it("y**2 !== x*x*x + 7", () => {
                const publicKey = Buffer.concat([Buffer.from([0x04]), util.getTweak(), util.getTweak()]);
                assert.isFalse(secp256k1.publicKeyVerify(publicKey));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const publicKey = util.getPublicKey(privateKey);
                assert.isTrue(secp256k1.publicKeyVerify(publicKey.compressed));
                assert.isTrue(secp256k1.publicKeyVerify(publicKey.uncompressed));
                done();
            });
        });

        describe("publicKeyTweakAdd", () => {
            it("public key should be a Buffer", () => {
                assert.throws(() => {
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakAdd(null, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("public key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakAdd(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("public key is invalid (version is 0x01)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    publicKey[0] = 0x01;
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakAdd(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_PARSE_FAIL}$`));
            });

            it("tweak should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.publicKeyTweakAdd(publicKey, null);
                }, new RegExp(`^${messages.TWEAK_TYPE_INVALID}$`));
            });

            it("tweak length length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.getTweak().slice(1);
                    secp256k1.publicKeyTweakAdd(publicKey, tweak);
                }, new RegExp(`^${messages.TWEAK_LENGTH_INVALID}$`));
            });

            it("tweak overflow", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.publicKeyTweakAdd(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TWEAK_ADD_FAIL}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakAdd(publicKey, tweak, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const tweak = util.getTweak();

                const publicPoint = util.ec.g.mul(new BN(privateKey));
                const publicKey = Buffer.from(publicPoint.encode(null, true));
                const expected = util.ec.g.mul(new BN(tweak)).add(publicPoint);

                const compressed = secp256k1.publicKeyTweakAdd(publicKey, tweak, true);
                assert.deepEqual(compressed.toString("hex"), expected.encode("hex", true));

                const uncompressed = secp256k1.publicKeyTweakAdd(publicKey, tweak, false);
                assert.deepEqual(uncompressed.toString("hex"), expected.encode("hex", false));

                done();
            });
        });

        describe("publicKeyTweakMul", () => {
            it("public key should be a Buffer", () => {
                assert.throws(() => {
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakMul(null, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("public key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakMul(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("public key is invalid (version is 0x01)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    publicKey[0] = 0x01;
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakMul(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_PARSE_FAIL}$`));
            });

            it("tweak should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.publicKeyTweakMul(publicKey, null);
                }, new RegExp(`^${messages.TWEAK_TYPE_INVALID}$`));
            });

            it("tweak length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.getTweak().slice(1);
                    secp256k1.publicKeyTweakMul(publicKey, tweak);
                }, new RegExp(`^${messages.TWEAK_LENGTH_INVALID}$`));
            });

            it("tweak is zero", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.BN_ZERO.toArrayLike(Buffer, "be", 32);
                    secp256k1.publicKeyTweakMul(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL}$`));
            });

            it("tweak overflow", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.ec.curve.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.publicKeyTweakMul(publicKey, tweak);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    const tweak = util.getTweak();
                    secp256k1.publicKeyTweakMul(publicKey, tweak, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey = util.getPrivateKey();
                const publicPoint = util.ec.g.mul(new BN(privateKey));
                const publicKey = Buffer.from(publicPoint.encode(null, true));
                const tweak = util.getTweak();

                if (new BN(tweak).cmp(util.BN_ZERO) === 0) {
                    assert.throws(() => {
                        secp256k1.publicKeyTweakMul(publicKey, tweak);
                    }, new RegExp(`^${messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL}$`));
                } else {
                    const expected = publicPoint.mul(tweak);

                    const compressed = secp256k1.publicKeyTweakMul(publicKey, tweak, true);
                    assert.deepEqual(compressed.toString("hex"), expected.encode("hex", true));

                    const uncompressed = secp256k1.publicKeyTweakMul(publicKey, tweak, false);
                    assert.deepEqual(uncompressed.toString("hex"), expected.encode("hex", false));
                }

                done();
            });
        });

        describe("publicKeyCombine", () => {
            it("public keys should be an Array", () => {
                assert.throws(() => {
                    secp256k1.publicKeyCombine(null);
                }, new RegExp(`^${messages.EC_PUBLIC_KEYS_TYPE_INVALID}$`));
            });

            it("public keys should have length greater that zero", () => {
                assert.throws(() => {
                    secp256k1.publicKeyCombine([]);
                }, new RegExp(`^${messages.EC_PUBLIC_KEYS_LENGTH_INVALID}$`));
            });

            it("public key should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.publicKeyCombine([null]);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("public key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    secp256k1.publicKeyCombine([publicKey]);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("public key is invalid (version is 0x01)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    publicKey[0] = 0x01;
                    secp256k1.publicKeyCombine([publicKey]);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_PARSE_FAIL}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.publicKeyCombine([publicKey], null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            it("P + (-P) = 0", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey1 = util.getPublicKey(privateKey).compressed;
                    const publicKey2 = Buffer.from(publicKey1);
                    publicKey2[0] = publicKey2[0] ^ 0x01;
                    secp256k1.publicKeyCombine([publicKey1, publicKey2], true);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_COMBINE_FAIL}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const cnt = 1 + Math.floor(Math.random() * 3); // 1 <= cnt <= 3
                const privateKeys = [];
                while (privateKeys.length < cnt) {
                    privateKeys.push(util.getPrivateKey());
                }
                const publicKeys = privateKeys.map((privateKey) => {
                    return util.getPublicKey(privateKey).compressed;
                });

                let expected = util.ec.g.mul(new BN(privateKeys[0]));
                for (let i = 1; i < privateKeys.length; ++i) {
                    const publicPoint = util.ec.g.mul(new BN(privateKeys[i]));
                    expected = expected.add(publicPoint);
                }

                const compressed = secp256k1.publicKeyCombine(publicKeys, true);
                assert.deepEqual(compressed.toString("hex"), expected.encode("hex", true));

                const uncompressed = secp256k1.publicKeyCombine(publicKeys, false);
                assert.deepEqual(uncompressed.toString("hex"), expected.encode("hex", false));

                done();
            });
        });
    });

    describe("signature", () => {
        describe("signatureNormalize", () => {
            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.signatureNormalize(null);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("invalid length", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey).slice(1);
                    secp256k1.signatureNormalize(signature);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_LENGTH_INVALID}$`));
            });

            it("parse fail (r equal N)", () => {
                assert.throws(() => {
                    const signature = Buffer.concat([
                        util.ec.curve.n.toArrayLike(Buffer, "be", 32),
                        util.BN_ONE.toArrayLike(Buffer, "be", 32)
                    ]);
                    secp256k1.signatureNormalize(signature);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_FAIL}$`));
            });

            it("normalize return same signature (s equal n/2)", () => {
                const signature = Buffer.concat([
                    util.BN_ONE.toArrayLike(Buffer, "be", 32),
                    util.ec.nh.toArrayLike(Buffer, "be", 32)
                ]);
                const result = secp256k1.signatureNormalize(signature);
                assert.deepEqual(result, signature);
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const message = util.getMessage();
                const privateKey = util.getPrivateKey();

                const sigObj = util.sign(message, privateKey);
                const result = secp256k1.signatureNormalize(sigObj.signature);
                assert.deepEqual(result, sigObj.signatureLowS);
                done();
            });
        });

        describe("signatureExport", () => {
            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.signatureExport(null);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("invalid length", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey).slice(1);
                    secp256k1.signatureExport(signature);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_LENGTH_INVALID}$`));
            });

            it("parse fail (r equal N)", () => {
                assert.throws(() => {
                    const signature = Buffer.concat([
                        util.ec.n.toArrayLike(Buffer, "be", 32),
                        util.BN_ONE.toArrayLike(Buffer, "be", 32)
                    ]);
                    secp256k1.signatureExport(signature);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_FAIL}$`));
            });
        });

        describe("signatureImport", () => {
            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.signatureImport(null);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("parse fail", () => {
                assert.throws(() => {
                    secp256k1.signatureImport(Buffer.alloc(1));
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_DER_FAIL}$`));
            });

            it("parse not bip66 signature", () => {
                const signature = Buffer.from("308002204171936738571ff75ec0c56c010f339f1f6d510ba45ad936b0762b1b2162d8020220152670567fa3cc92a5ea1a6ead11741832f8aede5ca176f559e8a46bb858e3f6", "hex");
                assert.throws(() => {
                    secp256k1.signatureImport(signature);
                });
            });
        });

        describe("signatureImportLax", () => {
            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    secp256k1.signatureImportLax(null);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("parse fail", () => {
                assert.throws(() => {
                    secp256k1.signatureImportLax(Buffer.alloc(1));
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_DER_FAIL}$`));
            });

            it("parse not bip66 signature", () => {
                const signature = Buffer.from("308002204171936738571ff75ec0c56c010f339f1f6d510ba45ad936b0762b1b2162d8020220152670567fa3cc92a5ea1a6ead11741832f8aede5ca176f559e8a46bb858e3f6", "hex");
                secp256k1.signatureImportLax(signature);
            });
        });

        describe("signatureExport/signatureImport", () => {
            util.repeat("random tests", util.env.repeat, (done) => {
                const message = util.getMessage();
                const privateKey = util.getPrivateKey();

                const signature = util.sign(message, privateKey).signatureLowS;

                const der = secp256k1.signatureExport(signature);
                assert.deepEqual(secp256k1.signatureImport(der), signature);
                assert.deepEqual(secp256k1.signatureImportLax(der), signature);
                done();
            });
        });
    });

    describe("ecdsa", () => {
        describe("sign", () => {
            it("message should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    secp256k1.sign(null, privateKey);
                }, new RegExp(`^${messages.MSG32_TYPE_INVALID}$`));
            });

            it("message invalid length", () => {
                assert.throws(() => {
                    const message = util.getMessage().slice(1);
                    const privateKey = util.getPrivateKey();
                    secp256k1.sign(message, privateKey);
                }, new RegExp(`^${messages.MSG32_LENGTH_INVALID}$`));
            });

            it("private key should be a Buffer", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    secp256k1.sign(message, null);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("private key invalid length", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey().slice(1);
                    secp256k1.sign(message, privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("private key is invalid", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.ec.n.toArrayLike(Buffer, "be", 32);
                    secp256k1.sign(message, privateKey);
                }, new RegExp(`^${messages.ECDSA_SIGN_FAIL}$`));
            });

            it("options should be an Object", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    secp256k1.sign(message, privateKey, null);
                }, new RegExp(`^${messages.OPTIONS_TYPE_INVALID}$`));
            });

            it("options.data should be a Buffer", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    secp256k1.sign(message, privateKey, { data: null });
                }, new RegExp(`^${messages.OPTIONS_DATA_TYPE_INVALID}$`));
            });

            it("options.data length is invalid", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    const data = getRandomBytes(31);
                    secp256k1.sign(message, privateKey, { data });
                }, new RegExp(`^${messages.OPTIONS_DATA_LENGTH_INVALID}$`));
            });

            it("options.noncefn should be a Function", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    secp256k1.sign(message, privateKey, { noncefn: null });
                }, new RegExp(`^${messages.OPTIONS_NONCEFN_TYPE_INVALID}$`));
            });

            it("noncefn return not a Buffer", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    const noncefn = function () {
                        return null;
                    };
                    secp256k1.sign(message, privateKey, { noncefn });
                }, new RegExp(`^${messages.ECDSA_SIGN_FAIL}$`));
            });

            it("noncefn return Buffer with invalid length", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const privateKey = util.getPrivateKey();
                    const noncefn = function () {
                        return getRandomBytes(31);
                    };
                    secp256k1.sign(message, privateKey, { noncefn });
                }, new RegExp(`^${messages.ECDSA_SIGN_FAIL}$`));
            });

            it("check options.noncefn arguments", () => {
                const message = util.getMessage();
                const privateKey = util.getPrivateKey();
                const data = getRandomBytes(32);
                const noncefn = function (message2, privateKey2, algo, data2, attempt) {
                    assert.deepEqual(message2, message);
                    assert.deepEqual(privateKey, privateKey);
                    assert.deepEqual(algo, null);
                    assert.deepEqual(data2, data);
                    assert.deepEqual(attempt, 0);
                    return getRandomBytes(32);
                };
                secp256k1.sign(message, privateKey, { data, noncefn });
            });
        });

        describe("verify", () => {
            it("message should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.verify(null, signature, publicKey);
                }, new RegExp(`^${messages.MSG32_TYPE_INVALID}$`));
            });

            it("message length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage().slice(1);
                    const signature = util.getSignature(message, privateKey);
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.verify(message, signature, publicKey);
                }, new RegExp(`^${messages.MSG32_LENGTH_INVALID}$`));
            });

            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.verify(message, null, publicKey);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("signature length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey).slice(1);
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.verify(message, signature, publicKey);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_LENGTH_INVALID}$`));
            });

            it("signature is invalid (r equal N)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = Buffer.concat([
                        util.ec.n.toArrayLike(Buffer, "be", 32),
                        getRandomBytes(32)
                    ]);
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.verify(message, signature, publicKey);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_FAIL}$`));
            });

            it("public key should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    secp256k1.verify(message, signature, null);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("public key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    secp256k1.verify(message, signature, publicKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("public key is invalid (version is 0x01)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    publicKey[0] = 0x01;
                    secp256k1.verify(message, signature, publicKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_PARSE_FAIL}$`));
            });
        });

        describe("recover", () => {
            it("message should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    secp256k1.recover(null, signature, 0);
                }, new RegExp(`^${messages.MSG32_TYPE_INVALID}$`));
            });

            it("message length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage().slice(1);
                    const signature = util.getSignature(message, privateKey);
                    secp256k1.recover(message, signature, 0);
                }, new RegExp(`^${messages.MSG32_LENGTH_INVALID}$`));
            });

            it("signature should be a Buffer", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    secp256k1.recover(message, null, 0);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_TYPE_INVALID}$`));
            });

            it("signature length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey).slice(1);
                    secp256k1.recover(message, signature, 0);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_LENGTH_INVALID}$`));
            });

            it("signature is invalid (r equal N)", () => {
                assert.throws(() => {
                    const message = util.getMessage();
                    const signature = Buffer.concat([
                        util.ec.n.toArrayLike(Buffer, "be", 32),
                        getRandomBytes(32)
                    ]);
                    secp256k1.recover(message, signature, 0);
                }, new RegExp(`^${messages.ECDSA_SIGNATURE_PARSE_FAIL}$`));
            });

            it("recovery should be a Number", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    secp256k1.recover(message, signature, null);
                }, new RegExp(`^${messages.RECOVERY_ID_TYPE_INVALID}$`));
            });

            it("recovery is invalid (equal 4)", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(privateKey, message);
                    secp256k1.recover(message, signature, 4);
                }, new RegExp(`^${messages.RECOVERY_ID_VALUE_INVALID}$`));
            });

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const message = util.getMessage();
                    const signature = util.getSignature(message, privateKey);
                    secp256k1.recover(message, signature, 0, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });
        });

        describe("sign/verify/recover", () => {
            util.repeat("random tests", util.env.repeat, (done) => {
                const message = util.getMessage();
                const privateKey = util.getPrivateKey();
                const publicKey = util.getPublicKey(privateKey);
                const expected = util.sign(message, privateKey);

                const sigObj = secp256k1.sign(message, privateKey);
                assert.deepEqual(sigObj.signature, expected.signatureLowS);
                assert.deepEqual(sigObj.recovery, expected.recovery);

                const isValid = secp256k1.verify(message, sigObj.signature, publicKey.compressed);
                assert.isTrue(isValid);

                const compressed = secp256k1.recover(message, sigObj.signature, sigObj.recovery, true);
                assert.deepEqual(compressed, publicKey.compressed);

                const uncompressed = secp256k1.recover(message, sigObj.signature, sigObj.recovery, false);
                assert.deepEqual(uncompressed, publicKey.uncompressed);

                done();
            });
        });
    });

    describe("ecdh", () => {
        const commonTests = function (ecdh) {
            it("public key should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = null;
                    ecdh(publicKey, privateKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_TYPE_INVALID}$`));
            });

            it("public key length is invalid", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed.slice(1);
                    ecdh(publicKey, privateKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_LENGTH_INVALID}$`));
            });

            it("invalid public key", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    publicKey[0] = 0x00;
                    ecdh(publicKey, privateKey);
                }, new RegExp(`^${messages.EC_PUBLIC_KEY_PARSE_FAIL}$`));
            });

            it("secret key should be a Buffer", () => {
                assert.throws(() => {
                    const privateKey = null;
                    const publicKey = util.getPublicKey(util.getPrivateKey()).compressed;
                    ecdh(publicKey, privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_TYPE_INVALID}$`));
            });

            it("secret key invalid length", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey().slice(1);
                    const publicKey = util.getPublicKey(util.getPrivateKey()).compressed;
                    ecdh(publicKey, privateKey);
                }, new RegExp(`^${messages.EC_PRIVATE_KEY_LENGTH_INVALID}$`));
            });

            it("secret key equal zero", () => {
                assert.throws(() => {
                    const privateKey = util.ec.curve.zero.fromRed().toArrayLike(Buffer, "be", 32);
                    const publicKey = util.getPublicKey(util.getPrivateKey()).compressed;
                    ecdh(publicKey, privateKey);
                }, new RegExp("^scalar was invalid \\(zero or overflow\\)$"));
            });

            it("secret key equal N", () => {
                assert.throws(() => {
                    const privateKey = util.ec.n.toArrayLike(Buffer, "be", 32);
                    const publicKey = util.getPublicKey(util.getPrivateKey()).compressed;
                    ecdh(publicKey, privateKey);
                }, new RegExp("^scalar was invalid \\(zero or overflow\\)$"));
            });
        };

        commonTests(secp256k1.ecdh);

        util.repeat("random tests", util.env.repeat, (done) => {
            const privateKey1 = util.getPrivateKey();
            const publicKey1 = util.getPublicKey(privateKey1).compressed;
            const privateKey2 = util.getPrivateKey();
            const publicKey2 = util.getPublicKey(privateKey2).compressed;

            const shared1 = secp256k1.ecdh(publicKey1, privateKey2);
            const shared2 = secp256k1.ecdh(publicKey2, privateKey1);
            assert.deepEqual(shared1, shared2);

            done();
        });

        describe("unsafe", () => {
            commonTests(secp256k1.ecdhUnsafe);

            it("compressed should be a boolean", () => {
                assert.throws(() => {
                    const privateKey = util.getPrivateKey();
                    const publicKey = util.getPublicKey(privateKey).compressed;
                    secp256k1.ecdhUnsafe(publicKey, privateKey, null);
                }, new RegExp(`^${messages.COMPRESSED_TYPE_INVALID}$`));
            });

            util.repeat("random tests", util.env.repeat, (done) => {
                const privateKey1 = util.getPrivateKey();
                const publicKey1 = util.getPublicKey(privateKey1).compressed;
                const privateKey2 = util.getPrivateKey();
                const publicKey2 = util.getPublicKey(privateKey2).compressed;

                const shared1c = secp256k1.ecdhUnsafe(publicKey1, privateKey2, true);
                const shared2c = secp256k1.ecdhUnsafe(publicKey2, privateKey1, true);
                assert.deepEqual(shared1c, shared2c);

                const shared1un = secp256k1.ecdhUnsafe(publicKey1, privateKey2, false);
                const shared2un = secp256k1.ecdhUnsafe(publicKey2, privateKey1, false);
                assert.deepEqual(shared1un, shared2un);

                done();
            });
        });
    });
});

// if (process.platform !== "win32") {
//     require("./bn");
// }
// require("./ecpoint");
// require("./ecjpoint");
