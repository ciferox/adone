import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "insert", "negative ai", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`neg-ai-test\` (
                \`id\` int(11) signed NOT NULL AUTO_INCREMENT,
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
        const [res] = await connection.query(
            'INSERT INTO `neg-ai-test` (id, title) values (-999, "test negative ai")'
        );
        expect(res.insertId).to.be.equal(-999);
        const [rows] = await connection.query(`SELECT * FROM \`neg-ai-test\` WHERE id = ${res.insertId}`);
        expect(rows).to.have.lengthOf(1);
        expect(rows[0].id).to.be.equal(-999);
        expect(rows[0].title).to.be.equal("test negative ai");
    });
});
