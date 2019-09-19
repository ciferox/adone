const {
    multiformat: { multihashingAsync }
} = adone;

const { Buffer } = require("buffer");
const sinon = require("sinon");

const fixtures = require("./fixtures/encodes");

describe("multiformat", "multihashingAsync", () => {
    for (const fixture of fixtures) {
        const raw = fixture[0];
        const func = fixture[1];
        const encoded = fixture[2];

        it(`encodes in ${func}`, async () => {
            const digest = await multihashingAsync(Buffer.from(raw), func);
            expect(digest.toString("hex")).to.eql(encoded);
        });

        // eslint-disable-next-line no-loop-func
        it(`encodes Uint8Array in ${func}`, async () => {
            const buffer = Buffer.from(raw);
            const bytes = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength);
            const digest = await multihashingAsync(bytes, func);
            expect(digest.toString("hex")).to.eql(encoded);
        });
    }

    it("cuts the length", async () => {
        const buf = Buffer.from("beep boop");

        const digest = await multihashingAsync(buf, "sha2-256", 10);
        expect(digest)
            .to.eql(Buffer.from("120a90ea688e275d58056732", "hex"));
    });

    it("digest only, without length", async () => {
        const buf = Buffer.from("beep boop");

        const digest = await multihashingAsync.digest(buf, "sha2-256");
        expect(
            digest
        ).to.eql(
            Buffer.from("90ea688e275d580567325032492b597bc77221c62493e76330b85ddda191ef7c", "hex")
        );
    });
});

describe("validate", () => {
    it("true on pass", async () => {
        const hash = await multihashingAsync(Buffer.from("test"), "sha2-256");
        const validation = await multihashingAsync.validate(Buffer.from("test"), hash);

        return expect(validation).to.eql(true);
    });

    it("false on fail", async () => {
        const hash = await multihashingAsync(Buffer.from("test"), "sha2-256");
        const validation = await multihashingAsync.validate(Buffer.from("test-fail"), hash);
        return expect(validation).to.eql(false);
    });
});

describe("error handling", () => {
    const methods = {
        multihashingAsync,
        digest: multihashingAsync.digest,
        createHash: (buff, alg) => multihashingAsync.createHash(alg)
    };

    for (const [name, fn] of Object.entries(methods)) {
        describe(name, () => {
            it("throws an error when there is no hashing algorithm specified", async () => {
                const buf = Buffer.from("beep boop");

                try {
                    await fn(buf);
                } catch (err) {
                    expect(err).to.instanceOf(adone.error.NotValidException);
                    return;
                }
                expect.fail("Did not throw");
            });

            it("throws an error when the hashing algorithm is not supported", async () => {
                const buf = Buffer.from("beep boop");

                const stub = sinon.stub(adone.multiformat.multihash, "coerceCode").returns("snake-oil");
                try {
                    await fn(buf, "snake-oil");
                } catch (err) {
                    expect(err).to.instanceOf(adone.error.NotSupportedException);
                    return;
                } finally {
                    stub.restore();
                }
                expect.fail("Did not throw");
            });
        });
    }
});
