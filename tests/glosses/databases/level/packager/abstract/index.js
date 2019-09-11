module.exports = function (level, options) {
    options = options || {};

    require("./base")(level);
    require("./db_values")(level, options.nonPersistent);

    if (!options.skipErrorIfExistsTest) {
        require("./error_if_exists")(level);
    }

    if (!options.skipRepairTest) {
        require("./repair")(level);
    }

    if (!options.skipDestroyTest) {
        require("./destroy")(level);
    }
};
