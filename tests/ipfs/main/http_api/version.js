const {
    ipfs: { ipfsdCtl }
} = adone;

const df = ipfsdCtl.create({ exec: adone.getPath("lib/ipfs/main/cli/bin.js") });

describe("version endpoint", () => {
    let ipfs = null;
    let ipfsd = null;
    before(function (done) {
        this.timeout(20 * 1000);
        df.spawn({
            initOptions: { bits: 512 },
            config: {
                Bootstrap: [],
                Discovery: {
                    MDNS: {
                        Enabled: false
                    },
                    webRTCStar: {
                        Enabled: false
                    }
                }
            }
        }, (err, _ipfsd) => {
            expect(err).to.not.exist();
            ipfsd = _ipfsd;
            ipfs = ipfsd.api;
            done();
        });
    });

    after((done) => ipfsd.stop(done));

    describe(".version", () => {
        it("get the version", (done) => {
            ipfs.version((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.have.a.property("version");
                expect(result).to.have.a.property("commit");
                expect(result).to.have.a.property("repo");
                done();
            });
        });
    });
});
