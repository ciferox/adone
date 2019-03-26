const rm = require("rimraf");
const log = require("npmlog");

const clean = function (gyp, argv, callback) {
    // Remove the 'build' dir
    const buildDir = "build";

    log.verbose("clean", 'removing "%s" directory', buildDir);
    rm(buildDir, callback);
};

module.exports = exports = clean;
exports.usage = 'Removes any generated build files and the "out" dir';
