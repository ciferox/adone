export default (() => {
    const suites = {};
    for (const n of [5, 10, 20, 40, 200]) {
        const arr = [...new Array(n)].map((x, i) => i);
        const f = (v) => {
            v;
        };
        suites[`length of ${n}`] = {
            index: () => {
                for (let i = 0; i < arr.length; ++i) {
                    const v = arr[i];
                }
            },
            "for of": () => {
                for (const v of arr) {
                    v;
                }
            },
            "for each": () => {
                arr.forEach((v) => {
                    v;
                });
            },
            "for each using outer function": () => {
                arr.forEach(f);
            }
        };
    }
    return suites;
})();
