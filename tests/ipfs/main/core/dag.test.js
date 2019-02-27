const {
    ipfs: { IPFS, ipfsdCtl }
} = adone;

describe("dag", () => {
    let ipfsd;
    let ipfs;

    before(function (done) {
        this.timeout(20 * 1000);

        const factory = ipfsdCtl.create({ type: "proc" });

        factory.spawn({
            exec: IPFS,
            initOptions: { bits: 512 },
            config: { Bootstrap: [] }
        }, (err, _ipfsd) => {
            expect(err).to.not.exist();
            ipfsd = _ipfsd;
            ipfs = _ipfsd.api;
            done();
        });
    });

    after((done) => {
        if (ipfsd) {
            ipfsd.stop(done);
        } else {
            done();
        }
    });

    describe("get", () => {
        it("should callback with error for invalid string CID input", (done) => {
            ipfs.dag.get("INVALID CID", (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_CID");
                done();
            });
        });

        it("should callback with error for invalid buffer CID input", (done) => {
            ipfs.dag.get(Buffer.from("INVALID CID"), (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_CID");
                done();
            });
        });
    });

    describe("tree", () => {
        it("should callback with error for invalid CID input", (done) => {
            ipfs.dag.tree("INVALID CID", (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_CID");
                done();
            });
        });
    });
});
