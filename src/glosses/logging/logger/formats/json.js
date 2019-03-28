const {
    logging: { logger: { format } },
    data: { json }
} = adone;

/**
 * function replacer (key, value)
 * Handles proper stringification of Buffer output.
 */
const replacer = (key, value) => value instanceof Buffer
    ? value.toString("base64")
    : value;

/**
 * function json (info)
 * Returns a new instance of the JSON format that turns a log `info`
 * object into pure JSON.
 */
export default format((info, opts = {}) => {
    info[adone.logging.logger.MESSAGE] = json.encodeSafe(info, opts.replacer || replacer, opts.space);
    return info;
});
