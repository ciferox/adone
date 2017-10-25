import { createConnection } from "../../common";
import typeCastringTests from "./type_casting_tests";

describe("database", "mysql", "functional", "connection", "type casting", () => {
    const { util, is } = adone;
    let connection = null;
    let tests = null;

    before(async () => {
        connection = await createConnection();
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

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should work", async () => {
        const [[row]] = await connection.query("SELECT * FROM type_casting");
        for (const test of tests) {
            let expected = test.expect || test.insert;
            let got = row[test.columnName];
            if (expected instanceof Date) {
                assert.equal(got instanceof Date, true, test.type);

                expected = String(expected);
                got = String(got);
            } else if (is.buffer(expected)) {
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
