const {
    crypto: { jws },
    fs,
    std,
    process: { shell }
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const filePath = (name) => std.path.join(FIXTURES_PATH, name);

describe("crypto", "jws", () => {
    const BITS = ["256", "384", "512"];
    const CURVES = {
        256: "256",
        384: "384",
        512: "521"
    };

    const payloadString = "oh ćhey José!: ¬˚∆ƒå¬ß…©…åˆø˙ˆø´∆¬˚µ…˚¬˜øå…ˆßøˆƒ˜¬";
    const payload = {
        name: payloadString,
        value: ["one", 2, 3]
    };

    let rsaPrivateKey;
    let rsaPrivateKeyEncrypted;
    let encryptedPassphrase;
    let rsaPublicKey;
    let rsaWrongPublicKey;
    let ecdsaPrivateKey;
    let ecdsaPublicKey;
    let ecdsaWrongPublicKey;

    const shellCwd = (cmd) => shell(cmd, {
        cwd: FIXTURES_PATH
    });

    const readfile = (path) => std.fs.readFileSync(filePath(path)).toString();
    const readstream = (path) => std.fs.createReadStream(filePath(path));

    before(async () => {
        await fs.mkdirp(FIXTURES_PATH);
        await shellCwd("openssl genrsa 2048 > rsa-private.pem");
        await shellCwd("openssl genrsa 2048 > rsa-wrong-private.pem");
        await shellCwd("openssl rsa -in rsa-private.pem -pubout > rsa-public.pem");
        await shellCwd("openssl rsa -in rsa-wrong-private.pem -pubout > rsa-wrong-public.pem");
        await shellCwd("openssl ecparam -out ec256-private.pem -name secp256r1 -genkey");
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
        await shellCwd("echo foo > encrypted-key-passphrase");
        await shellCwd("openssl rsa -passin file:encrypted-key-passphrase -in rsa-private.pem > rsa-private-encrypted.pem");

        rsaPrivateKey = readfile("rsa-private.pem");
        rsaPrivateKeyEncrypted = readfile("rsa-private-encrypted.pem");
        encryptedPassphrase = readfile("encrypted-key-passphrase");
        rsaPublicKey = readfile("rsa-public.pem");
        rsaWrongPublicKey = readfile("rsa-wrong-public.pem");
        ecdsaPrivateKey = {
            256: readfile("ec256-private.pem"),
            384: readfile("ec384-private.pem"),
            512: readfile("ec512-private.pem")
        };
        ecdsaPublicKey = {
            256: readfile("ec256-public.pem"),
            384: readfile("ec384-public.pem"),
            512: readfile("ec512-public.pem")
        };
        ecdsaWrongPublicKey = {
            256: readfile("ec256-wrong-public.pem"),
            384: readfile("ec384-wrong-public.pem"),
            512: readfile("ec512-wrong-public.pem")
        };
    });

    after(async () => {
        const persistent = ["data.txt"];
        const names = await fs.readdir(FIXTURES_PATH);
        for (const name of names) {
            if (persistent.includes(name)) {
                continue;
            }
            await fs.unlink(filePath(name)); // eslint-disable-line
        }
    });

    BITS.forEach((bits) => {
        it(`HMAC using SHA-${bits} hash algorithm`, () => {
            const alg = `HS${bits}`;
            const header = { alg, typ: "JWT" };
            const secret = "sup";
            const jwsObj = jws.sign({
                header,
                payload,
                secret,
                encoding: "utf8"
            });
            const parts = jws.decode(jwsObj);
            assert.ok(jws.verify(jwsObj, alg, secret));
            assert.notOk(jws.verify(jwsObj, alg, "something else"));
            assert.deepEqual(parts.payload, payload);
            assert.deepEqual(parts.header, header);
        });
    });

    BITS.forEach((bits) => {
        it(`RSASSA using SHA-${bits} hash algorithm`, () => {
            const alg = `RS${bits}`;
            const header = { alg };
            const privateKey = rsaPrivateKey;
            const publicKey = rsaPublicKey;
            const wrongPublicKey = rsaWrongPublicKey;
            const jwsObj = jws.sign({
                header,
                payload,
                privateKey
            });
            const parts = jws.decode(jwsObj, { json: true });
            assert.ok(jws.verify(jwsObj, alg, publicKey));
            assert.notOk(jws.verify(jwsObj, alg, wrongPublicKey));
            assert.notOk(jws.verify(jwsObj, `HS${bits}`, publicKey));
            assert.deepEqual(parts.payload, payload);
            assert.deepEqual(parts.header, header);
        });
    });

    BITS.forEach((bits) => {
        const curve = CURVES[bits];
        it(`ECDSA using P-${curve} curve and SHA-${bits} hash algorithm`, () => {
            const alg = `ES${bits}`;
            const header = { alg };
            const privateKey = ecdsaPrivateKey[bits];
            const publicKey = ecdsaPublicKey[bits];
            const wrongPublicKey = ecdsaWrongPublicKey[bits];
            const jwsObj = jws.sign({
                header,
                payload: payloadString,
                privateKey
            });
            const parts = jws.decode(jwsObj);
            assert.ok(jws.verify(jwsObj, alg, publicKey));
            assert.notOk(jws.verify(jwsObj, alg, wrongPublicKey));
            assert.notOk(jws.verify(jwsObj, `HS${bits}`, publicKey));
            assert.deepEqual(parts.payload, payloadString);
            assert.deepEqual(parts.header, header);
        });
    });

    it("No digital signature or MAC value included", () => {
        const alg = "none";
        const header = { alg };
        const payload = "oh hey José!";
        const jwsObj = jws.sign({
            header,
            payload
        });
        const parts = jws.decode(jwsObj);
        assert.ok(jws.verify(jwsObj, alg));
        assert.ok(jws.verify(jwsObj, alg, "anything"), "should still verify");
        assert.notOk(jws.verify(jwsObj, "HS256", "anything"));
        assert.deepEqual(parts.payload, payload);
        assert.deepEqual(parts.header, header);
    });

    it("Streaming sign: HMAC", (done) => {
        const dataStream = readstream("data.txt");
        const secret = "shhhhh";
        const sig = jws.createSign({
            header: { alg: "HS256" },
            secret
        });
        dataStream.pipe(sig.payload);
        sig.on("done", (signature) => {
            assert.ok(jws.verify(signature, "HS256", secret));
            done();
        });
    });

    it("Streaming sign: RSA", (done) => {
        const dataStream = readstream("data.txt");
        const privateKeyStream = readstream("rsa-private.pem");
        const publicKey = rsaPublicKey;
        const wrongPublicKey = rsaWrongPublicKey;
        const sig = jws.createSign({
            header: { alg: "RS256" }
        });
        dataStream.pipe(sig.payload);

        process.nextTick(() => {
            privateKeyStream.pipe(sig.key);
        });

        sig.on("done", (signature) => {
            assert.ok(jws.verify(signature, "RS256", publicKey));
            assert.notOk(jws.verify(signature, "RS256", wrongPublicKey), "should not verify");
            assert.equal(jws.decode(signature).payload, readfile("data.txt"), "got all the data");
            done();
        });
    });

    it("Streaming sign: RSA, predefined streams", (done) => {
        const dataStream = readstream("data.txt");
        const privateKeyStream = readstream("rsa-private.pem");
        const publicKey = rsaPublicKey;
        const wrongPublicKey = rsaWrongPublicKey;
        const sig = jws.createSign({
            header: { alg: "RS256" },
            payload: dataStream,
            privateKey: privateKeyStream
        });
        sig.on("done", (signature) => {
            assert.ok(jws.verify(signature, "RS256", publicKey));
            assert.notOk(jws.verify(signature, "RS256", wrongPublicKey), "should not verify");
            assert.equal(jws.decode(signature).payload, readfile("data.txt"), "got all the data");
            done();
        });
    });

    it("Streaming verify: ECDSA", (done) => {
        const dataStream = readstream("data.txt");
        const privateKeyStream = readstream("ec512-private.pem");
        const publicKeyStream = readstream("ec512-public.pem");
        const sigStream = jws.createSign({
            header: { alg: "ES512" },
            payload: dataStream,
            privateKey: privateKeyStream
        });
        const verifier = jws.createVerify({ algorithm: "ES512" });
        sigStream.pipe(verifier.signature);
        publicKeyStream.pipe(verifier.key);
        verifier.on("done", (valid) => {
            assert.ok(valid);
            done();
        });
    });

    it("Streaming verify: ECDSA, with invalid key", (done) => {
        const dataStream = readstream("data.txt");
        const privateKeyStream = readstream("ec512-private.pem");
        const publicKeyStream = readstream("ec512-wrong-public.pem");
        const sigStream = jws.createSign({
            header: { alg: "ES512" },
            payload: dataStream,
            privateKey: privateKeyStream
        });
        const verifier = jws.createVerify({
            algorithm: "ES512",
            signature: sigStream,
            publicKey: publicKeyStream
        });
        verifier.on("done", (valid) => {
            assert.notOk(valid, "should not verify");
            done();
        });
    });

    it('Streaming verify: errors during verify should emit as "error"', (done) => {
        const verifierShouldError = jws.createVerify({
            algorithm: "ES512",
            signature: "a.b.c", // the short/invalid length signature will make jwa throw
            publicKey: "invalid-key-will-make-crypto-throw"
        });

        verifierShouldError.on("done", () => {
            assert.fail();
        });
        verifierShouldError.on("error", () => {
            done();
        });
    });

    it("Signing: should accept an encrypted key", () => {
        const alg = "RS256";
        const signature = jws.sign({
            header: { alg },
            payload: "verifyme",
            privateKey: {
                key: rsaPrivateKeyEncrypted,
                passphrase: encryptedPassphrase
            }
        });
        assert.ok(jws.verify(signature, "RS256", rsaPublicKey));
    });

    it("Streaming sign: should accept an encrypted key", (done) => {
        const alg = "RS256";
        const signer = jws.createSign({
            header: { alg },
            payload: "verifyme",
            privateKey: {
                key: rsaPrivateKeyEncrypted,
                passphrase: encryptedPassphrase
            }
        });
        const verifier = jws.createVerify({
            algorithm: alg,
            signature: signer,
            publicKey: rsaPublicKey
        });
        verifier.on("done", (verified) => {
            assert.ok(verified);
            done();
        });
    });

    it("decode: not a jws signature", () => {
        assert.equal(jws.decode("some garbage string"), null);
        assert.equal(jws.decode("http://sub.domain.org"), null);
    });

    it("decode: with a bogus header ", () => {
        const header = Buffer.from("oh hei José!").toString("base64");
        const payload = Buffer.from("sup").toString("base64");
        const sig = `${header}.${payload}.`;
        const parts = jws.decode(sig);
        assert.equal(parts, null);
    });

    it("decode: with invalid json in body", () => {
        const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64");
        const payload = Buffer.from("sup").toString("base64");
        const sig = `${header}.${payload}.`;
        let parts;
        assert.throws(() => {
            parts = jws.decode(sig);
        });
    });

    it("verify: missing or invalid algorithm", () => {
        const header = Buffer.from('{"something":"not an algo"}').toString("base64");
        const payload = Buffer.from("sup").toString("base64");
        const sig = `${header}.${payload}.`;
        try {
            jws.verify(sig);
        } catch (e) {
            assert.equal(e.code, "MISSING_ALGORITHM");
        }
        try {
            jws.verify(sig, "whatever");
        } catch (e) {
            assert.ok(e.message.match('"whatever" is not a valid algorithm.'));
        }
    });

    it("isValid", () => {
        const valid = jws.sign({ header: { alg: "hs256" }, payload: "hi", secret: "shhh" });
        const invalid = (function () {
            const header = Buffer.from("oh hei José!").toString("base64");
            const payload = Buffer.from("sup").toString("base64");
            return `${header}.${payload}.`;
        })();
        assert.equal(jws.isValid("http://sub.domain.org"), false);
        assert.equal(jws.isValid(invalid), false);
        assert.equal(jws.isValid(valid), true);
    });

    it("#50 mangled binary payload", () => {
        const sig = jws.sign({
            header: {
                alg: "HS256"
            },
            payload: Buffer.from("TkJyotZe8NFpgdfnmgINqg==", "base64"),
            secret: Buffer.from("8NRxgIkVxP8LyyXSL4b1dg==", "base64")
        });

        assert.equal(sig, "eyJhbGciOiJIUzI1NiJ9.TkJyotZe8NFpgdfnmgINqg.9XilaLN_sXqWFtlUCdAlGI85PCEbJZSIQpakyAle-vo");
    });
});
