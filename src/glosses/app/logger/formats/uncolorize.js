const {
    app: { logger: { format, MESSAGE } },
    text: { stripAnsi }
} = adone;

/**
 * function uncolorize (info)
 * Returns a new instance of the uncolorize Format that strips colors
 * from `info` objects.
 */
export default format((info, opts) => {
    if (opts.level !== false) {
        info.level = stripAnsi(info.level);
    }

    if (opts.message !== false) {
        info.message = stripAnsi(info.message);
    }

    if (opts.raw !== false && info[MESSAGE]) {
        info[MESSAGE] = stripAnsi(info[MESSAGE]);
    }

    return info;
});
