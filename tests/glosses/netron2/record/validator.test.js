const fixture = require("./fixtures/go-key-records.js");

const {
    netron2: { PeerId, crypto, record }
} = adone;

const { Record, validator } = record;

const generateCases = (hash) => {
    return {
        valid: {
            publicKey: [
                Buffer.concat([
                    Buffer.from("/pk/"),
                    hash
                ])
            ]
        },
        invalid: {
            publicKey: [
                // missing hashkey
                Buffer.from("/pk/"),
                // not the hash of a key
                Buffer.concat([
                    Buffer.from("/pk/"),
                    Buffer.from("random")
                ]),
                // missing prefix
                hash
            ]
        }
    };
};

describe("validator", () => {
    let key;
    let hash;
    let cases;

    before(() => {
        key = crypto.keys.generateKeyPair("rsa", 1024);
        hash = key.public.hash();
        cases = generateCases(hash);
    });

    describe("verifyRecord", () => {
        it("calls matching validator", () => {
            const k = Buffer.from("/hello/you");
            const rec = new Record(k, Buffer.from("world"), new PeerId(hash));

            const validators = {
                hello: {
                    func(key, value) {
                        expect(key).to.eql(k);
                        expect(value).to.eql(Buffer.from("world"));
                    },
                    sign: false
                }
            };
            validator.verifyRecord(validators, rec);
        });
    });

    describe("isSigned", () => {
        it("returns false for missing validator", () => {
            const validators = {};

            expect(validator.isSigned(validators, Buffer.from("/hello"))).to.eql(false);
        });

        it("throws on unkown validator", () => {
            const validators = {};

            expect(() => validator.isSigned(validators, Buffer.from("/hello/world"))).to.throw(/Invalid record keytype/);
        });

        it("returns the value from the matching validator", () => {
            const validators = {
                hello: { sign: true },
                world: { sign: false }
            };

            expect(validator.isSigned(validators, Buffer.from("/hello/world"))).to.eql(true);

            expect(validator.isSigned(validators, "/world/hello")).to.eql(false);
        });
    });

    describe("validators", () => {
        it("exports pk", () => {
            expect(validator.validators).to.have.keys(["pk"]);
        });

        describe("public key", () => {
            it("exports func and sing", () => {
                const pk = validator.validators.pk;

                expect(pk).to.have.property("func");
                expect(pk).to.have.property("sign", false);
            });

            it("does not error on valid record", () => {
                for (const k of cases.valid.publicKey) {
                    validator.validators.pk.func(k, key.public.bytes);
                }
            });

            it("throws on invalid records", () => {
                for (const k of cases.invalid.publicKey) {
                    assert.throws(() => validator.validators.pk.func(k, key.public.bytes));
                }
            });
        });
    });

    describe("go interop", () => {
        it("record with key from from go", () => {
            const pubKey = crypto.keys.unmarshalPublicKey(fixture.publicKey);

            const hash = pubKey.hash();
            const k = Buffer.concat([Buffer.from("/pk/"), hash]);
            validator.validators.pk.func(k, pubKey.bytes);
        });
    });
});
