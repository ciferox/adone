const test = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5
};

const test2 = {
    a: {
        a: 1
    },
    b: {
        b: 2
    },
    c: {
        c: 3
    },
    d: {
        d: 4
    },
    e: {
        e: 5
    }
};

export default {
    "1 key": {
        get: () => {
            const a = test.a;
        },
        destr: () => {
            const { a } = test;
        }
    },
    "2 keys": {
        get: () => {
            const a = test.a;
            const b = test.b;
        },
        destr: () => {
            const { a, b } = test;
        }
    },
    "3 keys": {
        get: () => {
            const a = test.a;
            const b = test.b;
            const c = test.c;
        },
        destr: () => {
            const { a, b, c } = test;
        }
    },
    "4 keys": {
        get: () => {
            const a = test.a;
            const b = test.b;
            const c = test.c;
            const d = test.d;
        },
        destr: () => {
            const { a, b, c, d } = test;
        }
    },
    "5 keys": {
        get: () => {
            const a = test.a;
            const b = test.b;
            const c = test.c;
            const d = test.d;
            const e = test.e;
        },
        destr: () => {
            const { a, b, c, d, e } = test;
        }
    },
    "nested": {
        "1 key": {
            get: () => {
                const a = test.a.a;
            },
            destr: () => {
                const { a: { a } } = test;
            }
        },
        "2 keys": {
            get: () => {
                const a = test.a.a;
                const b = test.b.b;
            },
            destr: () => {
                const { a: { a }, b: { b } } = test;
            }
        },
        "3 keys": {
            get: () => {
                const a = test.a.a;
                const b = test.b.b;
                const c = test.c.c;
            },
            destr: () => {
                const { a: { a }, b: { b }, c: { c } } = test;
            }
        },
        "4 keys": {
            get: () => {
                const a = test.a.a;
                const b = test.b.b;
                const c = test.c.c;
                const d = test.d.d;
            },
            destr: () => {
                const { a: { a }, b: { b }, c: { c }, d: { d } } = test;
            }
        },
        "5 keys": {
            get: () => {
                const a = test.a.a;
                const b = test.b.b;
                const c = test.c.c;
                const d = test.d.c;
                const e = test.e.e;
            },
            destr: () => {
                const { a: { a }, b: { b }, c: { c }, d: { d }, e: { e } } = test;
            }
        }
    }
};
