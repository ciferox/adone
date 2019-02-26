const {
    ipfs: { ipfsdCtl }
} = adone;

const df = ipfsdCtl.create({ exec: adone.std.path.join(adone.ROOT_PATH, "lib/ipfs/ipfs/cli/bin.js") });

describe("dns endpoint", () => {
    let ipfs = null;
    let ipfsd = null;
    before(function (done) {
        this.timeout(20 * 1000);
        df.spawn({
            initOptions: { bits: 512 },
            config: { Bootstrap: [] }
        }, (err, _ipfsd) => {
            expect(err).to.not.exist();
            ipfsd = _ipfsd;
            ipfs = ipfsd.api;
            done();
        });
    });

    after((done) => ipfsd.stop(done));

    describe(".dns", () => {
        it("resolve ipfs.io dns", function (done) {
            this.timeout(40 * 1000);

            ipfs.dns("ipfs.io", (err, result) => {
                expect(err).to.not.exist();
                expect(result).to.exist();
                done();
            });
        });
    });
});
