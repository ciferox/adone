const {
    app: { logger: { format, MESSAGE } },
    data:{ json }
} = adone;

/**
 * function simple (info)
 * Returns a new instance of the simple format TransformStream
 * which writes a simple representation of logs.
 *
 *    const { level, message, splat, ...rest } = info;
 *
 *    ${level}: ${message}                            if rest is empty
 *    ${level}: ${message} ${JSON.stringify(rest)}    otherwise
 */
export default format((info) => {
    const stringifiedRest = json.encodeSafe(Object.assign({}, info, {
        level: undefined,
        message: undefined,
        splat: undefined
    }));

    const padding = info.padding && info.padding[info.level] || "";
    if (stringifiedRest !== "{}") {
        info[MESSAGE] = `${info.level}:${padding} ${info.message} ${stringifiedRest}`;
    } else {
        info[MESSAGE] = `${info.level}:${padding} ${info.message}`;
    }

    return info;
});
