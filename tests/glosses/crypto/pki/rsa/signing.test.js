describe("signing", function () {
    const {
        crypto
    } = adone;

    const forge = require("node-forge");
    const UTIL = forge.util;

    const _signature =
        "9200ece65cdaed36bcc20b94c65af852e4f88f0b4fe5b249d54665f815992ac4" +
        "3a1399e65d938c6a7f16dd39d971a53ca66523209dbbfbcb67afa579dbb0c220" +
        "672813d9e6f4818f29b9becbb29da2032c5e422da97e0c39bfb7a2e7d568615a" +
        "5073af0337ff215a8e1b2332d668691f4fb731440055420c24ac451dd3c913f4";

    it("should verify signature", () => {
        const publicKey = crypto.pki.publicKeyFromPem(this.pem.publicKey);
        const md = crypto.md.sha1.create();
        md.update("0123456789abcdef");
        const signature = UTIL.hexToBytes(_signature);
        assert.ok(publicKey.verify(md.digest().getBytes(), signature));
    });

    it("should sign and verify", () => {
        const privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);
        const publicKey = crypto.pki.publicKeyFromPem(this.pem.publicKey);
        const md = crypto.md.sha1.create();
        md.update("0123456789abcdef");
        const signature = privateKey.sign(md);
        assert.ok(publicKey.verify(md.digest().getBytes(), signature));
    });

    it("should generate missing CRT parameters, sign, and verify", () => {
        let privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);

        // remove dQ, dP, and qInv
        privateKey = crypto.pki.rsa.setPrivateKey(privateKey.n, privateKey.e, privateKey.d, privateKey.p, privateKey.q);

        const publicKey = crypto.pki.publicKeyFromPem(this.pem.publicKey);
        const md = crypto.md.sha1.create();
        md.update("0123456789abcdef");
        const signature = privateKey.sign(md);
        assert.ok(publicKey.verify(md.digest().getBytes(), signature));
    });

    it("should sign and verify with a private key containing only e, n, and d parameters", () => {
        let privateKey = crypto.pki.privateKeyFromPem(this.pem.privateKey);

        // remove all CRT parameters from private key, so that it consists
        // only of e, n and d (which make a perfectly valid private key, but its
        // operations are slower)
        privateKey = crypto.pki.rsa.setPrivateKey(
            privateKey.n, privateKey.e, privateKey.d);

        const publicKey = crypto.pki.publicKeyFromPem(this.pem.publicKey);
        const md = crypto.md.sha1.create();
        md.update("0123456789abcdef");
        const signature = privateKey.sign(md);
        assert.ok(publicKey.verify(md.digest().getBytes(), signature));
    });
});
