const clean = require("./clean");
const hat = require("hat");
const series = require("async/series");

const {
    ipfs: { Repo },
    std: { os, path }
} = adone;

const createTempRepo = function (repoPath) {
    repoPath = repoPath || path.join(os.tmpdir(), `/ipfs-test-${hat()}`);

    const repo = new Repo(repoPath);

    repo.teardown = (done) => {
        series([
            // ignore err, might have been closed already
            (cb) => repo.close(() => cb()),
            (cb) => {
                clean(repoPath);
                cb();
            }
        ], done);
    };

    return repo;
};

module.exports = createTempRepo;
