import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "parameters questionmark", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`test_table\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`str\` varchar(64),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("insert into test_table(str) values(?)", ["abc?"]);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should not change", async () => {
        await connection.query("UPDATE test_table SET str = ? WHERE id = ?", ["should not change ?", 1]);
        const [rows] = await connection.query("SELECT str FROM test_table WHERE id = ?", [1]);
        expect(rows).to.be.deep.equal([{ str: "should not change ?" }]);
    });
});
