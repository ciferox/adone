const {
    ipfs: { ipldInMemory }
} = adone;

class IPLD { }

describe("ipfs", "ipldInMemory", () => {
    it("should create an IPLD instance", (done) => {
        ipldInMemory(IPLD, (err, ipld) => {
            assert.notExists(err);
            assert.ok(ipld instanceof IPLD);
            done();
        });
    });    
});
