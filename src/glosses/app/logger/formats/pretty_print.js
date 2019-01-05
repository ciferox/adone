const {
    app: { logger: { format, LEVEL, MESSAGE } },
    std: { util: { inspect } }
} = adone;

/**
 * function prettyPrint (info)
 * Returns a new instance of the prettyPrint Format that "prettyPrint"
 * serializes `info` objects.
 */
export default format((info, opts = {}) => {
    // info[LEVEL] is enumerable here, so util.inspect would print it; so it must be manually stripped
    const strippedInfo = Object.assign({}, info);
    delete strippedInfo[LEVEL];
    info[MESSAGE] = inspect(strippedInfo, false, opts.depth || null, opts.colorize);
    return info;
});
