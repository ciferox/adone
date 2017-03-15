import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "insert", "results", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`insert_test\` (
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

    it("should work properly", async () => {
        const [res] = await connection.query('INSERT INTO insert_test SET title=" test test test "');
        expect(res.insertId).to.be.equal(1);
        const [rows] = await connection.query(`SELECT * FROM insert_test WHERE id = ${res.insertId}`);
        expect(rows).to.have.lengthOf(1);
        expect(rows[0].id).to.be.equal(1);
        expect(rows[0].title).to.be.equal(" test test test ");
    });
});
