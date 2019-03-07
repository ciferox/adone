const {
    is,
    util: { omit, keys }
} = adone;

describe("util", "omit", () => {
    it("should omit a key from the object", () => {
        assert.deepEqual(omit({ a: "a", b: "b", c: "c" }, "a"), { b: "b", c: "c" });
        assert.deepEqual(omit({ aaa: "a", bbb: "b", ccc: "c" }, "aaa"), { bbb: "b", ccc: "c" });
    });

    it("should omit an array of keys from the object", () => {
        assert.deepEqual(omit({ a: "a", b: "b", c: "c" }, ["a", "c"]), { b: "b" });
    });

    it("should return the object if no keys are given", () => {
        assert.deepEqual(omit({ a: "a", b: "b", c: "c" }), { a: "a", b: "b", c: "c" });
    });

    it("should return a new object when no keys are given", () => {
        const obj = { a: "a", b: "b", c: "c" };
        assert(omit(obj) !== obj);
    });

    it("should omit using a filter function", () => {
        const foo = omit({ a: "a", b: "b", c: "c" }, (key) => key === "a");
        const bar = omit({ a: "a", b: "b", c() { } }, (key, val) => is.function(val));
        assert.deepEqual(foo, { b: "b", c: "c" });
        assert.deepEqual(bar, { a: "a", b: "b" });
    });

    it("should return an empty object if the first arg is not an object", () => {
        assert.deepEqual(omit(null, { a: "a", b: "b", c: "c" }), {});
    });

    it("should return an empty object if no object is specified", () => {
        assert.deepEqual(omit(), {});
    });

    it("should omit all items", () => {
        assert.deepEqual(omit({
            __dirname: false,
            __filename: false,
            Buffer: false,
            clearImmediate: false,
            clearInterval: false,
            clearTimeout: false,
            console: false,
            exports: true,
            global: false,
            Intl: false,
            module: false,
            process: false,
            require: false,
            setImmediate: false,
            setInterval: false,
            setTimeout: false
        }, ["exports", "__dirname", "__filename", "module", "require"]), {
                Buffer: false,
                clearImmediate: false,
                clearInterval: false,
                clearTimeout: false,
                console: false,
                global: false,
                Intl: false,
                process: false,
                setImmediate: false,
                setInterval: false,
                setTimeout: false
            });
    });

    it("should return really empty object for props=true", () => {
        class A {
            constructor({ sec } = {}) {
                this.sec = sec;
            }
        }

        assert.deepEqual(omit(A, true), {});
    });

    it("should not omit non-enumerable properties", () => {
        class A {
            constructor({ sec } = {}) {
                this.sec = sec;
            }
        }

        const result = keys(omit(A, ["a"]), {
            enumOnly: false
        });

        assert.sameMembers(result, keys(A, {
            enumOnly: false
        }));
    });

    it("not omitted properties should have same descriptors", () => {
        class A {
            static prop1 = 12;

            constructor({ sec } = {}) {
                this.sec = sec;
            }
        }

        const originalDescrs = [];
        const resultDescrs = [];

        const keys_ = keys(omit(A, ["a"]), {
            enumOnly: false
        });

        for (const key of keys_) {
            if (key === "name") {
                continue;
            }
            originalDescrs.push(Object.getOwnPropertyDescriptor(A, key));
        }

        const result = omit(A, ["name"]);
        for (const key of keys(result, { enumOnly: false })) {
            resultDescrs.push(Object.getOwnPropertyDescriptor(result, key));
        }

        assert.sameDeepMembers(resultDescrs, originalDescrs);
    });
});
