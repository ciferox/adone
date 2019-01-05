const {
    app: { logger: { MESSAGE, format } }
} = adone;

/**
 * function errors (info)
 * If the `message` property of the `info` object is an instance of `Error`,
 * replace the `Error` object its own `message` property.
 *
 * Optionally, the Error's `stack` property can also be appended to the `info` object.
 */
export default format((info, opts) => {
    if (!(info.message instanceof Error)) {
        return info;
    }

    const err = info.message;

    info.message = err.message;
    info[MESSAGE] = err.message;

    if (opts.stack) {
        info.stack = err.stack;
    }

    return info;
});
