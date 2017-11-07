describe("util", "querystring", "parse", () => {
    const {
        util: {
            querystring: qs,
            iconv
        }
    } = adone;

    it("parses a simple string", () => {
        assert.deepEqual(qs.parse("0=foo"), { 0: "foo" });
        assert.deepEqual(qs.parse("foo=c++"), { foo: "c  " });
        assert.deepEqual(qs.parse("a[>=]=23"), { a: { ">=": "23" } });
        assert.deepEqual(qs.parse("a[<=>]==23"), { a: { "<=>": "=23" } });
        assert.deepEqual(qs.parse("a[==]=23"), { a: { "==": "23" } });
        assert.deepEqual(qs.parse("foo", { strictNullHandling: true }), { foo: null });
        assert.deepEqual(qs.parse("foo"), { foo: "" });
        assert.deepEqual(qs.parse("foo="), { foo: "" });
        assert.deepEqual(qs.parse("foo=bar"), { foo: "bar" });
        assert.deepEqual(qs.parse(" foo = bar = baz "), { " foo ": " bar = baz " });
        assert.deepEqual(qs.parse("foo=bar=baz"), { foo: "bar=baz" });
        assert.deepEqual(qs.parse("foo=bar&bar=baz"), { foo: "bar", bar: "baz" });
        assert.deepEqual(qs.parse("foo2=bar2&baz2="), { foo2: "bar2", baz2: "" });
        assert.deepEqual(qs.parse("foo=bar&baz", { strictNullHandling: true }), { foo: "bar", baz: null });
        assert.deepEqual(qs.parse("foo=bar&baz"), { foo: "bar", baz: "" });
        assert.deepEqual(qs.parse("cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World"), {
            cht: "p3",
            chd: "t:60,40",
            chs: "250x100",
            chl: "Hello|World"
        });
    });

    it("allows enabling dot notation", () => {
        assert.deepEqual(qs.parse("a.b=c"), { "a.b": "c" });
        assert.deepEqual(qs.parse("a.b=c", { allowDots: true }), { a: { b: "c" } });
    });

    it("nested", () => {
        assert.deepEqual(qs.parse("a[b]=c"), { a: { b: "c" } }, "parses a single nested string");
        assert.deepEqual(qs.parse("a[b][c]=d"), { a: { b: { c: "d" } } }, "parses a double nested string");
        assert.deepEqual(
            qs.parse("a[b][c][d][e][f][g][h]=i"),
            { a: { b: { c: { d: { e: { f: { "[g][h]": "i" } } } } } } },
            "defaults to a depth of 5"
        );
    });

    it("only parses one level when depth = 1", () => {
        assert.deepEqual(qs.parse("a[b][c]=d", { depth: 1 }), { a: { b: { "[c]": "d" } } });
        assert.deepEqual(qs.parse("a[b][c][d]=e", { depth: 1 }), { a: { b: { "[c][d]": "e" } } });
    });

    it("simple array", () => {
        assert.deepEqual(qs.parse("a=b&a=c"), { a: ["b", "c"] }, "parses a simple array");
    });


    it("parses an explicit array", () => {
        assert.deepEqual(qs.parse("a[]=b"), { a: ["b"] });
        assert.deepEqual(qs.parse("a[]=b&a[]=c"), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[]=b&a[]=c&a[]=d"), { a: ["b", "c", "d"] });
    });

    it("parses a mix of simple and explicit arrays", () => {
        assert.deepEqual(qs.parse("a=b&a[]=c"), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[]=b&a=c"), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[0]=b&a=c"), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a=b&a[0]=c"), { a: ["b", "c"] });

        assert.deepEqual(qs.parse("a[1]=b&a=c", { arrayLimit: 20 }), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[]=b&a=c", { arrayLimit: 0 }), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[]=b&a=c"), { a: ["b", "c"] });

        assert.deepEqual(qs.parse("a=b&a[1]=c", { arrayLimit: 20 }), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a=b&a[]=c", { arrayLimit: 0 }), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a=b&a[]=c"), { a: ["b", "c"] });
    });

    it("parses a nested array", () => {
        assert.deepEqual(qs.parse("a[b][]=c&a[b][]=d"), { a: { b: ["c", "d"] } });
        assert.deepEqual(qs.parse("a[>=]=25"), { a: { ">=": "25" } });
    });

    it("allows to specify array indices", () => {
        assert.deepEqual(qs.parse("a[1]=c&a[0]=b&a[2]=d"), { a: ["b", "c", "d"] });
        assert.deepEqual(qs.parse("a[1]=c&a[0]=b"), { a: ["b", "c"] });
        assert.deepEqual(qs.parse("a[1]=c", { arrayLimit: 20 }), { a: ["c"] });
        assert.deepEqual(qs.parse("a[1]=c", { arrayLimit: 0 }), { a: { 1: "c" } });
        assert.deepEqual(qs.parse("a[1]=c"), { a: ["c"] });
    });

    it("limits specific array indices to arrayLimit", () => {
        assert.deepEqual(qs.parse("a[20]=a", { arrayLimit: 20 }), { a: ["a"] });
        assert.deepEqual(qs.parse("a[21]=a", { arrayLimit: 20 }), { a: { 21: "a" } });
    });

    it("supports number keys", () => {
        assert.deepEqual(qs.parse("a[12b]=c"), { a: { "12b": "c" } }, "supports keys that begin with a number");
    });


    it("supports encoded = signs", () => {
        assert.deepEqual(qs.parse("he%3Dllo=th%3Dere"), { "he=llo": "th=ere" });
    });

    it("is ok with url encoded strings", () => {
        assert.deepEqual(qs.parse("a[b%20c]=d"), { a: { "b c": "d" } });
        assert.deepEqual(qs.parse("a[b]=c%20d"), { a: { b: "c d" } });
    });

    it("allows brackets in the value", () => {
        assert.deepEqual(qs.parse('pets=["tobi"]'), { pets: '["tobi"]' });
        assert.deepEqual(qs.parse('operators=[">=", "<="]'), { operators: '[">=", "<="]' });
    });

    it("allows empty values", () => {
        assert.deepEqual(qs.parse(""), {});
        assert.deepEqual(qs.parse(null), {});
        assert.deepEqual(qs.parse(undefined), {});
    });

    it("transforms arrays to objects", () => {
        assert.deepEqual(qs.parse("foo[0]=bar&foo[bad]=baz"), { foo: { 0: "bar", bad: "baz" } });
        assert.deepEqual(qs.parse("foo[bad]=baz&foo[0]=bar"), { foo: { bad: "baz", 0: "bar" } });
        assert.deepEqual(qs.parse("foo[bad]=baz&foo[]=bar"), { foo: { bad: "baz", 0: "bar" } });
        assert.deepEqual(qs.parse("foo[]=bar&foo[bad]=baz"), { foo: { 0: "bar", bad: "baz" } });
        assert.deepEqual(qs.parse("foo[bad]=baz&foo[]=bar&foo[]=foo"), { foo: { bad: "baz", 0: "bar", 1: "foo" } });
        assert.deepEqual(qs.parse("foo[0][a]=a&foo[0][b]=b&foo[1][a]=aa&foo[1][b]=bb"), { foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }] });

        assert.deepEqual(qs.parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: false }), { a: { 0: "b", t: "u" } });
        assert.deepEqual(qs.parse("a[]=b&a[t]=u&a[hasOwnProperty]=c", { allowPrototypes: true }), { a: { 0: "b", t: "u", hasOwnProperty: "c" } });
        assert.deepEqual(qs.parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: false }), { a: { 0: "b", x: "y" } });
        assert.deepEqual(qs.parse("a[]=b&a[hasOwnProperty]=c&a[x]=y", { allowPrototypes: true }), { a: { 0: "b", hasOwnProperty: "c", x: "y" } });
    });

    it("transforms arrays to objects (dot notation)", () => {
        assert.deepEqual(qs.parse("foo[0].baz=bar&fool.bad=baz", { allowDots: true }), { foo: [{ baz: "bar" }], fool: { bad: "baz" } });
        assert.deepEqual(qs.parse("foo[0].baz=bar&fool.bad.boo=baz", { allowDots: true }), { foo: [{ baz: "bar" }], fool: { bad: { boo: "baz" } } });
        assert.deepEqual(qs.parse("foo[0][0].baz=bar&fool.bad=baz", { allowDots: true }), { foo: [[{ baz: "bar" }]], fool: { bad: "baz" } });
        assert.deepEqual(qs.parse("foo[0].baz[0]=15&foo[0].bar=2", { allowDots: true }), { foo: [{ baz: ["15"], bar: "2" }] });
        assert.deepEqual(qs.parse("foo[0].baz[0]=15&foo[0].baz[1]=16&foo[0].bar=2", { allowDots: true }), { foo: [{ baz: ["15", "16"], bar: "2" }] });
        assert.deepEqual(qs.parse("foo.bad=baz&foo[0]=bar", { allowDots: true }), { foo: { bad: "baz", 0: "bar" } });
        assert.deepEqual(qs.parse("foo.bad=baz&foo[]=bar", { allowDots: true }), { foo: { bad: "baz", 0: "bar" } });
        assert.deepEqual(qs.parse("foo[]=bar&foo.bad=baz", { allowDots: true }), { foo: { 0: "bar", bad: "baz" } });
        assert.deepEqual(qs.parse("foo.bad=baz&foo[]=bar&foo[]=foo", { allowDots: true }), { foo: { bad: "baz", 0: "bar", 1: "foo" } });
        assert.deepEqual(qs.parse("foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb", { allowDots: true }), { foo: [{ a: "a", b: "b" }, { a: "aa", b: "bb" }] });
    });

    it("correctly prunes undefined values when converting an array to an object", () => {
        assert.deepEqual(qs.parse("a[2]=b&a[99999999]=c"), { a: { 2: "b", 99999999: "c" } });
    });

    it("supports malformed uri characters", () => {
        assert.deepEqual(qs.parse("{%:%}", { strictNullHandling: true }), { "{%:%}": null });
        assert.deepEqual(qs.parse("{%:%}="), { "{%:%}": "" });
        assert.deepEqual(qs.parse("foo=%:%}"), { foo: "%:%}" });
    });

    it("doesn't produce empty keys", () => {
        assert.deepEqual(qs.parse("_r=1&"), { _r: "1" });
    });

    it("cannot access Object prototype", () => {
        qs.parse("constructor[prototype][bad]=bad");
        qs.parse("bad[constructor][prototype][bad]=bad");
        assert.equal(typeof Object.prototype.bad, "undefined");
    });

    it("parses arrays of objects", () => {
        assert.deepEqual(qs.parse("a[][b]=c"), { a: [{ b: "c" }] });
        assert.deepEqual(qs.parse("a[0][b]=c"), { a: [{ b: "c" }] });
    });

    it("allows for empty strings in arrays", () => {
        assert.deepEqual(qs.parse("a[]=b&a[]=&a[]=c"), { a: ["b", "", "c"] });

        assert.deepEqual(
            qs.parse("a[0]=b&a[1]&a[2]=c&a[19]=", { strictNullHandling: true, arrayLimit: 20 }),
            { a: ["b", null, "c", ""] },
            "with arrayLimit 20 + array indices: null then empty string works"
        );
        assert.deepEqual(
            qs.parse("a[]=b&a[]&a[]=c&a[]=", { strictNullHandling: true, arrayLimit: 0 }),
            { a: ["b", null, "c", ""] },
            "with arrayLimit 0 + array brackets: null then empty string works"
        );

        assert.deepEqual(
            qs.parse("a[0]=b&a[1]=&a[2]=c&a[19]", { strictNullHandling: true, arrayLimit: 20 }),
            { a: ["b", "", "c", null] },
            "with arrayLimit 20 + array indices: empty string then null works"
        );
        assert.deepEqual(
            qs.parse("a[]=b&a[]=&a[]=c&a[]", { strictNullHandling: true, arrayLimit: 0 }),
            { a: ["b", "", "c", null] },
            "with arrayLimit 0 + array brackets: empty string then null works"
        );

        assert.deepEqual(
            qs.parse("a[]=&a[]=b&a[]=c"),
            { a: ["", "b", "c"] },
            "array brackets: empty strings work"
        );
    });

    it("compacts sparse arrays", () => {
        assert.deepEqual(qs.parse("a[10]=1&a[2]=2", { arrayLimit: 20 }), { a: ["2", "1"] });
        assert.deepEqual(qs.parse("a[1][b][2][c]=1", { arrayLimit: 20 }), { a: [{ b: [{ c: "1" }] }] });
        assert.deepEqual(qs.parse("a[1][2][3][c]=1", { arrayLimit: 20 }), { a: [[[{ c: "1" }]]] });
        assert.deepEqual(qs.parse("a[1][2][3][c][1]=1", { arrayLimit: 20 }), { a: [[[{ c: ["1"] }]]] });
    });

    it("parses semi-parsed strings", () => {
        assert.deepEqual(qs.parse({ "a[b]": "c" }), { a: { b: "c" } });
        assert.deepEqual(qs.parse({ "a[b]": "c", "a[d]": "e" }), { a: { b: "c", d: "e" } });
    });

    it("parses buffers correctly", () => {
        const b = Buffer.from("test");
        assert.deepEqual(qs.parse({ a: b }), { a: b });
    });

    it("continues parsing when no parent is found", () => {
        assert.deepEqual(qs.parse("[]=&a=b"), { 0: "", a: "b" });
        assert.deepEqual(qs.parse("[]&a=b", { strictNullHandling: true }), { 0: null, a: "b" });
        assert.deepEqual(qs.parse("[foo]=bar"), { foo: "bar" });
    });

    it("does not error when parsing a very long array", () => {
        let str = "a[]=a";
        while (Buffer.byteLength(str) < 128 * 1024) {
            str = `${str}&${str}`;
        }

        assert.doesNotThrow(() => {
            qs.parse(str);
        });
    });

    it("should not throw when a native prototype has an enumerable property", { parallel: false }, () => {
        Object.prototype.crash = ""; // eslint-disable-line no-extend-native
        Array.prototype.crash = ""; // eslint-disable-line no-extend-native
        try {
            assert.doesNotThrow(qs.parse.bind(null, "a=b"));
            assert.deepEqual(qs.parse("a=b"), { a: "b" });
            assert.doesNotThrow(qs.parse.bind(null, "a[][b]=c"));
            assert.deepEqual(qs.parse("a[][b]=c"), { a: [{ b: "c" }] });
        } finally {
            delete Object.prototype.crash;
            delete Array.prototype.crash;
        }
    });

    it("parses a string with an alternative string delimiter", () => {
        assert.deepEqual(qs.parse("a=b;c=d", { delimiter: ";" }), { a: "b", c: "d" });
    });

    it("parses a string with an alternative RegExp delimiter", () => {
        assert.deepEqual(qs.parse("a=b; c=d", { delimiter: /[;,] */ }), { a: "b", c: "d" });
    });

    it("does not use non-splittable objects as delimiters", () => {
        assert.deepEqual(qs.parse("a=b&c=d", { delimiter: true }), { a: "b", c: "d" });
    });

    it("allows overriding parameter limit", () => {
        assert.deepEqual(qs.parse("a=b&c=d", { parameterLimit: 1 }), { a: "b" });
    });

    it("allows setting the parameter limit to Infinity", () => {
        assert.deepEqual(qs.parse("a=b&c=d", { parameterLimit: Infinity }), { a: "b", c: "d" });
    });

    it("allows overriding array limit", () => {
        assert.deepEqual(qs.parse("a[0]=b", { arrayLimit: -1 }), { a: { 0: "b" } });
        assert.deepEqual(qs.parse("a[-1]=b", { arrayLimit: -1 }), { a: { "-1": "b" } });
        assert.deepEqual(qs.parse("a[0]=b&a[1]=c", { arrayLimit: 0 }), { a: { 0: "b", 1: "c" } });
    });

    it("allows disabling array parsing", () => {
        assert.deepEqual(qs.parse("a[0]=b&a[1]=c", { parseArrays: false }), { a: { 0: "b", 1: "c" } });
    });

    it("allows for query string prefix", () => {
        assert.deepEqual(qs.parse("?foo=bar", { ignoreQueryPrefix: true }), { foo: "bar" });
        assert.deepEqual(qs.parse("foo=bar", { ignoreQueryPrefix: true }), { foo: "bar" });
        assert.deepEqual(qs.parse("?foo=bar", { ignoreQueryPrefix: false }), { "?foo": "bar" });
    });

    it("parses an object", () => {
        const input = {
            "user[name]": { "pop[bob]": 3 },
            "user[email]": null
        };

        const expected = {
            user: {
                name: { "pop[bob]": 3 },
                email: null
            }
        };

        const result = qs.parse(input);

        assert.deepEqual(result, expected);
    });

    it("parses an object in dot notation", () => {
        const input = {
            "user.name": { "pop[bob]": 3 },
            "user.email.": null
        };

        const expected = {
            user: {
                name: { "pop[bob]": 3 },
                email: null
            }
        };

        const result = qs.parse(input, { allowDots: true });

        assert.deepEqual(result, expected);
    });

    it("parses an object and not child values", () => {
        const input = {
            "user[name]": { "pop[bob]": { test: 3 } },
            "user[email]": null
        };

        const expected = {
            user: {
                name: { "pop[bob]": { test: 3 } },
                email: null
            }
        };

        const result = qs.parse(input);

        assert.deepEqual(result, expected);
    });

    it("does not blow up when Buffer global is missing", () => {
        const tempBuffer = global.Buffer;
        delete global.Buffer;
        let result;
        try {
            result = qs.parse("a=b&c=d");
        } finally {
            global.Buffer = tempBuffer;
        }
        assert.deepEqual(result, { a: "b", c: "d" });
    });

    it("does not crash when parsing circular references", () => {
        const a = {};
        a.b = a;

        let parsed;

        assert.doesNotThrow(() => {
            parsed = qs.parse({ "foo[bar]": "baz", "foo[baz]": a });
        });

        assert.equal("foo" in parsed, true, 'parsed has "foo" property');
        assert.equal("bar" in parsed.foo, true);
        assert.equal("baz" in parsed.foo, true);
        assert.equal(parsed.foo.bar, "baz");
        assert.deepEqual(parsed.foo.baz, a);
    });

    it("does not crash when parsing deep objects", () => {
        let parsed;
        let str = "foo";

        for (let i = 0; i < 5000; i++) {
            str += "[p]";
        }

        str += "=bar";

        assert.doesNotThrow(() => {
            parsed = qs.parse(str, { depth: 5000 });
        });

        assert.equal("foo" in parsed, true, 'parsed has "foo" property');

        let depth = 0;
        let ref = parsed.foo;
        while ((ref = ref.p)) {
            depth += 1;
        }

        assert.equal(depth, 5000, "parsed is 5000 properties deep");
    });

    it("parses null objects correctly", { skip: !Object.create }, async () => {
        const a = Object.create(null);
        a.b = "c";

        assert.deepEqual(qs.parse(a), { b: "c" });
        const result = qs.parse({ a });
        assert.equal("a" in result, true, 'result has "a" property');
        assert.deepEqual(result.a, a);
    });

    it("parses dates correctly", () => {
        const now = new Date();
        assert.deepEqual(qs.parse({ a: now }), { a: now });
    });

    it("parses regular expressions correctly", () => {
        const re = /^test$/;
        assert.deepEqual(qs.parse({ a: re }), { a: re });
    });

    it("does not allow overwriting prototype properties", () => {
        assert.deepEqual(qs.parse("a[hasOwnProperty]=b", { allowPrototypes: false }), {});
        assert.deepEqual(qs.parse("hasOwnProperty=b", { allowPrototypes: false }), {});

        assert.deepEqual(
            qs.parse("toString", { allowPrototypes: false }),
            {},
            'bare "toString" results in {}'
        );
    });

    it("can allow overwriting prototype properties", () => {
        assert.deepEqual(qs.parse("a[hasOwnProperty]=b", { allowPrototypes: true }), { a: { hasOwnProperty: "b" } });
        assert.deepEqual(qs.parse("hasOwnProperty=b", { allowPrototypes: true }), { hasOwnProperty: "b" });

        assert.deepEqual(
            qs.parse("toString", { allowPrototypes: true }),
            { toString: "" },
            'bare "toString" results in { toString: "" }'
        );
    });

    it("params starting with a closing bracket", () => {
        assert.deepEqual(qs.parse("]=toString"), { "]": "toString" });
        assert.deepEqual(qs.parse("]]=toString"), { "]]": "toString" });
        assert.deepEqual(qs.parse("]hello]=toString"), { "]hello]": "toString" });
    });

    it("params starting with a starting bracket", () => {
        assert.deepEqual(qs.parse("[=toString"), { "[": "toString" });
        assert.deepEqual(qs.parse("[[=toString"), { "[[": "toString" });
        assert.deepEqual(qs.parse("[hello[=toString"), { "[hello[": "toString" });
    });

    it("add keys to objects", () => {
        assert.deepEqual(
            qs.parse("a[b]=c&a=d"),
            { a: { b: "c", d: true } },
            "can add keys to objects"
        );

        assert.deepEqual(
            qs.parse("a[b]=c&a=toString"),
            { a: { b: "c" } },
            "can not overwrite prototype"
        );

        assert.deepEqual(
            qs.parse("a[b]=c&a=toString", { allowPrototypes: true }),
            { a: { b: "c", toString: true } },
            "can overwrite prototype with allowPrototypes true"
        );

        assert.deepEqual(
            qs.parse("a[b]=c&a=toString", { plainObjects: true }),
            { a: { b: "c", toString: true } },
            "can overwrite prototype with plainObjects true"
        );
    });

    it("can return null objects", { skip: !Object.create }, () => {
        const expected = Object.create(null);
        expected.a = Object.create(null);
        expected.a.b = "c";
        expected.a.hasOwnProperty = "d";
        assert.deepEqual(qs.parse("a[b]=c&a[hasOwnProperty]=d", { plainObjects: true }), expected);
        assert.deepEqual(qs.parse(null, { plainObjects: true }), Object.create(null));
        const expectedArray = Object.create(null);
        expectedArray.a = Object.create(null);
        expectedArray.a[0] = "b";
        expectedArray.a.c = "d";
        assert.deepEqual(qs.parse("a[]=b&a[c]=d", { plainObjects: true }), expectedArray);
    });

    it("can parse with custom encoding", () => {
        assert.deepEqual(qs.parse("%8c%a7=%91%e5%8d%e3%95%7b", {
            decoder(str) {
                const reg = /%([0-9A-F]{2})/ig;
                const result = [];
                let parts = reg.exec(str);
                while (parts) {
                    result.push(parseInt(parts[1], 16));
                    parts = reg.exec(str);
                }
                return iconv.decode(Buffer.from(result, "binary"), "shift_jis").toString();
            }
        }), { 県: "大阪府" });
    });

    it("throws error with wrong decoder", () => {
        assert.throws(() => {
            qs.parse({}, { decoder: "string" });
        }, "Decoder has to be a function.");
    });

    it("does not mutate the options argument", () => {
        const options = {};
        qs.parse("a[b]=true", options);
        assert.deepEqual(options, {});
    });
});
