const {
    multiformat: { multihashingAsync }
} = adone;

const fixtures = require("./fixtures/encodes");

describe("multiformat", "multihashing", () => {
    fixtures.forEach((fixture) => {
        const raw = fixture[0];
        const func = fixture[1];
        const encoded = fixture[2];

        it(`encodes in ${func}`, (done) => {
            multihashingAsync(Buffer.from(raw), func, (err, digest) => {
                if (err) {
                    return done(err);
                }

                expect(
                    digest.toString("hex")
                ).to.eql(encoded);
                done();
            });
        });
    });

    it("cuts the length", (done) => {
        const buf = Buffer.from("beep boop");

        multihashingAsync(buf, "sha2-256", 10, (err, digest) => {
            if (err) {
                return done(err);
            }

            expect(digest)
                .to.eql(Buffer.from("120a90ea688e275d58056732", "hex"));

            done();
        });
    });

    it("digest only, without length", (done) => {
        const buf = Buffer.from("beep boop");

        multihashingAsync.digest(buf, "sha2-256", (err, digest) => {
            if (err) {
                return done(err);
            }

            expect(
                digest
            ).to.eql(
                Buffer.from("90ea688e275d580567325032492b597bc77221c62493e76330b85ddda191ef7c", "hex")
            );

            done();
        });
    });

    describe("invalid arguments", () => {
        it("throws on missing callback", () => {
            expect(
                () => multihashingAsync(Buffer.from("beep"), "sha3")
            ).to.throw(/Missing callback/);
        });

        it("digest only, throws on missing callback", () => {
            expect(
                () => multihashingAsync.digest(Buffer.from("beep"), "sha3")
            ).to.throw(/Missing callback/);
        });
    });
});
