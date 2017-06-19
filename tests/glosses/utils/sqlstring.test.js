describe("util", "sqlstring", () => {
    const { util: { sqlstring } } = adone;

    describe("escapeId", () => {
        specify("value is quoted", () => {
            assert.equal("`id`", sqlstring.escapeId("id"));
        });

        specify("value containing escapes is quoted", () => {
            assert.equal("`i``d`", sqlstring.escapeId("i`d"));
        });

        specify("value containing separator is quoted", () => {
            assert.equal("`id1`.`id2`", sqlstring.escapeId("id1.id2"));
        });
        specify("value containing separator and escapes is quoted", () => {
            assert.equal("`id``1`.`i``d2`", sqlstring.escapeId("id`1.i`d2"));
        });

        specify("arrays are turned into lists", () => {
            assert.equal(sqlstring.escapeId(["a", "b", "t.c"]), "`a`, `b`, `t`.`c`");
        });

        specify("nested arrays are flattened", () => {
            assert.equal(sqlstring.escapeId(["a", ["b", ["t.c"]]]), "`a`, `b`, `t`.`c`");
        });
    });

    describe("escape", () => {
        specify("undefined -> NULL", () => {
            assert.equal(sqlstring.escape(undefined), "NULL");
        });

        specify("null -> NULL", () => {
            assert.equal(sqlstring.escape(null), "NULL");
        });

        specify("booleans convert to strings", () => {
            assert.equal(sqlstring.escape(false), "false");
            assert.equal(sqlstring.escape(true), "true");
        });

        specify("numbers convert to strings", () => {
            assert.equal(sqlstring.escape(5), "5");
        });

        specify("objects are turned into key value pairs", () => {
            assert.equal(sqlstring.escape({ a: "b", c: "d" }), "`a` = 'b', `c` = 'd'");
        });

        specify("objects function properties are ignored", () => {
            assert.equal(sqlstring.escape({ a: "b", c() { } }), "`a` = 'b'");
        });

        specify("nested objects are cast to strings", () => {
            assert.equal(sqlstring.escape({ a: { nested: true } }), "`a` = '[object Object]'");
        });

        specify("arrays are turned into lists", () => {
            assert.equal(sqlstring.escape([1, 2, "c"]), "1, 2, 'c'");
        });

        specify("nested arrays are turned into grouped lists", () => {
            assert.equal(sqlstring.escape([[1, 2, 3], [4, 5, 6], ["a", "b", { nested: true }]]), "(1, 2, 3), (4, 5, 6), ('a', 'b', '[object Object]')");
        });

        specify("nested objects inside arrays are cast to strings", () => {
            assert.equal(sqlstring.escape([1, { nested: true }, 2]), "1, '[object Object]', 2");
        });

        specify("strings are quoted", () => {
            assert.equal(sqlstring.escape("Super"), "'Super'");
        });

        specify("\\0 gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\0er"), "'Sup\\0er'");
        });

        specify("\\b gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\ber"), "'Sup\\ber'");
        });

        specify("\\n gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\ner"), "'Sup\\ner'");
        });

        specify("\\r gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\rer"), "'Sup\\rer'");
        });

        specify("\\t gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\ter"), "'Sup\\ter'");
        });

        specify("\\ gets escaped", () => {
            assert.equal(sqlstring.escape("Sup\\er"), "'Sup\\\\er'");
        });

        specify("\\u001a (ascii 26) gets replaced with \\Z", () => {
            assert.equal(sqlstring.escape("Sup\u001aer"), "'Sup\\Zer'");
        });

        specify("single quotes get escaped", () => {
            assert.equal(sqlstring.escape("Sup'er"), "'Sup\\'er'");
        });

        specify("double quotes get escaped", () => {
            assert.equal(sqlstring.escape('Sup"er'), '\'Sup\\"er\'');
        });

        specify("dates are converted to YYYY-MM-DD HH:II:SS.sss", () => {
            const expected = "2012-05-07 11:42:03.002";
            const date = new Date(2012, 4, 7, 11, 42, 3, 2);
            const string = sqlstring.escape(date);

            assert.strictEqual(string, `'${expected}'`);
        });

        specify("buffers are converted to hex", () => {
            const buffer = Buffer.from([0, 1, 254, 255]);
            const string = sqlstring.escape(buffer);

            assert.strictEqual(string, "X'0001feff'");
        });

        specify("NaN -> NaN", () => {
            assert.equal(sqlstring.escape(NaN), "NaN");
        });

        specify("Infinity -> Infinity", () => {
            assert.equal(sqlstring.escape(Infinity), "Infinity");
        });
    });

    describe("format", () => {
        specify("question marks are replaced with escaped array values", () => {
            const sql = sqlstring.format("? and ?", ["a", "b"]);
            assert.equal(sql, "'a' and 'b'");
        });

        specify("extra question marks are left untouched", () => {
            const sql = sqlstring.format("? and ?", ["a"]);
            assert.equal(sql, "'a' and ?");
        });

        specify("extra arguments are not used", () => {
            const sql = sqlstring.format("? and ?", ["a", "b", "c"]);
            assert.equal(sql, "'a' and 'b'");
        });

        specify("question marks within values do not cause issues", () => {
            const sql = sqlstring.format("? and ?", ["hello?", "b"]);
            assert.equal(sql, "'hello?' and 'b'");
        });

        specify("undefined is ignored", () => {
            const sql = sqlstring.format("?", undefined, false);
            assert.equal(sql, "?");
        });

        specify("objects is converted to values", () => {
            const sql = sqlstring.format("?", { hello: "world" }, false);
            assert.equal(sql, "`hello` = 'world'");
        });

        specify("objects is not converted to values", () => {
            let sql = sqlstring.format("?", { hello: "world" }, true);
            assert.equal(sql, "'[object Object]'");

            sql = sqlstring.format("?", {
                toString() {
                    return "hello";
                }
            }, true);
            assert.equal(sql, "'hello'");
        });
    });
});
