const {
    netron2: { crypto }
} = adone;

const hashes = ["SHA1", "SHA256", "SHA512"];

describe("netron2", "crypto", "HMAC", () => {
    hashes.forEach((hash) => {
        it(`${hash} - sign and verify`, () => {
            const hmac = crypto.hmac.create(hash, Buffer.from("secret"));
            const sig = hmac.digest(Buffer.from("hello world"));
            expect(sig).to.have.length(hmac.length);
        });
    });
});
