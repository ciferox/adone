const IPFSFactory = require("ipfsd-ctl");

const {
    ipfs: { IPFS }
} = adone;

describe("dht", () => {
    let ipfsd; let ipfs;

    before(function (done) {
        this.timeout(30 * 1000);

        const factory = IPFSFactory.create({ type: "proc" });

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

    describe("findprovs", () => {
        it("should callback with error for invalid CID input", (done) => {
            ipfs.dht.findprovs("INVALID CID", (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_CID");
                done();
            });
        });
    });
});
