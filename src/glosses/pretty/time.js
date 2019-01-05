const {
    is,
    util: { fromMs, pluralizeWord }
} = adone;

export default (ms, opts) => {
    if (!is.finite(ms)) {
        throw new TypeError(`${ms} is not finite number`);
    }

    opts = opts || {};

    if (ms < 1000) {
        const msDecimalDigits = is.number(opts.msDecimalDigits) ? opts.msDecimalDigits : 0;
        return (msDecimalDigits ? ms.toFixed(msDecimalDigits) : Math.ceil(ms)) + (opts.verbose ? ` ${pluralizeWord("millisecond", Math.ceil(ms))}` : "ms");
    }

    const ret = [];

    const add = function (val, long, short, valStr) {
        if (val === 0) {
            return;
        }

        const postfix = opts.verbose ? ` ${pluralizeWord(long, val)}` : short;

        ret.push((valStr || val) + postfix);
    };

    const parsed = fromMs(ms);

    add(parsed.days, "day", "d");
    add(parsed.hours, "hour", "h");
    add(parsed.minutes, "minute", "m");

    if (opts.compact) {
        add(parsed.seconds, "second", "s");
        return `~${ret[0]}`;
    }

    const sec = ms / 1000 % 60;
    const secDecimalDigits = is.number(opts.secDecimalDigits) ? opts.secDecimalDigits : 1;
    const secStr = sec.toFixed(secDecimalDigits).replace(/\.0$/, "");
    add(sec, "second", "s", secStr);

    return ret.join(" ");
};
