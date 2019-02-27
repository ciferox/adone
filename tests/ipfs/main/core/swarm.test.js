const {
    ipfs: { IPFS, ipfsdCtl }
} = adone;

describe("swarm", () => {
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

    describe("peers", () => {
        it("should not error when passed null options", (done) => {
            ipfs.swarm.peers(null, (err) => {
                expect(err).to.not.exist();
                done();
            });
        });
    });
});
