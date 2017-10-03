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
    for (const n of [50]) {
        const _map = new Map();
        const _mapcache = new adone.collection.MapCache();
        const _object = {};
        const _objectNull = Object.create(null);
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
                MapCache: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _mapcache.get(keys[i]);
                    }
                },
                Object: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _object[keys[i]];
                    }
                },
                "Object create(null)": () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _objectNull[keys[i]];
                    }
                }
            },
            has: {
                Map: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _map.has(keys[i]);
                    }
                },
                MapCache: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _mapcache.has(keys[i]);
                    }
                },
                Object: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        keys[i] in _object;
                    }
                },
                "Object create(null)": () => {
                    for (let i = 0; i < keys.length; ++i) {
                        keys[i] in _objectNull;
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
                MapCache: () => {
                    for (let i = 0; i < keys.length; ++i) {
                        _mapcache.set(keys[i], values[i]);
                    }
                },
                Object: () => {
                    const o = {};
                    for (let i = 0; i < keys.length; ++i) {
                        o[keys[i]] = values[i];
                    }
                },
                "Object create(null)": () => {
                    const o = Object.create(null);
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
                },
                "Object create(null)": () => {
                    const keys = Object.keys(_objectNull);
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
                },
                "Object create(null)": () => {
                    const keys = Object.keys(_objectNull);
                    for (let i = 0; i < keys.length; ++i) {
                        const value = _objectNull[keys[i]];
                    }
                }
            }
        };
    }
    return suites;
})();
