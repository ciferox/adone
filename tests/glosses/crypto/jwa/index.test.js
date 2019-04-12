const {
    crypto: { formatEcdsa, jwa },
    fs,
    std,
    process: { shell }
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const filePath = (name) => std.path.join(FIXTURES_PATH, name);

describe("crypto", "jwa", () => {
    let rsaPrivateKey;
    let rsaPublicKey;
    let rsaPrivateKeyWithPassphrase;
    let rsaPublicKeyWithPassphrase;
    let rsaWrongPublicKey;
    let ecdsaPrivateKey;
    let ecdsaPublicKey;
    let ecdsaWrongPublicKey;

    const shellCwd = (cmd) => shell(cmd, {
        cwd: FIXTURES_PATH
    });

    before(async () => {
        await fs.mkdirp(FIXTURES_PATH);
        await shellCwd("openssl genrsa 2048 > rsa-private.pem");
        await shellCwd("openssl genrsa 2048 > rsa-wrong-private.pem");
        await shellCwd("openssl genrsa 2048 -passout pass:test_pass > rsa-passphrase-private.pem");
        await shellCwd("openssl rsa -in rsa-private.pem -pubout > rsa-public.pem");
        await shellCwd("openssl rsa -in rsa-wrong-private.pem -pubout > rsa-wrong-public.pem");
        await shellCwd("openssl rsa -in rsa-passphrase-private.pem -pubout -passin pass:test_pass > rsa-passphrase-public.pem");
        await shellCwd("openssl ecparam -out ec256-private.pem -name prime256v1 -genkey");
        await shellCwd("openssl ecparam -out ec256-wrong-private.pem -name secp256k1 -genkey");
        await shellCwd("openssl ecparam -out ec384-private.pem -name secp384r1 -genkey");
        await shellCwd("openssl ecparam -out ec384-wrong-private.pem -name secp384r1 -genkey");
        await shellCwd("openssl ecparam -out ec512-private.pem -name secp521r1 -genkey");
        await shellCwd("openssl ecparam -out ec512-wrong-private.pem -name secp521r1 -genkey");
        await shellCwd("openssl ec -in ec256-private.pem -pubout > ec256-public.pem");
        await shellCwd("openssl ec -in ec256-wrong-private.pem -pubout > ec256-wrong-public.pem");
        await shellCwd("openssl ec -in ec384-private.pem -pubout > ec384-public.pem");
        await shellCwd("openssl ec -in ec384-wrong-private.pem -pubout > ec384-wrong-public.pem");
        await shellCwd("openssl ec -in ec512-private.pem -pubout > ec512-public.pem");
        await shellCwd("openssl ec -in ec512-wrong-private.pem -pubout > ec512-wrong-public.pem");

        rsaPrivateKey = fs.readFileSync(filePath("rsa-private.pem")).toString();
        rsaPublicKey = fs.readFileSync(filePath("rsa-public.pem")).toString();
        rsaPrivateKeyWithPassphrase = fs.readFileSync(filePath("rsa-passphrase-private.pem")).toString();
        rsaPublicKeyWithPassphrase = fs.readFileSync(filePath("rsa-passphrase-public.pem")).toString();
        rsaWrongPublicKey = fs.readFileSync(filePath("rsa-wrong-public.pem")).toString();
        ecdsaPrivateKey = {
            256: fs.readFileSync(filePath("ec256-private.pem")).toString(),
            384: fs.readFileSync(filePath("ec384-private.pem")).toString(),
            512: fs.readFileSync(filePath("ec512-private.pem")).toString()
        };
        ecdsaPublicKey = {
            256: fs.readFileSync(filePath("ec256-public.pem")).toString(),
            384: fs.readFileSync(filePath("ec384-public.pem")).toString(),
            512: fs.readFileSync(filePath("ec512-public.pem")).toString()
        };
        ecdsaWrongPublicKey = {
            256: fs.readFileSync(filePath("ec256-wrong-public.pem")).toString(),
            384: fs.readFileSync(filePath("ec384-wrong-public.pem")).toString(),
            512: fs.readFileSync(filePath("ec512-wrong-public.pem")).toString()
        };
    });

    after(async () => {
        await fs.rm(FIXTURES_PATH);
    });

    const BIT_DEPTHS = ["256", "384", "512"];

    it("HMAC signing, verifying", () => {
        const input = "eugene mirman";
        const secret = "shhhhhhhhhh";
        BIT_DEPTHS.forEach((bits) => {
            const algo = jwa(`hs${bits}`);
            const sig = algo.sign(input, secret);
            assert.ok(algo.verify(input, sig, secret));
            assert.notOk(algo.verify(input, "other sig", secret));
            assert.notOk(algo.verify(input, sig, "incrorect"));
        });
    });

    it("RSA signing, verifying", () => {
        const input = "h. jon benjamin";
        BIT_DEPTHS.forEach((bits) => {
            const algo = jwa(`rs${bits}`);
            const sig = algo.sign(input, rsaPrivateKey);
            assert.ok(algo.verify(input, sig, rsaPublicKey));
            assert.notOk(algo.verify(input, sig, rsaWrongPublicKey));
        });
    });

    it("RSA with passphrase signing, verifying", () => {
        const input = "test input";
        BIT_DEPTHS.forEach((bits) => {
            const algo = jwa(`rs${bits}`);
            const secret = "test_pass";
            const sig = algo.sign(input, { key: rsaPrivateKeyWithPassphrase, passphrase: secret });
            assert.ok(algo.verify(input, sig, rsaPublicKeyWithPassphrase));
        });
    });

    BIT_DEPTHS.forEach((bits) => {
        it(`RS${bits}: openssl sign -> js verify`, (done) => {
            const input = "iodine";
            const algo = jwa(`rs${bits}`);
            const dgst = std.childProcess.spawn("openssl", ["dgst", `-sha${bits}`, "-sign", filePath("rsa-private.pem")], {
                cwd: FIXTURES_PATH
            });
            let buffer = Buffer.alloc(0);

            dgst.stdout.on("data", (buf) => {
                buffer = Buffer.concat([buffer, buf]);
            });

            dgst.stdin.write(input, () => {
                dgst.stdin.end();
            });

            dgst.on("exit", (code) => {
                if (code !== 0) {
                    return assert.fail("could not test interop: openssl failure");
                }
                const sig = adone.data.base64url.encode(buffer);

                assert.ok(algo.verify(input, sig, rsaPublicKey));
                assert.notOk(algo.verify(input, sig, rsaWrongPublicKey));
                done();
            });
        });
    });

    BIT_DEPTHS.forEach((bits) => {
        it(`ES${bits}: signing, verifying`, () => {
            const input = "kristen schaal";
            const algo = jwa(`es${bits}`);
            const sig = algo.sign(input, ecdsaPrivateKey[bits]);
            assert.ok(algo.verify(input, sig, ecdsaPublicKey[bits]));
            assert.notOk(algo.verify(input, sig, ecdsaWrongPublicKey[bits]));
        });
    });

    BIT_DEPTHS.forEach((bits) => {
        it(`ES${bits}: openssl sign -> js verify`, (done) => {
            const input = "strawberry";
            const algo = jwa(`es${bits}`);
            const dgst = std.childProcess.spawn("openssl", ["dgst", `-sha${bits}`, "-sign", filePath(`ec${bits}-private.pem`)]);
            let buffer = Buffer.alloc(0);
            dgst.stdin.end(input);
            dgst.stdout.on("data", (buf) => {
                buffer = Buffer.concat([buffer, buf]);
            });
            dgst.on("exit", (code) => {
                if (code !== 0) {
                    return assert.fail("could not test interop: openssl failure");
                }
                const sig = formatEcdsa.derToJose(buffer, `ES${bits}`);
                assert.ok(algo.verify(input, sig, ecdsaPublicKey[bits]), "should verify");
                assert.notOk(algo.verify(input, sig, ecdsaWrongPublicKey[bits]));
                done();
            });
        });
    });

    BIT_DEPTHS.forEach((bits) => {
        const input = "bob's";
        const inputFile = filePath("interop.input.txt");
        const signatureFile = filePath("interop.sig.txt");

        const opensslVerify = (keyfile) => std.childProcess.spawn("openssl", ["dgst", `-sha${bits}`, "-verify", keyfile, "-signature", signatureFile, inputFile]);

        it(`ES${bits}: js sign -> openssl verify`, () => {
            const publicKeyFile = filePath(`ec${bits}-public.pem`);
            const wrongPublicKeyFile = filePath(`ec${bits}-wrong-public.pem`);
            const privateKey = ecdsaPrivateKey[bits];
            const signature =
                formatEcdsa.joseToDer(
                    jwa(`es${bits}`).sign(input, privateKey),
                    `ES${bits}`
                );
            fs.writeFileSync(inputFile, input);
            fs.writeFileSync(signatureFile, signature);

            opensslVerify(publicKeyFile).on("exit", (code) => {
                assert.equal(code, 0);
            });
            opensslVerify(wrongPublicKeyFile).on("exit", (code) => {
                assert.equal(code, 1);
            });
        });
    });

    BIT_DEPTHS.forEach((bits) => {
        const input = "burgers";
        const inputFile = filePath("interop.input.txt");
        const signatureFile = filePath("interop.sig.txt");

        const opensslVerify = (keyfile) => std.childProcess.spawn("openssl", ["dgst", `-sha${bits}`, "-verify", keyfile, "-signature", signatureFile, inputFile]);

        it(`RS${bits}: js sign -> openssl verify`, () => {
            const publicKeyFile = filePath("rsa-public.pem");
            const wrongPublicKeyFile = filePath("rsa-wrong-public.pem");
            const privateKey = rsaPrivateKey;
            const signature = adone.data.base64url.decode(jwa(`rs${bits}`).sign(input, privateKey), { buffer: true });
            fs.writeFileSync(signatureFile, signature);
            fs.writeFileSync(inputFile, input);

            opensslVerify(publicKeyFile).on("exit", (code) => {
                assert.equal(code, 0);
            });
            opensslVerify(wrongPublicKeyFile).on("exit", (code) => {
                assert.equal(code, 1);
            });
        });
    });

    it("none", () => {
        const input = "whatever";
        const algo = jwa("none");
        const sig = algo.sign(input);
        assert.ok(algo.verify(input, sig), "should verify");
        assert.notOk(algo.verify(input, "something"), "shoud not verify");
    });

    it("some garbage algorithm", () => {
        try {
            jwa("something bogus");
            assert.fail("should throw");
        } catch (ex) {
            assert.equal(ex.name, "TypeError");
            assert.ok(ex.message.match(/valid algorithm/), "should say something about algorithms");
        }
    });

    ["ahs256b", "anoneb", "none256", "rsnone"].forEach((superstringAlg) => {
        it("superstrings of other algorithms", () => {
            try {
                jwa(superstringAlg);
                assert.fail("should throw");
            } catch (ex) {
                assert.equal(ex.name, "TypeError");
                assert.ok(ex.message.match(/valid algorithm/), "should say something about algorithms");
            }
        });
    });

    ["rs", "es", "hs"].forEach((partialAlg) => {
        it("partial strings of other algorithms", () => {
            try {
                jwa(partialAlg);
                assert.fail("should throw");
            } catch (ex) {
                assert.equal(ex.name, "TypeError");
                assert.ok(ex.message.match(/valid algorithm/), "should say something about algorithms");
            }
        });
    });

    it("hs512, missing secret", () => {
        const algo = jwa("hs512");
        try {
            algo.sign("some stuff");
            assert.fail("should throw");
        } catch (ex) {
            assert.equal(ex.name, "TypeError");
            assert.ok(ex.message.match(/secret/), "should say something about secrets");
        }
    });

    it("hs512, weird input type", () => {
        const algo = jwa("hs512");
        const input = { a: ["whatever", "this", "is"] };
        const secret = "bones";
        const sig = algo.sign(input, secret);
        assert.ok(algo.verify(input, sig, secret), "should verify");
        assert.notOk(algo.verify(input, sig, "other thing"));
    });

    it("rs512, weird input type", () => {
        const algo = jwa("rs512");
        const input = { a: ["whatever", "this", "is"] };
        const sig = algo.sign(input, rsaPrivateKey);
        assert.ok(algo.verify(input, sig, rsaPublicKey), "should verify");
        assert.notOk(algo.verify(input, sig, rsaWrongPublicKey));
    });

    it("rs512, missing signing key", () => {
        const algo = jwa("rs512");
        try {
            algo.sign("some stuff");
            assert.fail("should throw");
        } catch (ex) {
            assert.equal(ex.name, "TypeError");
            assert.ok(ex.message.match(/key/), "should say something about keys");
        }
    });

    it("rs512, missing verifying key", () => {
        const algo = jwa("rs512");
        const input = { a: ["whatever", "this", "is"] };
        const sig = algo.sign(input, rsaPrivateKey);
        try {
            algo.verify(input, sig);
            assert.fail("should throw");
        } catch (ex) {
            assert.equal(ex.name, "TypeError");
            assert.ok(ex.message.match(/key/), "should say something about keys");
        }
    });
});
