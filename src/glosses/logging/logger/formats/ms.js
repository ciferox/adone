const {
    logging: { logger: { format } },
    util: { toMs }
} = adone;

/**
 * function ms (info)
 * Returns an `info` with a `ms` property. The `ms` property holds the Value
 * of the time difference between two calls in milliseconds.
 */
export default format(function (info) {
    const curr = Number(new Date());
    this.diff = curr - (this.prevTime || curr);
    this.prevTime = curr;
    info.ms = `+${toMs(this.diff)}`;

    return info;
});
