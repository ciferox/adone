const fixtures = require("../fixtures/secp256k1");

const {
    net: { p2p: { crypto } }
} = adone;

describe("crypto", "keys", "secp256k1", () => {
    const mockPublicKey = {
        bytes: fixtures.pbmPublicKey
    };

    const mockPrivateKey = {
        bytes: fixtures.pbmPrivateKey,
        public: mockPublicKey
    };

    const mockSecp256k1Module = {
        generateKeyPair(bits) {
            return mockPrivateKey;
        },

        unmarshalSecp256k1PrivateKey(buf) {
            return mockPrivateKey;
        },

        unmarshalSecp256k1PublicKey(buf) {
            return mockPublicKey;
        }
    };

    // No needed in adone
    describe.skip("without secp256k1 module present", () => {
        crypto.keys.supportedKeys.secp256k1 = undefined;

        it("fails to generate a secp256k1 key", () => {
            assert.throws(() => crypto.keys.generateKeyPair("secp256k1", 256));
        });

        it("fails to unmarshal a secp256k1 private key", () => {
            assert.throws(() => crypto.keys.unmarshalPrivateKey(fixtures.pbmPrivateKey));
        });

        it("fails to unmarshal a secp256k1 public key", () => {
            assert.throws(() => crypto.keys.unmarshalPublicKey(fixtures.pbmPublicKey));
        });
    });

    describe("with secp256k1 module present", () => {
        let key;

        before(() => {
            crypto.keys.supportedKeys.secp256k1 = mockSecp256k1Module;
            key = crypto.keys.generateKeyPair("secp256k1", 256);
        });

        after(() => {
            delete crypto.keys.secp256k1;
        });

        it("generates a valid key", (done) => {
            assert.exists(key);
            done();
        });

        it("protobuf encoding", () => {
            const keyMarshal = crypto.keys.marshalPrivateKey(key);
            const key2 = crypto.keys.unmarshalPrivateKey(keyMarshal);
            const keyMarshal2 = crypto.keys.marshalPrivateKey(key2);

            expect(keyMarshal).to.eql(keyMarshal2);

            const pk = key.public;
            const pkMarshal = crypto.keys.marshalPublicKey(pk);
            const pk2 = crypto.keys.unmarshalPublicKey(pkMarshal);
            const pkMarshal2 = crypto.keys.marshalPublicKey(pk2);

            expect(pkMarshal).to.eql(pkMarshal2);
        });
    });
});
