export default (() => {
    const suites = {};

    for (const n of [5, 10, 100, 1000, 10000, 20000]) {
        const arr = [...new Array(n)].map((_, i) => i);
        const start = 2;
        const mid = Math.floor(n / 2);
        const end = n - 1;
        const s = arr.join(" ");

        const suite = suites[`length of ${n}`] = {};

        for (const [type, x] of [["array", arr], ["string", s]]) {
            suite[type] = {
                beginning: {
                    includes: () => {
                        x.includes(start);
                    },
                    indexOf: () => {
                        x.indexOf(start) >= 0;
                    }
                },
                middle: {
                    includes: () => {
                        x.includes(mid);
                    },
                    indexOf: () => {
                        x.indexOf(mid) >= 0;
                    }
                },
                end: {
                    includes: () => {
                        x.includes(end);
                    },
                    indexOf: () => {
                        x.indexOf(end) >= 0;
                    }
                },
                negative: {
                    includes: () => {
                        x.includes(-1);
                    },
                    indexOf: () => {
                        x.indexOf(-1) >= 0;
                    }
                }
            };
        }
    }

    return suites;
})();
