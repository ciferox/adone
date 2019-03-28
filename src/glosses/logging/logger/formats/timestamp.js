const {
    logging: { logger: { format } },
    datetime,
    is
} = adone;

/**
 * function timestamp (info)
 * Returns a new instance of the timestamp Format which adds a timestamp
 * to the info.
 *
 * - { timestamp: true }             // `new Date.toISOString()`
 * - { timestamp: function:String }  // Value returned by `timestamp()`
 */
export default format((info, opts = {}) => {
    if (opts.format) {
        info.timestamp = is.function(opts.format)
            ? opts.format()
            : datetime().format(opts.format);
    }

    if (!info.timestamp) {
        info.timestamp = new Date().toISOString();
    }

    if (opts.alias) {
        info[opts.alias] = info.timestamp;
    }

    return info;
});
