const fixtures = require("./fixtures/async_encodes");

const {
    multi: { hash: { async: multihashing } }
} = adone;

describe("multi", "hash", "async", () => {
    fixtures.forEach((fixture) => {
        const raw = fixture[0];
        const func = fixture[1];
        const encoded = fixture[2];

        it(`encodes in ${func}`, (done) => {
            multihashing(Buffer.from(raw), func, (err, digest) => {
                if (err) {
                    return done(err);
                }

                assert.deepEqual(digest.toString("hex"), encoded);
                done();
            });
        });
    });

    it("cuts the length", (done) => {
        const buf = Buffer.from("beep boop");

        multihashing(buf, "sha2-256", 10, (err, digest) => {
            if (err) {
                return done(err);
            }

            assert.deepEqual(digest, Buffer.from("120a90ea688e275d58056732", "hex"));

            done();
        });
    });

    it("digest only, without length", (done) => {
        const buf = Buffer.from("beep boop");

        multihashing.digest(buf, "sha2-256", (err, digest) => {
            if (err) {
                return done(err);
            }

            assert.deepEqual(digest, Buffer.from("90ea688e275d580567325032492b597bc77221c62493e76330b85ddda191ef7c", "hex"));

            done();
        });
    });

    describe("invalid arguments", () => {
        it("throws on missing callback", () => {
            assert.throws(() => multihashing(Buffer.from("beep"), "sha3"), /Missing callback/);
        });

        it("digest only, throws on missing callback", () => {
            assert.throws(() => multihashing.digest(Buffer.from("beep"), "sha3"), /Missing callback/);
        });
    });
});
