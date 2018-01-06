describe("key encryption", function () {
    const {
        crypto
    } = adone;

    for (const algorithm of ["aes128", "aes192", "aes256", "3des", "des"]) {
        it(`should PKCS#8 encrypt and decrypt private key with ${algorithm}`, () => { // eslint-disable-line
            let privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);
            const encryptedPem = crypto.pki.encryptRsaPrivateKey(privateKey, "password", { algorithm });
            privateKey = crypto.pki.decryptRsaPrivateKey(encryptedPem, "password");
            assert.equal(crypto.pki.privateKeyToPem(privateKey), this.pem.privateKey);
        });
    }

    for (const algorithm of ["aes128", "aes192", "aes256"]) {
        for (const prfAlgorithm of ["sha1", "sha224", "sha256", "sha384", "sha512"]) {
            it(`should PKCS#8 encrypt and decrypt private key with ${algorithm} encryption and ${prfAlgorithm} PRF`, () => { // eslint-disable-line
                let privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);
                const encryptedPem = crypto.pki.encryptRsaPrivateKey(privateKey, "password", {
                    algorithm,
                    prfAlgorithm
                });
                privateKey = crypto.pki.decryptRsaPrivateKey(encryptedPem, "password");
                assert.equal(crypto.pki.privateKeyToPem(privateKey), this.pem.privateKey);
            });
        }
    }

    for (const algorithm of ["aes128", "aes192", "aes256", "3des", "des"]) {
        it(`should legacy (OpenSSL style) encrypt and decrypt private key with ${algorithm}`, () => { // eslint-disable-line
            let privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);
            const encryptedPem = crypto.pki.encryptRsaPrivateKey(privateKey, "password", { algorithm, legacy: true });
            privateKey = crypto.pki.decryptRsaPrivateKey(encryptedPem, "password");
            assert.equal(crypto.pki.privateKeyToPem(privateKey), this.pem.privateKey);
        });
    }
});
