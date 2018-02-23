const async = require("async");
const forge = require("node-forge");

const {
    is,
    // crypto: { pki }
} = adone;

/**
 * Gets a self-signed X.509 certificate for the key.
 *
 * The output Buffer contains the PKCS #7 message in DER.
 *
 * TODO: move to libp2p-crypto package
 *
 * @param {KeyInfo} key - The id and name of the key
 * @param {RsaPrivateKey} privateKey - The naked key
 * @param {function(Error, Certificate)} callback
 * @returns {undefined}
 */
const certificateForKey = (key, privateKey, callback) => {
    const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    const attrs = [{
        name: "organizationName",
        value: "ipfs"
    }, {
        shortName: "OU",
        value: "keystore"
    }, {
        name: "commonName",
        value: key.id
    }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
        name: "basicConstraints",
        cA: true
    }, {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
    }, {
        name: "extKeyUsage",
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true
    }, {
        name: "nsCertType",
        client: true,
        server: true,
        email: true,
        objsign: true,
        sslCA: true,
        emailCA: true,
        objCA: true
    }]);
    // self-sign certificate
    cert.sign(privateKey);

    return callback(null, cert);
};

/**
 * Cryptographic Message Syntax (aka PKCS #7)
 *
 * CMS describes an encapsulation syntax for data protection. It
 * is used to digitally sign, digest, authenticate, or encrypt
 * arbitrary message content.
 *
 * See RFC 5652 for all the details.
 */
export default class CMS {
    /**
     * Creates a new instance with a keychain
     *
     * @param {Keychain} keychain - the available keys
     */
    constructor(keychain) {
        if (!keychain) {
            throw new Error("keychain is required");
        }

        this.keychain = keychain;
    }

    /**
     * Creates some protected data.
     *
     * The output Buffer contains the PKCS #7 message in DER.
     *
     * @param {string} name - The local key name.
     * @param {Buffer} plain - The data to encrypt.
     * @param {function(Error, Buffer)} callback
     * @returns {undefined}
     */
    encrypt(name, plain, callback) {
        const self = this;
        const done = (err, result) => async.setImmediate(() => callback(err, result));

        if (!is.buffer(plain)) {
            return done(new Error("Plain data must be a Buffer"));
        }

        async.series([
            (cb) => self.keychain.findKeyByName(name, cb),
            (cb) => self.keychain._getPrivateKey(name, cb)
        ], (err, results) => {
            if (err) {
                return done(err);
            }

            const key = results[0];
            const pem = results[1];
            try {
                const privateKey = forge.pki.decryptRsaPrivateKey(pem, self.keychain._());
                certificateForKey(key, privateKey, (err, certificate) => {
                    if (err) {
                        return callback(err);
                    }

                    // create a p7 enveloped message
                    const p7 = forge.pkcs7.createEnvelopedData();
                    p7.addRecipient(certificate);
                    p7.content = forge.util.createBuffer(plain);
                    p7.encrypt();

                    // convert message to DER
                    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
                    done(null, Buffer.from(der, "binary"));
                });
            } catch (err) {
                done(err);
            }
        });
    }

    /**
     * Reads some protected data.
     *
     * The keychain must contain one of the keys used to encrypt the data.  If none of the keys
     * exists, an Error is returned with the property 'missingKeys'.  It is array of key ids.
     *
     * @param {Buffer} cmsData - The CMS encrypted data to decrypt.
     * @param {function(Error, Buffer)} callback
     * @returns {undefined}
     */
    decrypt(cmsData, callback) {
        const done = (err, result) => async.setImmediate(() => callback(err, result));

        if (!is.buffer(cmsData)) {
            return done(new Error("CMS data is required"));
        }

        const self = this;
        let cms;
        try {
            const buf = forge.util.createBuffer(cmsData.toString("binary"));
            const obj = forge.asn1.fromDer(buf);
            cms = forge.pkcs7.messageFromAsn1(obj);
        } catch (err) {
            return done(new Error(`Invalid CMS: ${err.message}`));
        }

        // Find a recipient whose key we hold. We only deal with recipient certs
        // issued by ipfs (O=ipfs).
        const recipients = cms.recipients
            .filter((r) => r.issuer.find((a) => a.shortName === "O" && a.value === "ipfs"))
            .filter((r) => r.issuer.find((a) => a.shortName === "CN"))
            .map((r) => {
                return {
                    recipient: r,
                    keyId: r.issuer.find((a) => a.shortName === "CN").value
                };
            });
        async.detect(
            recipients,
            (r, cb) => self.keychain.findKeyById(r.keyId, (err, info) => cb(null, !err && info)),
            (err, r) => {
                if (err) {
                    return done(err);
                }
                if (!r) {
                    const missingKeys = recipients.map((r) => r.keyId);
                    err = new Error(`Decryption needs one of the key(s): ${missingKeys.join(", ")}`);
                    err.missingKeys = missingKeys;
                    return done(err);
                }

                async.waterfall([
                    (cb) => self.keychain.findKeyById(r.keyId, cb),
                    (key, cb) => self.keychain._getPrivateKey(key.name, cb)
                ], (err, pem) => {
                    if (err) {
                        return done(err);
                    }

                    const privateKey = forge.pki.decryptRsaPrivateKey(pem, self.keychain._());
                    cms.decrypt(r.recipient, privateKey);
                    done(null, Buffer.from(cms.content.getBytes(), "binary"));
                });
            }
        );
    }
}
