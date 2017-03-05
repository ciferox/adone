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
        const _map = new Map();
        const _object = {};
        const keys = [...new Array(n)].map((x, i) => `hello${i}`);
        const values = [...new Array(n)].map((x, i) => `world${i}`);
        for (let i = 0; i < n; ++i) {
            _map.set(keys[i], values[i]);
            _object[keys[i]] = values[i];
        }

        suites[`length of ${n}`] = {
            get: {
                Map: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _map.get(keys[i]);
                    }
                },
                Object: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _object[keys[i]];
                    }
                }
            },
            has: {
                Map: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _map.has(keys[i]);
                    }
                },
                Object: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        keys[i] in _object;
                    }
                }
            },
            set: {
                Map: () => {
                    const m = new Map();
                    for (let i = 0; i < keys.length; ++i) {
                        m.set(keys[i], values[i]);
                    }
                },
                Object: () => {
                    const o = {};
                    for (let i = 0; i < keys.length; ++i) {
                        o[keys[i]] = values[i];
                    }
                }
            },
            "iterating through keys": {
                Map: () => {
                    for (const key of _map.keys()) {
                        key;
                    }
                },
                Object: () => {
                    const keys = Object.keys(_object);
                    for (let i = 0; i < keys.length; ++i) {
                        const key = keys[i];
                    }
                }
            },
            "iterating through values": {
                Map: () => {
                    for (const value of _map.values()) {
                        value;
                    }
                },
                Object: () => {
                    const keys = Object.keys(_object);
                    for (let i = 0; i < keys.length; ++i) {
                        const value = _object[keys[i]];
                    }
                }
            }
        };
    }
    return suites;
})();
