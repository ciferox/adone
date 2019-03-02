const {
    is,
    app: { logger: { addColors, config, LEVEL, MESSAGE, format } },
    std: { stream }
} = adone;

exports.setupLevels = () => {
    addColors(config.adone);
    addColors(config.cli);
    addColors(config.npm);
    addColors(config.syslog);
};

/**
 * Returns a new writable stream with the specified write function.
 * @param {function} write Write function for the specified stream
 * @returns {stream.Writeable} A writable stream instance
 */
exports.writable = (write) => (
    new stream.Writable({
        write,
        objectMode: true
    })
);

/**
 * Returns the provided `info` object with the appropriate LEVEL,
 * and MESSAGE symbols defined.
 */
exports.infoify = (info) => {
    info[LEVEL] = info.level;
    info[MESSAGE] = info.message;
    return info;
};

/**
 * Simple test helper which creates an instance
 * of the `colorize` format and asserts that the
 * correct `info` object was processed.
 */
exports.assumeFormatted = (fmt, info, assertion, opts = {}) => {
    return (done) => {
        const writable = exports.writable((actual) => {
            assertion(actual, info);
            done();
        });

        const value = opts.immutable === false
            ? info
            : Object.assign({}, info);
  
        writable.write(fmt.transform(value, fmt.options));
    };
};

/**
 * Assumes that the Factory prototype is exposed on every
 * instance of the format, `fmt`, as `fmt.Format`.
 */
exports.assumeHasPrototype = (fmt) => {
    return () => {
        assert.isTrue(is.class(fmt.Format));
        assert.isFunction(fmt.Format.prototype.transform);
    };
};

/**
 * Set of simple format functions that illustrate
 * expected, edge, and corner cases.
 */
exports.formatFns = {
    identity(info) {
        return info;
    },

    assign(info, opts) {
        return Object.assign({}, info, opts);
    },

    // eslint-disable-next-line no-unused-vars
    ignore(info) {
        return false;
    },

    // eslint-disable-next-line no-unused-vars
    invalid(just, too, many, args) {
        return just;
    },

    die(info) {
        throw new Error(`die from ${info.message}`);
    }
};

/**
 * Create a set of actual formats based on the formatFns.
 * This is very useful in upstream tests.
 */
exports.formats = Object.keys(exports.formatFns)
    .filter((name) => !["invalid"].includes(name))
    .reduce((acc, name) => {
        const formatFn = exports.formatFns[name];
        acc[name] = format(formatFn);

        return acc;
    }, {});
