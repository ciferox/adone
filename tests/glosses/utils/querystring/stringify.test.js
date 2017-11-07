describe("util", "querystring", "stringify", () => {
    const {
        is,
        util: {
            querystring: qs,
            iconv
        }
    } = adone;

    it("stringifies a querystring object", () => {
        assert.equal(qs.stringify({ a: "b" }), "a=b");
        assert.equal(qs.stringify({ a: 1 }), "a=1");
        assert.equal(qs.stringify({ a: 1, b: 2 }), "a=1&b=2");
        assert.equal(qs.stringify({ a: "A_Z" }), "a=A_Z");
        assert.equal(qs.stringify({ a: "€" }), "a=%E2%82%AC");
        assert.equal(qs.stringify({ a: "" }), "a=%EE%80%80");
        assert.equal(qs.stringify({ a: "א" }), "a=%D7%90");
        assert.equal(qs.stringify({ a: "𐐷" }), "a=%F0%90%90%B7");
    });

    it("adds query prefix", () => {
        assert.equal(qs.stringify({ a: "b" }, { addQueryPrefix: true }), "?a=b");
    });

    it("with query prefix, outputs blank string given an empty object", () => {
        assert.equal(qs.stringify({}, { addQueryPrefix: true }), "");
    });

    it("stringifies a nested object", () => {
        assert.equal(qs.stringify({ a: { b: "c" } }), "a%5Bb%5D=c");
        assert.equal(qs.stringify({ a: { b: { c: { d: "e" } } } }), "a%5Bb%5D%5Bc%5D%5Bd%5D=e");
    });

    it("stringifies a nested object with dots notation", () => {
        assert.equal(qs.stringify({ a: { b: "c" } }, { allowDots: true }), "a.b=c");
        assert.equal(qs.stringify({ a: { b: { c: { d: "e" } } } }, { allowDots: true }), "a.b.c.d=e");
    });

    it("stringifies an array value", () => {
        assert.equal(
            qs.stringify({ a: ["b", "c", "d"] }, { arrayFormat: "indices" }),
            "a%5B0%5D=b&a%5B1%5D=c&a%5B2%5D=d",
            "indices => indices"
        );
        assert.equal(
            qs.stringify({ a: ["b", "c", "d"] }, { arrayFormat: "brackets" }),
            "a%5B%5D=b&a%5B%5D=c&a%5B%5D=d",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify({ a: ["b", "c", "d"] }),
            "a%5B0%5D=b&a%5B1%5D=c&a%5B2%5D=d",
            "default => indices"
        );
    });

    it("omits nulls when asked", () => {
        assert.equal(qs.stringify({ a: "b", c: null }, { skipNulls: true }), "a=b");
    });

    it("omits nested nulls when asked", () => {
        assert.equal(qs.stringify({ a: { b: "c", d: null } }, { skipNulls: true }), "a%5Bb%5D=c");
    });

    it("omits array indices when asked", () => {
        assert.equal(qs.stringify({ a: ["b", "c", "d"] }, { indices: false }), "a=b&a=c&a=d");
    });

    it("stringifies a nested array value", () => {
        assert.equal(qs.stringify({ a: { b: ["c", "d"] } }, { arrayFormat: "indices" }), "a%5Bb%5D%5B0%5D=c&a%5Bb%5D%5B1%5D=d");
        assert.equal(qs.stringify({ a: { b: ["c", "d"] } }, { arrayFormat: "brackets" }), "a%5Bb%5D%5B%5D=c&a%5Bb%5D%5B%5D=d");
        assert.equal(qs.stringify({ a: { b: ["c", "d"] } }), "a%5Bb%5D%5B0%5D=c&a%5Bb%5D%5B1%5D=d");
    });

    it("stringifies a nested array value with dots notation", () => {
        assert.equal(
            qs.stringify(
                { a: { b: ["c", "d"] } },
                { allowDots: true, encode: false, arrayFormat: "indices" }
            ),
            "a.b[0]=c&a.b[1]=d",
            "indices: stringifies with dots + indices"
        );
        assert.equal(
            qs.stringify(
                { a: { b: ["c", "d"] } },
                { allowDots: true, encode: false, arrayFormat: "brackets" }
            ),
            "a.b[]=c&a.b[]=d",
            "brackets: stringifies with dots + brackets"
        );
        assert.equal(
            qs.stringify(
                { a: { b: ["c", "d"] } },
                { allowDots: true, encode: false }
            ),
            "a.b[0]=c&a.b[1]=d",
            "default: stringifies with dots + indices"
        );
    });

    it("stringifies an object inside an array", () => {
        assert.equal(
            qs.stringify({ a: [{ b: "c" }] }, { arrayFormat: "indices" }),
            "a%5B0%5D%5Bb%5D=c",
            "indices => brackets"
        );
        assert.equal(
            qs.stringify({ a: [{ b: "c" }] }, { arrayFormat: "brackets" }),
            "a%5B%5D%5Bb%5D=c",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify({ a: [{ b: "c" }] }),
            "a%5B0%5D%5Bb%5D=c",
            "default => indices"
        );

        assert.equal(
            qs.stringify({ a: [{ b: { c: [1] } }] }, { arrayFormat: "indices" }),
            "a%5B0%5D%5Bb%5D%5Bc%5D%5B0%5D=1",
            "indices => indices"
        );

        assert.equal(
            qs.stringify({ a: [{ b: { c: [1] } }] }, { arrayFormat: "brackets" }),
            "a%5B%5D%5Bb%5D%5Bc%5D%5B%5D=1",
            "brackets => brackets"
        );

        assert.equal(
            qs.stringify({ a: [{ b: { c: [1] } }] }),
            "a%5B0%5D%5Bb%5D%5Bc%5D%5B0%5D=1",
            "default => indices"
        );

    });

    it("stringifies an array with mixed objects and primitives", () => {
        assert.equal(
            qs.stringify({ a: [{ b: 1 }, 2, 3] }, { encode: false, arrayFormat: "indices" }),
            "a[0][b]=1&a[1]=2&a[2]=3",
            "indices => indices"
        );
        assert.equal(
            qs.stringify({ a: [{ b: 1 }, 2, 3] }, { encode: false, arrayFormat: "brackets" }),
            "a[][b]=1&a[]=2&a[]=3",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify({ a: [{ b: 1 }, 2, 3] }, { encode: false }),
            "a[0][b]=1&a[1]=2&a[2]=3",
            "default => indices"
        );
    });

    it("stringifies an object inside an array with dots notation", () => {
        assert.equal(
            qs.stringify(
                { a: [{ b: "c" }] },
                { allowDots: true, encode: false, arrayFormat: "indices" }
            ),
            "a[0].b=c",
            "indices => indices"
        );
        assert.equal(
            qs.stringify(
                { a: [{ b: "c" }] },
                { allowDots: true, encode: false, arrayFormat: "brackets" }
            ),
            "a[].b=c",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify(
                { a: [{ b: "c" }] },
                { allowDots: true, encode: false }
            ),
            "a[0].b=c",
            "default => indices"
        );

        assert.equal(
            qs.stringify(
                { a: [{ b: { c: [1] } }] },
                { allowDots: true, encode: false, arrayFormat: "indices" }
            ),
            "a[0].b.c[0]=1",
            "indices => indices"
        );
        assert.equal(
            qs.stringify(
                { a: [{ b: { c: [1] } }] },
                { allowDots: true, encode: false, arrayFormat: "brackets" }
            ),
            "a[].b.c[]=1",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify(
                { a: [{ b: { c: [1] } }] },
                { allowDots: true, encode: false }
            ),
            "a[0].b.c[0]=1",
            "default => indices"
        );
    });

    it("does not omit object keys when indices = false", () => {
        assert.equal(qs.stringify({ a: [{ b: "c" }] }, { indices: false }), "a%5Bb%5D=c");
    });

    it("uses indices notation for arrays when indices=true", () => {
        assert.equal(qs.stringify({ a: ["b", "c"] }, { indices: true }), "a%5B0%5D=b&a%5B1%5D=c");
    });

    it("uses indices notation for arrays when no arrayFormat is specified", () => {
        assert.equal(qs.stringify({ a: ["b", "c"] }), "a%5B0%5D=b&a%5B1%5D=c");
    });

    it("uses indices notation for arrays when no arrayFormat=indices", () => {
        assert.equal(qs.stringify({ a: ["b", "c"] }, { arrayFormat: "indices" }), "a%5B0%5D=b&a%5B1%5D=c");
    });

    it("uses repeat notation for arrays when no arrayFormat=repeat", () => {
        assert.equal(qs.stringify({ a: ["b", "c"] }, { arrayFormat: "repeat" }), "a=b&a=c");
    });

    it("uses brackets notation for arrays when no arrayFormat=brackets", () => {
        assert.equal(qs.stringify({ a: ["b", "c"] }, { arrayFormat: "brackets" }), "a%5B%5D=b&a%5B%5D=c");
    });

    it("stringifies a complicated object", () => {
        assert.equal(qs.stringify({ a: { b: "c", d: "e" } }), "a%5Bb%5D=c&a%5Bd%5D=e");
    });

    it("stringifies an empty value", () => {
        assert.equal(qs.stringify({ a: "" }), "a=");
        assert.equal(qs.stringify({ a: null }, { strictNullHandling: true }), "a");

        assert.equal(qs.stringify({ a: "", b: "" }), "a=&b=");
        assert.equal(qs.stringify({ a: null, b: "" }, { strictNullHandling: true }), "a&b=");

        assert.equal(qs.stringify({ a: { b: "" } }), "a%5Bb%5D=");
        assert.equal(qs.stringify({ a: { b: null } }, { strictNullHandling: true }), "a%5Bb%5D");
        assert.equal(qs.stringify({ a: { b: null } }, { strictNullHandling: false }), "a%5Bb%5D=");

    });

    it("stringifies a null object", { skip: !Object.create }, () => {
        const obj = Object.create(null);
        obj.a = "b";
        assert.equal(qs.stringify(obj), "a=b");
    });

    it("returns an empty string for invalid input", () => {
        assert.equal(qs.stringify(undefined), "");
        assert.equal(qs.stringify(false), "");
        assert.equal(qs.stringify(null), "");
        assert.equal(qs.stringify(""), "");
    });

    it("stringifies an object with a null object as a child", { skip: !Object.create }, () => {
        const obj = { a: Object.create(null) };

        obj.a.b = "c";
        assert.equal(qs.stringify(obj), "a%5Bb%5D=c");
    });

    it("drops keys with a value of undefined", () => {
        assert.equal(qs.stringify({ a: undefined }), "");

        assert.equal(qs.stringify({ a: { b: undefined, c: null } }, { strictNullHandling: true }), "a%5Bc%5D");
        assert.equal(qs.stringify({ a: { b: undefined, c: null } }, { strictNullHandling: false }), "a%5Bc%5D=");
        assert.equal(qs.stringify({ a: { b: undefined, c: "" } }), "a%5Bc%5D=");
    });

    it("url encodes values", () => {
        assert.equal(qs.stringify({ a: "b c" }), "a=b%20c");
    });

    it("stringifies a date", () => {
        const now = new Date();
        const str = `a=${encodeURIComponent(now.toISOString())}`;
        assert.equal(qs.stringify({ a: now }), str);
    });

    it("stringifies the weird object from qs", () => {
        assert.equal(qs.stringify({ "my weird field": '~q1!2"\'w$5&7/z8)?' }), "my%20weird%20field=~q1%212%22%27w%245%267%2Fz8%29%3F");
    });

    it("skips properties that are part of the object prototype", () => {
        Object.prototype.crash = "test"; // eslint-disable-line no-extend-native
        assert.equal(qs.stringify({ a: "b" }), "a=b");
        assert.equal(qs.stringify({ a: { b: "c" } }), "a%5Bb%5D=c");
        delete Object.prototype.crash;
    });

    it("stringifies boolean values", () => {
        assert.equal(qs.stringify({ a: true }), "a=true");
        assert.equal(qs.stringify({ a: { b: true } }), "a%5Bb%5D=true");
        assert.equal(qs.stringify({ b: false }), "b=false");
        assert.equal(qs.stringify({ b: { c: false } }), "b%5Bc%5D=false");
    });

    it("stringifies buffer values", () => {
        assert.equal(qs.stringify({ a: Buffer.from("test") }), "a=test");
        assert.equal(qs.stringify({ a: { b: Buffer.from("test") } }), "a%5Bb%5D=test");
    });

    it("stringifies an object using an alternative delimiter", () => {
        assert.equal(qs.stringify({ a: "b", c: "d" }, { delimiter: ";" }), "a=b;c=d");
    });

    it("doesn't blow up when Buffer global is missing", () => {
        const tempBuffer = global.Buffer;
        delete global.Buffer;
        const result = qs.stringify({ a: "b", c: "d" });
        global.Buffer = tempBuffer;
        assert.equal(result, "a=b&c=d");
    });

    it("selects properties when filter=array", () => {
        assert.equal(qs.stringify({ a: "b" }, { filter: ["a"] }), "a=b");
        assert.equal(qs.stringify({ a: 1 }, { filter: [] }), "");

        assert.equal(
            qs.stringify(
                { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
                { filter: ["a", "b", 0, 2], arrayFormat: "indices" }
            ),
            "a%5Bb%5D%5B0%5D=1&a%5Bb%5D%5B2%5D=3",
            "indices => indices"
        );
        assert.equal(
            qs.stringify(
                { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
                { filter: ["a", "b", 0, 2], arrayFormat: "brackets" }
            ),
            "a%5Bb%5D%5B%5D=1&a%5Bb%5D%5B%5D=3",
            "brackets => brackets"
        );
        assert.equal(
            qs.stringify(
                { a: { b: [1, 2, 3, 4], c: "d" }, c: "f" },
                { filter: ["a", "b", 0, 2] }
            ),
            "a%5Bb%5D%5B0%5D=1&a%5Bb%5D%5B2%5D=3",
            "default => indices"
        );

    });

    it("supports custom representations when filter=function", () => {
        let calls = 0;
        const obj = { a: "b", c: "d", e: { f: new Date(1257894000000) } };
        const filterFunc = function (prefix, value) {
            calls += 1;
            if (calls === 1) {
                assert.equal(prefix, "", "prefix is empty");
                assert.equal(value, obj);
            } else if (prefix === "c") {
                return void 0;
            } else if (value instanceof Date) {
                assert.equal(prefix, "e[f]");
                return value.getTime();
            }
            return value;
        };

        assert.equal(qs.stringify(obj, { filter: filterFunc }), "a=b&e%5Bf%5D=1257894000000");
        assert.equal(calls, 5);
    });

    it("can disable uri encoding", () => {
        assert.equal(qs.stringify({ a: "b" }, { encode: false }), "a=b");
        assert.equal(qs.stringify({ a: { b: "c" } }, { encode: false }), "a[b]=c");
        assert.equal(qs.stringify({ a: "b", c: null }, { strictNullHandling: true, encode: false }), "a=b&c");
    });

    it("can sort the keys", () => {
        const sort = function (a, b) {
            return a.localeCompare(b);
        };
        assert.equal(qs.stringify({ a: "c", z: "y", b: "f" }, { sort }), "a=c&b=f&z=y");
        assert.equal(qs.stringify({ a: "c", z: { j: "a", i: "b" }, b: "f" }, { sort }), "a=c&b=f&z%5Bi%5D=b&z%5Bj%5D=a");
    });

    it("can sort the keys at depth 3 or more too", () => {
        const sort = function (a, b) {
            return a.localeCompare(b);
        };
        assert.equal(
            qs.stringify(
                { a: "a", z: { zj: { zjb: "zjb", zja: "zja" }, zi: { zib: "zib", zia: "zia" } }, b: "b" },
                { sort, encode: false }
            ),
            "a=a&b=b&z[zi][zia]=zia&z[zi][zib]=zib&z[zj][zja]=zja&z[zj][zjb]=zjb"
        );
        assert.equal(
            qs.stringify(
                { a: "a", z: { zj: { zjb: "zjb", zja: "zja" }, zi: { zib: "zib", zia: "zia" } }, b: "b" },
                { sort: null, encode: false }
            ),
            "a=a&z[zj][zjb]=zjb&z[zj][zja]=zja&z[zi][zib]=zib&z[zi][zia]=zia&b=b"
        );
    });

    it("can stringify with custom encoding", () => {
        assert.equal(qs.stringify({ 県: "大阪府", "": "" }, {
            encoder(str) {
                if (str.length === 0) {
                    return "";
                }
                const buf = iconv.encode(str, "shiftjis");
                const result = [];
                for (let i = 0; i < buf.length; ++i) {
                    result.push(buf.readUInt8(i).toString(16));
                }
                return `%${result.join("%")}`;
            }
        }), "%8c%a7=%91%e5%8d%e3%95%7b&=");
    });

    it("throws error with wrong encoder", () => {
        assert.throws(() => {
            qs.stringify({}, { encoder: "string" });
        }, "Encoder has to be a function.");
    });

    it("can use custom encoder for a buffer object", () => {
        assert.equal(qs.stringify({ a: Buffer.from([1]) }, {
            encoder(buffer) {
                if (is.string(buffer)) {
                    return buffer;
                }
                return String.fromCharCode(buffer.readUInt8(0) + 97);
            }
        }), "a=b");
    });

    it("serializeDate option", () => {
        const date = new Date();
        assert.equal(
            qs.stringify({ a: date }),
            `a=${date.toISOString().replace(/:/g, "%3A")}`,
            "default is toISOString"
        );

        const mutatedDate = new Date();
        mutatedDate.toISOString = function () {
            throw new SyntaxError();
        };
        assert.throws(() => {
            mutatedDate.toISOString();
        }, SyntaxError);
        assert.equal(
            qs.stringify({ a: mutatedDate }),
            `a=${Date.prototype.toISOString.call(mutatedDate).replace(/:/g, "%3A")}`,
            "toISOString works even when method is not locally present"
        );

        const specificDate = new Date(6);
        assert.equal(
            qs.stringify(
                { a: specificDate },
                {
                    serializeDate(d) {
                        return d.getTime() * 7;
                    }
                }
            ),
            "a=42",
            "custom serializeDate function called"
        );

    });

    it("RFC 1738 spaces serialization", () => {
        assert.equal(qs.stringify({ a: "b c" }, { format: qs.formats.RFC1738 }), "a=b+c");
        assert.equal(qs.stringify({ "a b": "c d" }, { format: qs.formats.RFC1738 }), "a+b=c+d");
    });

    it("RFC 3986 spaces serialization", () => {
        assert.equal(qs.stringify({ a: "b c" }, { format: qs.formats.RFC3986 }), "a=b%20c");
        assert.equal(qs.stringify({ "a b": "c d" }, { format: qs.formats.RFC3986 }), "a%20b=c%20d");
    });

    it("Backward compatibility to RFC 3986", () => {
        assert.equal(qs.stringify({ a: "b c" }), "a=b%20c");
    });

    it("Edge cases and unknown formats", () => {
        ["UFO1234", false, 1234, null, {}, []].forEach(
            (format) => {
                assert.throws(
                    () => {
                        qs.stringify({ a: "b c" }, { format });
                    },
                    "Unknown format option provided."
                );
            }
        );
    });

    it("encodeValuesOnly", () => {
        assert.equal(
            qs.stringify(
                { a: "b", c: ["d", "e=f"], f: [["g"], ["h"]] },
                { encodeValuesOnly: true }
            ),
            "a=b&c[0]=d&c[1]=e%3Df&f[0][0]=g&f[1][0]=h"
        );
        assert.equal(
            qs.stringify(
                { a: "b", c: ["d", "e"], f: [["g"], ["h"]] }
            ),
            "a=b&c%5B0%5D=d&c%5B1%5D=e&f%5B0%5D%5B0%5D=g&f%5B1%5D%5B0%5D=h"
        );
    });

    it("encodeValuesOnly - strictNullHandling", () => {
        assert.equal(
            qs.stringify(
                { a: { b: null } },
                { encodeValuesOnly: true, strictNullHandling: true }
            ),
            "a[b]"
        );
    });

    it("does not mutate the options argument", () => {
        const options = {};
        qs.stringify({}, options);
        assert.deepEqual(options, {});
    });
});
