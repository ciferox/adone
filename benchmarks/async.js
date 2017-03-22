const { is } = adone;

const asyncFunctions = {
    empty: {
        native: async () => {

        }
    },
    "await Promise.resolve": {
        native: {
            native: async () => {
                await Promise.resolve();
            }
        }
    },
    "try { await Promise.reject } catch": {
        native: async () => {
            try {
                await Promise.reject();
            } catch (err) {
                //
            }
        }
    }
};

export default {
    promises: {
        "Promise.resolve": {
            native: [(defer) => {
                Promise.resolve().then(() => defer.resolve());
            }, { defer: true }]
        },
        "Promise.reject": {
            "native catch": [(defer) => {
                Promise.reject().catch(() => defer.resolve());
            }, { defer: true }],
            "native then": [(defer) => {
                Promise.reject().then(adone.noop, () => defer.resolve());
            }, { defer: true }]
        },
        "immediate new Promise resolving": {
            native: [(defer) => {
                new Promise((resolve) => resolve()).then(() => defer.resolve());
            }, { defer: true }]
        },
        "immediate new Promise rejecting": {
            native: [(defer) => {
                new Promise((resolve, reject) => reject()).catch(() => defer.resolve());
            }, { defer: true }]
        },
        "chain resolving": {
            ...(() => {
                const suites = {};
                for (const n of [2, 5, 10, 20, 30, 50]) {
                    suites[`length of ${n}`] = {
                        native: [(defer) => {
                            let p = Promise.resolve();
                            for (let i = 0; i < n; ++i) {
                                p = p.then(() => Promise.resolve());
                            }
                            p.then(() => defer.resolve());
                        }, { defer: true }]
                    };
                }
                return suites;
            })()
        },
        "chain rejecting": {
            ...(() => {
                const suites = {};
                for (const n of [2, 5, 10, 20, 30, 50]) {
                    suites[`length of ${n}`] = {
                        native: [(defer) => {
                            let p = Promise.reject();
                            for (let i = 0; i < n; ++i) {
                                p = p.catch(() => Promise.catch());
                            }
                            p.catch(() => defer.resolve());
                        }, { defer: true }]
                    };
                }
                return suites;
            })()
        },
        "setTimeout promise resolving": {
            ...(() => {
                const suites = {};
                for (const n of [1, 2, 3, 5]) {
                    suites[`timeout of ${n}ms`] = {
                        native: [(defer) => {
                            new Promise((resolve) => {
                                setTimeout(resolve, n);
                            }).then(() => defer.resolve());
                        }, { defer: true }]
                    };
                }
                return suites;
            })()
        },
        "setImmediate resolving": {
            native: [(defer) => {
                new Promise((resolve) => {
                    setImmediate(resolve);
                }).then(() => defer.resolve());
            }, { defer: true }]
        },
        "process.nextTick resolving": {
            native: [(defer) => {
                new Promise((resolve) => {
                    process.nextTick(resolve);
                }).then(() => defer.resolve());
            }, { defer: true }]
        },
        "setTimeout promise rejecting": {
            ...(() => {
                const suites = {};
                for (const n of [1, 2, 3, 5]) {
                    suites[`timeout of ${n}ms`] = {
                        native: [(defer) => {
                            new Promise((resolve, reject) => {
                                setTimeout(reject, n);
                            }).catch(() => defer.resolve());
                        }, { defer: true }]
                    };
                }
                return suites;
            })()
        },
        "setImmediate rejecting": {
            native: [(defer) => {
                new Promise((resolve, reject) => {
                    setImmediate(reject);
                }).catch(() => defer.resolve());
            }, { defer: true }]
        },
        "process.nextTick rejecting": {
            native: [(defer) => {
                new Promise((resolve, reject) => {
                    process.nextTick(reject);
                }).catch(() => defer.resolve());
            }, { defer: true }]
        },
        "async function": {
            ...(function self(fns) {
                let suites = {};
                for (const [k, v] of adone.util.entries(fns)) {
                    if (is.function(v)) {
                        suites[k] = [(defer) => v().then(() => defer.resolve()), { defer: true }];
                    } else {
                        suites = { ...suites, [k]: self(v) };
                    }
                }
                return suites;
            })(asyncFunctions)
        }
    }
};
