const common = require("./common");

const suite = function (options) {
    const testCommon = common(options);

    require("./factory")(testCommon);

    require("./constructor")(testCommon);
    require("./open").all(testCommon);
    require("./close").all(testCommon);

    if (testCommon.createIfMissing) {
        require("./open_create_if_missing").all(testCommon);
    }

    if (testCommon.errorIfExists) {
        require("./open_error_if_exists").all(testCommon);
    }

    require("./put").all(testCommon);
    require("./get").all(testCommon);
    require("./del").all(testCommon);
    require("./put_get_del").all(testCommon);

    require("./batch").all(testCommon);
    require("./chained_batch").all(testCommon);

    require("./iterator").all(testCommon);
    require("./iterator_range").all(testCommon);

    if (testCommon.seek) {
        require("./iterator_seek").all(testCommon);
    }

    if (testCommon.snapshots) {
        require("./iterator_snapshot").all(testCommon);
    } else {
        require("./iterator_no_snapshot").all(testCommon);
    }

    if (testCommon.clear) {
        require("./clear").all(testCommon);
        require("./clear_range").all(testCommon);
    }
};

suite.common = common;
module.exports = suite;
