const {
    ipfs: { IPFS, ipfsdCtl }
} = adone;


describe("pin", () => {
    let ipfsd; let ipfs;

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

    describe("ls", () => {
        it("should callback with error for invalid non-string pin type option", (done) => {
            ipfs.pin.ls({ type: 6 }, (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_PIN_TYPE");
                done();
            });
        });

        it("should callback with error for invalid string pin type option", (done) => {
            ipfs.pin.ls({ type: "__proto__" }, (err) => {
                expect(err).to.exist();
                expect(err.code).to.equal("ERR_INVALID_PIN_TYPE");
                done();
            });
        });
    });
});
