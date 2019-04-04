const {
    sourcemap: { inline: { generate: generator } }
} = adone;

const foo = String(function foo() {
    const hello = "hello";
    const world = "world";
    console.log("%s %s", hello, world);
});

const bar = `${function bar() {
    console.log("yes?");
}}`;

const decode = (base64) => Buffer.from(base64, "base64").toString();

describe("inline", "generator", () => {
    describe("generated mappings", () => {
        it("one file no offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo);

            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 1,
                    generatedColumn: 0,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 2,
                    generatedColumn: 0,
                    originalLine: 2,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 3,
                    generatedColumn: 0,
                    originalLine: 3,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 4,
                    generatedColumn: 0,
                    originalLine: 4,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 5,
                    generatedColumn: 0,
                    originalLine: 5,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                }]
                , "generates correct mappings"
            );

            assert.deepEqual(
                JSON.parse(decode(gen.base64Encode()))
                , { version: 3, file: "", sources: ["foo.js"], names: [], mappings: "AAAA;AACA;AACA;AACA;AACA", sourceRoot: "" }
                , "encodes generated mappings"
            );
            assert.equal(
                gen.inlineMappingUrl()
                , "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ=="
                , "returns correct inline mapping url"
            );
        });

        it("two files no offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo)
                .addGeneratedMappings("bar.js", bar);

            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 1,
                    generatedColumn: 0,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 2,
                    generatedColumn: 0,
                    originalLine: 2,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 3,
                    generatedColumn: 0,
                    originalLine: 3,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 4,
                    generatedColumn: 0,
                    originalLine: 4,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 5,
                    generatedColumn: 0,
                    originalLine: 5,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 1,
                    generatedColumn: 0,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 2,
                    generatedColumn: 0,
                    originalLine: 2,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 3,
                    generatedColumn: 0,
                    originalLine: 3,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                }]
                , "generates correct mappings"
            );
            assert.deepEqual(
                JSON.parse(decode(gen.base64Encode()))
                , { version: 3, file: "", sources: ["foo.js", "bar.js"], names: [], mappings: "ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA", sourceRoot: "" }
                , "encodes generated mappings"
            );
            assert.equal(
                gen.inlineMappingUrl()
                , "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUNBQSxBREFBO0FDQ0EsQURBQTtBQ0NBLEFEQUE7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ=="
                , "returns correct inline mapping url"
            );
        });

        it("one line source", () => {
            const gen = generator().addGeneratedMappings("one-liner.js", 'console.log("line one");');
            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 1,
                    generatedColumn: 0,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "one-liner.js",
                    name: null
                }]
                , "generates correct mappings"
            );
        });

        it("with offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo, { line: 20 })
                .addGeneratedMappings("bar.js", bar, { line: 23, column: 22 });

            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 21,
                    generatedColumn: 0,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 22,
                    generatedColumn: 0,
                    originalLine: 2,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 23,
                    generatedColumn: 0,
                    originalLine: 3,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 24,
                    generatedColumn: 0,
                    originalLine: 4,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 25,
                    generatedColumn: 0,
                    originalLine: 5,
                    originalColumn: 0,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 24,
                    generatedColumn: 22,
                    originalLine: 1,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 25,
                    generatedColumn: 22,
                    originalLine: 2,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 26,
                    generatedColumn: 22,
                    originalLine: 3,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                }]
                , "generates correct mappings"
            );

            assert.deepEqual(
                JSON.parse(decode(gen.base64Encode()))
                , { version: 3, file: "", sources: ["foo.js", "bar.js"], names: [], mappings: ";;;;;;;;;;;;;;;;;;;;AAAA;AACA;AACA;AACA,sBCHA;ADIA,sBCHA;sBACA", sourceRoot: "" }
                , "encodes generated mappings with offset"
            );
        });
    });

    describe("given mappings, with one having no original", () => {
        it("no offset", () => {
            const gen = generator()
                .addMappings("foo.js", [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }])

                // This addresses an edgecase in which a transpiler generates mappings but doesn't include the original position.
                // If we set source to sourceFile (as usual) in that case, the mappings are considered invalid by the source-map module's
                // SourceMapGenerator. Keeping source undefined fixes this problem.
                // Raised issue: https://github.com/thlorenz/inline-source-map/issues/2
                // Validate function: https://github.com/mozilla/source-map/blob/a3372ea78e662582087dd25ebda999c06424e047/lib/source-map/source-map-generator.js#L232
                .addMappings("bar.js", [
                    { original: { line: 6, column: 0 }, generated: { line: 7, column: 20 } },
                    { generated: { line: 8, column: 30 } }
                ]);

            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 5,
                    generatedColumn: 10,
                    originalLine: 2,
                    originalColumn: 3,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 7,
                    generatedColumn: 20,
                    originalLine: 6,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 8,
                    generatedColumn: 30,
                    originalLine: false,
                    originalColumn: false,
                    source: undefined,
                    name: null
                }]
                , "adds correct mappings"
            );
            assert.deepEqual(
                JSON.parse(decode(gen.base64Encode()))
                , { version: 3, file: "", sources: ["foo.js", "bar.js"], names: [], mappings: ";;;;UACG;;oBCIH;8B", sourceRoot: "" }
                , "encodes generated mappings"
            );
            assert.equal(
                gen.inlineMappingUrl()
                , "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O1VBQ0c7O29CQ0lIOzhCIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ=="
                , "returns correct inline mapping url"
            );
        });

        it("with offset", () => {
            const gen = generator()
                .addMappings("foo.js", [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }], { line: 5 })
                .addMappings("bar.js", [{ original: { line: 6, column: 0 }, generated: { line: 7, column: 20 } }, { generated: { line: 8, column: 30 } }], { line: 9, column: 3 });

            assert.deepEqual(
                gen._mappings()
                , [{
                    generatedLine: 10,
                    generatedColumn: 10,
                    originalLine: 2,
                    originalColumn: 3,
                    source: "foo.js",
                    name: null
                },
                {
                    generatedLine: 16,
                    generatedColumn: 23,
                    originalLine: 6,
                    originalColumn: 0,
                    source: "bar.js",
                    name: null
                },
                {
                    generatedLine: 17,
                    generatedColumn: 33,
                    originalLine: false,
                    originalColumn: false,
                    source: undefined,
                    name: null
                }]
                , "adds correct mappings"
            );
            assert.deepEqual(
                JSON.parse(decode(gen.base64Encode()))
                , { version: 3, file: "", sources: ["foo.js", "bar.js"], names: [], mappings: ";;;;;;;;;UACG;;;;;;uBCIH;iC", sourceRoot: "" }
                , "encodes mappings with offset"
            );
        });
    });

    describe("inline mapping url with charset opt", () => {
        it("set inline mapping url charset to gbk", () => {
            const gen = generator({ charset: "gbk" })
                .addGeneratedMappings("foo.js", foo);
            assert.equal(
                gen.inlineMappingUrl(),
                "//# sourceMappingURL=data:application/json;charset=gbk;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==",
                "charset set to gbk"
            );
        });

        it("default charset should be utf-8", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo);

            assert.equal(
                gen.inlineMappingUrl(),
                "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==",
                "charset default to utf-8"
            );
        });
    });
});
