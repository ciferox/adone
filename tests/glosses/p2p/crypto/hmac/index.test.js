const {
    p2p: { crypto }
} = adone;

const hashes = ["SHA1", "SHA256", "SHA512"];

describe("HMAC", () => {
    hashes.forEach((hash) => {
        it(`${hash} - sign and verify`, (done) => {
            crypto.hmac.create(hash, Buffer.from("secret"), (err, hmac) => {
                expect(err).to.not.exist();

                hmac.digest(Buffer.from("hello world"), (err, sig) => {
                    expect(err).to.not.exist();
                    expect(sig).to.have.length(hmac.length);
                    done();
                });
            });
        });
    });
});
