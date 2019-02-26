const rimraf = require("rimraf");

const {
    std: { fs }
} = adone;

module.exports = (dir) => {
    try {
        fs.accessSync(dir);
    } catch (err) {
        // Does not exist so all good
        return;
    }

    rimraf.sync(dir);
};
