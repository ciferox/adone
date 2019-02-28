const {
    ipfs: { httpClient }
} = adone;

const f = require("./utils/factory");

describe(".commands", function () {
    this.timeout(60 * 1000);

    let ipfsd;
    let ipfs;

    before((done) => {
        f.spawn({ initOptions: { bits: 1024, profile: "test" } }, (err, _ipfsd) => {
            expect(err).to.not.exist();
            ipfsd = _ipfsd;
            ipfs = httpClient(_ipfsd.apiAddr);
            done();
        });
    });

    after((done) => {
        if (!ipfsd) {
            return done(); 
        }
        ipfsd.stop(done);
    });

    it("lists commands", (done) => {
        ipfs.commands((err, res) => {
            expect(err).to.not.exist();
            expect(res).to.exist();
            done();
        });
    });

    describe("promise", () => {
        it("lists commands", () => {
            return ipfs.commands()
                .then((res) => {
                    expect(res).to.exist();
                });
        });
    });
});
