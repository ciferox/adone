const fixtures = require("../fixtures/go-stretch-key");

const {
    net: { p2p: { crypto } }
} = adone;

describe("crypto", "keys", "keyStretcher", () => {
    describe("generate", () => {
        const ciphers = ["AES-128", "AES-256", "Blowfish"];
        const hashes = ["SHA1", "SHA256", "SHA512"];
        let res;
        let secret;

        before(() => {
            res = crypto.keys.generateEphemeralKeyPair("P-256");
            secret = res.genSharedKey(res.key);
        });

        ciphers.forEach((cipher) => {
            hashes.forEach((hash) => {
                it(`${cipher} - ${hash}`, () => {
                    const keys = crypto.keys.keyStretcher(cipher, hash, secret);
                    assert.exists(keys.k1);
                    assert.exists(keys.k2);
                });
            });
        });
    });

    describe("go interop", () => {
        fixtures.forEach((test) => {
            it(`${test.cipher} - ${test.hash}`, () => {
                const cipher = test.cipher;
                const hash = test.hash;
                const secret = test.secret;
                const keys = crypto.keys.keyStretcher(cipher, hash, secret);

                expect(keys.k1.iv).to.be.eql(test.k1.iv);
                expect(keys.k1.cipherKey).to.be.eql(test.k1.cipherKey);
                expect(keys.k1.macKey).to.be.eql(test.k1.macKey);

                expect(keys.k2.iv).to.be.eql(test.k2.iv);
                expect(keys.k2.cipherKey).to.be.eql(test.k2.cipherKey);
                expect(keys.k2.macKey).to.be.eql(test.k2.macKey);
            });
        });
    });
});
