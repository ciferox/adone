const {
    data: { json5 }
} = adone;

describe("data", "json5", "encode", () => {
    describe("objects", () => {
        it("encodes empty objects", () => {
            assert.strictEqual(json5.encode({}), "{}");
        });

        it("encodes unquoted property names", () => {
            assert.strictEqual(json5.encode({ a: 1 }), "{a:1}");
        });

        it("encodes single quoted string property names", () => {
            assert.strictEqual(json5.encode({ "a-b": 1 }), "{'a-b':1}");
        });

        it("encodes double quoted string property names", () => {
            assert.strictEqual(json5.encode({ "a'": 1 }), "{\"a'\":1}");
        });

        it("encodes empty string property names", () => {
            assert.strictEqual(json5.encode({ "": 1 }), "{'':1}");
        });

        it("encodes special character property names", () => {
            assert.strictEqual(json5.encode({ $_: 1, _$: 2, a‌: 3 }), "{$_:1,_$:2,a\u200C:3}");
        });

        it("encodes unicode property names", () => {
            assert.strictEqual(json5.encode({ ùńîċõďë: 9 }), "{ùńîċõďë:9}");
        });

        it("encodes escaped property names", () => {
            assert.strictEqual(json5.encode({ "\\\b\f\n\r\t\v\0\x01": 1 }), "{'\\\\\\b\\f\\n\\r\\t\\v\\0\\x01':1}");
        });

        it("encodes multiple properties", () => {
            assert.strictEqual(json5.encode({ abc: 1, def: 2 }), "{abc:1,def:2}");
        });

        it("encodes nested objects", () => {
            assert.strictEqual(json5.encode({ a: { b: 2 } }), "{a:{b:2}}");
        });
    });

    describe("arrays", () => {
        it("encodes empty arrays", () => {
            assert.strictEqual(json5.encode([]), "[]");
        });

        it("encodes array values", () => {
            assert.strictEqual(json5.encode([1]), "[1]");
        });

        it("encodes multiple array values", () => {
            assert.strictEqual(json5.encode([1, 2]), "[1,2]");
        });

        it("encodes nested arrays", () => {
            assert.strictEqual(json5.encode([1, [2, 3]]), "[1,[2,3]]");
        });
    });

    it("encodes nulls", () => {
        assert.strictEqual(json5.encode(null), "null");
    });

    it("returns undefined for functions", () => {
        assert.strictEqual(json5.encode(() => { }), undefined);
    });

    it("ignores function properties", () => {
        assert.strictEqual(json5.encode({ a() { } }), "{}");
    });

    it("returns null for functions in arrays", () => {
        assert.strictEqual(json5.encode([() => { }]), "[null]");
    });

    describe("Booleans", () => {
        it("encodes true", () => {
            assert.strictEqual(json5.encode(true), "true");
        });

        it("encodes false", () => {
            assert.strictEqual(json5.encode(false), "false");
        });

        it("encodes true Boolean objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode(new Boolean(true)), "true");
        });

        it("encodes false Boolean objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode(new Boolean(false)), "false");
        });
    });

    describe("numbers", () => {
        it("encodes numbers", () => {
            assert.strictEqual(json5.encode(-1.2), "-1.2");
        });

        it("encodes non-finite numbers", () => {
            assert.strictEqual(json5.encode([Infinity, -Infinity, NaN]), "[Infinity,-Infinity,NaN]");
        });

        it("encodes Number objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode(new Number(-1.2)), "-1.2");
        });
    });

    describe("strings", () => {
        it("encodes single quoted strings", () => {
            assert.strictEqual(json5.encode("abc"), "'abc'");
        });

        it("encodes double quoted strings", () => {
            assert.strictEqual(json5.encode("abc'"), "\"abc'\"");
        });

        it("encodes escaped characters", () => {
            assert.strictEqual(json5.encode("\\\b\f\n\r\t\v\0\x0f"), "'\\\\\\b\\f\\n\\r\\t\\v\\0\\x0f'");
        });

        it("encodes escaped single quotes", () => {
            assert.strictEqual(json5.encode("'\""), "'\\'\"'");
        });

        it("encodes escaped double quotes", () => {
            assert.strictEqual(json5.encode("''\""), "\"''\\\"\"");
        });

        it("encodes escaped line and paragraph separators", () => {
            assert.strictEqual(json5.encode("\u2028\u2029"), "'\\u2028\\u2029'");
        });

        it("encodes String objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode(new String("abc")), "'abc'");
        });
    });

    it("encodes using built-in toJSON methods", () => {
        assert.strictEqual(json5.encode(new Date("2016-01-01T00:00:00.000Z")), "'2016-01-01T00:00:00.000Z'");
    });

    it("encodes using user defined toJSON methods", () => {
        function C() { }
        Object.assign(C.prototype, {
            toJSON() {
                return { a: 1, b: 2 };
            }
        });
        assert.strictEqual(json5.encode(new C()), "{a:1,b:2}");
    });

    it("encodes using user defined toJSON(key) methods", () => {
        function C() { }
        Object.assign(C.prototype, {
            toJSON(key) {
                return (key === "a") ? 1 : 2;
            }
        });
        assert.strictEqual(json5.encode({ a: new C(), b: new C() }), "{a:1,b:2}");
    });

    it("encodes using toJSON5 methods", () => {
        function C() { }
        Object.assign(C.prototype, {
            toJSON5() {
                return { a: 1, b: 2 };
            }
        });
        assert.strictEqual(json5.encode(new C()), "{a:1,b:2}");
    });

    it("encodes using toJSON5(key) methods", () => {
        function C() { }
        Object.assign(C.prototype, {
            toJSON5(key) {
                return (key === "a") ? 1 : 2;
            }
        });
        assert.strictEqual(json5.encode({ a: new C(), b: new C() }), "{a:1,b:2}");
    });

    it("calls toJSON5 instead of toJSON if both are defined", () => {
        function C() { }
        Object.assign(C.prototype, {
            toJSON() {
                return { a: 1, b: 2 };
            },
            toJSON5() {
                return { a: 2, b: 2 };
            }
        });
        assert.strictEqual(json5.encode(new C()), "{a:2,b:2}");
    });

    it("throws on circular objects", () => {
        const a = {};
        a.a = a;
        assert.throws(() => {
            json5.encode(a);
        }, TypeError, "Converting circular structure to JSON5");
    });

    it("throws on circular arrays", () => {
        const a = [];
        a[0] = a;
        assert.throws(() => {
            json5.encode(a);
        }, TypeError, "Converting circular structure to JSON5");
    });


    describe("#encode(value, {replacer: null, space})", () => {
        it("does not indent when no value is provided", () => {
            assert.strictEqual(json5.encode([1]), "[1]");
        });

        it("does not indent when 0 is provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: 0 }), "[1]");
        });

        it("does not indent when an empty string is provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: "" }), "[1]");
        });

        it("indents n spaces when a number is provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: 2 }), "[\n  1,\n]");
        });

        it("does not indent more than 10 spaces when a number is provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: 11 }), "[\n          1,\n]");
        });

        it("indents with the string provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: "\t" }), "[\n\t1,\n]");
        });

        it("does not indent more than 10 characters of the string provided", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: "           " }), "[\n          1,\n]");
        });

        it("indents in arrays", () => {
            assert.strictEqual(json5.encode([1], { replacer: null, space: 2 }), "[\n  1,\n]");
        });

        it("indents in nested arrays", () => {
            assert.strictEqual(json5.encode([1, [2], 3], { replacer: null, space: 2 }), "[\n  1,\n  [\n    2,\n  ],\n  3,\n]");
        });

        it("indents in objects", () => {
            assert.strictEqual(json5.encode({ a: 1 }, { replacer: null, space: 2 }), "{\n  a: 1,\n}");
        });

        it("indents in nested objects", () => {
            assert.strictEqual(json5.encode({ a: { b: 2 } }, { replacer: null, space: 2 }), "{\n  a: {\n    b: 2,\n  },\n}");
        });

        it("accepts Number objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode([1], { replacer: null, space: new Number(2) }), "[\n  1,\n]");
        });

        it("accepts String objects", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode([1], { replacer: null, space: new String("\t") }), "[\n\t1,\n]");
        });
    });

    describe("#encode(value, replacer)", () => {
        it("filters keys when an array is provided", () => {
            assert.strictEqual(json5.encode({ a: 1, b: 2, 3: 3 }, { replacer: ["a", 3] }), "{a:1,'3':3}");
        });

        it("only filters string and number keys when an array is provided", () => {
            assert.strictEqual(json5.encode({ a: 1, b: 2, 3: 3, false: 4 }, { replacer: ["a", 3, false] }), "{a:1,'3':3}");
        });

        it("accepts String and Number objects when an array is provided", () => {
            // eslint-disable-next-line no-new-wrappers
            assert.strictEqual(json5.encode({ a: 1, b: 2, 3: 3 }, { replacer: [new String("a"), new Number(3)] }), "{a:1,'3':3}");
        });

        it("replaces values when a function is provided", () => {
            assert.strictEqual(
                json5.encode({ a: 1, b: 2 }, { replacer: (key, value) => (key === "a") ? 2 : value }),
                "{a:2,b:2}"
            );
        });

        it("sets `this` to the parent value", () => {
            assert.strictEqual(
                json5.encode({ a: { b: 1 } }, {
                    replacer(k, v) {
                        return (k === "b" && this.b) ? 2 : v;
                    }
                }),
                "{a:{b:2}}"
            );
        });

        it("is called after toJSON", () => {
            function C() { }
            Object.assign(C.prototype, {
                toJSON() {
                    return { a: 1, b: 2 };
                }
            });
            assert.strictEqual(
                json5.encode(new C(), { replacer: (key, value) => (key === "a") ? 2 : value }),
                "{a:2,b:2}"
            );
        });

        it("is called after toJSON5", () => {
            function C() { }
            Object.assign(C.prototype, {
                toJSON5() {
                    return { a: 1, b: 2 };
                }
            });
            assert.strictEqual(
                json5.encode(new C(), { replacer: (key, value) => (key === "a") ? 2 : value }),
                "{a:2,b:2}"
            );
        });

        it("does not affect space when calls are nested", () => {
            assert.strictEqual(
                json5.encode({ a: 1 }, {
                    replacer: (key, value) => {
                        json5.encode({}, { replacer: null, space: 4 });
                        return value;
                    },
                    space: 2
                }),
                "{\n  a: 1,\n}"
            );
        });
    });

    describe("#encode(value, options)", () => {
        it("accepts replacer as an option", () => {
            assert.strictEqual(json5.encode({ a: 1, b: 2, 3: 3 }, { replacer: ["a", 3] }), "{a:1,'3':3}");
        });

        it("accepts space as an option", () => {
            assert.strictEqual(json5.encode([1], { space: 2 }), "[\n  1,\n]");
        });
    });

    describe("#encode(value, {quote})", () => {
        it("uses double quotes if provided", () => {
            assert.strictEqual(json5.encode({ 'a"': '1"' }, { replacer: { quote: '"' } }), '{"a\\"":"1\\""}');
        });

        it("uses single quotes if provided", () => {
            assert.strictEqual(json5.encode({ "a'": "1'" }, { replacer: { quote: "'" } }), "{'a\\'':'1\\''}");
        });
    });
});
