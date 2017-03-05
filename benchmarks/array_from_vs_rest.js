const _array = [];
const _map = new Map();
const _omap = {};

for (let i = 0; i < 100; ++i) {
    _array.push(i);
    _map.set(i, i);
    _omap[i] = i;
}


export default (() => {
    const suites = {};
    for (const n of [5, 10, 15, 30, 45]) {

        const a = [...new Array(n)].map((_, i) => i);
        const s = new Set(a);
        const m = new Map(a.map((i) => [i, i]));

        suites[`length of ${n}`] = {
            Set: {
                "Array.from(s)": () => {
                    Array.from(s);
                },
                "[...s]": () => {
                    [...s];
                }
            },
            Map: {
                "Array.from(m)": () => {
                    Array.from(m);
                },
                "[...m]": () => {
                    [...m];
                }
            },
            Array: {
                "Array.from(a)": () => {
                    Array.from(a);
                },
                "[...a]": () => {
                    [...a];
                },
                "a.slice(0)": () => {
                    a.slice(0);
                }
            }
        };
    }
    return suites;
})();
