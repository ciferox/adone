describe("format conversions", function () {
    const {
        crypto
    } = adone;

    it("should convert private key to/from PEM", () => {
        const privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);
        assert.equal(crypto.pki.privateKeyToPem(privateKey), this.pem.privateKey);
    });

    it("should convert public key to/from PEM", () => {
        const publicKey = crypto.pki.publicKeyFromPem(this.pem.publicKey);
        assert.equal(crypto.pki.publicKeyToPem(publicKey), this.pem.publicKey);
    });

    it("should convert a PKCS#8 PrivateKeyInfo to/from PEM", () => {
        const privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKeyInfo);
        const rsaPrivateKey = crypto.pki.privateKeyToAsn1(privateKey);
        const pki = crypto.pki.wrapRsaPrivateKey(rsaPrivateKey);
        assert.equal(crypto.pki.privateKeyInfoToPem(pki), this.pem.privateKeyInfo);
    });
});
