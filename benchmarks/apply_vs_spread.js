const f = () => {
    // do nothing
};

export default (() => {
    const suites = {};

    for (const n of [0, 1, 2, 3, 5, 8]) {
        const arr = [...new Array(n)].map((_, i) => i);

        suites[`length of ${n}`] = {
            apply: () => {
                f.apply(null, arr);
            },
            spread: () => {
                f(...arr);
            }
        };
    }

    return suites;
})();