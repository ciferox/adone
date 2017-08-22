const randomNumber = (min, max) => {
    const maxTimeout = 600000; // Hard-coded default of 10 minutes
    min = parseInt(min, 10) || 0;
    max = parseInt(max, 10);
    if (max !== max || max <= min) {
        max = (min || 1) << 1; // doubling
    } else {
        max = max + 1;
    }
    // In order to not exceed maxTimeout, pick a random value between half of maxTimeout and maxTimeout
    if (max > maxTimeout) {
        min = maxTimeout >> 1; // divide by two
        max = maxTimeout;
    }
    const ratio = Math.random();
    const range = max - min;

    return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
};

export default function defaultBackOff(min) {
    let max = 0;
    if (!min) {
        max = 2000;
    }
    return randomNumber(min, max);
}
