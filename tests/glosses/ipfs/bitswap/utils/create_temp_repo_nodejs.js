const {
    ipfs: { Repo },
    std: { path: { join: pathJoin }, os }
} = adone;

const ncp = require("ncp");
const rimraf = require("rimraf");
const series = require("async/series");

const baseRepo = pathJoin(__dirname, "../fixtures/repo");

const createTempRepo = function (callback) {
    const date = Date.now().toString();
    const path = pathJoin(os.tmpdir(), `bitswap-tests-${date}-${Math.random()}`);

    ncp(baseRepo, path, (err) => {
        if (err) {
            return callback(err);
        }

        const repo = new Repo(path);

        repo.teardown = (done) => {
            series([
                (cb) => repo.close(cb),
                (cb) => rimraf(path, cb)
            ], (err) => done(err));
        };

        repo.open((err) => {
            if (err) {
                return callback(err);
            }
            callback(null, repo);
        });
    });
};

module.exports = createTempRepo;
