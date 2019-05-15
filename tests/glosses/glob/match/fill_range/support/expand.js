

module.exports = (start, stop, step = 1) => {
    const arr = new Array((stop - start) / step);
    let num = 0;

    for (let i = start; i <= stop; i += step) {
        arr[num++] = i;
    }
    return arr;
};
