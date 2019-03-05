const {
    p2p: { PeerId, Keychain }
} = adone;

module.exports = (datastore1, datastore2) => {
    describe("keychain", () => {
        const passPhrase = "this is not a secure phrase";
        const keyName = "tajné jméno";
        const renamedKeyName = "ชื่อลับ";
        let keyInfo;
        let ecKeyInfo;
        let secpKeyInfo;
        let emptyKeystore;
        let ks;

        before((done) => {
            ks = new Keychain(datastore2, { passPhrase });
            emptyKeystore = new Keychain(datastore1, { passPhrase });
            done();
        });

        it("needs a pass phrase to encrypt a key", () => {
            expect(() => new Keychain(datastore2)).to.throw();
        });

        it("needs a NIST SP 800-132 non-weak pass phrase", () => {
            expect(() => new Keychain(datastore2, { passPhrase: "< 20 character" })).to.throw();
        });

        it("needs a store to persist a key", () => {
            expect(() => new Keychain(null, { passPhrase })).to.throw();
        });

        it("has default options", () => {
            expect(Keychain.options).to.exist();
        });

        it("needs a supported hashing alorithm", () => {
            const ok = new Keychain(datastore2, { passPhrase, dek: { hash: "sha2-256" } });
            expect(ok).to.exist();
            expect(() => new Keychain(datastore2, { passPhrase, dek: { hash: "my-hash" } })).to.throw();
        });

        it("can generate options", () => {
            const options = Keychain.generateOptions();
            options.passPhrase = passPhrase;
            const chain = new Keychain(datastore2, options);
            expect(chain).to.exist();
        });

        describe("key name", () => {
            it("is a valid filename and non-ASCII", () => {
                ks.removeKey("../../nasty", (err) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("message", "Invalid key name '../../nasty'");
                });
                ks.removeKey("", (err) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("message", "Invalid key name ''");
                });
                ks.removeKey("    ", (err) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("message", "Invalid key name '    '");
                });
                ks.removeKey(null, (err) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("message", "Invalid key name 'null'");
                });
                ks.removeKey(undefined, (err) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("message", "Invalid key name 'undefined'");
                });
            });
        });

        describe.todo("key", () => {
            it("can be an ed25519 key", function (done) {
                this.timeout(50 * 1000);
                ks.createKey(`${keyName}ed25519`, "ed25519", 2048, (err, info) => {
                    expect(err).to.not.exist();
                    expect(info).exist();
                    ecKeyInfo = info;
                    done();
                });
            });

            it("can be an secp256k1 key", function (done) {
                this.timeout(50 * 1000);
                ks.createKey(`${keyName}secp256k1`, "secp256k1", 2048, (err, info) => {
                    expect(err).to.not.exist();
                    expect(info).exist();
                    secpKeyInfo = info;
                    done();
                });
            });

            it("can be an RSA key", function (done) {
                this.timeout(50 * 1000);
                ks.createKey(keyName, "rsa", 2048, (err, info) => {
                    expect(err).to.not.exist();
                    expect(info).exist();
                    keyInfo = info;
                    done();
                });
            });

            it("has a name and id", () => {
                expect(keyInfo).to.have.property("name", keyName);
                expect(keyInfo).to.have.property("id");
            });

            it("is encrypted PEM encoded PKCS #8", (done) => {
                ks._getPrivateKey(keyName, (err, pem) => {
                    expect(err).to.not.exist();
                    expect(pem).to.startsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----");
                    done();
                });
            });

            it("does not overwrite existing key", (done) => {
                ks.createKey(keyName, "rsa", 2048, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it('cannot create the "self" key', (done) => {
                ks.createKey("self", "rsa", 2048, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("should validate name is string", (done) => {
                ks.createKey(5, "rsa", 2048, (err) => {
                    expect(err).to.exist();
                    expect(err.message).to.contain("Invalid key name");
                    done();
                });
            });

            it("should validate type is string", (done) => {
                ks.createKey(`TEST${  Date.now()}`, null, 2048, (err) => {
                    expect(err).to.exist();
                    expect(err.message).to.contain("Invalid key type");
                    done();
                });
            });

            it("should validate size is integer", (done) => {
                ks.createKey(`TEST${  Date.now()}`, "rsa", "string", (err) => {
                    expect(err).to.exist();
                    expect(err.message).to.contain("Invalid key size");
                    done();
                });
            });

            describe("implements NIST SP 800-131A", () => {
                it("disallows RSA length < 2048", (done) => {
                    ks.createKey("bad-nist-rsa", "rsa", 1024, (err) => {
                        expect(err).to.exist();
                        expect(err).to.have.property("message", "Invalid RSA key size 1024");
                        done();
                    });
                });
            });
        });

        describe.todo("query", () => {
            it("finds all existing keys", (done) => {
                ks.listKeys((err, keys) => {
                    expect(err).to.not.exist();
                    expect(keys).to.exist();
                    const mykey = keys.find((k) => k.name.normalize() === keyName.normalize());
                    expect(mykey).to.exist();
                    done();
                });
            });

            it("finds a key by name", (done) => {
                ks.findKeyByName(keyName, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.deep.equal(keyInfo);
                    done();
                });
            });

            it("finds a key by id", (done) => {
                ks.findKeyById(keyInfo.id, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.deep.equal(keyInfo);
                    done();
                });
            });

            it("returns the key's name and id", (done) => {
                ks.listKeys((err, keys) => {
                    expect(err).to.not.exist();
                    expect(keys).to.exist();
                    keys.forEach((key) => {
                        expect(key).to.have.property("name");
                        expect(key).to.have.property("id");
                    });
                    done();
                });
            });
        });

        describe("CMS protected data", () => {
            const plainData = Buffer.from("This is a message from Alice to Bob");
            let cms;

            it("service is available", (done) => {
                expect(ks).to.have.property("cms");
                done();
            });

            it("requires a key", (done) => {
                ks.cms.encrypt("no-key", plainData, (err, msg) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("requires plain data as a Buffer", (done) => {
                ks.cms.encrypt(keyName, "plain data", (err, msg) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it.todo("encrypts", (done) => {
                ks.cms.encrypt(keyName, plainData, (err, msg) => {
                    expect(err).to.not.exist();
                    expect(msg).to.exist();
                    expect(msg).to.be.instanceOf(Buffer);
                    cms = msg;
                    done();
                });
            });

            it("is a PKCS #7 message", (done) => {
                ks.cms.decrypt("not CMS", (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("is a PKCS #7 binary message", (done) => {
                ks.cms.decrypt(plainData, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it.todo("cannot be read without the key", (done) => {
                emptyKeystore.cms.decrypt(cms, (err, plain) => {
                    expect(err).to.exist();
                    expect(err).to.have.property("missingKeys");
                    expect(err.missingKeys).to.eql([keyInfo.id]);
                    done();
                });
            });

            it.todo("can be read with the key", (done) => {
                ks.cms.decrypt(cms, (err, plain) => {
                    expect(err).to.not.exist();
                    expect(plain).to.exist();
                    expect(plain.toString()).to.equal(plainData.toString());
                    done();
                });
            });
        });

        describe.todo("exported key", () => {
            let pemKey;
            let ed25519Key;
            let secp256k1Key;

            it("is a PKCS #8 encrypted pem", (done) => {
                ks.exportKey(keyName, "password", (err, pem) => {
                    expect(err).to.not.exist();
                    expect(pem).to.startsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----");
                    pemKey = pem;
                    done();
                });
            });

            it("can be imported", (done) => {
                ks.importKey("imported-key", pemKey, "password", (err, key) => {
                    expect(err).to.not.exist();
                    expect(key.name).to.equal("imported-key");
                    expect(key.id).to.equal(keyInfo.id);
                    done();
                });
            });

            it("can export ed25519 key", (done) => {
                ks.exportKey(`${keyName}ed25519`, (err, key) => {
                    expect(err).to.not.exist();
                    ed25519Key = key;
                    expect(key).to.exist();
                    done();
                });
            });

            it("ed25519 key can be imported", (done) => {
                ks.importKey("imported-key-ed25199", ed25519Key, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key.name).to.equal("imported-key-ed25199");
                    expect(key.id).to.equal(ecKeyInfo.id);
                    done();
                });
            });

            it("can export secp256k1 key", (done) => {
                ks.exportKey(`${keyName}secp256k1`, (err, key) => {
                    expect(err).to.not.exist();
                    secp256k1Key = key;
                    expect(key).to.exist();
                    done();
                });
            });

            it("secp256k1 key can be imported", (done) => {
                ks.importKey("imported-key-secp256k1", secp256k1Key, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key.name).to.equal("imported-key-secp256k1");
                    expect(key.id).to.equal(secpKeyInfo.id);
                    done();
                });
            });

            it("cannot be imported as an existing key name", (done) => {
                ks.importKey(keyName, pemKey, "password", (err, key) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("cannot be imported with the wrong password", function (done) {
                this.timeout(5 * 1000);
                ks.importKey("a-new-name-for-import", pemKey, "not the password", (err, key) => {
                    expect(err).to.exist();
                    done();
                });
            });
        });

        describe("peer id", () => {
            const alicePrivKey = "CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw==";
            let alice;

            before((done) => {
                const encoded = Buffer.from(alicePrivKey, "base64");
                PeerId.createFromPrivKey(encoded, (err, id) => {
                    expect(err).to.not.exist();
                    alice = id;
                    done();
                });
            });

            it("private key can be imported", (done) => {
                ks.importPeer("alice", alice, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key.name).to.equal("alice");
                    expect(key.id).to.equal(alice.toB58String());
                    done();
                });
            });

            it("key id exists", (done) => {
                ks.findKeyById(alice.toB58String(), (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", "alice");
                    expect(key).to.have.property("id", alice.toB58String());
                    done();
                });
            });

            it("key name exists", (done) => {
                ks.findKeyByName("alice", (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", "alice");
                    expect(key).to.have.property("id", alice.toB58String());
                    done();
                });
            });
        });

        describe("rename", () => {
            it("requires an existing key name", (done) => {
                ks.renameKey("not-there", renamedKeyName, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("requires a valid new key name", (done) => {
                ks.renameKey(keyName, "..\not-valid", (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("does not overwrite existing key", (done) => {
                ks.renameKey(keyName, keyName, (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it('cannot create the "self" key', (done) => {
                ks.renameKey(keyName, "self", (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it.todo("removes the existing key name", (done) => {
                ks.renameKey(keyName, renamedKeyName, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", renamedKeyName);
                    expect(key).to.have.property("id", keyInfo.id);
                    ks.findKeyByName(keyName, (err, key) => {
                        expect(err).to.exist();
                        done();
                    });
                });
            });

            it.todo("creates the new key name", (done) => {
                ks.findKeyByName(renamedKeyName, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", renamedKeyName);
                    done();
                });
            });

            it.todo("does not change the key ID", (done) => {
                ks.findKeyByName(renamedKeyName, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", renamedKeyName);
                    expect(key).to.have.property("id", keyInfo.id);
                    done();
                });
            });
        });

        describe("key removal", () => {
            it('cannot remove the "self" key', (done) => {
                ks.removeKey("self", (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it("cannot remove an unknown key", (done) => {
                ks.removeKey("not-there", (err) => {
                    expect(err).to.exist();
                    done();
                });
            });

            it.todo("can remove a known key", (done) => {
                ks.removeKey(renamedKeyName, (err, key) => {
                    expect(err).to.not.exist();
                    expect(key).to.exist();
                    expect(key).to.have.property("name", renamedKeyName);
                    expect(key).to.have.property("id", keyInfo.id);
                    done();
                });
            });
        });
    });
};
