const {
    is
} = adone;

export default (num, space = " ") => {
    if (!is.number(num) || is.nan(num)) {
        throw new TypeError(`${num} is not a a number`);
    }

    const neg = num < 0;
    const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    if (neg) {
        num = -num;
    }

    if (num < 1) {
        return `${(neg ? "-" : "") + num + space}B`;
    }

    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1024)), units.length - 1);
    num = Number((num / Math.pow(1024, exponent)).toFixed(2));
    const unit = units[exponent];

    return (neg ? "-" : "") + num + space + unit;
};
