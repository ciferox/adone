const strings = [];
for (let i = 0; i < 55; ++i) {
    if (!(i % 2)) {
        strings.push(`hello${i} `);
    } else {
        strings.push(`world${i} `);
    }
}

export default (function () {
    const suites = {};
    for (const n of [2, 3, 5, 8, 13, 21, 34, 55]) {
        suites[`concatination of ${n} strings`] = {
            "+"() {
                let res = "";
                for (let i = 0; i < n; ++i) {
                    res += strings[i];
                }
                res;
            },
            "array"() {
                const res = [];
                for (let i = 0; i < n; ++i) {
                    res.push(strings[i]);
                }
                res.join("");
            }
        };
    }
    return suites;
})();
