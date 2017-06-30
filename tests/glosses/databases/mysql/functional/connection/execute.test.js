import { createConnection } from "../../common";
import typeCastringTests from "./type_casting_tests";

describe("database", "mysql", "functional", "connection", "execute", () => {
    const { util, is } = adone;

    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`announcements\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255) DEFAULT NULL,
                \`text\` varchar(255) DEFAULT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO announcements(title, text) VALUES(?, ?)", ["Что-то", "Некий предмет, некое явление, нечто."]);
        await connection.query("INSERT INTO announcements(title, text) VALUES(?, ?)", ["Кто-то", "Неизвестно кто, некто."]);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select", async () => {
        let [rows, fields] = await connection.execute("SELECT 1+? as test", [123]);
        expect(rows).to.be.deep.equal([{ test: 124 }]);
        expect(fields[0].name).to.be.equal("test");

        [rows, fields] = await connection.execute("SELECT 1 as test2");
        expect(rows).to.be.deep.equal([{ test2: 1 }]);
        expect(fields[0].name).to.be.equal("test2");
    });

    it("should select inserted data", async () => {
        const [rows] = await connection.execute("SELECT * FROM announcements");
        expect(rows).to.be.deep.equal([{
            id: 1,
            title: "Что-то",
            text: "Некий предмет, некое явление, нечто."
        }, {
            id: 2,
            title: "Кто-то",
            text: "Неизвестно кто, некто."
        }]);
    });

    context("unprepare", () => {
        before(async () => {
            await connection.query("SET GLOBAL max_prepared_stmt_count=10");
        });

        after(async () => {
            await connection.query("SET GLOBAL max_prepared_stmt_count=16382");
        });

        it("should not fail", async function test() {
            this.timeout(10000);

            for (let i = 0; i < 100; ++i) {
                const query = `SELECT 1 + ${i}`;
                // eslint-disable-next-line
                await connection.execute(query);
                connection.unprepare(query);
            }
        });
    });

    context("cached", () => {
        const q = "select 1 + ? as test";
        const key = `undefined/undefined/undefined${q}`;

        before(async () => {
            // reset connection to clear the cache
            await connection.end();
            connection = await createConnection();
        });

        it("should cache statements", async () => {
            let [rows] = await connection.execute(q, [123]);
            expect(rows).to.be.deep.equal([{ test: 124 }]);

            [rows] = await connection.execute(q, [124]);
            expect(rows).to.be.deep.equal([{ test: 125 }]);

            [rows] = await connection.execute(q, [125]);
            expect(rows).to.be.deep.equal([{ test: 126 }]);

            expect(connection._statements.size).to.be.equal(1);
            expect(connection._statements.get(key).query).to.be.equal(q);
            expect(connection._statements.get(key).parameters).to.have.lengthOf(1);
        });
    });

    context("decimal", () => {
        before(async () => {
            await connection.query("CREATE TEMPORARY TABLE t (f DECIMAL(19,4))");
            await connection.query("INSERT INTO t VALUES(12345.67)");
        });

        it("should work", async () => {
            const [rows, fields] = await connection.query("SELECT f FROM t");
            expect(rows).to.be.deep.equal([{ f: "12345.6700" }]);
            expect(fields[0].name).to.be.equal("f");
        });
    });

    context("columndef", () => {
        it("should return some info", async () => {
            const [rows] = await connection.execute("explain SELECT 1");
            const expectedRows = [{
                id: 1,
                select_type: "SIMPLE",  // eslint-disable-line
                table: null,
                type: null,
                possible_keys: null,  // eslint-disable-line
                key: null,
                key_len: null,  // eslint-disable-line
                ref: null,
                rows: null,
                Extra: "No tables used"
            }];

            if (connection.params.serverVersion.startsWith("5.7")) {
                expectedRows[0].partitions = null;
                expectedRows[0].filtered = null;
            }
            expect(rows).to.be.deep.equal(expectedRows);

            // check fields?
        });
    });

    context("order", () => {
        it("should execute queries sequentially", async () => {
            const result = [];
            await Promise.all([
                connection.execute("SELECT 1 + 2").then(() => result.push(0)),
                connection.execute("SELECT 2 + 2").then(() => result.push(1)),
                connection.execute("SELECT 3 + 3").then(() => result.push(2)),
                connection.execute("SELECT 4 + 4").then(() => result.push(3)),
                connection.execute("SELECT 5 + 5").then(() => result.push(4)),
                connection.execute("SELECT 6 + 6").then(() => result.push(5)),
                connection.execute("SELECT 7 + 7").then(() => result.push(6))
            ]);
            expect(result).to.be.deep.equal([0, 1, 2, 3, 4, 5, 6]);
        });
    });

    context("signed int", () => {
        before(async () => {
            await connection.query(`
                CREATE TEMPORARY TABLE \`signed_test\` (
                    \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                    \`num\` int(15),
                    \`l\` long,
                    PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            `);
            await connection.query("insert into signed_test(num,l) values(?, 3)", [1]);
            await connection.query("insert into signed_test(num,l) values(3-?, -10)", [5]);
            await connection.query("insert into signed_test(num,l) values(4+?, 4000000-?)", [-5, 8000000]);
        });

        it("should be correct", async () => {
            const [rows] = await connection.execute("SELECT * from signed_test");
            expect(rows).to.be.deep.equal([
                { id: 1, num: 1, l: "3" },
                { id: 2, num: -2, l: "-10" },
                { id: 3, num: -1, l: "-4000000" }
            ]);
        });
    });

    context("type casting", () => {
        let tests = null;

        before(async () => {
            const schema = [];
            const inserts = [];
            tests = typeCastringTests(connection);
            for (const [index, test] of util.enumerate(tests)) {
                const escaped = test.insertRaw || connection.escape(test.insert);

                test.columnName = `${test.type}_${index}`;

                schema.push(`\`${test.columnName}\` ${test.type},`);
                inserts.push(`\`${test.columnName}\` = ${escaped}`);
            }

            await connection.query(`
                CREATE TEMPORARY TABLE \`type_casting\` (
                    \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                    ${schema.join("\n")}
                    PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            `);
            connection.query(`INSERT INTO type_casting SET${inserts.join(",\n")}`);
        });

        it("should be correct", async () => {
            const [[row]] = await connection.execute("SELECT * FROM type_casting WHERE id");
            for (const test of tests) {
                let expected = test.expect || test.insert;
                let got = row[test.columnName];
                if (expected instanceof Date) {
                    assert.equal(is.date(got), true, test.type);
                    expected = String(expected);
                    got = String(got);
                } else if (Buffer.isBuffer(expected)) {
                    assert.equal(is.buffer(got), true, test.type);

                    expected = String(Array.prototype.slice.call(expected));
                    got = String(Array.prototype.slice.call(got));
                }
                if (test.deep) {
                    const message = `got: "${JSON.stringify(got)}" expected: "${JSON.stringify(expected)}" test: ${test.type}`;
                    assert.deepEqual(expected, got, message);
                } else {
                    const message = `got: "${got}" (${typeof got}) expected: "${expected}" (${typeof expected}) test: ${test.type}`;
                    assert.strictEqual(expected, got, message);
                }
            }
        });
    });
});
