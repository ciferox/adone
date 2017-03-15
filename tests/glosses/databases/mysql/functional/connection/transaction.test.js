import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "transaction", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`test\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should commit", async () => {
        await connection.beginTransaction();
        const row = {
            id: 1,
            title: "Test row"
        };
        await connection.query("INSERT INTO test SET ?", row);
        await connection.commit();
        const [rows] = await connection.query("SELECT * FROM test");
        expect(rows).to.have.lengthOf(1);
        expect(rows).to.be.deep.equal([row]);
    });

    it("should rollback", async () => {
        await connection.beginTransaction();
        const row = {
            id: 2,
            title: "Test row"
        };
        await connection.query("INSERT INTO test SET ?", row);
        await connection.rollback();
        const [rows] = await connection.query("SELECT * FROM test WHERE id = ?", [2]);
        expect(rows).to.have.lengthOf(0);
    });
});
