const {
    p2p: { crypto }
} = adone;

const hashes = ["SHA1", "SHA256", "SHA512"];

describe("HMAC", () => {
    hashes.forEach((hash) => {
        it(`${hash} - sign and verify`, async () => {
            const hmac = await crypto.hmac.create(hash, Buffer.from("secret"));
            const sig = await hmac.digest(Buffer.from("hello world"));
            expect(sig).to.have.length(hmac.length);
        });
    });
});
