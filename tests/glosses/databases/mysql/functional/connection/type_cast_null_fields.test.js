import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "type cast null fields", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`test\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`date\` DATETIME NULL,
                \`number\` INT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO test SET ?", {
            date: null,
            number: null
        });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select nulls", async () => {
        const [rows] = await connection.query("SELECT * FROM test");
        expect(rows).to.be.deep.equal([{
            id: 1,
            date: null,
            number: null
        }]);
    });
});
