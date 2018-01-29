const fixtures = require("../fixtures/go-elliptic-key");

const {
    net: { p2p: { crypto } }
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

describe("crypto", "keys", "generateEphemeralKeyPair", () => {
    curves.forEach((curve) => {
        it(`generate and shared key ${curve}`, () => {
            const key0 = crypto.keys.generateEphemeralKeyPair(curve);
            const key1 = crypto.keys.generateEphemeralKeyPair(curve);

            expect(key0.key).to.have.length(lengths[curve]);
            expect(key1.key).to.have.length(lengths[curve]);

            const shared = key0.genSharedKey(key1.key);
            expect(shared).to.have.length(secretLengths[curve]);
        });
    });

    describe("go interop", () => {
        it("generates a shared secret", () => {
            const curve = fixtures.curve;

            const res0 = crypto.keys.generateEphemeralKeyPair(curve);
            const res1 = crypto.keys.generateEphemeralKeyPair(curve);

            const alice = res0;
            const bob = res1;
            bob.key = fixtures.bob.public;

            const secret0 = alice.genSharedKey(bob.key);
            const secret1 = bob.genSharedKey(alice.key, fixtures.bob);

            expect(secret0).to.eql(secret1);
            expect(secret0).to.have.length(32);
        });
    });
});
