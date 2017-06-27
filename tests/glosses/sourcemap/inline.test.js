// dont change them
const foo = `function foo() {
  var hello = 'hello';
  var world = 'world';
  console.log('%s %s', hello, world);
}`;

const bar = `function bar() {
  console.log('yes?');
}`;

describe("sourcemap", "inline", () => {
    const { sourcemap: { inline: generator } } = adone;

    const decode = (base64) => Buffer.from(base64, "base64").toString();

    describe("generated mappings", () => {

        specify("one file no offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo);

            expect(gen._mappings()).to.be.deep.equal([{
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
            }], "generates correct mappings");

            expect(JSON.parse(decode(gen.base64Encode()))).to.be.deep.equal({
                version: 3,
                file: "",
                sources: ["foo.js"],
                names: [],
                mappings: "AAAA;AACA;AACA;AACA;AACA",
                sourceRoot: ""
            }, "encodes generated mappings");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==", "returns correct inline mapping url");
        });

        specify("two files no offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo)
                .addGeneratedMappings("bar.js", bar);

            expect(gen._mappings()).to.be.deep.equal([{
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
            }], "generates correct mappings");
            expect(JSON.parse(decode(gen.base64Encode()))).to.be.deep.equal({
                version: 3,
                file: "",
                sources: ["foo.js", "bar.js"],
                names: [],
                mappings: "ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA",
                sourceRoot: ""
            }, "encodes generated mappings");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUNBQSxBREFBO0FDQ0EsQURBQTtBQ0NBLEFEQUE7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==", "returns correct inline mapping url");
        });

        specify("one line source", () => {
            const gen = generator().addGeneratedMappings("one-liner.js", 'console.log("line one");');
            expect(gen._mappings()).to.be.deep.equal([{
                generatedLine: 1,
                generatedColumn: 0,
                originalLine: 1,
                originalColumn: 0,
                source: "one-liner.js",
                name: null
            }], "generates correct mappings");
        });

        specify("with offset", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo, { line: 20 })
                .addGeneratedMappings("bar.js", bar, { line: 23, column: 22 });

            expect(gen._mappings()).to.be.deep.equal([{
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
            }], "generates correct mappings");

            expect(JSON.parse(decode(gen.base64Encode()))).to.be.deep.equal({
                version: 3,
                file: "",
                sources: ["foo.js", "bar.js"],
                names: [],
                mappings: ";;;;;;;;;;;;;;;;;;;;AAAA;AACA;AACA;AACA,sBCHA;ADIA,sBCHA;sBACA",
                sourceRoot: ""
            }, "encodes generated mappings with offset");
        });
    });

    describe("given mappings, with one having no original", () => {
        specify("no offset", () => {
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

            expect(gen._mappings()).to.be.deep.equal([{
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
                originalLine: null,
                originalColumn: null,
                source: undefined,
                name: null
            }], "adds correct mappings");
            expect(JSON.parse(decode(gen.base64Encode()))).to.be.deep.equal({
                version: 3,
                file: "",
                sources: ["foo.js", "bar.js"],
                names: [],
                mappings: ";;;;UACG;;oBCIH;8B",
                sourceRoot: ""
            }, "encodes generated mappings");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O1VBQ0c7O29CQ0lIOzhCIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==", "returns correct inline mapping url");
        });

        specify("with offset", () => {
            const gen = generator()
                .addMappings("foo.js", [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }], { line: 5 })
                .addMappings("bar.js", [{ original: { line: 6, column: 0 }, generated: { line: 7, column: 20 } }, { generated: { line: 8, column: 30 } }], { line: 9, column: 3 });

            expect(gen._mappings()).to.be.deep.equal([{
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
                originalLine: null,
                originalColumn: null,
                source: undefined,
                name: null
            }], "adds correct mappings");
            expect(JSON.parse(decode(gen.base64Encode()))).to.be.deep.equal({
                version: 3,
                file: "",
                sources: ["foo.js", "bar.js"],
                names: [],
                mappings: ";;;;;;;;;UACG;;;;;;uBCIH;iC",
                sourceRoot: ""
            }, "encodes mappings with offset");
        });
    });

    describe("inline mapping url with charset opt", () => {
        specify("set inline mapping url charset to gbk", () => {
            const gen = generator({ charset: "gbk" })
                .addGeneratedMappings("foo.js", foo);
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=gbk;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==", "charset set to gbk");
        });

        specify("default charset should be utf-8", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo);

            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIifQ==", "charset default to utf-8");
        });
    });

    describe("source content", () => {
        specify("one file with source content", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo)
                .addSourceContent("foo.js", foo);

            expect(gen.toJSON()).to.be.deep.equal({
                version: 3,
                file: "",
                sources: [
                    "foo.js"
                ],
                names: [],
                mappings: "AAAA;AACA;AACA;AACA;AACA",
                sourceRoot: "",
                sourcesContent: [
                    "function foo() {\n  var hello = 'hello';\n  var world = 'world';\n  console.log('%s %s', hello, world);\n}"
                ]
            }, "includes source content");

            expect(decode(gen.base64Encode())).to.be.equal('{"version":3,"sources":["foo.js"],"names":[],"mappings":"AAAA;AACA;AACA;AACA;AACA","file":"","sourceRoot":"","sourcesContent":["function foo() {\\n  var hello = \'hello\';\\n  var world = \'world\';\\n  console.log(\'%s %s\', hello, world);\\n}"]}', "encodes generated mappings including source content");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBmb28oKSB7XG4gIHZhciBoZWxsbyA9ICdoZWxsbyc7XG4gIHZhciB3b3JsZCA9ICd3b3JsZCc7XG4gIGNvbnNvbGUubG9nKCclcyAlcycsIGhlbGxvLCB3b3JsZCk7XG59Il19", "returns correct inline mapping url including source content");
        });

        specify("two files with source content", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo)
                .addSourceContent("foo.js", foo)
                .addGeneratedMappings("bar.js", bar)
                .addSourceContent("bar.js", bar);

            expect(gen.toJSON()).to.be.deep.equal({
                version: 3,
                file: "",
                sources: [
                    "foo.js",
                    "bar.js"
                ],
                names: [],
                mappings: "ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA",
                sourceRoot: "",
                sourcesContent: [
                    "function foo() {\n  var hello = 'hello';\n  var world = 'world';\n  console.log('%s %s', hello, world);\n}",
                    "function bar() {\n  console.log('yes?');\n}"
                ]
            }, "includes source content for both files");

            expect(decode(gen.base64Encode())).to.be.equal('{"version":3,"sources":["foo.js","bar.js"],"names":[],"mappings":"ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA","file":"","sourceRoot":"","sourcesContent":["function foo() {\\n  var hello = \'hello\';\\n  var world = \'world\';\\n  console.log(\'%s %s\', hello, world);\\n}","function bar() {\\n  console.log(\'yes?\');\\n}"]}', "encodes generated mappings including source content");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUNBQSxBREFBO0FDQ0EsQURBQTtBQ0NBLEFEQUE7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBmb28oKSB7XG4gIHZhciBoZWxsbyA9ICdoZWxsbyc7XG4gIHZhciB3b3JsZCA9ICd3b3JsZCc7XG4gIGNvbnNvbGUubG9nKCclcyAlcycsIGhlbGxvLCB3b3JsZCk7XG59IiwiZnVuY3Rpb24gYmFyKCkge1xuICBjb25zb2xlLmxvZygneWVzPycpO1xufSJdfQ==", "returns correct inline mapping url including source content");
        });

        specify("two files, only one with source content", () => {
            const gen = generator()
                .addGeneratedMappings("foo.js", foo)
                .addGeneratedMappings("bar.js", bar)
                .addSourceContent("bar.js", bar);

            expect(gen.toJSON()).to.be.deep.equal({
                version: 3,
                file: "",
                sources: [
                    "foo.js",
                    "bar.js"
                ],
                names: [],
                mappings: "ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA",
                sourcesContent: [null, "function bar() {\n  console.log('yes?');\n}"],
                sourceRoot: ""
            }, "includes source content for the file with source content and [null] for the other file");

            expect(decode(gen.base64Encode())).to.be.equal('{"version":3,"sources":["foo.js","bar.js"],"names":[],"mappings":"ACAA,ADAA;ACCA,ADAA;ACCA,ADAA;AACA;AACA","file":"","sourceRoot":"","sourcesContent":[null,"function bar() {\\n  console.log(\'yes?\');\\n}"]}', "encodes generated mappings including source content");
            expect(gen.inlineMappingUrl()).to.be.equal("//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvby5qcyIsImJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUNBQSxBREFBO0FDQ0EsQURBQTtBQ0NBLEFEQUE7QUFDQTtBQUNBIiwiZmlsZSI6IiIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6W251bGwsImZ1bmN0aW9uIGJhcigpIHtcbiAgY29uc29sZS5sb2coJ3llcz8nKTtcbn0iXX0=", "returns correct inline mapping url including source content");
        });

        specify("one file with empty source", () => {
            const gen = generator()
                .addGeneratedMappings("empty.js", "")
                .addSourceContent("empty.js", "");
            expect(gen.toJSON().sourcesContent).to.be.deep.equal([""]);
        });
    });
});
