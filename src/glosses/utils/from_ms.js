const {
    is
} = adone;

export default (ms) => {
    if (!is.number(ms)) {
        throw new TypeError(`${ms} is not a number`);
    }

    const roundTowardZero = ms > 0 ? Math.floor : Math.ceil;

    return {
        days: roundTowardZero(ms / 86400000),
        hours: roundTowardZero(ms / 3600000) % 24,
        minutes: roundTowardZero(ms / 60000) % 60,
        seconds: roundTowardZero(ms / 1000) % 60,
        milliseconds: roundTowardZero(ms) % 1000
    };
};