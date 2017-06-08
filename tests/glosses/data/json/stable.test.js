describe("data", "json", "stable", () => {
    const stringify = (x, opts = {}) => {
        opts.stable = true;
        return adone.data.json.encode(x, opts).toString();
    };
    describe("cmp", () => {
        specify("custom comparison function", () => {
            const obj = { c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 };
            const s = stringify(obj, {
                cmp: (a, b) => a.key < b.key ? 1 : -1
            });
            expect(s).to.be.equal('{"c":8,"b":[{"z":6,"y":5,"x":4},7],"a":3}');
        });
    });

    describe("nested", () => {
        specify("nested", () => {
            const obj = { c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 };
            expect(stringify(obj)).to.be.equal('{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}');
        });

        specify("cyclic (default)", () => {
            const one = { a: 1 };
            const two = { a: 2, one };
            one.two = two;
            try {
                stringify(one);
            } catch (ex) {
                expect(ex.toString()).to.be.equal("TypeError: Converting circular structure to JSON");
            }
        });

        specify("cyclic (specifically allowed)", () => {
            const one = { a: 1 };
            const two = { a: 2, one };
            one.two = two;
            expect(stringify(one, { cycles: true })).to.be.equal('{"a":1,"two":{"a":2,"one":"__cycle__"}}');
        });

        specify("repeated non-cyclic value", () => {
            const one = { x: 1 };
            const two = { a: one, b: one };
            expect(stringify(two)).to.be.equal('{"a":{"x":1},"b":{"x":1}}');
        });

        specify("acyclic but with reused obj-property pointers", () => {
            const x = { a: 1 };
            const y = { b: x, c: x };
            expect(stringify(y)).to.be.equal('{"b":{"a":1},"c":{"a":1}}');
        });
    });

    describe("replacer", () => {
        specify("replace root", () => {
            const obj = { a: 1, b: 2, c: false };
            const replacer = () => "one";

            expect(stringify(obj, { replacer })).to.be.equal('"one"');
        });

        specify("replace numbers", () => {
            const obj = { a: 1, b: 2, c: false };
            const replacer = function (key, value) {
                if (value === 1) {
                    return "one";
                }
                if (value === 2) {
                    return "two";
                }
                return value;
            };

            expect(stringify(obj, { replacer })).to.be.equal('{"a":"one","b":"two","c":false}');
        });

        specify("replace with object", () => {
            const obj = { a: 1, b: 2, c: false };
            const replacer = function (key, value) {
                if (key === "b") {
                    return { d: 1 };
                }
                if (value === 1) {
                    return "one";
                }
                return value;
            };

            expect(stringify(obj, { replacer })).to.be.equal('{"a":"one","b":{"d":"one"},"c":false}');
        });

        specify("replace with undefined", () => {
            const obj = { a: 1, b: 2, c: false };
            const replacer = function (key, value) {
                if (value === false) {
                    return;
                }
                return value;
            };

            expect(stringify(obj, { replacer })).to.be.equal('{"a":1,"b":2}');
        });

        specify("replace with array", () => {
            const obj = { a: 1, b: 2, c: false };
            const replacer = function (key, value) {
                if (key === "b") {
                    return ["one", "two"];
                }
                return value;
            };

            expect(stringify(obj, { replacer })).to.be.equal('{"a":1,"b":["one","two"],"c":false}');
        });

        specify("replace array item", () => {
            const obj = { a: 1, b: 2, c: [1, 2] };
            const replacer = function (key, value) {
                if (value === 1) {
                    return "one";
                }
                if (value === 2) {
                    return "two";
                }
                return value;
            };

            expect(stringify(obj, { replacer })).to.be.equal('{"a":"one","b":"two","c":["one","two"]}');
        });
    });

    describe("space", () => {
        specify("space parameter", () => {
            const obj = { one: 1, two: 2 };
            expect(stringify(obj, { space: "  " })).to.be.equal(
                ""
                + "{\n"
                + '  "one": 1,\n'
                + '  "two": 2\n'
                + "}"
            );
        });

        specify("space parameter (with tabs)", () => {
            const obj = { one: 1, two: 2 };
            expect(stringify(obj, { space: "\t" })).to.be.equal(
                ""
                + "{\n"
                + '\t"one": 1,\n'
                + '\t"two": 2\n'
                + "}"
            );
        });

        specify("space parameter (with a number)", () => {
            const obj = { one: 1, two: 2 };
            expect(stringify(obj, { space: 3 })).to.be.equal(
                ""
                + "{\n"
                + '   "one": 1,\n'
                + '   "two": 2\n'
                + "}"
            );
        });

        specify("space parameter (nested objects)", () => {
            const obj = { one: 1, two: { b: 4, a: [2, 3] } };
            expect(stringify(obj, { space: "  " })).to.be.equal(
                ""
                + "{\n"
                + '  "one": 1,\n'
                + '  "two": {\n'
                + '    "a": [\n'
                + "      2,\n"
                + "      3\n"
                + "    ],\n"
                + '    "b": 4\n'
                + "  }\n"
                + "}"
            );
        });

        specify("space parameter (same as native)", () => {
            // for this test, properties need to be in alphabetical order
            const obj = { one: 1, two: { a: [2, 3], b: 4 } };
            expect(stringify(obj, { space: "  " })).to.be.equal(JSON.stringify(obj, null, "  "));
        });
    });

    describe("str", () => {
        specify("simple object", () => {
            const obj = { c: 6, b: [4, 5], a: 3, z: null };
            expect(stringify(obj)).to.be.equal('{"a":3,"b":[4,5],"c":6,"z":null}');
        });

        specify("object with undefined", () => {
            const obj = { a: 3, z: undefined };
            expect(stringify(obj)).to.be.equal('{"a":3}');
        });

        specify("array with undefined", () => {
            const obj = [4, undefined, 6];
            expect(stringify(obj)).to.be.equal("[4,null,6]");
        });

        specify("object with empty string", () => {
            const obj = { a: 3, z: "" };
            expect(stringify(obj)).to.be.equal('{"a":3,"z":""}');
        });

        specify("array with empty string", () => {
            const obj = [4, "", 6];
            expect(stringify(obj)).to.be.equal('[4,"",6]');
        });
    });

    describe("toJSON", () => {
        specify("toJSON function", () => {
            const obj = { one: 1, two: 2, toJSON() {
                return { one: 1 };
            } };
            expect(stringify(obj)).to.be.equal('{"one":1}');
        });

        specify("toJSON returns string", () => {
            const obj = { one: 1, two: 2, toJSON() {
                return "one";
            } };
            expect(stringify(obj)).to.be.equal('"one"');
        });

        specify("toJSON returns array", () => {
            const obj = { one: 1, two: 2, toJSON() {
                return ["one"];
            } };
            expect(stringify(obj)).to.be.equal('["one"]');
        });
    });
});
