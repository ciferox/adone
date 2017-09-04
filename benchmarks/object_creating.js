export default {
    Object: {
        "new Object()"() {
            return new Object({ a: 1, b: "abc" });
        },
        "{}"() {
            return { a: 1, b: "abc" };
        },
        "adone.o()"() {
            return adone.o({ a: 1, b: "abc" });
        },
        "Object.create()"() {
            return Object.create(null, {
                a: {
                    value: 1
                },
                b: {
                    value: "abc"
                }
            });
        }
    },
    "Empty object": {
        "{}"() {
            return {};
        },
        "adone.o()"() {
            return adone.o();
        },
        "Object.create(null)"() {
            return Object.create(null);
        }
    },
    Array: {
        "new Array()"() {
            return new Array(1, 2, 3);
        },
        "[]"() {
            return [1, 2, 3];
        }
    },
    ...(() => {
        const suites = {};
        for (const n of [5, 10, 20, 50, 100, 200]) {
            suites[`Array creation and filling: ${n} elements`] = {
                "new Array()"() {
                    const arr = new Array(n);
                    for (let i = 0; i < n; ++i) {
                        arr[i] = i;
                    }
                },
                "[]"() {
                    const arr = [];
                    for (let i = 0; i < n; ++i) {
                        arr.push(i);
                    }
                }
            };
        }
        return suites;
    })()
};
