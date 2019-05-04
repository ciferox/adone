

const { getLocks } = require(adone.getPath("lib", "glosses", "lockfile", "lockfile"));
const { unlock } = adone.lockfile;

const unlockAll = function () {
    const locks = getLocks();
    const promises = Object.keys(locks).map((file) => unlock(file, { realpath: false }));

    return Promise.all(promises);
}

module.exports = unlockAll;
