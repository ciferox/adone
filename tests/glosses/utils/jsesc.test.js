describe("util", "jsesc", () => {
    const { util } = adone;

    describe("common usage", () => {
        it("works correctly for common operations", () => {
            expect(util.jsesc("\0\x31")).to.be.equal("\\x001", "`\\0` followed by `1`");
            expect(util.jsesc("\0\x38")).to.be.equal("\\x008", "`\\0` followed by `8`");
            expect(util.jsesc("\0\x39")).to.be.equal("\\x009", "`\\0` followed by `9`");
            expect(util.jsesc("\0a")).to.be.equal("\\0a", "`\\0` followed by `a`");
            expect(util.jsesc("foo\"bar'baz", {
                quotes: "LOLWAT" // invalid setting
            })).to.be.equal("foo\"bar\\'baz");
            expect(util.jsesc("\\x00")).to.be.equal("\\\\x00", "`\\\\x00` shouldn’t be changed to `\\\\0`");
            expect(util.jsesc("a\\x00")).to.be.equal("a\\\\x00", "`a\\\\x00` shouldn’t be changed to `\\\\0`");
            expect(util.jsesc("\\\x00")).to.be.equal("\\\\\\0", "`\\\\\\x00` should be changed to `\\\\\\0`");
            expect(util.jsesc("\\\\x00")).to.be.equal("\\\\\\\\x00", "`\\\\\\\\x00` shouldn’t be changed to `\\\\\\\\0`");
            expect(util.jsesc("lolwat\"foo'bar", {
                escapeEverything: true
            })).to.be.equal("\\x6C\\x6F\\x6C\\x77\\x61\\x74\\\"\\x66\\x6F\\x6F\\'\\x62\\x61\\x72");
            expect(util.jsesc("\0foo\u2029bar\nbaz\xA9qux\uD834\uDF06flops", {
                minimal: true
            })).to.be.equal("\\0foo\\u2029bar\\nbaz\xA9qux\uD834\uDF06flops");
            expect(util.jsesc("foo</script>bar</style>baz</script>qux", {
                isScriptContext: true
            })).to.be.equal("foo<\\/script>bar<\\/style>baz<\\/script>qux");
            expect(util.jsesc("foo</sCrIpT>bar</STYLE>baz</SCRIPT>qux", {
                isScriptContext: true
            })).to.be.equal("foo<\\/sCrIpT>bar<\\/STYLE>baz<\\/SCRIPT>qux");
            expect(util.jsesc("\"<!--<script></script>\";alert(1);", {
                isScriptContext: true
            })).to.be.equal("\"\\x3C!--<script><\\/script>\";alert(1);");
            expect(util.jsesc("\"<!--<script></script>\";alert(1);", {
                isScriptContext: true,
                json: true
            })).to.be.equal("\"\\\"\\u003C!--<script><\\/script>\\\";alert(1);\"");
            expect(util.jsesc([0x42, 0x1337], {
                numbers: "decimal"
            })).to.be.equal("[66,4919]");
            expect(util.jsesc([0x42, 0x1337], {
                numbers: "binary"
            })).to.be.equal("[0b1000010,0b1001100110111]");
            expect(util.jsesc([0x42, 0x1337, NaN, Infinity], {
                numbers: "binary",
                json: true
            })).to.be.equal("[66,4919,null,null]");
            expect(util.jsesc([0x42, 0x1337], {
                numbers: "octal"
            })).to.be.equal("[0o102,0o11467]");
            expect(util.jsesc([0x42, 0x1337], {
                numbers: "hexadecimal"
            })).to.be.equal("[0x42,0x1337]");
            expect(util.jsesc("a\uD834\uDF06b", {
                es6: true
            })).to.be.equal("a\\u{1D306}b");
            expect(util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                es6: true
            })).to.be.equal("a\\u{1D306}b\\u{1F4A9}c");
            expect(util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                es6: true,
                escapeEverything: true
            })).to.be.equal("\\x61\\u{1D306}\\x62\\u{1F4A9}\\x63");
            expect(util.jsesc({}, {
                compact: true
            })).to.be.equal("{}");
            expect(util.jsesc({}, {
                compact: false
            })).to.be.equal("{}");
            expect(util.jsesc([], {
                compact: true
            })).to.be.equal("[]");
            expect(util.jsesc([], {
                compact: false
            })).to.be.equal("[]");
            // Stringifying flat objects containing only string values
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" })).to.be.equal("{'foo\\0bar\\uFFFDbaz':'foo\\0bar\\uFFFDbaz'}", "Stringifying a flat object with default settings`");
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                quotes: "double"
            })).to.be.equal("{\"foo\\0bar\\uFFFDbaz\":\"foo\\0bar\\uFFFDbaz\"}");
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                compact: false
            })).to.be.equal("{\n\t'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
            expect(util.jsesc(["a", "b", "c"], {
                compact: false,
                indentLevel: 1
            })).to.be.equal("[\n\t\t'a',\n\t\t'b',\n\t\t'c'\n\t]");
            expect(util.jsesc(["a", "b", "c"], {
                compact: false,
                indentLevel: 2
            })).to.be.equal("[\n\t\t\t'a',\n\t\t\t'b',\n\t\t\t'c'\n\t\t]");
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                compact: false,
                indent: "  "
            })).to.be.equal("{\n  'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                escapeEverything: true
            })).to.be.equal("{'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A':'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A'}");
            // Stringifying flat arrays containing only string values
            expect(util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                escapeEverything: true
            })).to.be.equal("['\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A','\\xA9']");
            expect(util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                compact: false
            })).to.be.equal("[\n\t'foo\\0bar\\uFFFDbaz',\n\t'\\xA9'\n]");
            expect(util.jsesc(new Map([]))).to.be.equal("new Map()");
            expect(util.jsesc(new Map([["a", 1], ["b", 2]]), {
                compact: true
            })).to.be.equal("new Map([['a',1],['b',2]])");
            expect(util.jsesc(new Map([["a", 1], ["b", 2]]), {
                compact: false
            })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', 2]\n])");
            expect(util.jsesc(new Map([["a", 1], ["b", ["a", "nested", "array"]]]), {
                compact: false
            })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', [\n\t\t'a',\n\t\t'nested',\n\t\t'array'\n\t]]\n])");
            expect(util.jsesc(new Map([["a", 1], ["b", new Map([["x", 2], ["y", 3]])]]), {
                compact: false
            })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', new Map([\n\t\t['x', 2],\n\t\t['y', 3]\n\t])]\n])");
            expect(util.jsesc(new Set([]))).to.be.equal("new Set()");
            expect(util.jsesc(new Set([["a"], "b", {}]), {
                compact: true
            })).to.be.equal("new Set([['a'],'b',{}])");
            expect(util.jsesc(new Set([["a"], "b", {}]), {
                compact: false
            })).to.be.equal("new Set([\n\t[\n\t\t'a'\n\t],\n\t'b',\n\t{}\n])");
            // Buffer
            expect(util.jsesc(Buffer.from([0x13, 0x37, 0x42]))).to.be.equal("Buffer.from([19,55,66])");
            expect(util.jsesc(Buffer.from([0x13, 0x37, 0x42]), {
                compact: false
            })).to.be.equal("Buffer.from([\n\t19,\n\t55,\n\t66\n])");
            // JSON
            expect(util.jsesc("foo\x00bar\xFF\uFFFDbaz", {
                json: true
            })).to.be.equal("\"foo\\u0000bar\\u00FF\\uFFFDbaz\"");
            expect(util.jsesc("foo\x00bar\uFFFDbaz", {
                escapeEverything: true,
                json: true
            })).to.be.equal("\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"");
            expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                escapeEverything: true,
                json: true
            })).to.be.equal("{\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\":\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"}");
            expect(util.jsesc(["foo\x00bar\uFFFDbaz", "foo\x00bar\uFFFDbaz"], {
                escapeEverything: true,
                json: true
            })).to.be.equal("[\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\",\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"]");
            expect(util.jsesc("foo\x00bar", {
                json: true,
                wrap: false // override default `wrap: true` when `json` is enabled
            })).to.be.equal("foo\\u0000bar");
            expect(util.jsesc("foo \"\x00\" bar", {
                json: true,
                wrap: false // override default `wrap: true` when `json` is enabled
            })).to.be.equal("foo \\\"\\u0000\\\" bar");
            expect(util.jsesc("foo \"\x00\" bar ' qux", {
                json: true,
                quotes: "single", // override default `quotes: 'double'` when `json` is enabled
                wrap: false // override default `wrap: true` when `json` is enabled
            })).to.be.equal("foo \"\\u0000\" bar \\' qux");
            expect(util.jsesc("foo\uD834\uDF06bar\xA9baz", {
                json: true,
                es6: true // override default `es6: false` when `json` is enabled
            })).to.be.equal("\"foo\\u{1D306}bar\\u00A9baz\"");
            const tmp = {
                "shouldn\u2019t be here": 10,
                toJSON() {
                    return {
                        hello: "world",
                        "\uD83D\uDCA9": "foo",
                        pile: "\uD83D\uDCA9"
                    };
                }
            };
            expect(util.jsesc(tmp, { json: true })).to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are called when `json: true`");
            expect(util.jsesc(tmp)).not.to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are not called when `json: false`");
            expect(util.jsesc(42, {
                numbers: "hexadecimal",
                lowercaseHex: true
            })).to.be.equal("0x2a");
            expect(util.jsesc("\u2192\xE9", {
                lowercaseHex: true
            })).to.be.equal("\\u2192\\xe9");
            expect(util.jsesc("\u2192\xE9", {
                lowercaseHex: false
            })).to.be.equal("\\u2192\\xE9");
            expect(util.jsesc("\u2192\xE9", {
                lowercaseHex: true,
                json: true
            })).to.be.equal("\"\\u2192\\u00e9\"");
            expect(util.jsesc("\u2192\xe9", {
                lowercaseHex: false,
                json: true
            })).to.be.equal("\"\\u2192\\u00E9\"");
            expect(util.jsesc("\xE7\xE7a\xE7\xE7", {
                lowercaseHex: true,
                escapeEverything: true
            })).to.be.equal("\\xe7\\xe7\\x61\\xe7\\xe7");
            expect(util.jsesc("\xE7\xE7a\xE7\xE7", {
                lowercaseHex: false,
                escapeEverything: true
            })).to.be.equal("\\xE7\\xE7\\x61\\xE7\\xE7");
            expect(util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                lowercaseHex: true,
                es6: true
            })).to.be.equal("\\u2192\\xe9\\u{1f4a9}");
            expect(util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                lowercaseHex: false,
                es6: true
            })).to.be.equal("\\u2192\\xE9\\u{1F4A9}");
        });
    });

    describe("advanced tests", () => {
        let allSymbols = "";
        // Generate strings based on code points. Trickier than it seems:
        // https://mathiasbynens.be/notes/javascript-encoding
        for (let codePoint = 0x000000; codePoint <= 0x10FFFF; codePoint += 0xF) {
            const symbol = String.fromCodePoint(codePoint);
            // ok(
            // 	eval('\'' + util.jsesc(symbol) + '\'') == symbol,
            // 	'U+' + codePoint.toString(16).toUpperCase()
            // );
            allSymbols += `${symbol} `;
        }
        it("works correctly for advanced operations", () => {
            expect(eval(`'${util.jsesc(allSymbols)}'`) === allSymbols).to.be.ok;
            expect(eval(`'${util.jsesc(allSymbols, {
                quotes: "single"
            })}'`) === allSymbols).to.be.ok;
            expect(eval(util.jsesc(allSymbols, {
                quotes: "single",
                wrap: true
            })) == allSymbols).to.be.ok;
            expect(eval(`"${util.jsesc(allSymbols, {
                quotes: "double"
            })}"`) === allSymbols).to.be.ok;
            expect(eval(util.jsesc(allSymbols, {
                quotes: "double",
                wrap: true
            })) === allSymbols).to.be.ok;

            // Some of these depend on `JSON.parse()`, so only test them in Node
            // Some of these depend on `JSON.parse()`, so only test them in Node
            const testArray = [
                undefined, Infinity, new Number(Infinity), -Infinity,
                new Number(-Infinity), 0, new Number(0), -0, new Number(-0), +0,
                new Number(+0), new Function(), "str",
                function zomg() {
                    return "desu";
                }, null, true, new Boolean(true),
                false, new Boolean(false), {
                    foo: 42, hah: [1, 2, 3, { foo: 42 }]
                }
            ];
            expect(util.jsesc(testArray, {
                json: false
            })).to.be.equal("[undefined,Infinity,Infinity,-Infinity,-Infinity,0,0,0,0,0,0,function anonymous() {\n\n},'str',function zomg() {\n        return \"desu\";\n      },null,true,true,false,false,{'foo':42,'hah':[1,2,3,{'foo':42}]}]");
            expect(util.jsesc(testArray, {
                json: true
            })).to.be.equal("[null,null,null,null,null,0,0,0,0,0,0,null,\"str\",null,null,true,true,false,false,{\"foo\":42,\"hah\":[1,2,3,{\"foo\":42}]}]");
            expect(util.jsesc(testArray, {
                json: true,
                compact: false
            })).to.be.equal("[\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\tnull,\n\t\"str\",\n\tnull,\n\tnull,\n\ttrue,\n\ttrue,\n\tfalse,\n\tfalse,\n\t{\n\t\t\"foo\": 42,\n\t\t\"hah\": [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3,\n\t\t\t{\n\t\t\t\t\"foo\": 42\n\t\t\t}\n\t\t]\n\t}\n]");
        });
    });
});
