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
        const obj = {};
        for (let i = 0; i < n; ++i) {
            obj[i] = i;
        }

        suites[`length of ${n}`] = {
            "Plain object": {
                "util keys": () => {
                    adone.util.keys(obj);
                },
                "Object keys": () => {
                    Object.keys(obj);
                }
            }
        };
    }
    return suites;
})();
