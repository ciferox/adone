const rimraf = require("rimraf");
const async = require("async");

const {
    crypto,
    datastore,
    multi,
    realm: { Keychain },
    std: { os, path }
} = adone;

const { Identity } = crypto;

describe.skip("realm", "Keychain", () => {
    const store1 = path.join(os.tmpdir(), "test-keystore-1");
    const store2 = path.join(os.tmpdir(), "test-keystore-2");
    const datastore1 = new datastore.backend.Fs(store1);
    const datastore2 = new datastore.backend.Fs(store2);

    before((done) => {
        async.series([
            (cb) => datastore1.open(cb),
            (cb) => datastore2.open(cb)
        ], done);
    });

    after((done) => {
        async.series([
            (cb) => datastore1.close(cb),
            (cb) => datastore2.close(cb),
            (cb) => rimraf(store1, cb),
            (cb) => rimraf(store2, cb)
        ], done);
    });

    describe("interface", () => {
        const passPhrase = "this is not a secure phrase";
        const rsaKeyName = "tajné jméno";
        const renamedRsaKeyName = "ชื่อลับ";
        let rsaKeyInfo;
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
            assert.exists(Keychain.options);
        });

        it("needs a supported hashing alorithm", () => {
            const ok = new Keychain(datastore2, { passPhrase, dek: { hash: "sha2-256" } });
            assert.exists(ok);
            expect(() => new Keychain(datastore2, { passPhrase, dek: { hash: "my-hash" } })).to.throw();
        });

        it("can generate options", () => {
            const options = Keychain.generateOptions();
            options.passPhrase = passPhrase;
            const chain = new Keychain(datastore2, options);
            assert.exists(chain);
        });

        describe("key name", () => {
            it("is a valid filename and non-ASCII", () => {
                ks.removeKey("../../nasty", (err) => {
                    assert.exists(err);
                    expect(err).to.have.property("message", "Invalid key name '../../nasty'");
                });
                ks.removeKey("", (err) => {
                    assert.exists(err);
                    expect(err).to.have.property("message", "Invalid key name ''");
                });
                ks.removeKey("    ", (err) => {
                    assert.exists(err);
                    expect(err).to.have.property("message", "Invalid key name '    '");
                });
                ks.removeKey(null, (err) => {
                    assert.exists(err);
                    expect(err).to.have.property("message", "Invalid key name 'null'");
                });
                ks.removeKey(undefined, (err) => {
                    assert.exists(err);
                    expect(err).to.have.property("message", "Invalid key name 'undefined'");
                });
            });
        });

        describe("key", () => {
            it("can be an RSA key", function (done) {
                this.timeout(50 * 1000);
                ks.createKey(rsaKeyName, "rsa", 2048, (err, info) => {
                    assert.notExists(err);
                    assert.exists(info);
                    rsaKeyInfo = info;
                    done();
                });
            });

            it("has a name and id", () => {
                expect(rsaKeyInfo).to.have.property("name", rsaKeyName);
                expect(rsaKeyInfo).to.have.property("id");
            });

            it("is encrypted PEM encoded PKCS #8", (done) => {
                ks._getPrivateKey(rsaKeyName, (err, pem) => {
                    assert.notExists(err);
                    assert.true(pem.startsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----"));
                    done();
                });
            });

            it("does not overwrite existing key", (done) => {
                ks.createKey(rsaKeyName, "rsa", 2048, (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it('cannot create the "self" key', (done) => {
                ks.createKey("self", "rsa", 2048, (err) => {
                    assert.exists(err);
                    done();
                });
            });

            describe("implements NIST SP 800-131A", () => {
                it("disallows RSA length < 2048", (done) => {
                    ks.createKey("bad-nist-rsa", "rsa", 1024, (err) => {
                        assert.exists(err);
                        expect(err).to.have.property("message", "Invalid RSA key size 1024");
                        done();
                    });
                });
            });
        });

        describe("query", () => {
            it("finds all existing keys", (done) => {
                ks.listKeys((err, keys) => {
                    assert.notExists(err);
                    assert.exists(keys);
                    const mykey = keys.find((k) => k.name.normalize() === rsaKeyName.normalize());
                    assert.exists(mykey);
                    done();
                });
            });

            it("finds a key by name", (done) => {
                ks.findKeyByName(rsaKeyName, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.deep.equal(rsaKeyInfo);
                    done();
                });
            });

            it("finds a key by id", (done) => {
                ks.findKeyById(rsaKeyInfo.id, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.deep.equal(rsaKeyInfo);
                    done();
                });
            });

            it("returns the key's name and id", (done) => {
                ks.listKeys((err, keys) => {
                    assert.notExists(err);
                    assert.exists(keys);
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
                    assert.exists(err);
                    done();
                });
            });

            it("requires plain data as a Buffer", (done) => {
                ks.cms.encrypt(rsaKeyName, "plain data", (err, msg) => {
                    assert.exists(err);
                    done();
                });
            });

            it("encrypts", (done) => {
                ks.cms.encrypt(rsaKeyName, plainData, (err, msg) => {
                    assert.notExists(err);
                    assert.exists(msg);
                    expect(msg).to.be.instanceOf(Buffer);
                    cms = msg;
                    done();
                });
            });

            it("is a PKCS #7 message", (done) => {
                ks.cms.decrypt("not CMS", (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("is a PKCS #7 binary message", (done) => {
                ks.cms.decrypt(plainData, (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("cannot be read without the key", (done) => {
                emptyKeystore.cms.decrypt(cms, (err, plain) => {
                    assert.exists(err);
                    expect(err).to.have.property("missingKeys");
                    expect(err.missingKeys).to.eql([rsaKeyInfo.id]);
                    done();
                });
            });

            it("can be read with the key", (done) => {
                ks.cms.decrypt(cms, (err, plain) => {
                    assert.notExists(err);
                    assert.exists(plain);
                    expect(plain.toString()).to.equal(plainData.toString());
                    done();
                });
            });
        });

        describe("exported key", () => {
            let pemKey;

            it("is a PKCS #8 encrypted pem", (done) => {
                ks.exportKey(rsaKeyName, "password", (err, pem) => {
                    assert.notExists(err);
                    assert.true(pem.startsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----"));
                    pemKey = pem;
                    done();
                });
            });

            it("can be imported", (done) => {
                ks.importKey("imported-key", pemKey, "password", (err, key) => {
                    assert.notExists(err);
                    expect(key.name).to.equal("imported-key");
                    expect(key.id).to.equal(rsaKeyInfo.id);
                    done();
                });
            });

            it("cannot be imported as an existing key name", (done) => {
                ks.importKey(rsaKeyName, pemKey, "password", (err, key) => {
                    assert.exists(err);
                    done();
                });
            });

            it("cannot be imported with the wrong password", function (done) {
                this.timeout(5 * 1000);
                ks.importKey("a-new-name-for-import", pemKey, "not the password", (err, key) => {
                    assert.exists(err);
                    done();
                });
            });
        });

        describe("identity", () => {
            const alicePrivKey = "CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw==";
            let alice;

            before(() => {
                const encoded = Buffer.from(alicePrivKey, "base64");
                const id = Identity.createFromPrivKey(encoded);
                alice = id;
            });

            it("private key can be imported", (done) => {
                ks.importPeer("alice", alice, (err, key) => {
                    assert.notExists(err);
                    expect(key.name).to.equal("alice");
                    expect(key.id).to.equal(alice.asBase58());
                    done();
                });
            });

            it("key id exists", (done) => {
                ks.findKeyById(alice.asBase58(), (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", "alice");
                    expect(key).to.have.property("id", alice.asBase58());
                    done();
                });
            });

            it("key name exists", (done) => {
                ks.findKeyByName("alice", (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", "alice");
                    expect(key).to.have.property("id", alice.asBase58());
                    done();
                });
            });
        });

        describe("rename", () => {
            it("requires an existing key name", (done) => {
                ks.renameKey("not-there", renamedRsaKeyName, (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("requires a valid new key name", (done) => {
                ks.renameKey(rsaKeyName, "..\not-valid", (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("does not overwrite existing key", (done) => {
                ks.renameKey(rsaKeyName, rsaKeyName, (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it('cannot create the "self" key', (done) => {
                ks.renameKey(rsaKeyName, "self", (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("removes the existing key name", (done) => {
                ks.renameKey(rsaKeyName, renamedRsaKeyName, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", renamedRsaKeyName);
                    expect(key).to.have.property("id", rsaKeyInfo.id);
                    ks.findKeyByName(rsaKeyName, (err, key) => {
                        assert.exists(err);
                        done();
                    });
                });
            });

            it("creates the new key name", (done) => {
                ks.findKeyByName(renamedRsaKeyName, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", renamedRsaKeyName);
                    done();
                });
            });

            it("does not change the key ID", (done) => {
                ks.findKeyByName(renamedRsaKeyName, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", renamedRsaKeyName);
                    expect(key).to.have.property("id", rsaKeyInfo.id);
                    done();
                });
            });
        });

        describe("key removal", () => {
            it('cannot remove the "self" key', (done) => {
                ks.removeKey("self", (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("cannot remove an unknown key", (done) => {
                ks.removeKey("not-there", (err) => {
                    assert.exists(err);
                    done();
                });
            });

            it("can remove a known key", (done) => {
                ks.removeKey(renamedRsaKeyName, (err, key) => {
                    assert.notExists(err);
                    assert.exists(key);
                    expect(key).to.have.property("name", renamedRsaKeyName);
                    expect(key).to.have.property("id", rsaKeyInfo.id);
                    done();
                });
            });
        });
    });

    describe("cms interop", () => {
        const passPhrase = "this is not a secure phrase";
        const aliceKeyName = "cms-interop-alice";
        let ks;

        before((done) => {
            ks = new Keychain(datastore2, { passPhrase });
            done();
        });

        const plainData = Buffer.from("This is a message from Alice to Bob");

        it("imports openssl key", function (done) {
            this.timeout(10 * 1000);
            const aliceKid = "QmNzBqPwp42HZJccsLtc4ok6LjZAspckgs2du5tTmjPfFA";
            const alice = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICxjBABgkqhkiG9w0BBQ0wMzAbBgkqhkiG9w0BBQwwDgQIMhYqiVoLJMICAggA
MBQGCCqGSIb3DQMHBAhU7J9bcJPLDQSCAoDzi0dP6z97wJBs3jK2hDvZYdoScknG
QMPOnpG1LO3IZ7nFha1dta5liWX+xRFV04nmVYkkNTJAPS0xjJOG9B5Hm7wm8uTd
1rOaYKOW5S9+1sD03N+fAx9DDFtB7OyvSdw9ty6BtHAqlFk3+/APASJS12ak2pg7
/Ei6hChSYYRS9WWGw4lmSitOBxTmrPY1HmODXkR3txR17LjikrMTd6wyky9l/u7A
CgkMnj1kn49McOBJ4gO14c9524lw9OkPatyZK39evFhx8AET73LrzCnsf74HW9Ri
dKq0FiKLVm2wAXBZqdd5ll/TPj3wmFqhhLSj/txCAGg+079gq2XPYxxYC61JNekA
ATKev5zh8x1Mf1maarKN72sD28kS/J+aVFoARIOTxbG3g+1UbYs/00iFcuIaM4IY
zB1kQUFe13iWBsJ9nfvN7TJNSVnh8NqHNbSg0SdzKlpZHHSWwOUrsKmxmw/XRVy/
ufvN0hZQ3BuK5MZLixMWAyKc9zbZSOB7E7VNaK5Fmm85FRz0L1qRjHvoGcEIhrOt
0sjbsRvjs33J8fia0FF9nVfOXvt/67IGBKxIMF9eE91pY5wJNwmXcBk8jghTZs83
GNmMB+cGH1XFX4cT4kUGzvqTF2zt7IP+P2cQTS1+imKm7r8GJ7ClEZ9COWWdZIcH
igg5jozKCW82JsuWSiW9tu0F/6DuvYiZwHS3OLiJP0CuLfbOaRw8Jia1RTvXEH7m
3N0/kZ8hJIK4M/t/UAlALjeNtFxYrFgsPgLxxcq7al1ruG7zBq8L/G3RnkSjtHqE
cn4oisOvxCprs4aM9UVjtZTCjfyNpX8UWwT1W3rySV+KQNhxuMy3RzmL
-----END ENCRYPTED PRIVATE KEY-----
`;
            ks.importKey(aliceKeyName, alice, "mypassword", (err, key) => {
                expect(err).to.not.exist();
                expect(key.name).to.equal(aliceKeyName);
                expect(key.id).to.equal(aliceKid);
                done();
            });
        });

        it("decrypts node-forge example", (done) => {
            const example = `
MIIBcwYJKoZIhvcNAQcDoIIBZDCCAWACAQAxgfowgfcCAQAwYDBbMQ0wCwYDVQQK
EwRpcGZzMREwDwYDVQQLEwhrZXlzdG9yZTE3MDUGA1UEAxMuUW1OekJxUHdwNDJI
WkpjY3NMdGM0b2s2TGpaQXNwY2tnczJkdTV0VG1qUGZGQQIBATANBgkqhkiG9w0B
AQEFAASBgLKXCZQYmMLuQ8m0Ex/rr3KNK+Q2+QG1zIbIQ9MFPUNQ7AOgGOHyL40k
d1gr188EHuiwd90PafZoQF9VRSX9YtwGNqAE8+LD8VaITxCFbLGRTjAqeOUHR8cO
knU1yykWGkdlbclCuu0NaAfmb8o0OX50CbEKZB7xmsv8tnqn0H0jMF4GCSqGSIb3
DQEHATAdBglghkgBZQMEASoEEP/PW1JWehQx6/dsLkp/Mf+gMgQwFM9liLTqC56B
nHILFmhac/+a/StQOKuf9dx5qXeGvt9LnwKuGGSfNX4g+dTkoa6N
`;
            ks.cms.decrypt(Buffer.from(example, "base64"), (err, plain) => {
                expect(err).to.not.exist();
                expect(plain).to.exist();
                expect(plain.toString()).to.equal(plainData.toString());
                done();
            });
        });
    });

    const sample = {
        id: "122019318b6e5e0cf93a2314bf01269a2cc23cd3dcd452d742cdb9379d8646f6e4a9",
        privKey: "CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw==",
        pubKey: "CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAE="
    };

    describe("identity", () => {
        let peer;
        let publicKeyDer; // a buffer

        before(() => {
            const encoded = Buffer.from(sample.privKey, "base64");
            peer = Identity.createFromPrivKey(encoded);
        });

        it("decoded public key", () => {
            // console.log('peer id', peer.toJSON())
            // console.log('id', peer.toB58String())
            // console.log('id decoded', multihash.decode(peer.id))

            // get protobuf version of the public key
            const publicKeyProtobuf = peer.marshalPubKey();
            const publicKey = crypto.keys.unmarshalPublicKey(publicKeyProtobuf);
            // console.log('public key', publicKey)
            publicKeyDer = publicKey.marshal();
            // console.log('public key der', publicKeyDer.toString('base64'))

            // get protobuf version of the private key
            const privateKeyProtobuf = peer.marshalPrivKey();
            const key = crypto.keys.unmarshalPrivateKey(privateKeyProtobuf);
            // console.log('private key', key)
            // console.log('\nprivate key der', key.marshal().toString('base64'))
        });

        it("encoded public key with DER", () => {
            const jwk = adone.crypto.keys.supportedKeys.rsa.pkixToJwk(publicKeyDer);
            // console.log('jwk', jwk)
            const rsa = new adone.crypto.keys.supportedKeys.rsa.RsaPublicKey(jwk);
            // console.log('rsa', rsa)
            const keyId = rsa.hash();
            // console.log('err', err)
            // console.log('keyId', keyId)
            // console.log('id decoded', multihash.decode(keyId))
            const kids = multi.hash.toB58String(keyId);
            // console.log('id', kids)
            expect(kids).to.equal(peer.asBase58());
        });

        it("encoded public key with JWT", () => {
            const jwk = {
                kty: "RSA",
                n: "tkiqPxzBWXgZpdQBd14o868a30F3Sc43jwWQG3caikdTHOo7kR14o-h12D45QJNNQYRdUty5eC8ItHAB4YIH-Oe7DIOeVFsnhinlL9LnILwqQcJUeXENNtItDIM4z1ji1qta7b0mzXAItmRFZ-vkNhHB6N8FL1kbS3is_g2UmX8NjxAwvgxjyT5e3_IO85eemMpppsx_ZYmSza84P6onaJFL-btaXRq3KS7jzXkzg5NHKigfjlG7io_RkoWBAghI2smyQ5fdu-qGpS_YIQbUnhL9tJLoGrU72MufdMBZSZJL8pfpz8SB9BBGDCivV0VpbvV2J6En26IsHL_DN0pbIw",
                e: "AQAB",
                alg: "RS256",
                kid: "2011-04-29"
            };
            // console.log('jwk', jwk)
            const rsa = new adone.crypto.keys.supportedKeys.rsa.RsaPublicKey(jwk);
            // console.log('rsa', rsa)
            const keyId = rsa.hash();
            // console.log('err', err)
            // console.log('keyId', keyId)
            // console.log('id decoded', multihash.decode(keyId))
            const kids = multi.hash.toB58String(keyId);
            // console.log('id', kids)
            expect(kids).to.equal(peer.asBase58());
        });

        it("decoded private key", () => {
            // console.log('peer id', peer.toJSON())
            // console.log('id', peer.toB58String())
            // console.log('id decoded', multihash.decode(peer.id))

            // get protobuf version of the private key
            const privateKeyProtobuf = peer.marshalPrivKey();
            const key = crypto.keys.unmarshalPrivateKey(privateKeyProtobuf);
            // console.log('private key', key)
            // console.log('\nprivate key der', key.marshal().toString('base64'))
        });
    });
});
