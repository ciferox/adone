const {
    crypto: { ed25519 }
} = adone;

const data = {
    seed: "af9881fe34edfd3463cf3e14e22ad95a0608967e084d3ca1fc57be023040de59",
    privateKey: "af9881fe34edfd3463cf3e14e22ad95a0608967e084d3ca1fc57be023040de590c32c468980d40237f4e44a66dec3beb564b3e1394a4c6df1da2065e3afc1d81",
    publicKey: "0c32c468980d40237f4e44a66dec3beb564b3e1394a4c6df1da2065e3afc1d81",
    message: "test",
    signature: "98c8351675ade54b3aedc14f0b9c40b47569d9da191db066312ed6423d20dff8a52988f869fc3fbf4402971034b387ac7fbcfa704eb4c1e86e48e15de5e3d206",
    invalidSignature: "88c8351675ade54b3aedc14f0b9c40b47569d9da191db066312ed6423d20dff8a52988f869fc3fbf4402971034b387ac7fbcfa704eb4c1e86e48e15de5e3d205"
};

describe("crypto", "ed25519", () => {
    describe("generateKeyPair()", () => {
        it("returns a public and private key", () => {
            const seed = Buffer.from(data.seed, "hex");
            const keyPair = ed25519.generateKeyPair(seed);

            assert.equal(
                keyPair.publicKey.toString("hex"),
                data.publicKey
            );

            assert.equal(
                keyPair.privateKey.toString("hex"),
                data.privateKey
            );
        });
    });

    describe("#Sign()", () => {
        it("Generates a valid signature using a seed", () => {
            const seed = Buffer.from(data.seed, "hex");
            const message = Buffer.from(data.message);
            const signature = ed25519.sign(message, seed);

            assert.equal(signature.toString("hex"), data.signature);
        });

        it("Generates a valid signature using a keyPair", () => {
            const privateKey = Buffer.from(data.privateKey, "hex");
            const publicKey = Buffer.from(data.publicKey, "hex");
            const message = Buffer.from(data.message);
            const signature = ed25519.sign(
                message,
                {
                    privateKey,
                    publicKey
                }
            );

            assert.equal(signature.toString("hex"), data.signature);
        });
    });

    describe("#Verify", () => {
        it("returns true if the signature is valid", () => {
            const publicKey = Buffer.from(data.publicKey, "hex");
            const signature = Buffer.from(data.signature, "hex");
            const message = Buffer.from(data.message);

            assert.ok(ed25519.verify(message, signature, publicKey));
        });

        it("returns false if the signature is not valid", () => {
            const publicKey = Buffer.from(data.publicKey, "hex");
            const signature = Buffer.from(data.invalidSignature, "hex");
            const message = Buffer.from(data.message);

            assert.ifError(ed25519.verify(message, signature, publicKey));
        });
    });
});
