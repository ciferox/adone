const pkg = adone.package;
const promisify = require("promisify-es6");

const {
    is
} = adone;

// TODO add the commit hash of the current ipfs version to the response.
module.exports = function version(self) {
    return promisify((opts, callback) => {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        self.repo.version((err, repoVersion) => {
            if (err) {
                return callback(err);
            }

            callback(null, {
                version: pkg.version,
                repo: repoVersion,
                commit: ""
            });
        });
    });
};
