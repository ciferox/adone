const {
    is,
    database: { level: { LevelUP, backend: { EncodingBackend } } }
} = adone;

class CustomEncodingBackend extends EncodingBackend {
    constructor(db, opts) {
        super(db, opts);

        if (opts.valueEncoding.type === "mpak") {
            // Allow `null` and `undefined` values.
            this._checkValue = function (value) {
            };
        }
    }
}

export default (DB) => {
    // eslint-disable-next-line func-style
    function Level(location, options, callback) {
        if (is.function(options)) {
            callback = options;
        }
        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        return new LevelUP(new CustomEncodingBackend(new DB(location), options), options, callback);
    }

    ["destroy", "repair"].forEach((m) => {
        if (is.function(DB[m])) {
            Level[m] = function (...args) {
                DB[m].apply(DB, args);
            };
        }
    });

    Level.errors = LevelUP.errors;

    return Level;
};
