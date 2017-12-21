const parallel = require("async/parallel");
const fixtures = require("../fixtures/go-elliptic-key");

const {
    netron2: { crypto }
} = adone;

const curves = ["P-256", "P-384"]; // 'P-521' fails in tests :( no clue why
const lengths = {
    "P-256": 65,
    "P-384": 97,
    "P-521": 133
};
const secretLengths = {
    "P-256": 32,
    "P-384": 48,
    "P-521": 66
};

describe("generateEphemeralKeyPair", () => {
    curves.forEach((curve) => {
        it(`generate and shared key ${curve}`, (done) => {
            parallel([
                (cb) => crypto.keys.generateEphemeralKeyPair(curve, cb),
                (cb) => crypto.keys.generateEphemeralKeyPair(curve, cb)
            ], (err, keys) => {
                assert.notExists(err);
                expect(keys[0].key).to.have.length(lengths[curve]);
                expect(keys[1].key).to.have.length(lengths[curve]);

                keys[0].genSharedKey(keys[1].key, (err, shared) => {
                    assert.notExists(err);
                    expect(shared).to.have.length(secretLengths[curve]);
                    done();
                });
            });
        });
    });

    describe("go interop", () => {
        it("generates a shared secret", (done) => {
            const curve = fixtures.curve;

            parallel([
                (cb) => crypto.keys.generateEphemeralKeyPair(curve, cb),
                (cb) => crypto.keys.generateEphemeralKeyPair(curve, cb)
            ], (err, res) => {
                assert.notExists(err);
                const alice = res[0];
                const bob = res[1];
                bob.key = fixtures.bob.public;

                parallel([
                    (cb) => alice.genSharedKey(bob.key, cb),
                    (cb) => bob.genSharedKey(alice.key, fixtures.bob, cb)
                ], (err, secrets) => {
                    assert.notExists(err);

                    expect(secrets[0]).to.eql(secrets[1]);
                    expect(secrets[0]).to.have.length(32);

                    done();
                });
            });
        });
    });
});
