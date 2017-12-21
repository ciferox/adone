const {
    netron2: { crypto }
} = adone;

const hashes = ["SHA1", "SHA256", "SHA512"];

describe("HMAC", () => {
    hashes.forEach((hash) => {
        it(`${hash} - sign and verify`, (done) => {
            crypto.hmac.create(hash, Buffer.from("secret"), (err, hmac) => {
                assert.notExists(err);

                hmac.digest(Buffer.from("hello world"), (err, sig) => {
                    assert.notExists(err);
                    expect(sig).to.have.length(hmac.length);
                    done();
                });
            });
        });
    });
});
