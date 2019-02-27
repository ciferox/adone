const {
    ipfs: { httpClient, ipfsdCtl }
} = adone;

describe("custom API", function () {
    this.timeout(30 * 1000);

    it("should create a factory with a custom API", (done) => {
        const mockApi = {};

        const f = ipfsdCtl.create({
            type: "js",
            initOptions: { bits: 512 },
            IpfsClient: () => mockApi
        });

        f.spawn({ initOptions: { profile: "test" } }, (err, ipfsd) => {
            if (err) {
                return done(err);
            }
            expect(ipfsd.api).to.equal(mockApi);
            // Restore a real API so that the node can be stopped properly
            ipfsd.api = httpClient(ipfsd.apiAddr);
            ipfsd.stop(done);
        });
    });
});
