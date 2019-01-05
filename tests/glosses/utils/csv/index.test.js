const {
    is,
    util: { csv },
    stream: { concat },
    std: { fs, path }
} = adone;

const bops = require("bops");
const spectrum = require("csv-spectrum");

const read = fs.createReadStream;
const eol = "\n";

describe("util", "csv", () => {
    // helpers
    const fixture = (name) => path.join(__dirname, "data", name);

    const collect = (file, opts, cb) => {
        if (is.function(opts)) {
            return collect(file, null, opts);
        }
        const data = read(fixture(file));
        const lines = [];
        const parser = csv(opts);
        data
            .pipe(parser)
            .on("data", (line) => {
                lines.push(line);
            })
            .on("error", (err) => {
                cb(err, lines);
            })
            .on("end", () => {
                // eslint-disable-next-line standard/no-callback-literal
                cb(false, lines);
            });
        return parser;
    };

    it("simple csv", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "2",
                c: "3"
            }, "first row");
            assert.strictEqual(lines.length, 1, "1 row");
            done();
        };

        collect("dummy.csv", verify);
    });

    it("supports strings", (done) => {
        const parser = csv();

        parser.on("data", (data) => {
            assert.deepEqual(data, {
                hello: "world"
            });
            done();
        });

        parser.write("hello\n");
        parser.write("world\n");
        parser.end();
    });

    it("newlines in a cell", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "2",
                c: "3"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "Once upon \na time",
                b: "5",
                c: "6"
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "7",
                b: "8",
                c: "9"
            }, "fourth row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("newlines.csv", verify);
    });

    it("raw escaped quotes", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: 'ha "ha" ha'
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "2",
                b: '""'
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "3",
                b: "4"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("escaped_quotes.csv", verify);
    });

    it("raw escaped quotes and newlines", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: 'ha \n"ha" \nha'
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "2",
                b: ' \n"" \n'
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "3",
                b: "4"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("quotes_and_newlines.csv", verify);
    });

    it("line with comma in quotes", (done) => {
        const headers = bops.from("a,b,c,d,e\n");
        const line = bops.from('John,Doe,120 any st.,"Anytown, WW",08123\n');
        const correct = JSON.stringify({
            a: "John",
            b: "Doe",
            c: "120 any st.",
            d: "Anytown, WW",
            e: "08123"
        });
        const parser = csv();

        parser.write(headers);
        parser.write(line);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(JSON.stringify(data), correct);
            done();
        });
    });

    it("line with newline in quotes", (done) => {
        const headers = bops.from("a,b,c\n");
        const line = bops.from(`1,"ha ${eol}""ha"" ${eol}ha",3\n`);
        const correct = JSON.stringify({ a: "1", b: `ha ${eol}"ha" ${eol}ha`, c: "3" });
        const parser = csv();

        parser.write(headers);
        parser.write(line);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(JSON.stringify(data), correct);
            done();
        });
    });

    it("cell with comma in quotes", (done) => {
        const headers = bops.from("a\n");
        const cell = bops.from('"Anytown, WW"\n');
        const correct = "Anytown, WW";
        const parser = csv();

        parser.write(headers);
        parser.write(cell);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(data.a, correct);
            done();
        });
    });

    it("cell with newline", (done) => {
        const headers = bops.from("a\n");
        const cell = bops.from(`"why ${eol}hello ${eol}there"\n`);
        const correct = `why ${eol}hello ${eol}there`;
        const parser = csv();

        parser.write(headers);
        parser.write(cell);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(data.a, correct);
            done();
        });
    });

    it("cell with escaped quote in quotes", (done) => {
        const headers = bops.from("a\n");
        const cell = bops.from('"ha ""ha"" ha"\n');
        const correct = 'ha "ha" ha';
        const parser = csv();

        parser.write(headers);
        parser.write(cell);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(data.a, correct);
            done();
        });
    });

    it("cell with multibyte character", (done) => {
        const headers = bops.from("a\n");
        const cell = bops.from("this ʤ is multibyte\n");
        const correct = "this ʤ is multibyte";
        const parser = csv();

        parser.write(headers);
        parser.write(cell);
        parser.end();

        parser.once("data", (data) => {
            assert.strictEqual(data.a, correct, "multibyte character is preserved");
            done();
        });
    });

    it("geojson", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            const lineObj = {
                type: "LineString",
                coordinates: [[102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]]
            };
            assert.deepEqual(JSON.parse(lines[1].geojson), lineObj, "linestrings match");
            done();
        };

        collect("test_geojson.csv", verify);
    });

    it("empty_columns", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            const testLine = function (row) {
                assert.strictEqual(Object.keys(row).length, 3, "Split into three columns");
                assert.true(/^2007-01-0\d$/.test(row.a), "First column is a date");
                assert.true(!is.undefined(row.b), "Empty column is in line");
                assert.strictEqual(row.b.length, 0, "Empty column is empty");
                assert.true(!is.undefined(row.c), "Empty column is in line");
                assert.strictEqual(row.c.length, 0, "Empty column is empty");
            };
            lines.forEach(testLine);
            done();
        };

        collect("empty_columns.csv", ["a", "b", "c"], verify);
    });

    it("csv-spectrum", (done) => {
        const expected = [
            [
                {
                    address: "120 any st.",
                    city: "Anytown, WW",
                    first: "John",
                    last: "Doe",
                    zip: "08123"
                }
            ],
            [
                {
                    a: "1",
                    b: "",
                    c: ""
                },
                {
                    a: "2",
                    b: "3",
                    c: "4"
                }
            ],
            [
                {
                    a: "1",
                    b: "",
                    c: ""
                },
                {
                    a: "2",
                    b: "3",
                    c: "4"
                }
            ],
            [
                {
                    a: "1",
                    b: 'ha "ha" ha'
                },
                {
                    a: "3",
                    b: "4"
                }
            ],
            [
                {
                    key: "1",
                    val: '{"type": "Point", "coordinates": [102.0, 0.5]}'
                }
            ],
            [
                {
                    a: "1",
                    b: "2",
                    c: "3"
                },
                {
                    a: "Once upon \na time",
                    b: "5",
                    c: "6"
                },
                {
                    a: "7",
                    b: "8",
                    c: "9"
                }
            ],
            [
                {
                    a: "1",
                    b: "2",
                    c: "3"
                },
                {
                    a: "Once upon \r\na time",
                    b: "5",
                    c: "6"
                },
                {
                    a: "7",
                    b: "8",
                    c: "9"
                }
            ],
            [
                {
                    a: "1",
                    b: "ha \n\"ha\" \nha"
                },
                {
                    a: "3",
                    b: "4"
                }
            ],
            [
                {
                    a: "1",
                    b: "2",
                    c: "3"
                }
            ],
            [
                {
                    a: "1",
                    b: "2",
                    c: "3"
                }
            ],
            [
                {
                    a: "1",
                    b: "2",
                    c: "3"
                },
                {
                    a: "4",
                    b: "5",
                    c: "ʤ"
                }
            ]
        ];

        spectrum((err, data) => {
            if (err) {
                throw err;
            }
            let pending = data.length;

            const tick = () => {
                pending--;
                if (pending === 0) {
                    done();
                }
            };

            data.map((d) => {
                const parser = csv();
                const collector = concat.create((objs) => {
                    assert.sameDeepMembers(objs, expected[data.length - pending], d.name);
                    tick();
                });
                parser.pipe(collector);
                parser.write(d.csv);
                parser.end();
            });
        });
    });

    it("custom newline", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "2",
                c: "3"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "X-Men",
                b: "5",
                c: "6"
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "7",
                b: "8",
                c: "9"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("custom-newlines.csv", { newline: "X" }, verify);
    });

    it("optional strict", (done) => {
        const verify = (err, lines) => {
            assert.strictEqual(err.name, "RangeError", "err name");
            assert.strictEqual(err.message, "Row length does not match headers", "strict row length");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "2",
                c: "3"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "4",
                b: "5",
                c: "6"
            }, "second row");
            assert.strictEqual(lines.length, 2, "2 rows before error");
            done();
        };

        collect("test_strict.csv", { strict: true }, verify);
    });

    it("optional row size limit", (done) => {
        const verify = (err, lines) => {
            assert.strictEqual(err.message, "Row exceeds the maximum size", "strict row size");
            assert.strictEqual(lines.length, 4576, "4576 rows before error");
            done();
        };

        collect("max_row_size.csv", { maxRowBytes: 200 }, verify);
    });

    it("custom quote character", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "some value",
                c: "2"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "3",
                b: "4",
                c: "5"
            }, "second row");
            assert.strictEqual(lines.length, 2, "2 rows");
            done();
        };

        collect("custom_quote_character.csv", { quote: "'" }, verify);
    });

    it("custom escape character", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: 'some "escaped" value',
                c: "2"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "3",
                b: '""',
                c: "4"
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "5",
                b: "6",
                c: "7"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("custom_escape_character.csv", { escape: "\\" }, verify);
    });

    it("custom quote and escape character", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "some 'escaped' value",
                c: "2"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "3",
                b: "''",
                c: "4"
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "5",
                b: "6",
                c: "7"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("custom_quote_and_escape_character.csv", { quote: "'", escape: "\\" }, verify);
    });

    it("custom quote character with default escaped value", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: "1",
                b: "some 'escaped' value",
                c: "2"
            }, "first row");
            assert.deepEqual(lines[1], {
                a: "3",
                b: "''",
                c: "4"
            }, "second row");
            assert.deepEqual(lines[2], {
                a: "5",
                b: "6",
                c: "7"
            }, "third row");
            assert.strictEqual(lines.length, 3, "3 rows");
            done();
        };

        collect("custom_quote_character_default_escape.csv", { quote: "'" }, verify);
    });

    it("process all rows", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.strictEqual(lines.length, 7268, "7268 rows");
            done();
        };

        collect("process_all_rows.csv", {}, verify);
    });

    it("skip columns a and c", (done) => {
        const mapHeaders = ({ header, index }) => {
            if (["a", "c"].indexOf(header) > -1) {
                return null;
            }
            return header;
        };

        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                b: "2"
            }, "first row");
            assert.strictEqual(lines.length, 1, "1 row");
            done();
        };

        collect("dummy.csv", { mapHeaders }, verify);
    });

    it("rename columns", (done) => {
        const mapHeaders = ({ header, index }) => {
            const headers = { a: "x", b: "y", c: "z" };
            return headers[header];
        };
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                x: "1",
                y: "2",
                z: "3"
            }, "first row");
            assert.strictEqual(lines.length, 1, "1 row");
            done();
        };

        collect("dummy.csv", { mapHeaders }, verify);
    });

    it("headers: false, numeric column names", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.sameDeepMembers(lines, [
                {
                    0: "a",
                    1: "b",
                    2: "c"
                }, {
                    0: "1",
                    1: "2",
                    2: "3"
                }
            ], "lines");
            assert.strictEqual(lines.length, 2, "2 rows");
            done();
        };

        collect("dummy.csv", { headers: false }, verify);
    });

    it("format values", (done) => {
        const headers = [];
        const indexes = [];
        const mapValues = ({ header, index, value }) => {
            headers.push(header);
            indexes.push(index);
            return parseInt(value, 10);
        };

        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.deepEqual(lines[0], {
                a: 1,
                b: 2,
                c: 3
            }, "first row");
            assert.strictEqual(lines.length, 1, "1 row");
            assert.sameMembers(headers, ["a", "b", "c"], "headers");
            assert.sameMembers(indexes, [0, 1, 2], "indexes");
            done();
        };

        collect("dummy.csv", { mapValues }, verify);
    });

    it("skip rows until", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.strictEqual(JSON.stringify(lines[0]), JSON.stringify({ yes: "ok", yup: "ok", yeah: "ok!" }));
            done();
        };

        collect("junk_rows.csv", { skipLines: 2 }, verify);
    });

    it.skip("binary stanity", async () => {
        const binPath = path.resolve(__dirname, "../bin/csv-parser");
        const { stdout } = await adone.system.process.shell(`echo "a\n1" | node ${binPath}`);

        assert.deepEqual(stdout);
    });

    it("backtick separator (#105)", (done) => {
        const verify = (err, lines) => {
            assert.false(err, "no err");
            assert.sameDeepMembers(lines, [
                {
                    pokemon_id: "1",
                    p_desc: "Bulbasaur can be seen napping"
                },
                {
                    p_desc: "There is a bud on this",
                    pokemon_id: "2"
                }
            ], "lines");
            assert.strictEqual(lines.length, 2, "2 rows");
            done();
        };

        collect("backtick.csv", { separator: "`" }, verify);
    });
});
