import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "update changed rows", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`changed_rows\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`value\` int(5) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("insert into changed_rows(value) values(1)");
        await connection.query("insert into changed_rows(value) values(1)");
        await connection.query("insert into changed_rows(value) values(2)");
        await connection.query("insert into changed_rows(value) values(3)");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should not change changed rows", async () => {
        let [res] = await connection.execute("update changed_rows set value=1");
        expect(res.affectedRows).to.be.equal(4);
        expect(res.changedRows).to.be.equal(2);
        [res] = await connection.execute("update changed_rows set value=1");
        expect(res.affectedRows).to.be.equal(4);
        expect(res.changedRows).to.be.equal(0);
    });
});
