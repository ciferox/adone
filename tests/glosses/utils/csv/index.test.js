import intoStream from "into-stream";

const {
    is,
    util: { csv: { Parser, parse } },
    std: { fs, path, os }
} = adone;

const eol = os.EOL;
const bops = require("bops");
const spectrum = require("csv-spectrum");
const concat = require("concat-stream");
const read = fs.createReadStream;

describe("util", "csv", () => {
    describe("Parser", () => {
        const fixture = (name) => path.join(__dirname, "data", name);

        const collect = function (file, opts, cb) {
            if (is.function(opts)) {
                return collect(file, null, opts);
            }
            const data = read(fixture(file));
            const lines = [];
            const parser = new Parser(opts);
            data.pipe(parser)
                .on("data", (line) => {
                    lines.push(line);
                })
                .on("error", (err) => {
                    cb(err, lines);
                })
                .on("end", () => {
                    cb(false, lines);
                });
            return parser;
        };

        it("simple csv", () => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "2", c: "3" }, "first row");
                assert.strictEqual(lines.length, 1, "1 row");
            };

            collect("dummy.csv", verify);
        });

        it("supports strings", (done) => {
            const parser = new Parser();

            parser.on("data", (data) => {
                assert.deepEqual(data, { hello: "world" });
                done();
            });

            parser.write("hello\n");
            parser.write("world\n");
            parser.end();
        });

        it("newlines in a cell", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "2", c: "3" }, "first row");
                assert.deepEqual(lines[1], { a: `Once upon ${eol}a time`, b: "5", c: "6" }, "second row");
                assert.deepEqual(lines[2], { a: "7", b: "8", c: "9" }, "fourth row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("newlines.csv", verify);
        });

        it("raw escaped quotes", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: 'ha "ha" ha' }, "first row");
                assert.deepEqual(lines[1], { a: "2", b: '""' }, "second row");
                assert.deepEqual(lines[2], { a: "3", b: "4" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };

            collect("escaped_quotes.csv", verify);
        });

        it("raw escaped quotes and newlines", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: `ha ${eol}"ha" ${eol}ha` }, "first row");
                assert.deepEqual(lines[1], { a: "2", b: ` ${eol}"" ${eol}` }, "second row");
                assert.deepEqual(lines[2], { a: "3", b: "4" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("quotes_and_newlines.csv", verify);
        });

        it("line with comma in quotes", (done) => {
            const headers = bops.from("a,b,c,d,e\n");
            const line = bops.from('John,Doe,120 any st.,"Anytown, WW",08123\n');
            const correct = JSON.stringify({ a: "John", b: "Doe", c: "120 any st.", d: "Anytown, WW", e: "08123" });
            const parser = new Parser();

            parser.write(headers);
            parser.write(line);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(JSON.stringify(data), correct);
                done();
            });
        });

        it("line with newline in quotes", (done) => {
            const headers = bops.from("a,b,c\n");
            const line = bops.from(`1,"ha ${eol}""ha"" ${eol}ha",3\n`);
            const correct = JSON.stringify({ a: "1", b: `ha ${eol}"ha" ${eol}ha`, c: "3" });
            const parser = new Parser();

            parser.write(headers);
            parser.write(line);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(JSON.stringify(data), correct);
                done();
            });
        });

        it("cell with comma in quotes", (done) => {
            const headers = bops.from("a\n");
            const cell = bops.from('"Anytown, WW"\n');
            const correct = "Anytown, WW";
            const parser = new Parser();

            parser.write(headers);
            parser.write(cell);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(data.a, correct);
                done();
            });
        });

        it("cell with newline", (done) => {
            const headers = bops.from("a\n");
            const cell = bops.from(`"why ${eol}hello ${eol}there"\n`);
            const correct = `why ${eol}hello ${eol}there`;
            const parser = new Parser();

            parser.write(headers);
            parser.write(cell);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(data.a, correct);
                done();
            });
        });

        it("cell with escaped quote in quotes", (done) => {
            const headers = bops.from("a\n");
            const cell = bops.from('"ha ""ha"" ha"\n');
            const correct = 'ha "ha" ha';
            const parser = new Parser();

            parser.write(headers);
            parser.write(cell);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(data.a, correct);
                done();
            });
        });

        it("cell with multibyte character", (done) => {
            const headers = bops.from("a\n");
            const cell = bops.from("this ʤ is multibyte\n");
            const correct = "this ʤ is multibyte";
            const parser = new Parser();

            parser.write(headers);
            parser.write(cell);
            parser.end();

            parser.once("data", (data) => {
                assert.equal(data.a, correct, "multibyte character is preserved");
                done();
            });
        });

        it("geojson", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                const lineObj = {
                    type: "LineString",
                    coordinates: [
                        [102.0, 0.0],
                        [103.0, 1.0],
                        [104.0, 0.0],
                        [105.0, 1.0]
                    ]
                };
                assert.deepEqual(JSON.parse(lines[1].geojson), lineObj, "linestrings match");
                done();
            };
            collect("test_geojson.csv", verify);
        });

        it("empty_columns", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                const testLine = function (row) {
                    assert.equal(Object.keys(row).length, 3, "Split into three columns");
                    assert.ok(/^2007-01-0\d$/.test(row.a), "First column is a date");
                    assert.ok(!is.undefined(row.b), "Empty column is in line");
                    assert.equal(row.b.length, 0, "Empty column is empty");
                    assert.ok(!is.undefined(row.c), "Empty column is in line");
                    assert.equal(row.c.length, 0, "Empty column is empty");
                };
                lines.forEach(testLine);
                done();
            };
            collect("empty_columns.csv", ["a", "b", "c"], verify);
        });

        it("csv-spectrum", (done) => {
            spectrum((err, data) => {
                if (err) {
                    throw err;
                }
                let pending = data.length;
                const dn = function () {
                    pending--;
                    if (pending === 0) {
                        done();
                    }
                };

                data.map((d) => {
                    const parser = new Parser();
                    const collector = concat((objs) => {
                        const expected = JSON.parse(d.json);
                        assert.deepEqual(objs, expected, d.name);
                        dn();
                    });
                    parser.pipe(collector);
                    parser.write(d.csv);
                    parser.end();
                });
            });
        });

        it("custom newline", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "2", c: "3" }, "first row");
                assert.deepEqual(lines[1], { a: "X-Men", b: "5", c: "6" }, "second row");
                assert.deepEqual(lines[2], { a: "7", b: "8", c: "9" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("custom-newlines.csv", { newline: "X" }, verify);
        });

        it("optional strict", (done) => {
            const verify = function (err, lines) {
                assert.equal(err.message, "Row length does not match headers", "strict row length");
                assert.deepEqual(lines[0], { a: "1", b: "2", c: "3" }, "first row");
                assert.deepEqual(lines[1], { a: "4", b: "5", c: "6" }, "second row");
                assert.equal(lines.length, 2, "2 rows before error");
                done();
            };
            collect("test_strict.csv", { strict: true }, verify);
        });

        it("custom quote character", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "some value", c: "2" }, "first row");
                assert.deepEqual(lines[1], { a: "3", b: "4", c: "5" }, "second row");
                assert.equal(lines.length, 2, "2 rows");
                done();
            };
            collect("custom_quote_character.csv", { quote: "'" }, verify);
        });

        it("custom escape character", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: 'some "escaped" value', c: "2" }, "first row");
                assert.deepEqual(lines[1], { a: "3", b: '""', c: "4" }, "second row");
                assert.deepEqual(lines[2], { a: "5", b: "6", c: "7" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("custom_escape_character.csv", { escape: "\\" }, verify);
        });

        it("custom quote and escape character", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "some 'escaped' value", c: "2" }, "first row");
                assert.deepEqual(lines[1], { a: "3", b: "''", c: "4" }, "second row");
                assert.deepEqual(lines[2], { a: "5", b: "6", c: "7" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("custom_quote_and_escape_character.csv", { quote: "'", escape: "\\" }, verify);
        });

        it("custom quote character with default escaped value", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: "1", b: "some 'escaped' value", c: "2" }, "first row");
                assert.deepEqual(lines[1], { a: "3", b: "''", c: "4" }, "second row");
                assert.deepEqual(lines[2], { a: "5", b: "6", c: "7" }, "third row");
                assert.equal(lines.length, 3, "3 rows");
                done();
            };
            collect("custom_quote_character_default_escape.csv", { quote: "'" }, verify);
        });

        it("process all rows", (done) => {
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.equal(lines.length, 7268, "7268 rows");
                done();
            };
            collect("process_all_rows.csv", {}, verify);
        });

        it("skip columns a and c", (done) => {
            const mapHeaders = function (name, i) {
                if (["a", "c"].indexOf(name) > -1) {
                    return null;
                }
                return name;
            };
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { b: "2" }, "first row");
                assert.equal(lines.length, 1, "1 row");
                done();
            };
            collect("dummy.csv", { mapHeaders }, verify);
        });

        it("rename columns", (done) => {
            const mapHeaders = function (name, i) {
                const headers = { a: "x", b: "y", c: "z" };
                return headers[name];
            };
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { x: "1", y: "2", z: "3" }, "first row");
                assert.equal(lines.length, 1, "1 row");
                done();
            };
            collect("dummy.csv", { mapHeaders }, verify);
        });

        it("format values", (done) => {
            const mapValues = function (v) {
                return parseInt(v, 10);
            };
            const verify = function (err, lines) {
                assert.false(err, "no err");
                assert.deepEqual(lines[0], { a: 1, b: 2, c: 3 }, "first row");
                assert.equal(lines.length, 1, "1 row");
                done();
            };
            collect("dummy.csv", { mapValues }, verify);
        });
    });

    describe("parse()", () => {
        it("buffer", async () => {
            const data = await parse(Buffer.from("name,val\nfoo,1\nbar,2"));
            assert.equal(data[0].name, "foo");
            assert.equal(data[1].name, "bar");
        });

        it("string", async () => {
            const data = await parse("name;val\nfoo;1\nbar;2", { separator: ";" });
            assert.equal(data[0].name, "foo");
            assert.equal(data[1].name, "bar");
        });

        it("stream", async () => {
            const data = await parse(intoStream("name,val\nfoo,1\nbar,2"));
            assert.equal(data[0].name, "foo");
            assert.equal(data[1].name, "bar");
        });

        it("error", async () => {
            await assert.throws(async () => parse("name,val\nfoo,1,3\nbar,2", { strict: true }), /Row length does not match headers/);
        });
    });
});
