const fs = require("graceful-fs");
const log = require("npmlog");

const {
    is
} = adone;

const list = function (gyp, args, callback) {
    const devDir = gyp.devDir;
    log.verbose("list", "using node-gyp dir:", devDir);

    const onreaddir = function (err, versions) {
        if (err && err.code !== "ENOENT") {
            return callback(err);
        }
        if (is.array(versions)) {
            versions = versions.filter((v) => {
                return v !== "current";
            });
        } else {
            versions = [];
        }
        callback(null, versions);
    };

    // readdir() the node-gyp dir
    fs.readdir(devDir, onreaddir);
};

module.exports = exports = list;
exports.usage = "Prints a listing of the currently installed node development files";
