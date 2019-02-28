const f = require("./utils/factory");

const {
    ipfs: { httpClient }
} = adone;

describe(".repo", function () {
    this.timeout(50 * 1000); // slow CI

    let ipfs;
    let ipfsd;

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

    it(".repo.gc", (done) => {
        ipfs.repo.gc((err, res) => {
            expect(err).to.not.exist();
            expect(res).to.exist();
            done();
        });
    });

    it(".repo.stat", (done) => {
        ipfs.repo.stat((err, res) => {
            expect(err).to.not.exist();
            expect(res).to.exist();
            expect(res).to.have.a.property("numObjects");
            expect(res).to.have.a.property("repoSize");
            done();
        });
    });

    it(".repo.version", (done) => {
        ipfs.repo.version((err, res) => {
            expect(err).to.not.exist();
            expect(res).to.exist();
            done();
        });
    });
});
