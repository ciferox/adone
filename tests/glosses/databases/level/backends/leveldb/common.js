const tempy = require("tempy");
const suite = require("../../abstract");

const {
    database: { level: { backend: { LevelDB } } }
} = adone;

module.exports = suite.common({
    factory() {
        return new LevelDB(tempy.directory());
    },
    // Opt-in to new clear() tests
    clear: true
});
