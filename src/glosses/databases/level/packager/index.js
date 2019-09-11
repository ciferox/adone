const {
    is,
    database: { level: { DB, backend: { Encoding } } }
} = adone;

export default (LevelDB) => {
    // eslint-disable-next-line func-style
    function Level(location, options, callback) {
        if (is.function(options)) {
            callback = options;
        }
        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        return new DB(new Encoding(new LevelDB(location), options), options, callback);
    }

    ["destroy", "repair"].forEach((m) => {
        if (is.function(LevelDB[m])) {
            Level[m] = function (...args) {
                LevelDB[m].apply(LevelDB, ...args);
            };
        }
    });

    // Level.errors = levelup.errors;

    return Level;
};
