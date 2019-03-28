const {
    logging: { logger: { format } }   
} = adone;

/**
 * function label (info)
 * Returns a new instance of the label Format which adds the specified
 * `opts.label` before the message.
 */
export default format((info, opts) => {
    if (opts.message) {
        info.message = `[${opts.label}] ${info.message}`;
        return info;
    }

    info.label = opts.label;
    return info;
});
